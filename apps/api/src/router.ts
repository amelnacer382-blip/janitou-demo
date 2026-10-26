import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MealServiceTime, OrderStatus, ComponentCategory, UnitOfMeasure } from '@janitou/common';
import { janitouStore } from './services/store.js';

declare global {
  interface PromiseConstructor {
    withResolvers<T>(): {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: unknown) => void;
    };
  }
}

if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const { promise, resolve, reject } = Promise.withResolvers<T>();
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 2 * 1024 * 1024) {
      reject(new Error('Payload too large'));
    }
  });
  req.on('end', () => {
    try {
      resolve(body.length > 0 ? (JSON.parse(body) as T) : ({} as T));
    } catch {
      reject(new Error('Invalid JSON payload'));
    }
  });
  req.on('error', (err) => reject(err));
  return promise;
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function checkRoleAccess(req: IncomingMessage, allowedRoles: string[]): boolean {
  const roleHeader = req.headers['x-user-role'] as string | undefined;
  if (!roleHeader) return true;
  return allowedRoles.includes(roleHeader.toUpperCase());
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const { pathname, searchParams } = url;
  const method = req.method?.toUpperCase() || 'GET';

  // Global CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // ----------------------------------------------------
    // Web Application Dashboard UI
    // ----------------------------------------------------
    if (pathname === '/' || pathname === '/dashboard') {
      try {
        const htmlPath = resolve(process.cwd(), 'apps/web/src/dashboard.html');
        const htmlContent = await readFile(htmlPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
        return;
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>JANITOU FOOD API is active</h1><p>Dashboard file loading error.</p>`);
        return;
      }
    }
    if (pathname === '/logo.png' || pathname === '/janitou-logo.png' || pathname === '/janitou.jfif') {
      try {
        const isJfif = pathname.endsWith('.jfif');
        const imgPath = resolve(process.cwd(), isJfif ? 'apps/web/src/janitou.jfif' : 'apps/web/src/logo.png');
        const imgData = await readFile(imgPath);
        res.writeHead(200, {
          'Content-Type': isJfif ? 'image/jpeg' : 'image/png',
          'Cache-Control': 'public, max-age=86400',
        });
        res.end(imgData);
        return;
      } catch {
        res.writeHead(404);
        res.end();
        return;
      }
    }

    // ----------------------------------------------------
    // System & Health Endpoints
    // ----------------------------------------------------
    if (pathname === '/health' || pathname === '/api/health') {
      const dbHealth = janitouStore.getDatabaseHealth();
      sendJson(res, 200, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'JANITOU FOOD API',
        version: '0.1.0',
        database: dbHealth,
      });
      return;
    }

    if (pathname === '/api' || pathname === '/api/v1') {
      sendJson(res, 200, {
        name: 'JANITOU FOOD Management API',
        version: 'v1',
        description: 'Meal Management, Production and Distribution Platform',
        endpoints: {
          customers: '/api/v1/customers',
          ingredients: '/api/v1/ingredients',
          recipes: '/api/v1/recipes',
          mealPlans: '/api/v1/meal-plans',
          orders: '/api/v1/orders',
          productionPlan: '/api/v1/production/plan?date=YYYY-MM-DD',
          productionAutoPurchase: '/api/v1/production/auto-purchase-orders',
          purchasingOrders: '/api/v1/purchasing/orders',
          deliveryRuns: '/api/v1/delivery/runs',
        },
      });
      return;
    }

    // ----------------------------------------------------
    // Customers API
    // ----------------------------------------------------
    if (pathname === '/api/v1/customers') {
      if (method === 'GET') {
        sendJson(res, 200, { customers: janitouStore.getCustomers() });
        return;
      }
      if (method === 'POST') {
        const body = await readJsonBody<{
          companyName?: string;
          contactName: string;
          phone: string;
          email?: string;
          deliveryAddress: string;
          wilaya?: string;
          commune?: string;
          deliveryNotes?: string;
          dietaryPreferences?: string[];
        }>(req);

        if (!body.contactName || !body.phone || !body.deliveryAddress) {
          sendJson(res, 400, {
            error: 'Validation Error',
            message: 'contactName, phone, and deliveryAddress are required.',
          });
          return;
        }

        const customer = janitouStore.createCustomer({
          companyName: body.companyName,
          contactName: body.contactName,
          phone: body.phone,
          email: body.email || '',
          deliveryAddress: body.deliveryAddress,
          wilaya: body.wilaya || 'Alger',
          commune: body.commune || 'Centre',
          deliveryNotes: body.deliveryNotes,
          dietaryPreferences: body.dietaryPreferences || ['Standard'],
        });

        sendJson(res, 201, { customer });
        return;
      }
    }

    // ----------------------------------------------------
    // Ingredients & Inventory API
    // ----------------------------------------------------
    if (pathname === '/api/v1/ingredients') {
      if (method === 'GET') {
        const ingredientsWithStatus = janitouStore.getIngredients().map((ing) => ({
          ...ing,
          isLowStock: ing.currentStock <= ing.minimumThreshold,
          stockDeficit: ing.currentStock <= ing.minimumThreshold ? ing.minimumThreshold - ing.currentStock : 0,
        }));
        sendJson(res, 200, { ingredients: ingredientsWithStatus });
        return;
      }
    }

    const ingredientStockMatch = pathname.match(/^\/api\/v1\/ingredients\/([^/]+)\/stock$/);
    if (ingredientStockMatch && method === 'PATCH') {
      const ingredientId = ingredientStockMatch[1];
      const body = await readJsonBody<{ currentStock: number }>(req);
      if (typeof body.currentStock !== 'number' || body.currentStock < 0) {
        sendJson(res, 400, { error: 'Validation Error', message: 'currentStock must be a positive number.' });
        return;
      }
      const updated = janitouStore.updateIngredientStock(ingredientId, body.currentStock);
      if (!updated) {
        sendJson(res, 404, { error: 'Not Found', message: `Ingredient ${ingredientId} not found.` });
        return;
      }
      sendJson(res, 200, { ingredient: updated });
      return;
    }

    // ----------------------------------------------------
    // Recipes API
    // ----------------------------------------------------
    if (pathname === '/api/v1/recipes') {
      if (method === 'GET') {
        const recipesWithCosts = janitouStore.getRecipes().map((rec) => {
          const costInfo = janitouStore.calculateRecipeCost(rec.id);
          return {
            ...rec,
            costPerPortion: costInfo.costPerPortion,
            ingredientsCostBreakdown: costInfo.breakdown,
          };
        });
        sendJson(res, 200, { recipes: recipesWithCosts });
        return;
      }
      if (method === 'POST') {
        const body = await readJsonBody<{
          name: string;
          category: ComponentCategory;
          description?: string;
          yieldPortions?: number;
          preparationTimeMinutes?: number;
          allergens?: string[];
          ingredients: { ingredientId: string; quantityPerPortion: number; unit: UnitOfMeasure }[];
        }>(req);

        if (!body.name || !body.category || !Array.isArray(body.ingredients)) {
          sendJson(res, 400, { error: 'Validation Error', message: 'name, category, and ingredients array are required.' });
          return;
        }

        const newRecipe = janitouStore.createRecipe({
          name: body.name,
          category: body.category,
          description: body.description || '',
          yieldPortions: body.yieldPortions || 1,
          preparationTimeMinutes: body.preparationTimeMinutes || 30,
          allergens: body.allergens || [],
          ingredients: body.ingredients,
        });

        sendJson(res, 201, { recipe: newRecipe });
        return;
      }
    }

    const recipeDetailMatch = pathname.match(/^\/api\/v1\/recipes\/([^/]+)$/);
    if (recipeDetailMatch && method === 'GET') {
      const recipeId = recipeDetailMatch[1];
      const recipe = janitouStore.getRecipeById(recipeId);
      if (!recipe) {
        sendJson(res, 404, { error: 'Not Found', message: `Recipe ${recipeId} not found.` });
        return;
      }
      const costInfo = janitouStore.calculateRecipeCost(recipeId);
      sendJson(res, 200, {
        recipe: {
          ...recipe,
          costPerPortion: costInfo.costPerPortion,
          ingredientsCostBreakdown: costInfo.breakdown,
        },
      });
      return;
    }

    const recipeSimMatch = pathname.match(/^\/api\/v1\/recipes\/([^/]+)\/pricing-simulation$/);
    if (recipeSimMatch && method === 'GET') {
      const recipeId = recipeSimMatch[1];
      const targetPct = searchParams.get('targetFoodCost') ? parseFloat(searchParams.get('targetFoodCost')!) : 30;
      const sim = janitouStore.simulateRecipePricing(recipeId, targetPct);
      if (!sim) {
        sendJson(res, 404, { error: 'Not Found', message: `Recipe ${recipeId} not found.` });
        return;
      }
      sendJson(res, 200, { simulation: sim });
      return;
    }

    if (pathname === '/api/v1/meal-plans/weekly' && method === 'GET') {
      const startDate = searchParams.get('startDate') || undefined;
      const weekly = janitouStore.getWeeklyMenuPlan(startDate);
      sendJson(res, 200, { weekly });
      return;
    }

    // ----------------------------------------------------
    // Meal Plans API
    // ----------------------------------------------------
    if (pathname === '/api/v1/meal-plans') {
      if (method === 'GET') {
        const date = searchParams.get('date') || undefined;
        sendJson(res, 200, { mealPlans: janitouStore.getMealPlans(date) });
        return;
      }
      if (method === 'POST') {
        const body = await readJsonBody<{
          date: string;
          serviceTime: MealServiceTime;
          starterRecipeId?: string;
          mainCourseRecipeId: string;
          sideDishRecipeId?: string;
          dessertRecipeId?: string;
          notes?: string;
        }>(req);

        if (!body.date || !body.serviceTime || !body.mainCourseRecipeId) {
          sendJson(res, 400, {
            error: 'Validation Error',
            message: 'date, serviceTime, and mainCourseRecipeId are required.',
          });
          return;
        }

        const mealPlan = janitouStore.createMealPlan(body);
        sendJson(res, 201, { mealPlan });
        return;
      }
    }

    // ----------------------------------------------------
    // Orders API
    // ----------------------------------------------------
    if (pathname === '/api/v1/orders') {
      if (method === 'GET') {
        const date = searchParams.get('date') || undefined;
        const serviceTime = (searchParams.get('serviceTime') as MealServiceTime) || undefined;
        const status = (searchParams.get('status') as OrderStatus) || undefined;

        const orders = janitouStore.getOrders({ date, serviceTime, status });
        sendJson(res, 200, { orders, total: orders.length });
        return;
      }
      if (method === 'POST') {
        const body = await readJsonBody<{
          customerId: string;
          deliveryDate: string;
          serviceTime: MealServiceTime;
          items: { recipeId: string; portions: number; specialNotes?: string }[];
          deliveryAddress?: string;
          notes?: string;
        }>(req);

        if (!body.customerId || !body.deliveryDate || !body.serviceTime || !Array.isArray(body.items) || body.items.length === 0) {
          sendJson(res, 400, {
            error: 'Validation Error',
            message: 'customerId, deliveryDate, serviceTime, and at least one item are required.',
          });
          return;
        }

        const newOrder = janitouStore.createOrder(body);
        sendJson(res, 201, { order: newOrder });
        return;
      }
    }

    const orderStatusMatch = pathname.match(/^\/api\/v1\/orders\/([^/]+)\/status$/);
    if (orderStatusMatch && method === 'PATCH') {
      const orderId = orderStatusMatch[1];
      const body = await readJsonBody<{ status: OrderStatus }>(req);
      if (!body.status || !Object.values(OrderStatus).includes(body.status)) {
        sendJson(res, 400, { error: 'Validation Error', message: `Invalid status: ${body.status}` });
        return;
      }
      const updatedOrder = janitouStore.updateOrderStatus(orderId, body.status);
      if (!updatedOrder) {
        sendJson(res, 404, { error: 'Not Found', message: `Order ${orderId} not found.` });
        return;
      }
      sendJson(res, 200, { order: updatedOrder });
      return;
    }

    // ----------------------------------------------------
    // CORE ENGINE: Production Planning & Ingredient Calculation
    // ----------------------------------------------------
    if (pathname === '/api/v1/production/plan') {
      if (method === 'GET') {
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
        const serviceTimeParam = searchParams.get('serviceTime');
        const serviceTime = serviceTimeParam ? (serviceTimeParam as MealServiceTime) : undefined;

        const plan = janitouStore.calculateProductionNeeds(date, serviceTime);
        sendJson(res, 200, { plan });
        return;
      }
    }

    if (pathname === '/api/v1/production/auto-purchase-orders' && method === 'POST') {
      const body = await readJsonBody<{ date: string; serviceTime?: MealServiceTime }>(req);
      if (!body.date) {
        sendJson(res, 400, { error: 'Validation Error', message: 'date is required.' });
        return;
      }
      const createdPOs = janitouStore.generatePurchaseOrdersFromDeficits(body.date, body.serviceTime);
      sendJson(res, 201, {
        message: `${createdPOs.length} purchase orders generated from calculated ingredient deficits.`,
        purchaseOrders: createdPOs,
      });
      return;
    }

    // ----------------------------------------------------
    // Purchasing Orders API
    // ----------------------------------------------------
    if (pathname === '/api/v1/purchasing/orders') {
      if (method === 'GET') {
        sendJson(res, 200, { purchaseOrders: janitouStore.getPurchaseOrders() });
        return;
      }
    }

    const receivePOMatch = pathname.match(/^\/api\/v1\/purchasing\/orders\/([^/]+)\/receive$/);
    if (receivePOMatch && method === 'POST') {
      const poId = receivePOMatch[1];
      const received = janitouStore.receivePurchaseOrder(poId);
      if (!received) {
        sendJson(res, 404, { error: 'Not Found', message: `Purchase order ${poId} not found.` });
        return;
      }
      sendJson(res, 200, {
        message: `Purchase order ${received.poNumber} received. Stock has been incremented.`,
        purchaseOrder: received,
      });
      return;
    }

    // ----------------------------------------------------
    // Logistics & Delivery Runs API
    // ----------------------------------------------------
    if (pathname === '/api/v1/delivery/runs') {
      if (method === 'GET') {
        const date = searchParams.get('date') || undefined;
        sendJson(res, 200, { deliveryRuns: janitouStore.getDeliveryRuns(date) });
        return;
      }
      if (method === 'POST') {
        const body = await readJsonBody<{
          runDate: string;
          serviceTime: MealServiceTime;
          driverName: string;
          driverPhone: string;
        }>(req);

        if (!body.runDate || !body.serviceTime || !body.driverName || !body.driverPhone) {
          sendJson(res, 400, {
            error: 'Validation Error',
            message: 'runDate, serviceTime, driverName, and driverPhone are required.',
          });
          return;
        }

        const run = janitouStore.createDeliveryRun(body);
        sendJson(res, 201, { deliveryRun: run });
        return;
      }
    }

    const deliveryStopMatch = pathname.match(/^\/api\/v1\/delivery\/runs\/([^/]+)\/stops\/([^/]+)$/);
    if (deliveryStopMatch && method === 'PATCH') {
      const [, runId, stopId] = deliveryStopMatch;
      const body = await readJsonBody<{ comment?: string }>(req);
      const updatedRun = janitouStore.markDeliveryStopCompleted(runId, stopId, body.comment);
      if (!updatedRun) {
        sendJson(res, 404, { error: 'Not Found', message: `Delivery run or stop not found.` });
        return;
      }
      sendJson(res, 200, { deliveryRun: updatedRun });
      return;
    }

    // ----------------------------------------------------
    // Packaging & Meal Box Labels API
    // ----------------------------------------------------
    if (pathname === '/api/v1/packaging/labels' && method === 'GET') {
      const date = searchParams.get('date');
      const orderId = searchParams.get('orderId');
      const labels = orderId
        ? janitouStore.generatePackagingLabels(orderId, true)
        : janitouStore.generatePackagingLabels(date || undefined, false);
      sendJson(res, 200, { labels, count: labels.length });
      return;
    }

    // ----------------------------------------------------
    // Financial & Operational Analytics API
    // ----------------------------------------------------
    if (pathname === '/api/v1/analytics/financials' && method === 'GET') {
      if (!checkRoleAccess(req, ['ADMIN', 'OPERATIONS_MANAGER'])) {
        sendJson(res, 403, { error: 'Forbidden', message: 'Accès interdit aux données financières pour ce profil.' });
        return;
      }
      const date = searchParams.get('date') || undefined;
      const analytics = janitouStore.getFinancialAnalytics(date);
      sendJson(res, 200, { analytics });
      return;
    }

    // ----------------------------------------------------
    // Data Exports (CSV) API
    // ----------------------------------------------------
    if (pathname === '/api/v1/export/production' && method === 'GET') {
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
      const serviceTime = (searchParams.get('serviceTime') as MealServiceTime) || undefined;
      const csvContent = janitouStore.exportProductionSheetCsv(date, serviceTime);
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="production-sheet-${date}.csv"`,
      });
      res.end(csvContent);
      return;
    }

    if (pathname === '/api/v1/export/delivery' && method === 'GET') {
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
      const serviceTime = (searchParams.get('serviceTime') as MealServiceTime) || undefined;
      const csvContent = janitouStore.exportDeliveryManifestCsv(date, serviceTime);
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="delivery-manifest-${date}.csv"`,
      });
      res.end(csvContent);
      return;
    }

    // ----------------------------------------------------
    // Customer Subscriptions API
    // ----------------------------------------------------
    if (pathname === '/api/v1/subscriptions') {
      if (method === 'GET') {
        sendJson(res, 200, { subscriptions: janitouStore.getSubscriptions() });
        return;
      }
      if (method === 'POST') {
        const body = await readJsonBody<{
          customerId: string;
          planName: string;
          serviceTimes: MealServiceTime[];
          dailyPortions: number;
          activeDays: string[];
          dietaryTags?: string[];
          preferredRecipeId?: string;
        }>(req);

        if (!body.customerId || !body.planName || !body.dailyPortions) {
          sendJson(res, 400, { error: 'Validation Error', message: 'customerId, planName, and dailyPortions are required.' });
          return;
        }

        const sub = janitouStore.createSubscription({
          customerId: body.customerId,
          planName: body.planName,
          serviceTimes: body.serviceTimes || [MealServiceTime.LUNCH],
          dailyPortions: body.dailyPortions,
          activeDays: body.activeDays || ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'],
          dietaryTags: body.dietaryTags || ['Standard'],
          status: 'ACTIVE',
          preferredRecipeId: body.preferredRecipeId,
        });

        sendJson(res, 201, { subscription: sub });
        return;
      }
    }

    if (pathname === '/api/v1/subscriptions/generate-orders' && method === 'POST') {
      const body = await readJsonBody<{ date?: string }>(req);
      const targetDate = body.date || new Date().toLocaleDateString('en-CA');
      const generatedOrders = janitouStore.generateOrdersFromSubscriptions(targetDate);
      sendJson(res, 201, {
        message: `${generatedOrders.length} orders generated from active subscriptions for ${targetDate}.`,
        orders: generatedOrders,
      });
      return;
    }

    // ----------------------------------------------------
    // Kitchen Display System (KDS) Batches API
    // ----------------------------------------------------
    if (pathname === '/api/v1/kds/batches' && method === 'GET') {
      const date = searchParams.get('date') || undefined;
      const batches = janitouStore.getKdsBatches(date);
      sendJson(res, 200, { batches });
      return;
    }

    const kdsStageMatch = pathname.match(/^\/api\/v1\/kds\/batches\/([^/]+)\/stage$/);
    if (kdsStageMatch && method === 'PATCH') {
      const batchId = kdsStageMatch[1];
      const body = await readJsonBody<{ stage: 'TO_PREPARE' | 'COOKING' | 'PACKAGING' | 'READY' }>(req);
      const updated = janitouStore.updateKdsBatchStage(batchId, body.stage);
      if (!updated) {
        sendJson(res, 404, { error: 'Not Found', message: `Batch ${batchId} not found.` });
        return;
      }
      sendJson(res, 200, { batch: updated });
      return;
    }

    // ----------------------------------------------------
    // Phase 1: Menu Calendar Rules Validation API
    // ----------------------------------------------------
    if (pathname === '/api/v1/meal-plans/validate-rules' && method === 'GET') {
      const validation = janitouStore.validateMenuCalendarRules();
      sendJson(res, 200, validation);
      return;
    }

    // ----------------------------------------------------
    // Phase 1: Accounting & Pre-paid Invoicing API
    // ----------------------------------------------------
    if (pathname === '/api/v1/accounting/invoices' && method === 'GET') {
      const customerId = searchParams.get('customerId') || undefined;
      sendJson(res, 200, { invoices: janitouStore.getInvoices(customerId) });
      return;
    }

    if (pathname === '/api/v1/accounting/payments') {
      if (method === 'GET') {
        const customerId = searchParams.get('customerId') || undefined;
        sendJson(res, 200, { payments: janitouStore.getPayments(customerId) });
        return;
      }
      if (method === 'POST') {
        const body = await readJsonBody<{
          customerId: string;
          amount: number;
          paymentMethod: 'CASH' | 'CHECK' | 'BANK_TRANSFER' | 'PREPAID_CREDIT';
          invoiceId?: string;
          notes?: string;
        }>(req);

        if (!body.customerId || typeof body.amount !== 'number' || body.amount <= 0 || !body.paymentMethod) {
          sendJson(res, 400, { error: 'Validation Error', message: 'customerId, positive amount, and paymentMethod are required.' });
          return;
        }

        const payment = janitouStore.recordPayment(body);
        sendJson(res, 201, { payment });
        return;
      }
    }

    const statementMatch = pathname.match(/^\/api\/v1\/accounting\/statements\/([^/]+)$/);
    if (statementMatch && method === 'GET') {
      const customerId = statementMatch[1];
      const statement = janitouStore.getCustomerStatement(customerId);
      if (!statement.customer) {
        sendJson(res, 404, { error: 'Not Found', message: `Customer ${customerId} not found.` });
        return;
      }
      sendJson(res, 200, { statement });
      return;
    }

    // ----------------------------------------------------
    // Phase 1: Driver Remuneration & Transfer API
    // ----------------------------------------------------
    const driverCompensationMatch = pathname.match(/^\/api\/v1\/delivery\/runs\/([^/]+)\/compensation$/);
    if (driverCompensationMatch && method === 'GET') {
      const runId = driverCompensationMatch[1];
      const comp = janitouStore.calculateDriverCompensation(runId);
      sendJson(res, 200, { compensation: comp });
      return;
    }

    const transferRunMatch = pathname.match(/^\/api\/v1\/delivery\/runs\/([^/]+)\/transfer$/);
    if (transferRunMatch && method === 'POST') {
      const runId = transferRunMatch[1];
      const body = await readJsonBody<{ newDriverName: string; newDriverPhone: string; reason: string }>(req);
      if (!body.newDriverName || !body.newDriverPhone) {
        sendJson(res, 400, { error: 'Validation Error', message: 'newDriverName and newDriverPhone are required.' });
        return;
      }
      const transferred = janitouStore.transferDeliveryRun(runId, body.newDriverName, body.newDriverPhone, body.reason || 'Indisponibilité chauffeur');
      if (!transferred) {
        sendJson(res, 404, { error: 'Not Found', message: `Run ${runId} not found.` });
        return;
      }
      sendJson(res, 200, { run: transferred, message: `Tournée transférée avec succès à ${body.newDriverName}.` });
      return;
    }

    // ----------------------------------------------------
    // Phase 1: Audit Log API
    // ----------------------------------------------------
    if (pathname === '/api/v1/audit/logs' && method === 'GET') {
      const entityType = searchParams.get('entityType') || undefined;
      const action = searchParams.get('action') || undefined;
      const logs = janitouStore.getAuditLogs({ entityType, action });
      sendJson(res, 200, { logs, count: logs.length });
      return;
    }

    // ----------------------------------------------------
    // Phase 1: Emergency Workshop Package & Backup/Restore
    // ----------------------------------------------------
    if (pathname === '/api/v1/emergency/workshop-package' && method === 'GET') {
      const date = searchParams.get('date') || undefined;
      const emergencyPkg = janitouStore.generateEmergencyWorkshopPackage(date);
      sendJson(res, 200, { emergencyPackage: emergencyPkg });
      return;
    }

    if (pathname === '/api/v1/system/backup' && method === 'GET') {
      if (!checkRoleAccess(req, ['ADMIN', 'OPERATIONS_MANAGER'])) {
        sendJson(res, 403, { error: 'Forbidden', message: 'Opération réservée aux administrateurs.' });
        return;
      }
      const backup = janitouStore.createDatabaseBackup();
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="janitou-backup-${new Date().toLocaleDateString('en-CA')}.json"`,
      });
      res.end(JSON.stringify(backup, null, 2));
      return;
    }

    if (pathname === '/api/v1/system/restore' && method === 'POST') {
      const body = await readJsonBody<{ data: Record<string, unknown> }>(req);
      const ok = janitouStore.restoreDatabaseFromBackup(body);
      if (!ok) {
        sendJson(res, 400, { error: 'Restore Error', message: 'Format de sauvegarde invalide.' });
        return;
      }
      sendJson(res, 200, { message: 'Restauration complète de la base effectuée avec succès.' });
      return;
    }

    // ----------------------------------------------------
    // Phase 1: Les 14 Rapports Officiels Hub API
    // ----------------------------------------------------
    if (pathname === '/api/v1/reports' && method === 'GET') {
      const reportsCatalog = [
        { id: 1, title: 'Commandes' },
        { id: 2, title: 'Production (prévu/réel, surplus/pénuries)' },
        { id: 3, title: 'Achats & réceptions' },
        { id: 4, title: 'Suppléments' },
        { id: 5, title: 'Emballage (individuel & collectif)' },
        { id: 6, title: 'Distribution & tournées' },
        { id: 7, title: 'Comptes clients & soldes' },
        { id: 8, title: 'Clients & Hiérarchie sociétés/filiales' },
        { id: 9, title: 'Statistiques consommation' },
        { id: 10, title: 'Performance globale' },
        { id: 11, title: 'Journal d’audit' },
        { id: 12, title: 'Paiements & Reçus' },
        { id: 13, title: 'Alternatives & Régimes spéciaux' },
        { id: 14, title: 'Synthèse hebdomadaire 360°' },
      ];
      sendJson(res, 200, { reports: reportsCatalog });
      return;
    }

    const reportDetailMatch = pathname.match(/^\/api\/v1\/reports\/([0-9]+)$/);
    if (reportDetailMatch && method === 'GET') {
      const reportId = parseInt(reportDetailMatch[1], 10);
      const date = searchParams.get('date') || undefined;
      const result = janitouStore.generateReport(reportId, date);
      sendJson(res, 200, { report: result });
      return;
    }

    // Default 404
    sendJson(res, 404, {
      error: 'Not Found',
      message: `Cannot ${method} ${pathname}`,
    });
  } catch (error: unknown) {
    console.error('[API Router Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    sendJson(res, 500, {
      error: 'Internal Server Error',
      message: errorMessage,
    });
  }
}
