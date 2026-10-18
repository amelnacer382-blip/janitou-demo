import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { handleRequest } from '../src/router.js';

test('HTTP Router End-to-End Suite', async (t) => {
  const server = http.createServer((req, res) => {
    void handleRequest(req, res);
  });

  const { promise: listeningPromise, resolve: onListening } = Promise.withResolvers<void>();
  server.listen(0, '127.0.0.1', () => onListening());
  await listeningPromise;

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(() => {
    server.close();
  });

  await t.test('GET /health returns healthy status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json() as { status: string; service: string };
    assert.equal(data.status, 'healthy');
    assert.equal(data.service, 'JANITOU FOOD API');
  });

  await t.test('GET / and /dashboard return HTML dashboard', async () => {
    const res = await fetch(`${baseUrl}/dashboard`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type')?.includes('text/html'), true);
    const text = await res.text();
    assert.equal(text.includes('JANITOU FOOD'), true);
  });

  await t.test('POST /api/v1/customers creates customer with validation', async () => {
    // Missing fields check
    const badRes = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(badRes.status, 400);

    // Valid creation
    const res = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactName: 'Nadia Boumaza',
        phone: '0555 99 88 77',
        deliveryAddress: '22 Rue Didouche Mourad, Alger',
        dietaryPreferences: ['Végétarien'],
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json() as { customer: { id: string; contactName: string } };
    assert.ok(data.customer.id.startsWith('cust-'));
    assert.equal(data.customer.contactName, 'Nadia Boumaza');
  });

  await t.test('GET /api/v1/production/plan returns calculated needs', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`${baseUrl}/api/v1/production/plan?date=${today}`);
    assert.equal(res.status, 200);
    const data = await res.json() as { plan: { totalOrders: number; recipes: unknown[]; ingredientRequirements: unknown[] } };
    assert.ok(data.plan.totalOrders >= 1);
    assert.ok(data.plan.recipes.length >= 1);
    assert.ok(data.plan.ingredientRequirements.length >= 1);
  });

  await t.test('POST /api/v1/orders creates order and triggers status updates', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'cust-1',
        deliveryDate: today,
        serviceTime: 'LUNCH',
        items: [{ recipeId: 'rec-1', portions: 5 }],
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json() as { order: { id: string; status: string; totalPortions: number } };
    assert.equal(data.order.status, 'CONFIRMED');
    assert.equal(data.order.totalPortions, 5);

    // Patch status
    const patchRes = await fetch(`${baseUrl}/api/v1/orders/${data.order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PRODUCTION' }),
    });
    assert.equal(patchRes.status, 200);
    const patchedData = await patchRes.json() as { order: { status: string } };
    assert.equal(patchedData.order.status, 'IN_PRODUCTION');
  });

  await t.test('GET /api/v1/packaging/labels returns meal box labels', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`${baseUrl}/api/v1/packaging/labels?date=${today}`);
    assert.equal(res.status, 200);
    const data = await res.json() as { labels: { labelId: string; recipeName: string }[] };
    assert.ok(data.labels.length > 0);
    assert.ok(data.labels[0].labelId.startsWith('LBL-'));
  });

  await t.test('GET /api/v1/analytics/financials returns margin and revenue metrics', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`${baseUrl}/api/v1/analytics/financials?date=${today}`);
    assert.equal(res.status, 200);
    const data = await res.json() as { analytics: { totalRevenue: number; grossMargin: number } };
    assert.ok(data.analytics.totalRevenue > 0);
    assert.ok(data.analytics.grossMargin > 0);
  });

  await t.test('GET /api/v1/export/production and /delivery return CSV downloads', async () => {
    const today = new Date().toISOString().split('T')[0];
    const prodRes = await fetch(`${baseUrl}/api/v1/export/production?date=${today}`);
    assert.equal(prodRes.status, 200);
    assert.equal(prodRes.headers.get('content-type')?.includes('text/csv'), true);
    const prodText = await prodRes.text();
    assert.equal(prodText.includes('SECTION: RECETTES À PRODUIRE'), true);

    const delivRes = await fetch(`${baseUrl}/api/v1/export/delivery?date=${today}`);
    assert.equal(delivRes.status, 200);
    assert.equal(delivRes.headers.get('content-type')?.includes('text/csv'), true);
  });
});
