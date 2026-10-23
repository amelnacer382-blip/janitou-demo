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

  await t.test('GET /health returns healthy status with database integration', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json() as { status: string; service: string; database?: { status: string; totalRecords: number } };
    assert.equal(data.status, 'healthy');
    assert.equal(data.service, 'JANITOU FOOD API');
    assert.ok(data.database);
    assert.equal(data.database.status, 'healthy');
    assert.ok(data.database.totalRecords > 0);
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

  await t.test('POST /api/v1/recipes and pricing simulation endpoint', async () => {
    const createRes = await fetch(`${baseUrl}/api/v1/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Soupe Chorba Traditionnelle',
        category: 'STARTER',
        ingredients: [{ ingredientId: 'ing-1', quantityPerPortion: 0.1, unit: 'KG' }],
      }),
    });
    assert.equal(createRes.status, 201);
    const { recipe } = await createRes.json() as { recipe: { id: string } };

    const simRes = await fetch(`${baseUrl}/api/v1/recipes/${recipe.id}/pricing-simulation?targetFoodCost=25`);
    assert.equal(simRes.status, 200);
    const { simulation } = await simRes.json() as { simulation: { recommendedSellingPrice: number } };
    assert.ok(simulation.recommendedSellingPrice > 0);
  });

  await t.test('GET /api/v1/meal-plans/weekly, /subscriptions and /kds/batches', async () => {
    const weeklyRes = await fetch(`${baseUrl}/api/v1/meal-plans/weekly`);
    assert.equal(weeklyRes.status, 200);
    const { weekly } = await weeklyRes.json() as { weekly: unknown[] };
    assert.equal(weekly.length, 7);

    const subRes = await fetch(`${baseUrl}/api/v1/subscriptions`);
    assert.equal(subRes.status, 200);
    const { subscriptions } = await subRes.json() as { subscriptions: unknown[] };
    assert.ok(subscriptions.length >= 1);

    const kdsRes = await fetch(`${baseUrl}/api/v1/kds/batches`);
    assert.equal(kdsRes.status, 200);
    const { batches } = await kdsRes.json() as { batches: { id: string; stage: string }[] };
    assert.ok(batches.length > 0);

    const patchKdsRes = await fetch(`${baseUrl}/api/v1/kds/batches/${batches[0].id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 'COOKING' }),
    });
    assert.equal(patchKdsRes.status, 200);
  });

  await t.test('GET /api/v1/meal-plans/validate-rules returns rules status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/meal-plans/validate-rules`);
    assert.equal(res.status, 200);
    const data = await res.json() as { isValid: boolean; violations: unknown[] };
    assert.ok(typeof data.isValid === 'boolean');
    assert.ok(Array.isArray(data.violations));
  });

  await t.test('Accounting endpoints & Payment recording flow', async () => {
    const invRes = await fetch(`${baseUrl}/api/v1/accounting/invoices`);
    assert.equal(invRes.status, 200);
    const { invoices } = await invRes.json() as { invoices: unknown[] };
    assert.ok(invoices.length >= 1);

    // Record payment via HTTP
    const payRes = await fetch(`${baseUrl}/api/v1/accounting/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'cust-1',
        amount: 2500,
        paymentMethod: 'CASH',
        notes: 'Versement espèces comptoir',
      }),
    });
    assert.equal(payRes.status, 201);
    const { payment } = await payRes.json() as { payment: { id: string; amount: number } };
    assert.equal(payment.amount, 2500);
  });

  await t.test('Reports hub and Emergency Workshop Package endpoints', async () => {
    const reportsRes = await fetch(`${baseUrl}/api/v1/reports`);
    assert.equal(reportsRes.status, 200);
    const { reports } = await reportsRes.json() as { reports: unknown[] };
    assert.equal(reports.length, 14);

    const singleReportRes = await fetch(`${baseUrl}/api/v1/reports/1`);
    assert.equal(singleReportRes.status, 200);
    const { report } = await singleReportRes.json() as { report: { reportNumber: number; title: string } };
    assert.equal(report.reportNumber, 1);

    const emerRes = await fetch(`${baseUrl}/api/v1/emergency/workshop-package`);
    assert.equal(emerRes.status, 200);
    const { emergencyPackage } = await emerRes.json() as { emergencyPackage: { totalMealPortions: number } };
    assert.ok(emergencyPackage.totalMealPortions > 0);
  });

  await t.test('Role Access Control — restricts sensitive financials to authorized roles', async () => {
    // Unauthorized role
    const forbiddenRes = await fetch(`${baseUrl}/api/v1/analytics/financials`, {
      headers: { 'x-user-role': 'DELIVERY_DRIVER' },
    });
    assert.equal(forbiddenRes.status, 403);

    // Authorized role
    const allowedRes = await fetch(`${baseUrl}/api/v1/analytics/financials`, {
      headers: { 'x-user-role': 'ADMIN' },
    });
    assert.equal(allowedRes.status, 200);
  });
});
