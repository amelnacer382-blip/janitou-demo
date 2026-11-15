import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { handleRequest } from '../src/router.js';

test('Simple mode API — mobile menu, dishes and settings', async (t) => {
  const server = http.createServer((req, res) => {
    void handleRequest(req, res);
  });
  const { promise: listening, resolve: onListening } = Promise.withResolvers<void>();
  server.listen(0, '127.0.0.1', () => onListening());
  await listening;

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  t.after(() => server.close());

  const loginResponse = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@janitou.dz', password: 'Admin@2026' }),
  });
  assert.equal(loginResponse.status, 200);
  const loginBody: unknown = await loginResponse.json();
  assert.ok(
    loginBody &&
      typeof loginBody === 'object' &&
      'token' in loginBody &&
      typeof loginBody.token === 'string'
  );
  const staffToken = loginBody.token;

  const json = async (path: string, init?: RequestInit) => {
    const headers = { Authorization: `Bearer ${staffToken}`, ...(init?.headers || {}) };
    const res = await fetch(`${base}${path}`, { ...init, headers });
    const body = await res.json();
    return { res, body };
  };
  const post = (path: string, body: unknown) =>
    json(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const patch = (path: string, body: unknown) =>
    json(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const menuDate = '2026-12-01';

  await t.test('GET /app serves the mobile application shell', async () => {
    const res = await fetch(`${base}/app`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/html/);
    const html = await res.text();
    assert.ok(html.includes('قائمة الطعام'));
    assert.ok(html.includes('/app/manifest.webmanifest'));
  });

  await t.test('dishes can be listed and created with validation', async () => {
    const listed = await json('/api/v1/simple/dishes');
    assert.equal(listed.res.status, 200);
    assert.ok(Array.isArray(listed.body.dishes));
    assert.ok(listed.body.dishes.length >= 4);

    const created = await post('/api/v1/simple/dishes', {
      name: 'Tajine de test',
      nameAr: 'طاجين تجريبي',
      category: 'MAIN_COURSE',
      photoUrl: '/app/dishes/tagine.jpg',
    });
    assert.equal(created.res.status, 201);
    assert.equal(created.body.dish.displayName, 'طاجين تجريبي');
    assert.equal(created.body.dish.photoUrl, '/app/dishes/tagine.jpg');

    const invalid = await post('/api/v1/simple/dishes', { name: 'x' });
    assert.equal(invalid.res.status, 400);

    const unsafePhoto = await post('/api/v1/simple/dishes', {
      name: 'Photo unsafe',
      photoUrl: 'javascript:alert(1)',
    });
    assert.equal(unsafePhoto.res.status, 400);
  });

  await t.test('a menu day can be created, changed, archived and restored', async () => {
    const created = await post('/api/v1/simple/menu', {
      date: menuDate,
      lunchDishId: 'rec-1',
      dinnerDishId: 'rec-2',
    });
    assert.equal(created.res.status, 201);
    assert.equal(created.body.day.lunch.id, 'rec-1');
    assert.equal(created.body.day.dinner.id, 'rec-2');

    const changed = await patch(`/api/v1/simple/menu/${menuDate}/dish`, {
      serviceTime: 'LUNCH',
      dishId: 'rec-3',
    });
    assert.equal(changed.res.status, 200);
    assert.equal(changed.body.day.lunch.id, 'rec-3');

    const archived = await patch(`/api/v1/simple/menu/${menuDate}/archive`, { archived: true });
    assert.equal(archived.res.status, 200);
    assert.equal(archived.body.day.archived, true);

    const current = await json(`/api/v1/simple/menu?scope=current&from=${menuDate}&to=${menuDate}`);
    assert.deepEqual(current.body.days, []);

    const archive = await json(`/api/v1/simple/menu?scope=archived&from=${menuDate}&to=${menuDate}`);
    assert.equal(archive.body.days.length, 1);
    assert.equal(archive.body.days[0].date, menuDate);

    const restored = await patch(`/api/v1/simple/menu/${menuDate}/archive`, { archived: false });
    assert.equal(restored.body.day.archived, false);

    const visibleAgain = await json(`/api/v1/simple/menu?scope=current&from=${menuDate}&to=${menuDate}`);
    assert.equal(visibleAgain.body.days.length, 1);
  });

  await t.test('menu creation rejects unknown dishes and empty selections', async () => {
    const unknown = await post('/api/v1/simple/menu', {
      date: '2026-12-02',
      lunchDishId: 'does-not-exist',
    });
    assert.equal(unknown.res.status, 404);

    const empty = await post('/api/v1/simple/menu', { date: '2026-12-02' });
    assert.equal(empty.res.status, 400);

    const badDate = await post('/api/v1/simple/menu', {
      date: '02-12-2026',
      lunchDishId: 'rec-1',
    });
    assert.equal(badDate.res.status, 400);
  });

  await t.test('home returns daily stats, menu and orders', async () => {
    const { res, body } = await json(`/api/v1/simple/home?date=${menuDate}`);
    assert.equal(res.status, 200);
    assert.equal(body.date, menuDate);
    assert.equal(body.stats.dishesCount, 2);
    assert.equal(body.stats.ordersCount, 0);
    assert.ok(Array.isArray(body.orders));
    assert.equal(body.menu.lunch.id, 'rec-3');
  });

  await t.test('settings can be read and updated, invalid values rejected', async () => {
    const defaults = await json('/api/v1/simple/settings');
    assert.equal(defaults.res.status, 200);
    assert.equal(defaults.body.settings.lunchPrice, 450);

    const updated = await json('/api/v1/simple/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lunchPrice: 600,
        dinnerPrice: 550,
        packagingPrice: 40,
        deliveryPrice: 200,
        lunchHours: '12:00 - 14:00',
        dinnerHours: '19:00 - 21:00',
        extras: [{ name: 'حلويات', price: 150 }],
      }),
    });
    assert.equal(updated.res.status, 200);
    assert.equal(updated.body.settings.lunchPrice, 600);
    assert.equal(updated.body.settings.extras[0].name, 'حلويات');

    const invalid = await json('/api/v1/simple/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lunchPrice: -5 }),
    });
    assert.equal(invalid.res.status, 400);
  });

  await t.test('weekly menu rules produce warnings without blocking creation', async () => {
    const first = await post('/api/v1/simple/dishes', {
      name: 'Pâtes test A',
      category: 'MAIN_COURSE',
      family: 'PASTA',
      flags: ['PASTA'],
    });
    const second = await post('/api/v1/simple/dishes', {
      name: 'Pâtes test B',
      category: 'MAIN_COURSE',
      family: 'PASTA',
      flags: ['PASTA'],
    });
    assert.equal(first.res.status, 201);
    assert.equal(second.res.status, 201);

    const firstMenu = await post('/api/v1/simple/menu', {
      date: '2026-12-07',
      lunchDishId: first.body.dish.id,
    });
    const secondMenu = await post('/api/v1/simple/menu', {
      date: '2026-12-08',
      lunchDishId: second.body.dish.id,
    });
    assert.equal(firstMenu.res.status, 201);
    assert.equal(secondMenu.res.status, 201);
    assert.ok(
      secondMenu.body.warnings.some(
        (violation: { ruleName: string }) => violation.ruleName === 'MAX_PATES_DEJEUNER_HEBDO'
      )
    );

    const rules = await json('/api/v1/simple/menu/rules?from=2026-12-06&to=2026-12-12');
    assert.equal(rules.res.status, 200);
    assert.ok(
      rules.body.violations.some(
        (violation: { ruleName: string }) => violation.ruleName === 'MAX_PATES_DEJEUNER_HEBDO'
      )
    );
  });

  await t.test('image upload accepts real images only', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const uploaded = await fetch(`${base}/api/v1/simple/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png', Authorization: `Bearer ${staffToken}` },
      body: png,
    });
    assert.equal(uploaded.status, 201);
    const payload: unknown = await uploaded.json();
    assert.ok(
      payload && typeof payload === 'object' && 'url' in payload && typeof payload.url === 'string'
    );
    assert.match(payload.url, /^\/uploads\/[A-Za-z0-9._-]+\.png$/);

    const served = await fetch(`${base}${payload.url}`);
    assert.equal(served.status, 200);
    assert.match(served.headers.get('content-type') || '', /image\/png/);

    const fake = await fetch(`${base}/api/v1/simple/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', Authorization: `Bearer ${staffToken}` },
      body: Buffer.from('not an image'),
    });
    assert.equal(fake.status, 415);

    const text = await fetch(`${base}/api/v1/simple/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Authorization: `Bearer ${staffToken}` },
      body: 'hello',
    });
    assert.equal(text.status, 415);

    await rm(resolve(process.cwd(), 'data', payload.url.replace(/^\//, '')), { force: true });
  });
});
