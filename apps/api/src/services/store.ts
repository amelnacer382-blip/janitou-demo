import {
  MealServiceTime,
  OrderStatus,
  ComponentCategory,
  UnitOfMeasure,
} from '@janitou/common';
import {
  DbSupplier,
  DbIngredient,
  DbRecipe,
  DbCustomer,
  DbMealPlan,
  DbOrder,
  DbOrderItem,
  DbProductionBatch,
  DbPurchaseOrder,
  DbDeliveryRun,
  DbInvoice,
  DbPayment,
  initialSuppliers,
  initialIngredients,
  initialRecipes,
  initialCustomers,
  initialMealPlans,
  initialOrders,
  initialInvoices,
  initialPayments,
} from '../data/mock-db.js';

export interface ProductionRequirement {
  recipeId: string;
  recipeName: string;
  category: ComponentCategory;
  totalPortions: number;
  ordersCount: number;
}

export interface IngredientRequirement {
  ingredientId: string;
  ingredientName: string;
  unit: UnitOfMeasure;
  currentStock: number;
  quantityRequired: number;
  stockAfterProduction: number;
  deficit: number;
  unitCost: number;
  totalDeficitCost: number;
  supplierId: string;
  supplierName: string;
}

export interface ProductionPlanSummary {
  date: string;
  serviceTime?: MealServiceTime;
  totalOrders: number;
  totalMealPortions: number;
  recipes: ProductionRequirement[];
  ingredientRequirements: IngredientRequirement[];
  totalEstimatedCost: number;
  deficitCost: number;
  hasDeficit: boolean;
}

export interface MealBoxLabel {
  labelId: string;
  orderNumber: string;
  customerName: string;
  companyName?: string;
  deliveryAddress: string;
  recipeName: string;
  category: ComponentCategory;
  serviceTime: MealServiceTime;
  deliveryDate: string;
  portionIndex: string;
  allergens: string[];
  heatingInstructions: string;
  storageInstructions: string;
  barcode: string;
}

export interface FinancialAnalytics {
  date?: string;
  totalRevenue: number;
  totalFoodCost: number;
  grossMargin: number;
  foodCostPercentage: number;
  grossMarginPercentage: number;
  totalPortions: number;
  averageMealPrice: number;
  topRecipes: { name: string; portions: number; foodCost: number; revenue: number }[];
}

export interface PricingSimulation {
  recipeId: string;
  recipeName: string;
  foodCostPerPortion: number;
  targetFoodCostPercentage: number;
  recommendedSellingPrice: number;
  projectedGrossMargin: number;
  projectedMarginPercentage: number;
}

export interface WeeklyDayPlan {
  date: string;
  dayName: string;
  lunch?: DbMealPlan;
  dinner?: DbMealPlan;
  starterName?: string;
  mainName?: string;
  dessertName?: string;
  dinnerMainName?: string;
}

export interface CustomerSubscription {
  id: string;
  customerId: string;
  planName: string;
  serviceTimes: MealServiceTime[];
  dailyPortions: number;
  activeDays: string[]; // e.g. ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
  dietaryTags: string[];
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  preferredRecipeId?: string;
}

export interface KdsBatch {
  id: string;
  recipeId: string;
  recipeName: string;
  category: ComponentCategory;
  portions: number;
  serviceTime: MealServiceTime;
  date: string;
  station: 'CHAUD' | 'FROID' | 'PATISSERIE' | 'CONDITIONNEMENT';
  stage: 'TO_PREPARE' | 'COOKING' | 'PACKAGING' | 'READY';
  updatedAt: string;
}

export interface MenuRuleViolation {
  date: string;
  ruleName: string;
  severity: 'ERROR' | 'WARNING';
  message: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
}

export interface EmergencyWorkshopPackage {
  date: string;
  generatedAt: string;
  totalMealPortions: number;
  recipes: { recipeName: string; category: string; portions: number }[];
  packagingRequirements: { type: string; quantity: number }[];
  alternatives: { customerName: string; address: string; requestedAlternative: string }[];
  allergensSummary: { allergen: string; portionCount: number }[];
}

export interface OfficialReportResult {
  reportNumber: number;
  title: string;
  generatedAt: string;
  summaryText: string;
  data: unknown;
}

