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
  initialSuppliers,
  initialIngredients,
  initialRecipes,
  initialCustomers,
  initialMealPlans,
  initialOrders,
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
  public calculateProductionNeeds(date: string, serviceTime?: MealServiceTime): ProductionPlanSummary {
    const relevantOrders = this.orders.filter(
      (o) =>
        o.deliveryDate === date &&
        (serviceTime ? o.serviceTime === serviceTime : true) &&
        o.status !== OrderStatus.CANCELLED
    );

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
}

export const janitouStore = new JanitouStore();
