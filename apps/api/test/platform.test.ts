import test from 'node:test';
import assert from 'node:assert/strict';
import { MealServiceTime, OrderStatus, UnitOfMeasure, ComponentCategory } from '@janitou/common';
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

test('6. Packaging Label Generator — generates individual meal box labels with thermal format', () => {
  const store = new JanitouStore();
  const today = new Date().toISOString().split('T')[0];

  const labels = store.generatePackagingLabels(today, false);
  assert.ok(labels.length > 0);

  const firstLabel = labels[0];
  assert.ok(firstLabel.labelId.startsWith('LBL-'));
  assert.ok(firstLabel.barcode.startsWith('*JNT-'));
  assert.ok(firstLabel.heatingInstructions.length > 10);
  assert.ok(firstLabel.storageInstructions.length > 10);
  assert.ok(Array.isArray(firstLabel.allergens));
});

test('7. Financial Analytics & Margins — calculates revenue, food cost and gross margin', () => {
  const store = new JanitouStore();
  const today = new Date().toISOString().split('T')[0];

  const analytics = store.getFinancialAnalytics(today);
  assert.ok(analytics.totalRevenue > 0);
  assert.ok(analytics.totalFoodCost > 0);
  assert.ok(analytics.grossMargin > 0);
  assert.equal(analytics.grossMargin, analytics.totalRevenue - analytics.totalFoodCost);
  assert.ok(analytics.foodCostPercentage > 0 && analytics.foodCostPercentage < 100);
  assert.ok(analytics.grossMarginPercentage > 0 && analytics.grossMarginPercentage < 100);
  assert.ok(analytics.topRecipes.length > 0);
});

test('8. Recipe Creation & Cost Simulation — creates custom dish and simulates selling price', () => {
  const store = new JanitouStore();
  const newRecipe = store.createRecipe({
    name: 'Tagine de Poulet aux Olives & Citron Confît',
    category: ComponentCategory.MAIN_COURSE,
    description: 'Plat traditionnel mijoté aux olives vertes et citrons confits maison.',
    yieldPortions: 1,
    preparationTimeMinutes: 50,
    allergens: [],
    ingredients: [
      { ingredientId: 'ing-1', quantityPerPortion: 0.25, unit: UnitOfMeasure.KILOGRAM }, // 250g chicken @ 850 = 212.5
      { ingredientId: 'ing-8', quantityPerPortion: 0.08, unit: UnitOfMeasure.KILOGRAM }, // 80g onions @ 70 = 5.6
      { ingredientId: 'ing-3', quantityPerPortion: 0.02, unit: UnitOfMeasure.LITER },   // 20ml olive oil @ 1100 = 22
    ],
  });

  assert.ok(newRecipe.id.startsWith('rec-'));
  const costInfo = store.calculateRecipeCost(newRecipe.id);
  assert.equal(costInfo.costPerPortion, 240.1);

  // Simulate target 30% Food Cost
  const sim = store.simulateRecipePricing(newRecipe.id, 30);
  assert.ok(sim);
  assert.equal(sim.foodCostPerPortion, 240.1);
  assert.equal(sim.recommendedSellingPrice, Math.round(240.1 / 0.3)); // ~800 DZD
  assert.ok(sim.projectedGrossMargin > 500);
});

test('9. Weekly Menu Calendar — returns 7 structured days with Lunch and Dinner slots', () => {
  const store = new JanitouStore();
  const today = new Date().toLocaleDateString('en-CA');
  const weekly = store.getWeeklyMenuPlan(today);

  assert.equal(weekly.length, 7);
  assert.equal(weekly[0].date, today);
  assert.ok(weekly[0].dayName.length > 3);
  assert.ok(weekly[0].lunch !== undefined);
});

test('10. Customer Subscriptions — automatically converts active subscriptions into orders', () => {
  const store = new JanitouStore();
  const today = new Date().toLocaleDateString('en-CA');

  const initialOrderCount = store.getOrders().length;
  const generated = store.generateOrdersFromSubscriptions(today);

  // Subscriptions active on today's day of week should produce orders
  if (generated.length > 0) {
    assert.ok(store.getOrders().length > initialOrderCount);
    assert.ok(generated[0].orderNumber.startsWith('JNT-'));
    assert.ok(generated[0].notes?.includes('Généré depuis abonnement'));
  }
});

