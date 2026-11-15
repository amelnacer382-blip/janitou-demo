import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { handleRequest } from '../src/router.js';
import { janitouStore } from '../src/services/store.js';

function isoToday(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

test('Client app API — public catalogue, guest checkout and ordering', async (t) => {
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

  const staffLogin = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@janitou.dz', password: 'Admin@2026' }),
  });
  assert.equal(staffLogin.status, 200);
  const staffLoginBody: unknown = await staffLogin.json();
  assert.ok(
    staffLoginBody &&
      typeof staffLoginBody === 'object' &&
      'token' in staffLoginBody &&
      typeof staffLoginBody.token === 'string'
  );
  const staffToken = staffLoginBody.token;

  const json = async (path: string, init?: RequestInit) => {
    const staffHeaders = path.startsWith('/api/v1/simple')
      ? { Authorization: `Bearer ${staffToken}` }
      : {};
    const headers = { ...staffHeaders, ...(init?.headers || {}) };
    const res = await fetch(`${base}${path}`, { ...init, headers });
    return { res, body: await res.json() };
  };
  const authorized = (token: string, init: RequestInit = {}): RequestInit => ({
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });

  await t.test('GET /client serves the customer app', async () => {
    const res = await fetch(`${base}/client`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('جانيتو فود'));
    assert.ok(html.includes('/client/manifest.webmanifest'));
  });

  await t.test('menu is published with prices and alternatives', async () => {
    const { res, body } = await json(`/api/v1/client/menu?from=${isoToday()}&to=${isoToday()}`);
    assert.equal(res.status, 200);
    assert.equal(body.days.length, 1);
    const day = body.days[0];
    assert.ok(day.lunch);
    assert.ok(day.dinner);
    assert.ok(day.lunch.price > 0);
    assert.ok(Array.isArray(day.alternatives));
    assert.ok(day.alternatives.length > 0);
    assert.equal(typeof day.orderDeadline, 'string');
  });

  await t.test('self-registration is disabled', async () => {
    const res = await json('/api/v1/client/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactName: 'Client Test',
        phone: '0699 00 11 22',
        pin: '4321',
        deliveryAddress: '10 Rue des Tests, Alger',
      }),
    });
    assert.equal(res.res.status, 403);
  });

  await t.test('admin creates an active account and the client can log in', async () => {
    const created = await json('/api/v1/simple/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactName: 'Client Test',
        phone: '0699 00 11 22',
        pin: '4321',
        deliveryAddress: '10 Rue des Tests, Alger',
        subscriptionType: 'INDIVIDUAL',
      }),
    });
    assert.equal(created.res.status, 201);
    assert.equal(created.body.client.accountStatus, 'ACTIVE');

    const duplicate = await json('/api/v1/simple/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactName: 'Autre',
        phone: '0699 00 11 22',
        pin: '1111',
        deliveryAddress: 'Adresse test',
      }),
    });
    assert.equal(duplicate.res.status, 409);

    const badLogin = await json('/api/v1/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0699 00 11 22', pin: '0000' }),
    });
    assert.equal(badLogin.res.status, 401);

    const login = await json('/api/v1/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0699 00 11 22', pin: '4321' }),
    });
    assert.equal(login.res.status, 200);
    assert.ok(login.body.token);
    assert.equal(login.body.account.accountStatus, 'ACTIVE');
  });

  await t.test('catalogue exposes all active dishes and can be ordered directly', async () => {
    const catalogue = await json('/api/v1/client/catalogue');
    assert.equal(catalogue.res.status, 200);
    assert.ok(Array.isArray(catalogue.body.dishes));
    assert.ok(catalogue.body.dishes.length >= 4);
    const dish = catalogue.body.dishes.find((entry: { id: string }) => entry.id === 'rec-4');
    assert.ok(dish);

    await json('/api/v1/simple/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lunchPrice: 450,
        dinnerPrice: 400,
        packagingPrice: 30,
        deliveryPrice: 150,
        lunchHours: '11:30 - 13:30',
        dinnerHours: '18:00 - 20:00',
        cutoffTime: '23:59',
        cutoffDaysBefore: 0,
        extras: [{ name: 'حلويات', price: 100 }],
      }),
    });
    const login = await json('/api/v1/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0699 00 11 22', pin: '4321' }),
    });
    const token = login.body.token as string;
    const placed = await json('/api/v1/client/orders', authorized(token, {
      method: 'POST',
      body: JSON.stringify({
        date: isoToday(),
        serviceTime: 'LUNCH',
        packaging: 'INDIVIDUAL',
        items: [
          { dishId: 'rec-3', portions: 2 },
          { dishId: 'rec-4', portions: 1 },
        ],
        extras: [],
        notes: 'Catalogue test',
      }),
    }));
    assert.equal(placed.res.status, 201);
    assert.equal(placed.body.order.totalPortions, 3);
    const settings = (await json('/api/v1/client/config')).body.settings;
    const priceById = new Map(
      catalogue.body.dishes.map((entry: { id: string; price: number }) => [entry.id, entry.price])
    );
    const expected =
      (priceById.get('rec-3') as number) * 2 +
      (priceById.get('rec-4') as number) +
      settings.deliveryPrice +
      settings.packagingPrice * 3;
    assert.equal(placed.body.order.totalPrice, expected);

    const orders = await json('/api/v1/client/orders', authorized(token));
    const catalogueOrder = orders.body.orders.find(
      (order: { orderNumber: string }) => order.orderNumber === placed.body.order.orderNumber
    );
    assert.equal(catalogueOrder.orderMode, 'CATALOGUE');
    assert.equal(catalogueOrder.editable, false);
    assert.equal(catalogueOrder.items.length, 2);
  });

  await t.test('a guest order stays pending until admin approval', async () => {
    const catalogue = await json('/api/v1/client/catalogue');
    const dish = catalogue.body.dishes[0] as { id: string; price: number };
    const settings = (await json('/api/v1/client/config')).body.settings;
    const placed = await json('/api/v1/client/guest-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactName: 'Invité Test',
        phone: '0699 00 11 44',
        deliveryAddress: '30 Rue Invitée, Alger',
        date: isoToday(),
        serviceTime: 'DINNER',
        packaging: 'INDIVIDUAL',
        items: [{ dishId: dish.id, portions: 2 }],
        extras: [],
        notes: 'Commande invité',
      }),
    });
    assert.equal(placed.res.status, 201);
    assert.equal(placed.body.order.pending, true);
    assert.equal(placed.body.order.totalPortions, 2);
    assert.equal(
      placed.body.order.totalPrice,
      dish.price * 2 + settings.deliveryPrice + settings.packagingPrice * 2
    );
    assert.equal(
      janitouStore.outboundMessages.some(
        (message) => message.orderNumber === placed.body.order.orderNumber
      ),
      false
    );

    const history = await json('/api/v1/client/guest-orders?phone=0699%2000%2011%2044');
    assert.equal(history.res.status, 200);
    assert.ok(history.body.orders.length >= 1);
    assert.equal(history.body.orders[0].orderNumber, placed.body.order.orderNumber);
    assert.equal(history.body.orders[0].status, 'PENDING_APPROVAL');
    assert.equal(history.body.orders[0].deliveryAddress, undefined);

    const filtered = await json(
      `/api/v1/client/guest-orders?phone=0699%2000%2011%2044&orderNumber=${placed.body.order.orderNumber}`
    );
    assert.equal(filtered.body.orders.length, 1);

    const duplicatePhone = await json('/api/v1/client/guest-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactName: 'Invité Test',
        phone: '0699 00 11 44',
        deliveryAddress: '30 Rue Invitée, Alger',
        date: isoToday(),
        serviceTime: 'LUNCH',
        packaging: 'COLLECTIVE',
        items: [{ dishId: dish.id, portions: 1 }],
        extras: [],
      }),
    });
    assert.equal(duplicatePhone.res.status, 201);
    assert.equal(duplicatePhone.body.order.pending, true);

    const clients = await json('/api/v1/simple/clients');
    const client = clients.body.clients.find(
      (entry: { phone: string }) => entry.phone === '0699 00 11 44'
    );
    assert.ok(client);
    assert.equal(client.accountStatus, 'PENDING');
    assert.equal(client.pendingOrders, 2);

    const approved = await json(`/api/v1/simple/clients/${client.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountStatus: 'ACTIVE' }),
    });
    assert.equal(approved.res.status, 200);

    const after = await json('/api/v1/client/guest-orders?phone=0699%2000%2011%2044');
    assert.ok(after.body.orders.every((order: { status: string }) => order.status === 'CONFIRMED'));
    assert.ok(
      janitouStore.outboundMessages.some(
        (message) => message.orderNumber === placed.body.order.orderNumber
      )
    );
  });

  await t.test('an active customer can order with packaging, alternatives and extras', async () => {
    const settings = await json('/api/v1/simple/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lunchPrice: 450,
        dinnerPrice: 400,
        packagingPrice: 30,
        deliveryPrice: 150,
        lunchHours: '11:30 - 13:30',
        dinnerHours: '18:00 - 20:00',
        cutoffTime: '23:59',
        cutoffDaysBefore: 0,
        extras: [{ name: 'حلويات', price: 100 }],
      }),
    });
    assert.equal(settings.res.status, 200);

    const login = await json('/api/v1/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0699 00 11 22', pin: '4321' }),
    });
    const token = login.body.token as string;

    const menu = await json(`/api/v1/client/menu?from=${isoToday()}&to=${isoToday()}`);
    const day = menu.body.days[0];
    const alternative = day.alternatives.find((dish: { id: string }) => dish.id === 'rec-3');
    assert.ok(alternative);

    const placed = await json('/api/v1/client/orders', authorized(token, {
      method: 'POST',
      body: JSON.stringify({
        date: isoToday(),
        lunchPortions: 2,
        dinnerPortions: 1,
        lunchPackaging: 'INDIVIDUAL',
        dinnerPackaging: 'COLLECTIVE',
        alternatives: [{ dishId: alternative.id, portions: 1 }],
        extras: [{ name: 'حلويات', quantity: 1 }],
        notes: 'Sans oignons',
      }),
    }));
    assert.equal(placed.res.status, 201);
    const expected = 2 * 450 + 1 * 400 + alternative.price + 100 + 150 + 3 * 30;
    assert.equal(placed.body.order.totalPrice, expected);
    assert.equal(placed.body.order.totalPortions, 3);

    const orders = await json('/api/v1/client/orders', authorized(token));
    assert.equal(orders.res.status, 200);
    assert.ok(orders.body.orders.some((order: { orderNumber: string }) => order.orderNumber === placed.body.order.orderNumber));
  });

  await t.test('weekly program generates orders and they can be edited or cancelled', async () => {
    const phone = '0699 00 11 23';
    const created = await json('/api/v1/simple/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactName: 'Programme Test',
        phone,
        pin: '5555',
        deliveryAddress: '20 Rue du Programme, Alger',
      }),
    });
    assert.equal(created.res.status, 201);
    const login = await json('/api/v1/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, pin: '5555' }),
    });
    const token = login.body.token as string;

    const config = (await json('/api/v1/client/config')).body.settings;
    const weekday = new Date(`${isoToday()}T12:00:00`).getDay();
    const entries = Array.from({ length: 7 }, (_, day) => ({
      weekday: day,
      lunchPortions: day === weekday ? 2 : 0,
      dinnerPortions: day === weekday ? 1 : 0,
      lunchPackaging: 'INDIVIDUAL',
      dinnerPackaging: 'COLLECTIVE',
    }));

    const saved = await json('/api/v1/client/program', authorized(token, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    }));
    assert.equal(saved.res.status, 200);
    assert.equal(saved.body.generatedCount, 1);
    const savedDay = saved.body.entries.find((entry: { weekday: number }) => entry.weekday === weekday);
    assert.equal(savedDay.lunchPortions, 2);

    const again = await json('/api/v1/client/program', authorized(token, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    }));
    assert.equal(again.body.generatedCount, 0);

    const orders = await json('/api/v1/client/orders', authorized(token));
    assert.equal(orders.body.orders.length, 1);
    const order = orders.body.orders[0];
    assert.equal(order.source, 'AUTOMATIC');
    assert.equal(order.editable, true);
    const expectedTotal = 2 * config.lunchPrice + config.dinnerPrice + config.deliveryPrice + 3 * config.packagingPrice;
    assert.equal(order.totalPrice, expectedTotal);

    const edited = await json(`/api/v1/client/orders/${order.id}`, authorized(token, {
      method: 'PATCH',
      body: JSON.stringify({
        lunchPortions: 1,
        dinnerPortions: 0,
        lunchPackaging: 'INDIVIDUAL',
        alternatives: [],
        extras: [],
        notes: 'تعديل تجريبي',
      }),
    }));
    assert.equal(edited.res.status, 200);
    assert.equal(edited.body.order.totalPrice, config.lunchPrice + config.deliveryPrice + config.packagingPrice);

    const cancelled = await json(`/api/v1/client/orders/${order.id}`, authorized(token, {
      method: 'DELETE',
    }));
    assert.equal(cancelled.res.status, 200);
    assert.equal(cancelled.body.order.status, 'CANCELLED');

    const after = await json('/api/v1/client/orders', authorized(token));
    assert.equal(after.body.orders[0].status, 'CANCELLED');
    assert.equal(after.body.orders[0].editable, false);

    const regeneration = await json('/api/v1/client/program', authorized(token, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    }));
    assert.equal(regeneration.body.generatedCount, 0);
  });

  await t.test('closed dates, deadline overrides and extra caps are enforced', async () => {
    const login = await json('/api/v1/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0699 00 11 22', pin: '4321' }),
    });
    const token = login.body.token as string;

    await json('/api/v1/simple/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        closedDates: [isoToday()],
        extras: [{ name: 'حلويات', price: 100, perMeals: 2 }],
      }),
    });
    const closedMenu = await json(`/api/v1/client/menu?from=${isoToday()}&to=${isoToday()}`);
    assert.equal(closedMenu.body.days[0].closed, true);

    const closedOrder = await json('/api/v1/client/orders', authorized(token, {
      method: 'POST',
      body: JSON.stringify({
        date: isoToday(),
        lunchPortions: 1,
        dinnerPortions: 0,
        lunchPackaging: 'INDIVIDUAL',
        alternatives: [],
        extras: [],
      }),
    }));
    assert.equal(closedOrder.res.status, 400);

    await json('/api/v1/simple/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closedDates: [] }),
    });
    const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const extended = await json(`/api/v1/simple/menu/${isoToday()}/deadline`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ until }),
    });
    assert.equal(extended.res.status, 200);

    const openMenu = await json(`/api/v1/client/menu?from=${isoToday()}&to=${isoToday()}`);
    assert.equal(openMenu.body.days[0].closed, false);

    const tooManyExtras = await json('/api/v1/client/orders', authorized(token, {
      method: 'POST',
      body: JSON.stringify({
        date: isoToday(),
        lunchPortions: 2,
        dinnerPortions: 1,
        lunchPackaging: 'INDIVIDUAL',
        dinnerPackaging: 'INDIVIDUAL',
        alternatives: [],
        extras: [{ name: 'حلويات', quantity: 3 }],
      }),
    }));
    assert.equal(tooManyExtras.res.status, 400);

    const capped = await json('/api/v1/client/orders', authorized(token, {
      method: 'POST',
      body: JSON.stringify({
        date: isoToday(),
        lunchPortions: 2,
        dinnerPortions: 1,
        lunchPackaging: 'INDIVIDUAL',
        dinnerPackaging: 'INDIVIDUAL',
        alternatives: [],
        extras: [{ name: 'حلويات', quantity: 2 }],
      }),
    }));
    assert.equal(capped.res.status, 201);
  });

  await t.test('prepaid billing, profile, distribution and notifications', async () => {
    const phone = '0699 00 11 22';
    const login = await json('/api/v1/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, pin: '4321' }),
    });
    const token = login.body.token as string;

    const clients = await json('/api/v1/simple/clients');
    const client = clients.body.clients.find(
      (entry: { phone: string }) => entry.phone === phone
    );
    assert.ok(client);

    const credited = await json(`/api/v1/simple/clients/${client.id}/credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1000 }),
    });
    assert.equal(credited.res.status, 200);
    assert.equal(credited.body.client.balance, 1000);

    const me = await json('/api/v1/client/me', authorized(token));
    assert.equal(me.body.account.balance, 1000);

    const placed = await json('/api/v1/client/orders', authorized(token, {
      method: 'POST',
      body: JSON.stringify({
        date: isoToday(),
        lunchPortions: 1,
        dinnerPortions: 0,
        lunchPackaging: 'INDIVIDUAL',
        alternatives: [],
        extras: [],
      }),
    }));
    assert.equal(placed.res.status, 201);
    assert.equal(placed.body.order.totalPrice, 630);

    const orders = await json('/api/v1/client/orders', authorized(token));
    const paidOrder = orders.body.orders.find(
      (order: { orderNumber: string }) => order.orderNumber === placed.body.order.orderNumber
    );
    assert.equal(paidOrder.isPaid, true);
    assert.ok(paidOrder.invoiceNumber);

    const afterPayment = await json('/api/v1/client/me', authorized(token));
    assert.equal(afterPayment.body.account.balance, 370);

    const edited = await json(`/api/v1/client/orders/${paidOrder.id}`, authorized(token, {
      method: 'PATCH',
      body: JSON.stringify({
        lunchPortions: 1,
        dinnerPortions: 0,
        lunchPackaging: 'INDIVIDUAL',
        alternatives: [],
        extras: [{ name: 'حلويات', quantity: 1 }],
      }),
    }));
    assert.equal(edited.res.status, 200);
    assert.equal(edited.body.order.totalPrice, 730);
    const afterEdit = await json('/api/v1/client/me', authorized(token));
    assert.equal(afterEdit.body.account.balance, 270);

    const cancelled = await json(`/api/v1/client/orders/${paidOrder.id}`, authorized(token, {
      method: 'DELETE',
    }));
    assert.equal(cancelled.res.status, 200);
    const afterCancel = await json('/api/v1/client/me', authorized(token));
    assert.equal(afterCancel.body.account.balance, 1000);

    const notifications = await json('/api/v1/client/notifications', authorized(token));
    const types = notifications.body.notifications.map(
      (notification: { type: string }) => notification.type
    );
    assert.ok(types.includes('ORDER_CREATED'));
    assert.ok(types.includes('ORDER_UPDATED'));
    assert.ok(types.includes('ORDER_CANCELLED'));

    const read = await json('/api/v1/client/notifications/read', authorized(token, {
      method: 'PATCH',
    }));
    assert.equal(read.res.status, 200);
    const readNotifications = await json('/api/v1/client/notifications', authorized(token));
    assert.ok(
      readNotifications.body.notifications.every(
        (notification: { readAt?: string }) => Boolean(notification.readAt)
      )
    );

    const staffNotifications = await json('/api/v1/simple/notifications');
    assert.ok(Array.isArray(staffNotifications.body.notifications));

    const profile = await json(`/api/v1/simple/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliveryAddress: '99 Rue de la Distribution, Alger',
        distribution: { type: 'EXPRESS', label: 'Tournée express', driverName: 'Rachid' },
      }),
    });
    assert.equal(profile.res.status, 200);
    assert.equal(profile.body.client.distribution.type, 'EXPRESS');

    const updatedClients = await json('/api/v1/simple/clients');
    const updated = updatedClients.body.clients.find(
      (entry: { id: string }) => entry.id === client.id
    );
    assert.equal(updated.deliveryAddress, '99 Rue de la Distribution, Alger');
    assert.equal(updated.distribution.type, 'EXPRESS');
  });

  await t.test('missing quantities, packaging and closed days are rejected', async () => {
    const login = await json('/api/v1/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0699 00 11 22', pin: '4321' }),
    });
    const token = login.body.token as string;

    const empty = await json('/api/v1/client/orders', authorized(token, {
      method: 'POST',
      body: JSON.stringify({
        date: isoToday(),
        lunchPortions: 0,
        dinnerPortions: 0,
        alternatives: [],
        extras: [],
      }),
    }));
    assert.equal(empty.res.status, 201);
    assert.equal(empty.body.order.status, 'CANCELLED');
    assert.equal(empty.body.order.totalPortions, 0);

    const noPackaging = await json('/api/v1/client/orders', authorized(token, {
      method: 'POST',
      body: JSON.stringify({
        date: isoToday(),
        lunchPortions: 1,
        dinnerPortions: 0,
        alternatives: [],
        extras: [],
      }),
    }));
    assert.equal(noPackaging.res.status, 400);

    const future = await json('/api/v1/client/orders', authorized(token, {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-12-20',
        lunchPortions: 1,
        dinnerPortions: 0,
        lunchPackaging: 'INDIVIDUAL',
        alternatives: [],
        extras: [],
      }),
    }));
    assert.equal(future.res.status, 400);

    const anonymous = await json('/api/v1/client/orders', {
      method: 'GET',
    });
    assert.equal(anonymous.res.status, 401);
  });

  await t.test('suspending the account blocks new orders', async () => {
    const clients = await json('/api/v1/simple/clients');
    const client = clients.body.clients.find((entry: { phone: string }) => entry.phone === '0699 00 11 22');
    await json(`/api/v1/simple/clients/${client.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountStatus: 'SUSPENDED' }),
    });
    const login = await json('/api/v1/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0699 00 11 22', pin: '4321' }),
    });
    const token = login.body.token as string;
    const blocked = await json('/api/v1/client/orders', authorized(token, {
      method: 'POST',
      body: JSON.stringify({
        date: isoToday(),
        lunchPortions: 1,
        dinnerPortions: 0,
        lunchPackaging: 'INDIVIDUAL',
        alternatives: [],
        extras: [],
      }),
    }));
    assert.equal(blocked.res.status, 403);
  });
});