export class JanitouStore {
  public suppliers: DbSupplier[] = [];
  public ingredients: DbIngredient[] = [];
  public recipes: DbRecipe[] = [];
  public customers: DbCustomer[] = [];
  public mealPlans: DbMealPlan[] = [];
  public orders: DbOrder[] = [];
  public productionBatches: DbProductionBatch[] = [];
  public purchaseOrders: DbPurchaseOrder[] = [];
  public deliveryRuns: DbDeliveryRun[] = [];
  public subscriptions: CustomerSubscription[] = [];
  public kdsBatches: KdsBatch[] = [];
  public invoices: DbInvoice[] = [];
  public payments: DbPayment[] = [];
  public auditLogs: AuditLogEntry[] = [];

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.suppliers = JSON.parse(JSON.stringify(initialSuppliers));
    this.ingredients = JSON.parse(JSON.stringify(initialIngredients));
    this.recipes = JSON.parse(JSON.stringify(initialRecipes));
    this.customers = JSON.parse(JSON.stringify(initialCustomers));
    this.mealPlans = JSON.parse(JSON.stringify(initialMealPlans));
    this.orders = JSON.parse(JSON.stringify(initialOrders));
    this.productionBatches = [];
    this.purchaseOrders = [];
    this.deliveryRuns = [];
    this.subscriptions = [
      {
        id: 'sub-1',
        customerId: 'cust-1',
        planName: 'Formule Déjeuner Santé Entreprise (5J/Semaine)',
        serviceTimes: [MealServiceTime.LUNCH],
        dailyPortions: 6,
        activeDays: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
        dietaryTags: ['Équilibré', 'Sans Porc'],
        status: 'ACTIVE',
      },
      {
        id: 'sub-2',
        customerId: 'cust-2',
        planName: 'Pack Repas Équipe Tech (Midi)',
        serviceTimes: [MealServiceTime.LUNCH],
        dailyPortions: 14,
        activeDays: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'],
        dietaryTags: ['Standard'],
        status: 'ACTIVE',
      },
    ];
    this.kdsBatches = [];
    this.invoices = JSON.parse(JSON.stringify(initialInvoices));
    this.payments = JSON.parse(JSON.stringify(initialPayments));
    this.auditLogs = [];
  }

  // ==========================================
  // Customers
  // ==========================================
  public getCustomers(): DbCustomer[] {
    return this.customers;
  }

  public getCustomerById(id: string): DbCustomer | undefined {
    return this.customers.find((c) => c.id === id);
  }

  public createCustomer(data: Omit<DbCustomer, 'id'>): DbCustomer {
    const customer: DbCustomer = {
      ...data,
      id: `cust-${Date.now()}`,
    };
    this.customers.push(customer);
    return customer;
  }

  // ==========================================
  // Suppliers & Ingredients
  // ==========================================
  public getSuppliers(): DbSupplier[] {
    return this.suppliers;
  }

  public getIngredients(): DbIngredient[] {
    return this.ingredients;
  }

  public getIngredientById(id: string): DbIngredient | undefined {
    return this.ingredients.find((i) => i.id === id);
  }

  public updateIngredientStock(id: string, newStock: number): DbIngredient | undefined {
    const ingredient = this.getIngredientById(id);
    if (ingredient) {
      ingredient.currentStock = Math.max(0, newStock);
    }
    return ingredient;
  }

  // ==========================================
  // Recipes
  // ==========================================
  public getRecipes(): DbRecipe[] {
    return this.recipes;
  }

  public getRecipeById(id: string): DbRecipe | undefined {
    return this.recipes.find((r) => r.id === id);
  }

  public calculateRecipeCost(recipeId: string): { costPerPortion: number; breakdown: { ingredientName: string; cost: number }[] } {
    const recipe = this.getRecipeById(recipeId);
    if (!recipe) return { costPerPortion: 0, breakdown: [] };

    let totalCost = 0;
    const breakdown = recipe.ingredients.map((item) => {
      const ing = this.getIngredientById(item.ingredientId);
      const unitCost = ing ? ing.unitCost : 0;
      const itemCost = item.quantityPerPortion * unitCost;
      totalCost += itemCost;
      return {
        ingredientName: ing ? ing.name : 'Inconnu',
        cost: Math.round(itemCost * 100) / 100,
      };
    });

    return {
      costPerPortion: Math.round(totalCost * 100) / 100,
      breakdown,
    };
  }

  public createRecipe(data: Omit<DbRecipe, 'id'>): DbRecipe {
    const recipe: DbRecipe = {
      ...data,
      id: `rec-${Date.now()}`,
    };
    this.recipes.push(recipe);
    return recipe;
  }

  public simulateRecipePricing(recipeId: string, targetFoodCostPercentage: number): PricingSimulation | undefined {
    const recipe = this.getRecipeById(recipeId);
    if (!recipe) return undefined;

    const costInfo = this.calculateRecipeCost(recipeId);
    const foodCost = costInfo.costPerPortion;
    const validTargetPct = Math.max(10, Math.min(90, targetFoodCostPercentage || 30));
    const recommendedPrice = Math.round(foodCost / (validTargetPct / 100));
    const grossMargin = recommendedPrice - foodCost;

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      foodCostPerPortion: foodCost,
      targetFoodCostPercentage: validTargetPct,
      recommendedSellingPrice: recommendedPrice,
      projectedGrossMargin: grossMargin,
      projectedMarginPercentage: Math.round((grossMargin / recommendedPrice) * 1000) / 10,
    };
  }

  // ==========================================
  // Meal Plans
  // ==========================================
  public getMealPlans(date?: string): DbMealPlan[] {
    if (date) {
      return this.mealPlans.filter((mp) => mp.date === date);
    }
    return this.mealPlans;
  }

  public createMealPlan(data: Omit<DbMealPlan, 'id'>): DbMealPlan {
    const existingIndex = this.mealPlans.findIndex(
      (mp) => mp.date === data.date && mp.serviceTime === data.serviceTime
    );
    const newPlan: DbMealPlan = {
      ...data,
      id: `mp-${Date.now()}`,
    };
    if (existingIndex >= 0) {
      this.mealPlans[existingIndex] = newPlan;
    } else {
      this.mealPlans.push(newPlan);
    }
    return newPlan;
  }

  public getWeeklyMenuPlan(startDateStr?: string): WeeklyDayPlan[] {
    const baseDate = startDateStr ? new Date(startDateStr) : new Date();
    const days: WeeklyDayPlan[] = [];
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const dateStr = d.toLocaleDateString('en-CA');
      const dayName = dayNames[d.getDay()];

      const lunch = this.mealPlans.find((m) => m.date === dateStr && m.serviceTime === MealServiceTime.LUNCH);
      const dinner = this.mealPlans.find((m) => m.date === dateStr && m.serviceTime === MealServiceTime.DINNER);

      const starter = lunch?.starterRecipeId ? this.getRecipeById(lunch.starterRecipeId) : undefined;
      const main = lunch?.mainCourseRecipeId ? this.getRecipeById(lunch.mainCourseRecipeId) : undefined;
      const dessert = lunch?.dessertRecipeId ? this.getRecipeById(lunch.dessertRecipeId) : undefined;
      const dinnerMain = dinner?.mainCourseRecipeId ? this.getRecipeById(dinner.mainCourseRecipeId) : undefined;

      days.push({
        date: dateStr,
        dayName,
        lunch,
        dinner,
        starterName: starter?.name,
        mainName: main?.name,
        dessertName: dessert?.name,
        dinnerMainName: dinnerMain?.name,
      });
    }

    return days;
  }

  // ==========================================
  // Orders
  // ==========================================
  public getOrders(filters?: { date?: string; serviceTime?: MealServiceTime; status?: OrderStatus }): DbOrder[] {
    let result = [...this.orders];
    if (filters?.date) {
      result = result.filter((o) => o.deliveryDate === filters.date);
    }
    if (filters?.serviceTime) {
      result = result.filter((o) => o.serviceTime === filters.serviceTime);
    }
    if (filters?.status) {
      result = result.filter((o) => o.status === filters.status);
    }
    return result;
  }

  public getOrderById(id: string): DbOrder | undefined {
    return this.orders.find((o) => o.id === id);
  }

  public createOrder(data: {
    customerId: string;
    deliveryDate: string;
    serviceTime: MealServiceTime;
    items: { recipeId: string; portions: number; specialNotes?: string }[];
    deliveryAddress?: string;
    notes?: string;
  }): DbOrder {
    const customer = this.getCustomerById(data.customerId);
    const totalPortions = data.items.reduce((sum, item) => sum + item.portions, 0);
    const orderNumber = `JNT-${data.deliveryDate.replace(/-/g, '')}-${String(this.orders.length + 1).padStart(3, '0')}`;

    const newOrder: DbOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerId: data.customerId,
      deliveryDate: data.deliveryDate,
      serviceTime: data.serviceTime,
      status: OrderStatus.CONFIRMED,
      totalPortions,
      deliveryAddress: data.deliveryAddress || (customer ? customer.deliveryAddress : ''),
      notes: data.notes,
      items: data.items.map((it, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        recipeId: it.recipeId,
        portions: it.portions,
        specialNotes: it.specialNotes,
      })),
      createdAt: new Date().toISOString(),
    };

    this.orders.unshift(newOrder);
    return newOrder;
  }

  public updateOrderStatus(id: string, status: OrderStatus): DbOrder | undefined {
    const order = this.getOrderById(id);
    if (order) {
      order.status = status;
    }
    return order;
  }

  // ==========================================
  // CORE ENGINE: Production & Ingredient Explosion
  // ==========================================
  public calculateProductionNeeds(date?: string, serviceTime?: MealServiceTime): ProductionPlanSummary {
    const targetDate = date || new Date().toLocaleDateString('en-CA');
    let relevantOrders = this.orders.filter(
      (o) =>
        o.deliveryDate === targetDate &&
        (serviceTime ? o.serviceTime === serviceTime : true) &&
        o.status !== OrderStatus.CANCELLED
    );
    if (relevantOrders.length === 0 && !date) {
      relevantOrders = this.orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    }

    const recipeMap = new Map<string, { portions: number; ordersCount: number }>();

    for (const order of relevantOrders) {
      for (const item of order.items) {
        const current = recipeMap.get(item.recipeId) || { portions: 0, ordersCount: 0 };
        current.portions += item.portions;
        current.ordersCount += 1;
        recipeMap.set(item.recipeId, current);
      }
    }

    const recipes: ProductionRequirement[] = [];
    const ingredientNeedsMap = new Map<string, number>();

    for (const [recipeId, stats] of recipeMap.entries()) {
      const recipe = this.getRecipeById(recipeId);
      if (!recipe) continue;

      recipes.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        category: recipe.category,
        totalPortions: stats.portions,
        ordersCount: stats.ordersCount,
      });

      // Explode recipe into raw ingredients
      for (const item of recipe.ingredients) {
        const needed = item.quantityPerPortion * stats.portions;
        const currentTotal = ingredientNeedsMap.get(item.ingredientId) || 0;
        ingredientNeedsMap.set(item.ingredientId, currentTotal + needed);
      }
    }

    let totalEstimatedCost = 0;
    let deficitCost = 0;
    const ingredientRequirements: IngredientRequirement[] = [];

    for (const [ingredientId, neededQty] of ingredientNeedsMap.entries()) {
      const ing = this.getIngredientById(ingredientId);
      if (!ing) continue;

      const roundedNeeded = Math.round(neededQty * 1000) / 1000;
      const stockAfter = Math.round((ing.currentStock - roundedNeeded) * 1000) / 1000;
      const deficit = stockAfter < 0 ? Math.abs(stockAfter) : 0;
      const lineCost = Math.round(roundedNeeded * ing.unitCost);
      const lineDeficitCost = Math.round(deficit * ing.unitCost);

      totalEstimatedCost += lineCost;
      deficitCost += lineDeficitCost;

      const supplier = this.suppliers.find((s) => s.id === ing.supplierId);

      ingredientRequirements.push({
        ingredientId: ing.id,
        ingredientName: ing.name,
        unit: ing.unit,
        currentStock: ing.currentStock,
        quantityRequired: roundedNeeded,
        stockAfterProduction: stockAfter,
        deficit,
        unitCost: ing.unitCost,
        totalDeficitCost: lineDeficitCost,
        supplierId: ing.supplierId,
        supplierName: supplier ? supplier.name : 'Fournisseur non assigné',
      });
    }

    const totalMealPortions = recipes.reduce((sum, r) => sum + r.totalPortions, 0);

    return {
      date,
      serviceTime,
      totalOrders: relevantOrders.length,
      totalMealPortions,
      recipes,
      ingredientRequirements,
      totalEstimatedCost,
      deficitCost,
      hasDeficit: deficitCost > 0,
    };
  }

  // ==========================================
  // Purchasing & Inventory Automation
  // ==========================================
  public generatePurchaseOrdersFromDeficits(date: string, serviceTime?: MealServiceTime): DbPurchaseOrder[] {
    const plan = this.calculateProductionNeeds(date, serviceTime);
    const deficitsBySupplier = new Map<string, { ingredientId: string; quantity: number; unitCost: number }[]>();

    for (const req of plan.ingredientRequirements) {
      if (req.deficit > 0) {
        const list = deficitsBySupplier.get(req.supplierId) || [];
        list.push({
          ingredientId: req.ingredientId,
          quantity: req.deficit,
          unitCost: req.unitCost,
        });
        deficitsBySupplier.set(req.supplierId, list);
      }
    }

    const createdPOs: DbPurchaseOrder[] = [];

    for (const [supplierId, items] of deficitsBySupplier.entries()) {
      const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
      const poNumber = `PO-${date.replace(/-/g, '')}-${String(this.purchaseOrders.length + 1).padStart(3, '0')}`;

      const po: DbPurchaseOrder = {
        id: `po-${Date.now()}-${supplierId}`,
        poNumber,
        supplierId,
        orderDate: new Date().toISOString().split('T')[0],
        status: 'SENT',
        totalCost: Math.round(totalCost),
        items,
        notes: `Commande automatique de réapprovisionnement pour la production du ${date}`,
      };

      this.purchaseOrders.push(po);
      createdPOs.push(po);
    }

    return createdPOs;
  }

  public getPurchaseOrders(): DbPurchaseOrder[] {
    return this.purchaseOrders;
  }

  public receivePurchaseOrder(poId: string): DbPurchaseOrder | undefined {
    const po = this.purchaseOrders.find((p) => p.id === poId);
    if (!po || po.status === 'RECEIVED') return po;

    // Increment inventory stock
    for (const item of po.items) {
      const ing = this.getIngredientById(item.ingredientId);
      if (ing) {
        ing.currentStock = Math.round((ing.currentStock + item.quantity) * 1000) / 1000;
      }
    }

    po.status = 'RECEIVED';
    return po;
  }

  // ==========================================
  // Logistics & Delivery Runs
  // ==========================================
  public getDeliveryRuns(date?: string): DbDeliveryRun[] {
    if (date) {
      return this.deliveryRuns.filter((r) => r.runDate === date);
    }
    return this.deliveryRuns;
  }

  public createDeliveryRun(data: {
    runDate: string;
    serviceTime: MealServiceTime;
    driverName: string;
    driverPhone: string;
  }): DbDeliveryRun {
    const relevantOrders = this.orders.filter(
      (o) =>
        o.deliveryDate === data.runDate &&
        o.serviceTime === data.serviceTime &&
        o.status !== OrderStatus.CANCELLED
    );

    const stops: DbDeliveryStop[] = relevantOrders.map((ord, idx) => ({
      id: `stop-${Date.now()}-${idx}`,
      orderId: ord.id,
      sequence: idx + 1,
      deliveryStatus: 'PENDING',
    }));

    const run: DbDeliveryRun = {
      id: `run-${Date.now()}`,
      runDate: data.runDate,
      serviceTime: data.serviceTime,
      driverName: data.driverName,
      driverPhone: data.driverPhone,
      status: 'PLANNED',
      stops,
    };

    this.deliveryRuns.push(run);
    return run;
  }

  public markDeliveryStopCompleted(runId: string, stopId: string, comment?: string): DbDeliveryRun | undefined {
    const run = this.deliveryRuns.find((r) => r.id === runId);
    if (!run) return undefined;

    const stop = run.stops.find((s) => s.id === stopId);
    if (stop) {
      stop.deliveryStatus = 'DELIVERED';
      stop.deliveredAt = new Date().toISOString();
      if (comment) stop.driverComment = comment;

      // Update associated order status
      this.updateOrderStatus(stop.orderId, OrderStatus.DELIVERED);
    }

    const allDelivered = run.stops.every((s) => s.deliveryStatus === 'DELIVERED');
    if (allDelivered) {
      run.status = 'COMPLETED';
    }

    return run;
  }

  // ==========================================
  // Packaging & Meal Box Label Generator
  // ==========================================
  public generatePackagingLabels(target?: string, isOrderId = false): MealBoxLabel[] {
    const effectiveTarget = target || new Date().toLocaleDateString('en-CA');
    let ordersToProcess = isOrderId
      ? this.orders.filter((o) => o.id === effectiveTarget)
      : this.orders.filter((o) => o.deliveryDate === effectiveTarget && o.status !== OrderStatus.CANCELLED);

    if (ordersToProcess.length === 0 && !isOrderId) {
      ordersToProcess = this.orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    }
    const labels: MealBoxLabel[] = [];

    for (const order of ordersToProcess) {
      const customer = this.getCustomerById(order.customerId);
      const customerName = customer ? customer.contactName : 'Client';
      const companyName = customer?.companyName;
      const address = order.deliveryAddress;

      let totalBoxCount = 0;
      for (const item of order.items) {
        totalBoxCount += item.portions;
      }

      let currentBox = 1;
      for (const item of order.items) {
        const recipe = this.getRecipeById(item.recipeId);
        if (!recipe) continue;

        const heatingInstructions =
          recipe.category === ComponentCategory.MAIN_COURSE
            ? 'Réchauffer 2 min 30 au micro-ondes à 750W (retirer le couvercle transparent).'
            : recipe.category === ComponentCategory.STARTER
            ? 'Prêt à consommer frais. Conserver entre 2°C et 4°C.'
            : 'Dessert artisanal prêt à déguster.';

        for (let p = 1; p <= item.portions; p++) {
          labels.push({
            labelId: `LBL-${order.orderNumber.replace(/[^0-9]/g, '')}-${currentBox}`,
            orderNumber: order.orderNumber,
            customerName,
            companyName,
            deliveryAddress: address,
            recipeName: recipe.name,
            category: recipe.category,
            serviceTime: order.serviceTime,
            deliveryDate: order.deliveryDate,
            portionIndex: `Colis ${currentBox} / ${totalBoxCount}`,
            allergens: recipe.allergens.length > 0 ? recipe.allergens : ['Aucun allergène majeur'],
            heatingInstructions,
            storageInstructions: 'Conserver entre 0°C et +3°C. À consommer dans les 24h.',
            barcode: `*${order.orderNumber}-${currentBox}*`,
          });
          currentBox++;
        }
      }
    }

    return labels;
  }

  // ==========================================
  // Financial & Food Cost Analytics
  // ==========================================
  public getFinancialAnalytics(date?: string): FinancialAnalytics {
    const ordersToAnalyze = date
      ? this.orders.filter((o) => o.deliveryDate === date && o.status !== OrderStatus.CANCELLED)
      : this.orders.filter((o) => o.status !== OrderStatus.CANCELLED);

    let totalRevenue = 0;
    let totalFoodCost = 0;
    let totalPortions = 0;
    const recipeStats = new Map<string, { portions: number; foodCost: number; revenue: number }>();

    for (const order of ordersToAnalyze) {
      const unitPrice = order.serviceTime === MealServiceTime.LUNCH ? 650 : 850;
      for (const item of order.items) {
        const recipe = this.getRecipeById(item.recipeId);
        if (!recipe) continue;

        const costInfo = this.calculateRecipeCost(recipe.id);
        const itemFoodCost = Math.round(costInfo.costPerPortion * item.portions);
        const itemRevenue = item.portions * unitPrice;

        totalFoodCost += itemFoodCost;
        totalRevenue += itemRevenue;
        totalPortions += item.portions;

        const current = recipeStats.get(recipe.name) || { portions: 0, foodCost: 0, revenue: 0 };
        current.portions += item.portions;
        current.foodCost += itemFoodCost;
        current.revenue += itemRevenue;
        recipeStats.set(recipe.name, current);
      }
    }

    const grossMargin = totalRevenue - totalFoodCost;
    const foodCostPercentage = totalRevenue > 0 ? Math.round((totalFoodCost / totalRevenue) * 1000) / 10 : 0;
    const grossMarginPercentage = totalRevenue > 0 ? Math.round((grossMargin / totalRevenue) * 1000) / 10 : 0;
    const averageMealPrice = totalPortions > 0 ? Math.round(totalRevenue / totalPortions) : 0;

    const topRecipes = Array.from(recipeStats.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.portions - a.portions);

    return {
      date,
      totalRevenue,
      totalFoodCost,
      grossMargin,
      foodCostPercentage,
      grossMarginPercentage,
      totalPortions,
      averageMealPrice,
      topRecipes,
    };
  }

  // ==========================================
  // CSV Data Exports (Kitchen & Delivery)
  // ==========================================
  public exportProductionSheetCsv(date: string, serviceTime?: MealServiceTime): string {
    const plan = this.calculateProductionNeeds(date, serviceTime);
    const lines: string[] = [];
    lines.push('SECTION: RECETTES À PRODUIRE');
    lines.push('Recette,Categorie,Portions,Nombre de Commandes');
    for (const r of plan.recipes) {
      lines.push(`"${r.recipeName}","${r.category}",${r.totalPortions},${r.ordersCount}`);
    }
    lines.push('');
    lines.push('SECTION: INGRÉDIENTS NÉCESSAIRES');
    lines.push('Ingrédient,Unité,Quantité Requise,Stock Actuel,Stock Après Prod,Déficit,Fournisseur');
    for (const ing of plan.ingredientRequirements) {
      lines.push(`"${ing.ingredientName}","${ing.unit}",${ing.quantityRequired},${ing.currentStock},${ing.stockAfterProduction},${ing.deficit},"${ing.supplierName}"`);
    }
    return lines.join('\n');
  }

  public exportDeliveryManifestCsv(date: string, serviceTime?: MealServiceTime): string {
    const runs = this.getDeliveryRuns(date);
    const lines: string[] = [];
    lines.push('Date,Service,Livreur,Téléphone Livreur,Arrêt,N° Commande,Client,Adresse,Statut Livraison');

    for (const run of runs) {
      if (serviceTime && run.serviceTime !== serviceTime) continue;
      for (const stop of run.stops) {
        const order = this.getOrderById(stop.orderId);
        const customer = order ? this.getCustomerById(order.customerId) : undefined;
        const clientName = customer ? (customer.companyName || customer.contactName) : 'Inconnu';
        const address = order ? order.deliveryAddress : '';
        lines.push(`"${run.runDate}","${run.serviceTime}","${run.driverName}","${run.driverPhone}",${stop.sequence},"${order?.orderNumber || stop.orderId}","${clientName}","${address}","${stop.deliveryStatus}"`);
      }
    }
    return lines.join('\n');
  }

  // ==========================================
  // Customer Subscriptions Engine
  // ==========================================
  public getSubscriptions(): CustomerSubscription[] {
    return this.subscriptions;
  }

  public createSubscription(data: Omit<CustomerSubscription, 'id'>): CustomerSubscription {
    const sub: CustomerSubscription = {
      ...data,
      id: `sub-${Date.now()}`,
    };
    this.subscriptions.push(sub);
    return sub;
  }

  public generateOrdersFromSubscriptions(date: string): DbOrder[] {
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const targetDay = dayNames[new Date(date).getDay()];
    const generatedOrders: DbOrder[] = [];

    const activeSubs = this.subscriptions.filter(
      (s) => s.status === 'ACTIVE' && s.activeDays.includes(targetDay)
    );

    for (const sub of activeSubs) {
      const customer = this.getCustomerById(sub.customerId);
      if (!customer) continue;

      for (const service of sub.serviceTimes) {
        const mealPlan = this.mealPlans.find((m) => m.date === date && m.serviceTime === service);
        const mainRecipeId = sub.preferredRecipeId || mealPlan?.mainCourseRecipeId || this.recipes[0].id;

        const items: { recipeId: string; portions: number }[] = [
          { recipeId: mainRecipeId, portions: sub.dailyPortions },
        ];
        if (mealPlan?.starterRecipeId) {
          items.push({ recipeId: mealPlan.starterRecipeId, portions: sub.dailyPortions });
        }
        if (mealPlan?.dessertRecipeId) {
          items.push({ recipeId: mealPlan.dessertRecipeId, portions: sub.dailyPortions });
        }

        const order = this.createOrder({
          customerId: sub.customerId,
          deliveryDate: date,
          serviceTime: service,
          items,
          notes: `Généré depuis abonnement: ${sub.planName}`,
        });

        generatedOrders.push(order);
      }
    }

    return generatedOrders;
  }

  // ==========================================
  // Kitchen Display System (KDS) Active Batches
  // ==========================================
  public getKdsBatches(date?: string): KdsBatch[] {
    const targetDate = date || new Date().toLocaleDateString('en-CA');
    const existing = this.kdsBatches.filter((b) => b.date === targetDate);

    if (existing.length > 0) {
      return existing;
    }

    // Auto-generate KDS batches from production needs if empty
    const plan = this.calculateProductionNeeds(targetDate);
    for (const rec of plan.recipes) {
      const r = this.getRecipeById(rec.recipeId);
      const station =
        rec.category === ComponentCategory.MAIN_COURSE
          ? 'CHAUD'
          : rec.category === ComponentCategory.STARTER
          ? 'FROID'
          : rec.category === ComponentCategory.DESSERT
          ? 'PATISSERIE'
          : 'CONDITIONNEMENT';

      this.kdsBatches.push({
        id: `kds-${targetDate}-${rec.recipeId}`,
        recipeId: rec.recipeId,
        recipeName: rec.recipeName,
        category: rec.category,
        portions: rec.totalPortions,
        serviceTime: plan.serviceTime || MealServiceTime.LUNCH,
        date: targetDate,
        station,
        stage: 'TO_PREPARE',
        updatedAt: new Date().toISOString(),
      });
    }

    return this.kdsBatches.filter((b) => b.date === targetDate);
  }

  public updateKdsBatchStage(batchId: string, stage: KdsBatch['stage']): KdsBatch | undefined {
    const batch = this.kdsBatches.find((b) => b.id === batchId);
    if (batch) {
      batch.stage = stage;
      batch.updatedAt = new Date().toISOString();
    }
    return batch;
  }

  // ==========================================
  // Phase 1: Audit Trail Logging
  // ==========================================
  public logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const log: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    return log;
  }

  public getAuditLogs(filters?: { entityType?: string; action?: string; limit?: number }): AuditLogEntry[] {
    let res = [...this.auditLogs];
    if (filters?.entityType) res = res.filter((l) => l.entityType === filters.entityType);
    if (filters?.action) res = res.filter((l) => l.action === filters.action);
    return res.slice(0, filters?.limit || 50);
  }

  // ==========================================
  // Phase 1: Menu Calendar Operational Rules Engine
  // ==========================================
  public validateMenuCalendarRules(plansToValidate?: DbMealPlan[]): { isValid: boolean; violations: MenuRuleViolation[] } {
    const plans = plansToValidate || this.mealPlans;
    const violations: MenuRuleViolation[] = [];

    // Group plans by date
    const byDate = new Map<string, { lunch?: DbMealPlan; dinner?: DbMealPlan }>();
    for (const p of plans) {
      const current = byDate.get(p.date) || {};
      if (p.serviceTime === MealServiceTime.LUNCH) current.lunch = p;
      if (p.serviceTime === MealServiceTime.DINNER) current.dinner = p;
      byDate.set(p.date, current);
    }

    let lunchPastaCount = 0;

    for (const [date, slots] of byDate.entries()) {
      const lunchMain = slots.lunch?.mainCourseRecipeId ? this.getRecipeById(slots.lunch.mainCourseRecipeId) : undefined;
      const dinnerMain = slots.dinner?.mainCourseRecipeId ? this.getRecipeById(slots.dinner.mainCourseRecipeId) : undefined;

      const lunchName = (lunchMain?.name || '').toLowerCase();
      const dinnerName = (dinnerMain?.name || '').toLowerCase();

      // Rule 4: Interdiction frites midi + soir le même jour
      const lunchHasFries = lunchName.includes('frite') || lunchName.includes('pommes de terre');
      const dinnerHasFries = dinnerName.includes('frite') || dinnerName.includes('pommes de terre');
      if (lunchHasFries && dinnerHasFries) {
        violations.push({
          date,
          ruleName: 'INTERDICTION_FRITES_MIDI_SOIR',
          severity: 'ERROR',
          message: `Règle enfreinte le ${date} : Interdiction de servir des frites/pommes de terre à la fois au déjeuner (${lunchMain?.name}) et au dîner (${dinnerMain?.name}).`,
        });
      }

      // Rule 6: Interdiction viande hachée midi + soir le même jour
      const lunchHasMinced = lunchName.includes('haché') || lunchName.includes('boulette');
      const dinnerHasMinced = dinnerName.includes('haché') || dinnerName.includes('boulette');
      if (lunchHasMinced && dinnerHasMinced) {
        violations.push({
          date,
          ruleName: 'INTERDICTION_VIANDE_HACHEE_MIDI_SOIR',
          severity: 'ERROR',
          message: `Règle enfreinte le ${date} : Interdiction de servir de la viande hachée au déjeuner et au dîner le même jour.`,
        });
      }

      // Rule 2: Pâtes/Spaghetti 1x/semaine max au déjeuner
      if (lunchName.includes('pâte') || lunchName.includes('spaghetti') || lunchName.includes('macaroni')) {
        lunchPastaCount++;
        if (lunchPastaCount > 1) {
          violations.push({
            date,
            ruleName: 'MAX_PATES_DEJEUNER_HEBDO',
            severity: 'WARNING',
            message: `Alerte le ${date} : Les pâtes/spaghetti sont programmées plus d'une fois au déjeuner cette semaine (${lunchMain?.name}).`,
          });
        }
      }

      // Rule 3: Repas du samedi faciles d'atelier
      const dayOfWeek = new Date(date).getDay();
      if (dayOfWeek === 6) { // Samedi
        if (lunchMain && lunchMain.preparationTimeMinutes > 45) {
          violations.push({
            date,
            ruleName: 'SAMEDI_REPAS_FACILE',
            severity: 'WARNING',
            message: `Alerte le ${date} (Samedi) : Le plat prévu (${lunchMain.name}) dépasse 45 min de préparation. Privilégier une recette facile pour la brigade allégée du samedi.`,
          });
        }
      }
    }

    const hasErrors = violations.some((v) => v.severity === 'ERROR');
    return { isValid: !hasErrors, violations };
  }

  // ==========================================
  // Phase 1: Accounting & Pre-paid Invoicing
  // ==========================================
  public getInvoices(customerId?: string): DbInvoice[] {
    if (customerId) return this.invoices.filter((i) => i.customerId === customerId);
    return this.invoices;
  }

  public getPayments(customerId?: string): DbPayment[] {
    if (customerId) return this.payments.filter((p) => p.customerId === customerId);
    return this.payments;
  }

  public recordPayment(data: {
    customerId: string;
    amount: number;
    paymentMethod: DbPayment['paymentMethod'];
    invoiceId?: string;
    notes?: string;
  }): DbPayment {
    const receiptNumber = `REC-${new Date().toLocaleDateString('en-CA').replace(/-/g, '')}-${String(this.payments.length + 1).padStart(3, '0')}`;
    const payment: DbPayment = {
      id: `pay-${Date.now()}`,
      receiptNumber,
      customerId: data.customerId,
      invoiceId: data.invoiceId,
      paymentDate: new Date().toLocaleDateString('en-CA'),
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    };

    this.payments.unshift(payment);

    // Update customer balance
    const customer = this.getCustomerById(data.customerId);
    if (customer) {
      customer.accountBalance += data.amount;
    }

    // If tied to an invoice, mark invoice paid or partially paid
    if (data.invoiceId) {
      const inv = this.invoices.find((i) => i.id === data.invoiceId);
      if (inv) {
        inv.paidAmount += data.amount;
        inv.status = inv.paidAmount >= inv.totalAmount ? 'PAID' : 'PARTIALLY_PAID';
      }
    }

    this.logAuditEvent({
      userId: 'usr-admin',
      userName: 'Directeur Financier',
      action: 'PAYMENT_RECORDED',
      entityType: 'PAYMENT',
      entityId: payment.id,
      afterSnapshot: payment,
    });

    return payment;
  }

  public getCustomerStatement(customerId: string): {
    customer: DbCustomer | undefined;
    balance: number;
    orders: DbOrder[];
    invoices: DbInvoice[];
    payments: DbPayment[];
  } {
    const customer = this.getCustomerById(customerId);
    const orders = this.orders.filter((o) => o.customerId === customerId);
    const invoices = this.getInvoices(customerId);
    const payments = this.getPayments(customerId);

    return {
      customer,
      balance: customer?.accountBalance || 0,
      orders,
      invoices,
      payments,
    };
  }

  // ==========================================
  // Phase 1: Driver Compensation & Run Transfer
  // ==========================================
  public calculateDriverCompensation(runId: string): {
    driverName: string;
    stopCount: number;
    compensation: number;
    breakdown: { baseFare: number; perStopRate: number; total: number };
  } {
    const run = this.deliveryRuns.find((r) => r.id === runId);
    if (!run) return { driverName: 'Inconnu', stopCount: 0, compensation: 0, breakdown: { baseFare: 0, perStopRate: 0, total: 0 } };

    const baseFare = 800; // 800 DZD forfait fixe tournée
    const perStopRate = 150; // 150 DZD par point de livraison
    const stopCount = run.stops.length;
    const total = baseFare + (stopCount * perStopRate);

    return {
      driverName: run.driverName,
      stopCount,
      compensation: total,
      breakdown: { baseFare, perStopRate: stopCount * perStopRate, total },
    };
  }

  public transferDeliveryRun(runId: string, newDriverName: string, newDriverPhone: string, reason: string): DbDeliveryRun | undefined {
    const run = this.deliveryRuns.find((r) => r.id === runId);
    if (!run) return undefined;

    const before = { ...run };
    run.driverName = newDriverName;
    run.driverPhone = newDriverPhone;

    this.logAuditEvent({
      userId: 'usr-logistics',
      userName: 'Responsable Logistique',
      action: 'DELIVERY_RUN_TRANSFERRED',
      entityType: 'DELIVERY_RUN',
      entityId: runId,
      beforeSnapshot: before,
      afterSnapshot: { newDriverName, newDriverPhone, reason },
    });

    return run;
  }

  // ==========================================
  // Phase 1: Emergency Workshop Package & Backup/Restore
  // ==========================================
  public generateEmergencyWorkshopPackage(date?: string): EmergencyWorkshopPackage {
    const targetDate = date || new Date().toLocaleDateString('en-CA');
    const plan = this.calculateProductionNeeds(targetDate);

    const packagingMap = new Map<string, number>();
    for (const r of plan.recipes) {
      const current = packagingMap.get('Barquettes Kraft 750ml Individuelles') || 0;
      packagingMap.set('Barquettes Kraft 750ml Individuelles', current + r.totalPortions);
    }
    packagingMap.set('Couvercles Transparents Écologiques', plan.totalMealPortions);
    packagingMap.set('Sacs Kraft Transport & Livraison', plan.totalOrders);

    const packagingRequirements = Array.from(packagingMap.entries()).map(([type, quantity]) => ({ type, quantity }));

    const relevantOrders = this.orders.filter((o) => o.deliveryDate === targetDate && o.status !== OrderStatus.CANCELLED);
    const alternatives: { customerName: string; address: string; requestedAlternative: string }[] = [];
    for (const ord of relevantOrders) {
      const cust = this.getCustomerById(ord.customerId);
      if (cust && cust.dietaryPreferences.length > 0 && !cust.dietaryPreferences.includes('Standard')) {
        alternatives.push({
          customerName: cust.companyName ? `${cust.companyName} (${cust.contactName})` : cust.contactName,
          address: ord.deliveryAddress,
          requestedAlternative: cust.dietaryPreferences.join(', '),
        });
      }
    }

    const allergensMap = new Map<string, number>();
    for (const rec of plan.recipes) {
      const r = this.getRecipeById(rec.recipeId);
      if (r && r.allergens.length > 0) {
        for (const al of r.allergens) {
          const current = allergensMap.get(al) || 0;
          allergensMap.set(al, current + rec.totalPortions);
        }
      }
    }
    const allergensSummary = Array.from(allergensMap.entries()).map(([allergen, portionCount]) => ({ allergen, portionCount }));

    return {
      date: targetDate,
      generatedAt: new Date().toISOString(),
      totalMealPortions: plan.totalMealPortions,
      recipes: plan.recipes.map((r) => ({ recipeName: r.recipeName, category: r.category, portions: r.totalPortions })),
      packagingRequirements,
      alternatives,
      allergensSummary,
    };
  }

  public createDatabaseBackup(): { timestamp: string; version: string; data: Record<string, unknown> } {
    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0-phase1',
      data: {
        suppliers: this.suppliers,
        ingredients: this.ingredients,
        recipes: this.recipes,
        customers: this.customers,
        mealPlans: this.mealPlans,
        orders: this.orders,
        productionBatches: this.productionBatches,
        purchaseOrders: this.purchaseOrders,
        deliveryRuns: this.deliveryRuns,
        subscriptions: this.subscriptions,
        invoices: this.invoices,
        payments: this.payments,
        auditLogs: this.auditLogs,
      },
    };
  }

  public restoreDatabaseFromBackup(backup: { data: Record<string, unknown> }): boolean {
    if (!backup || typeof backup.data !== 'object') return false;
    const d = backup.data;
    if (Array.isArray(d.customers)) this.customers = d.customers as DbCustomer[];
    if (Array.isArray(d.orders)) this.orders = d.orders as DbOrder[];
    if (Array.isArray(d.recipes)) this.recipes = d.recipes as DbRecipe[];
    if (Array.isArray(d.ingredients)) this.ingredients = d.ingredients as DbIngredient[];
    if (Array.isArray(d.invoices)) this.invoices = d.invoices as DbInvoice[];
    if (Array.isArray(d.payments)) this.payments = d.payments as DbPayment[];
    return true;
  }

  // ==========================================
  // Phase 1: Les 14 Rapports Essentiels Officiels
  // ==========================================
  public generateReport(reportNumber: number, date?: string): OfficialReportResult {
    const targetDate = date || new Date().toLocaleDateString('en-CA');
    const timestamp = new Date().toISOString();

    switch (reportNumber) {
      case 1: {
        const orders = this.orders.filter((o) => !date || o.deliveryDate === targetDate);
        return {
          reportNumber: 1,
          title: 'Rapport Nominatif des Commandes',
          generatedAt: timestamp,
          summaryText: `${orders.length} commande(s) répertoriée(s) pour un total de ${orders.reduce((s, o) => s + o.totalPortions, 0)} portions.`,
          data: orders,
        };
      }
      case 2: {
        const plan = this.calculateProductionNeeds(targetDate);
        return {
          reportNumber: 2,
          title: 'Rapport Production : Prévu vs Réel, Surplus & Pénuries',
          generatedAt: timestamp,
          summaryText: `${plan.recipes.length} plat(s) en production. Déficit matière estimé : ${plan.deficitCost} DZD.`,
          data: plan,
        };
      }
      case 3: {
        const pos = this.purchaseOrders;
        return {
          reportNumber: 3,
          title: 'Rapport des Achats & Réceptions Fournisseurs',
          generatedAt: timestamp,
          summaryText: `${pos.length} bon(s) d'achat émis pour une valorisation de ${pos.reduce((s, p) => s + p.totalCost, 0)} DZD.`,
          data: pos,
        };
      }
      case 4: {
        const supplements = this.orders.map((o) => ({ orderNumber: o.orderNumber, supplementsCost: o.supplementsCost }));
        return {
          reportNumber: 4,
          title: 'Rapport des Suppléments Facturés',
          generatedAt: timestamp,
          summaryText: `Total suppléments : ${supplements.reduce((s, i) => s + i.supplementsCost, 0)} DZD.`,
          data: supplements,
        };
      }
      case 5: {
        const pack = this.generateEmergencyWorkshopPackage(targetDate);
        return {
          reportNumber: 5,
          title: 'Rapport des Emballages (Individuel & Collectif)',
          generatedAt: timestamp,
          summaryText: `Quantités nécessaires calculées pour ${pack.totalMealPortions} repas.`,
          data: pack.packagingRequirements,
        };
      }
      case 6: {
        const runs = this.getDeliveryRuns(targetDate);
        return {
          reportNumber: 6,
          title: 'Rapport de Distribution & Tournées',
          generatedAt: timestamp,
          summaryText: `${runs.length} tournée(s) programmée(s) pour le service.`,
          data: runs,
        };
      }
      case 7: {
        const accounts = this.customers.map((c) => ({
          clientId: c.id,
          nom: c.companyName || c.contactName,
          soldePrepayeDZD: c.accountBalance,
          statut: c.status,
        }));
        return {
          reportNumber: 7,
          title: 'Rapport des Comptes Clients & Soldes Prépayés',
          generatedAt: timestamp,
          summaryText: `Encours total des soldes prépayés : ${accounts.reduce((s, a) => s + a.soldePrepayeDZD, 0)} DZD.`,
          data: accounts,
        };
      }
      case 8: {
        const clients = this.customers.map((c) => ({
          id: c.id,
          nom: c.companyName || c.contactName,
          type: c.subscriptionType,
          isSubsidiary: !!c.isSubsidiary,
          parentCompanyId: c.parentCompanyId || 'N/A',
          phone: c.phone,
          status: c.status,
        }));
        return {
          reportNumber: 8,
          title: 'Rapport Annuaire des Clients & Hiérarchie Sociétés/Filiales',
          generatedAt: timestamp,
          summaryText: `${clients.length} comptes clients répertoriés (dont ${clients.filter((c) => c.isSubsidiary).length} filiales).`,
          data: clients,
        };
      }
      case 9: {
        const fin = this.getFinancialAnalytics(targetDate);
        return {
          reportNumber: 9,
          title: 'Rapport Statistique de Consommation & Plats',
          generatedAt: timestamp,
          summaryText: `Plat le plus commandé : ${fin.topRecipes[0]?.name || 'N/A'}.`,
          data: fin.topRecipes,
        };
      }
      case 10: {
        const fin = this.getFinancialAnalytics(targetDate);
        return {
          reportNumber: 10,
          title: 'Rapport de Performance Globale & Rentabilité',
          generatedAt: timestamp,
          summaryText: `Taux de Food Cost : ${fin.foodCostPercentage}% • Marge brute : ${fin.grossMarginPercentage}%.`,
          data: fin,
        };
      }
      case 11: {
        const logs = this.getAuditLogs({ limit: 50 });
        return {
          reportNumber: 11,
          title: 'Rapport du Journal d’Audit & Sécurité',
          generatedAt: timestamp,
          summaryText: `${logs.length} opération(s) critique(s) tracée(s) dans le journal d'audit.`,
          data: logs,
        };
      }
      case 12: {
        const pays = this.payments;
        return {
          reportNumber: 12,
          title: 'Rapport des Paiements & Règlements Encaissés',
          generatedAt: timestamp,
          summaryText: `${pays.length} encaissement(s) pour un total de ${pays.reduce((s, p) => s + p.amount, 0)} DZD.`,
          data: pays,
        };
      }
      case 13: {
        const pack = this.generateEmergencyWorkshopPackage(targetDate);
        return {
          reportNumber: 13,
          title: 'Rapport des Alternatives & Régimes Spéciaux',
          generatedAt: timestamp,
          summaryText: `${pack.alternatives.length} demande(s) de repas alternatifs / sans allergènes.`,
          data: pack.alternatives,
        };
      }
      case 14:
      default: {
        const weekly = this.getWeeklyMenuPlan(targetDate);
        const fin = this.getFinancialAnalytics();
        return {
          reportNumber: 14,
          title: 'Rapport de Synthèse Hebdomadaire 360°',
          generatedAt: timestamp,
          summaryText: `Synthèse d'activité 360° sur 7 jours. CA cumulé estimé : ${fin.totalRevenue} DZD.`,
          data: { weekly, financialOverview: fin },
        };
      }
    }
  }
}

export const janitouStore = new JanitouStore();