test('11. Kitchen Display System (KDS) — tracks batch stations and updates workflow stage', () => {
  const store = new JanitouStore();
  const today = new Date().toLocaleDateString('en-CA');

  const batches = store.getKdsBatches(today);
  assert.ok(batches.length > 0);
  const firstBatch = batches[0];
  assert.equal(firstBatch.stage, 'TO_PREPARE');

  // Transition to COOKING
  const updated = store.updateKdsBatchStage(firstBatch.id, 'COOKING');
  assert.ok(updated);
  assert.equal(updated.stage, 'COOKING');
});

test('12. Menu Calendar Rules Engine — detects same-day fries and minced meat conflicts', () => {
  const store = new JanitouStore();
  // Create a recipe with fries
  const friesRecipe = store.createRecipe({
    name: 'Steak Grillé & Frites Maison',
    category: ComponentCategory.MAIN_COURSE,
    yieldPortions: 1,
    preparationTimeMinutes: 25,
    allergens: [],
    ingredients: [{ ingredientId: 'ing-6', quantityPerPortion: 0.3, unit: UnitOfMeasure.KILOGRAM }],
  });

  // Intentionally violate rule: fries at lunch and dinner on the same day
  const testDate = '2026-10-25';
  const conflictingPlans = [
    { id: 'mp-test-1', date: testDate, serviceTime: MealServiceTime.LUNCH, mainCourseRecipeId: friesRecipe.id },
    { id: 'mp-test-2', date: testDate, serviceTime: MealServiceTime.DINNER, mainCourseRecipeId: friesRecipe.id },
  ];

  const validation = store.validateMenuCalendarRules(conflictingPlans);
  assert.equal(validation.isValid, false);
  const friesViolation = validation.violations.find((v) => v.ruleName === 'INTERDICTION_FRITES_MIDI_SOIR');
  assert.ok(friesViolation);
  assert.equal(friesViolation.severity, 'ERROR');
});

test('13. Customer Hierarchy & Prepaid Accounting — tracks subsidiaries, payments, and balances', () => {
  const store = new JanitouStore();
  const subsidiary = store.getCustomerById('cust-4');
  assert.ok(subsidiary);
  assert.equal(subsidiary.isSubsidiary, true);
  assert.equal(subsidiary.parentCompanyId, 'cust-2');

  // Record payment and verify balance update
  const oldBalance = subsidiary.accountBalance;
  const payment = store.recordPayment({
    customerId: 'cust-4',
    amount: 5000,
    paymentMethod: 'BANK_TRANSFER',
    notes: 'Virement mensuel filiale',
  });

  assert.ok(payment.receiptNumber.startsWith('REC-'));
  assert.equal(subsidiary.accountBalance, oldBalance + 5000);

  // Audit trail verification
  const auditLogs = store.getAuditLogs({ action: 'PAYMENT_RECORDED' });
  assert.ok(auditLogs.length > 0);
  assert.equal(auditLogs[0].entityId, payment.id);
});

test('14. Emergency Workshop Package & Backup/Restore — generates printable package and round-trip backup', () => {
  const store = new JanitouStore();
  const pkg = store.generateEmergencyWorkshopPackage();
  assert.ok(pkg.totalMealPortions > 0);
  assert.ok(pkg.packagingRequirements.length > 0);
  assert.ok(Array.isArray(pkg.alternatives));

  // Backup test
  const backup = store.createDatabaseBackup();
  assert.equal(backup.version, '1.0.0-phase1');
  assert.ok(backup.data.customers !== undefined);

  // Restore test
  const restored = store.restoreDatabaseFromBackup(backup);
  assert.equal(restored, true);
});

test('15. The 14 Official Reports — generates all 14 Phase 1 reports successfully', () => {
  const store = new JanitouStore();
  for (let r = 1; r <= 14; r++) {
    const report = store.generateReport(r);
    assert.equal(report.reportNumber, r);
    assert.ok(report.title.length > 3);
    assert.ok(report.summaryText.length > 5);
    assert.ok(report.data !== undefined);
  }
});
