import test from 'node:test';
import assert from 'node:assert/strict';
import { MealServiceTime, OrderStatus, UnitOfMeasure } from '@janitou/common';
import { JanitouStore } from '../src/services/store.js';

test('1. Recipe Cost Calculation — accurately aggregates ingredient unit costs', () => {
  const store = new JanitouStore();
  const recipeCost = store.calculateRecipeCost('rec-1');

  // Poulet Mariné:
  // - 0.22kg chicken @ 850 = 187
  // - 0.25kg potatoes @ 85 = 21.25
  // - 0.10kg carrots @ 90 = 9
  // - 0.02L olive oil @ 1100 = 22
  // - 1 barquette @ 35 = 35
  // Total = 187 + 21.25 + 9 + 22 + 35 = 274.25 DZD
  assert.equal(recipeCost.costPerPortion, 274.25);
  assert.equal(recipeCost.breakdown.length, 5);
});

test('2. Production Engine — aggregates orders and explodes required raw ingredients', () => {
  const store = new JanitouStore();
  const today = new Date().toISOString().split('T')[0];

  const plan = store.calculateProductionNeeds(today, MealServiceTime.LUNCH);

  // In seed data, LUNCH has 2 orders:
  // - ord-101: 6x rec-1, 6x rec-3, 6x rec-4
  // - ord-102: 14x rec-1, 14x rec-4
  // Total rec-1 = 20 portions
  // Total rec-3 = 6 portions
  // Total rec-4 = 20 portions
  assert.equal(plan.totalOrders, 2);
  const rec1Requirement = plan.recipes.find((r) => r.recipeId === 'rec-1');
  assert.ok(rec1Requirement);
  assert.equal(rec1Requirement.totalPortions, 20);

  // Ingredient explosion check:
  // Chicken (ing-1) required for 20 portions of rec-1 = 20 * 0.22kg = 4.400 kg
  const chickenReq = plan.ingredientRequirements.find((i) => i.ingredientId === 'ing-1');
  assert.ok(chickenReq);
  assert.equal(chickenReq.quantityRequired, 4.4);
  assert.equal(chickenReq.unit, UnitOfMeasure.KILOGRAM);
  assert.equal(chickenReq.stockAfterProduction, Math.round((35.5 - 4.4) * 1000) / 1000);
});

test('3. Inventory Deficit & Automated Purchase Orders — detects deficit and restocks inventory', () => {
  const store = new JanitouStore();
  const today = new Date().toISOString().split('T')[0];

  // Set chicken stock artificially low to simulate shortage
  store.updateIngredientStock('ing-1', 2.0); // Only 2kg available, but 4.4kg needed for lunch

  const plan = store.calculateProductionNeeds(today, MealServiceTime.LUNCH);
  const chickenReq = plan.ingredientRequirements.find((i) => i.ingredientId === 'ing-1');
  assert.ok(chickenReq);
  assert.equal(chickenReq.deficit, 2.4); // 4.4 - 2.0 = 2.4kg deficit
  assert.equal(plan.hasDeficit, true);

  // Auto-generate Purchase Orders
  const createdPOs = store.generatePurchaseOrdersFromDeficits(today, MealServiceTime.LUNCH);
  assert.equal(createdPOs.length, 1);
  const po = createdPOs[0];
  assert.equal(po.supplierId, 'sup-2'); // Boucherie Atlas
  assert.equal(po.items[0].ingredientId, 'ing-1');
  assert.equal(po.items[0].quantity, 2.4);
  assert.equal(po.status, 'SENT');

  // Receive goods from supplier and confirm inventory updates
  const receivedPO = store.receivePurchaseOrder(po.id);
  assert.ok(receivedPO);
  assert.equal(receivedPO.status, 'RECEIVED');

  const reloadedChicken = store.getIngredientById('ing-1');
  assert.ok(reloadedChicken);
  assert.equal(reloadedChicken.currentStock, 4.4); // 2.0 + 2.4 = 4.4kg restored
});

test('4. Order Lifecycle & Delivery Run Tracking — dispatches stops and updates order status', () => {
  const store = new JanitouStore();
  const today = new Date().toISOString().split('T')[0];

  // Create delivery run for lunch
  const run = store.createDeliveryRun({
    runDate: today,
    serviceTime: MealServiceTime.LUNCH,
    driverName: 'Rachid B.',
    driverPhone: '0555 12 34 56',
  });

  assert.equal(run.stops.length, 2);
  assert.equal(run.status, 'PLANNED');

  const firstStop = run.stops[0];
  assert.equal(firstStop.deliveryStatus, 'PENDING');

  // Mark first stop delivered
  const updatedRun = store.markDeliveryStopCompleted(run.id, firstStop.id, 'Remis à la réception');
  assert.ok(updatedRun);
  assert.equal(updatedRun.stops[0].deliveryStatus, 'DELIVERED');

  // Verify associated order status transitioned to DELIVERED
  const order = store.getOrderById(firstStop.orderId);
  assert.ok(order);
  assert.equal(order.status, OrderStatus.DELIVERED);
});

test('5. Customer & Order Management — creates valid order with generated code and portions', () => {
  const store = new JanitouStore();
  const today = new Date().toISOString().split('T')[0];

  const order = store.createOrder({
    customerId: 'cust-1',
    deliveryDate: today,
    serviceTime: MealServiceTime.LUNCH,
    items: [
      { recipeId: 'rec-1', portions: 8 },
      { recipeId: 'rec-4', portions: 8 },
    ],
    notes: 'Livraison urgente',
  });

  assert.ok(order.orderNumber.startsWith(`JNT-${today.replace(/-/g, '')}`));
  assert.equal(order.totalPortions, 16);
  assert.equal(order.status, OrderStatus.CONFIRMED);
  assert.equal(order.items.length, 2);
});
