import {
  MealServiceTime,
  OrderStatus,
  ComponentCategory,
  UnitOfMeasure,
} from '@janitou/common';
import {
  createStateBackend,
  type DatabaseHealth,
  type DatabaseState,
  type StateBackend,
} from '@janitou/database';
import { createHash, randomUUID } from 'node:crypto';
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
  DbDeliveryStop,
  DbInvoice,
  DbPayment,
  DbStaffUser,
  DbNotification,
  DbOutboundMessage,
  StaffRole,
  initialSuppliers,
  initialIngredients,
  initialRecipes,
  initialCustomers,
  initialMealPlans,
  initialOrders,
  initialInvoices,
  initialPayments,
} from '../data/mock-db.js';
import { hashPin, normalizePhone } from './pin.js';
import {
  DEFAULT_SIMPLE_SETTINGS,
  SIMPLE_DISH_CATALOG,
  SIMPLE_DISH_PRICES,
  addDaysIso,
  toIsoDate,
  type ClientDishView,
  type ClientMenuDayView,
  type ClientOrderView,
  type ClientProgramEntry,
  type PackagingType,
  type SimpleDishView,
  type SimpleExtraSetting,
  type SimpleHomeView,
  type SimpleMenuDayView,
  type SimpleOrderView,
  type SimpleSettings,
} from '../data/simple-demo.js';

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

export interface StaffSessionRecord {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}

export interface ClientSessionRecord {
  tokenHash: string;
  customerId: string;
  expiresAt: string;
}

const STAFF_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const CLIENT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const AUDIT_RETENTION_YEARS = 2;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export class JanitouStore {
  public suppliers: DbSupplier[] = [];
  public ingredients: DbIngredient[] = [];
  public recipes: DbRecipe[] = [];
  public customers: DbCustomer[] = [];
  public mealPlans: DbMealPlan[] = [];
  public orders: DbOrder[] = [];
  public pendingOrders: DbOrder[] = [];
  public productionBatches: DbProductionBatch[] = [];
  public purchaseOrders: DbPurchaseOrder[] = [];
  public deliveryRuns: DbDeliveryRun[] = [];
  public subscriptions: CustomerSubscription[] = [];
  public kdsBatches: KdsBatch[] = [];
  public invoices: DbInvoice[] = [];
  public payments: DbPayment[] = [];
  public auditLogs: AuditLogEntry[] = [];
  public staffUsers: DbStaffUser[] = [];
  public staffSessions: StaffSessionRecord[] = [];
  public clientSessions: ClientSessionRecord[] = [];
  public notifications: DbNotification[] = [];
  public outboundMessages: DbOutboundMessage[] = [];
  public settings: SimpleSettings = this.cloneSettings(DEFAULT_SIMPLE_SETTINGS);
  private db: StateBackend;
  private isEphemeral: boolean;
  private readonly initPromise: Promise<void>;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(customDb?: StateBackend, options?: { ephemeral?: boolean }) {
    this.db = customDb || createStateBackend();
    this.isEphemeral = options?.ephemeral ?? (process.env.NODE_ENV === 'test' && !customDb);
    // Keep the store usable synchronously (tests, in-process tools); durable
    // state replaces these defaults once `ready()` resolves.
    this.resetToDefaults();
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!this.isEphemeral) {
      const savedState = await this.db.loadState();
      if (savedState) {
        this.suppliers = (savedState.suppliers as DbSupplier[]) || [];
        this.ingredients = (savedState.ingredients as DbIngredient[]) || [];
        this.recipes = (savedState.recipes as DbRecipe[]) || [];
        this.customers = (savedState.customers as DbCustomer[]) || [];
        this.mealPlans = (savedState.mealPlans as DbMealPlan[]) || [];
        this.orders = (savedState.orders as DbOrder[]) || [];
        this.pendingOrders = (savedState.pendingOrders as DbOrder[]) || [];
        this.productionBatches = (savedState.productionBatches as DbProductionBatch[]) || [];
        this.purchaseOrders = (savedState.purchaseOrders as DbPurchaseOrder[]) || [];
        this.deliveryRuns = (savedState.deliveryRuns as DbDeliveryRun[]) || [];
        this.subscriptions = (savedState.subscriptions as CustomerSubscription[]) || [];
        this.kdsBatches = (savedState.kdsBatches as KdsBatch[]) || [];
        this.invoices = (savedState.invoices as DbInvoice[]) || [];
        this.payments = (savedState.payments as DbPayment[]) || [];
        this.auditLogs = (savedState.auditLogs as AuditLogEntry[]) || [];
        this.staffUsers = (savedState.staffUsers as DbStaffUser[]) || [];
        this.staffSessions = (savedState.staffSessions as StaffSessionRecord[]) || [];
        this.clientSessions = (savedState.clientSessions as ClientSessionRecord[]) || [];
        this.notifications = (savedState.notifications as DbNotification[]) || [];
        this.outboundMessages = (savedState.outboundMessages as DbOutboundMessage[]) || [];
        this.settings = this.normalizeSettings(savedState.settings);
        this.pruneSessions();
        this.pruneAuditLogs();
        if (this.ensureSimpleDemo()) await this.persistNow();
        return;
      }
    }

    this.ensureSimpleDemo();
    if (!this.isEphemeral) await this.persistNow();
  }

  /** Resolves once the initial state has been loaded from the backend. */
  public async ready(): Promise<void> {
    await this.initPromise;
    await this.writeChain;
  }

  /** Waits for all queued writes to be committed. */
  public async flush(): Promise<void> {
    await this.writeChain;
  }

  private cloneSnapshot<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private pruneSessions(): void {
    const now = Date.now();
    this.staffSessions = this.staffSessions.filter(
      (session) => Date.parse(session.expiresAt) > now
    );
    this.clientSessions = this.clientSessions.filter(
      (session) => Date.parse(session.expiresAt) > now
    );
  }

  private snapshotState(): Omit<DatabaseState, 'metadata'> {
    return {
      suppliers: this.suppliers,
      ingredients: this.ingredients,
      recipes: this.recipes,
      customers: this.customers,
      mealPlans: this.mealPlans,
      orders: this.orders,
      pendingOrders: this.pendingOrders,
      productionBatches: this.productionBatches,
      purchaseOrders: this.purchaseOrders,
      deliveryRuns: this.deliveryRuns,
      subscriptions: this.subscriptions,
      kdsBatches: this.kdsBatches,
      invoices: this.invoices,
      payments: this.payments,
      auditLogs: this.auditLogs,
      staffUsers: this.staffUsers,
      staffSessions: this.staffSessions,
      clientSessions: this.clientSessions,
      notifications: this.notifications,
      outboundMessages: this.outboundMessages,
      settings: this.settings,
    };
  }

  public persist(): void {
    if (this.isEphemeral) return;
    const state = this.snapshotState();
    this.writeChain = this.writeChain
      .then(() => this.db.persistState(state))
      .catch((error) => {
        console.error('[STORE] Persist failed:', error);
      });
  }

  private async persistNow(): Promise<void> {
    if (this.isEphemeral) return;
    await this.db.persistState(this.snapshotState());
  }

  public getDatabaseHealth(): DatabaseHealth {
    return this.db.getHealth(this.snapshotState());
  }
  public resetToDefaults(): void {
    this.suppliers = JSON.parse(JSON.stringify(initialSuppliers));
    this.ingredients = JSON.parse(JSON.stringify(initialIngredients));
    this.recipes = JSON.parse(JSON.stringify(initialRecipes));
    this.customers = JSON.parse(JSON.stringify(initialCustomers));
    this.mealPlans = JSON.parse(JSON.stringify(initialMealPlans));
    this.orders = JSON.parse(JSON.stringify(initialOrders));
    this.pendingOrders = [];
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
    this.settings = this.cloneSettings(DEFAULT_SIMPLE_SETTINGS);
    this.staffSessions = [];
    this.clientSessions = [];
    this.notifications = [];
    this.outboundMessages = [];
    this.seedStaffUsers();
  }

  private seedStaffUsers(): void {
    const seeds: { id: string; email: string; fullName: string; role: StaffRole; password: string }[] = [
      { id: 'staff-admin', email: 'admin@janitou.dz', fullName: 'المدير العام', role: 'ADMIN', password: 'Admin@2026' },
      { id: 'staff-ops', email: 'ops@janitou.dz', fullName: 'مسؤول العمليات', role: 'OPERATIONS_MANAGER', password: 'Ops@2026' },
      { id: 'staff-chef', email: 'chef@janitou.dz', fullName: 'رئيس الورشة', role: 'CHEF_KITCHEN', password: 'Chef@2026' },
    ];
    const createdAt = new Date().toISOString();
    this.staffUsers = seeds.map((seed) => {
      const { salt, hash } = hashPin(seed.password);
      return {
        id: seed.id,
        email: seed.email,
        fullName: seed.fullName,
        role: seed.role,
        passwordSalt: salt,
        passwordHash: hash,
        isActive: true,
        createdAt,
      };
    });
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

  public createCustomer(data: Partial<Omit<DbCustomer, 'id'>> & Pick<DbCustomer, 'contactName' | 'phone' | 'deliveryAddress'>): DbCustomer {
    const customer: DbCustomer = {
      companyName: data.companyName,
      contactName: data.contactName,
      phone: data.phone,
      email: data.email || '',
      deliveryAddress: data.deliveryAddress,
      wilaya: data.wilaya || 'Alger',
      commune: data.commune || 'Centre',
      deliveryNotes: data.deliveryNotes,
      dietaryPreferences: data.dietaryPreferences || ['Standard'],
      parentCompanyId: data.parentCompanyId,
      isSubsidiary: data.isSubsidiary || false,
      status: data.status || 'ACTIVE',
      accountBalance: data.accountBalance ?? 0,
      whatsAppLink: data.whatsAppLink || `https://wa.me/213${(data.phone || '').replace(/\D/g, '')}`,
      subscriptionType: data.subscriptionType || 'CORPORATE',
      preferredDistributionType: data.preferredDistributionType || 'STANDARD_DELIVERY',
      id: `cust-${Date.now()}`,
    };
    this.customers.push(customer);
    this.persist();
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
      this.persist();
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

  public createRecipe(
    data: Partial<Omit<DbRecipe, 'id'>> & Pick<DbRecipe, 'name' | 'category' | 'yieldPortions' | 'ingredients' | 'allergens'>
  ): DbRecipe {
    const recipe: DbRecipe = {
      name: data.name,
      category: data.category,
      description: data.description || '',
      yieldPortions: data.yieldPortions,
      preparationTimeMinutes: data.preparationTimeMinutes ?? 30,
      ingredients: data.ingredients,
      allergens: data.allergens,
      nameAr: data.nameAr?.trim() || undefined,
      photoUrl: data.photoUrl?.trim() || undefined,
      family: data.family?.trim() || undefined,
      flags: data.flags,
      mainIngredient: data.mainIngredient?.trim() || undefined,
      id: `rec-${Date.now()}`,
    };
    this.recipes.push(recipe);
    this.persist();
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
  // Simple Mode (mobile menu, dishes & daily orders)
  // ==========================================
  private cloneSettings(settings: SimpleSettings): SimpleSettings {
    return { ...settings, extras: settings.extras.map((extra) => ({ ...extra })) };
  }

  private normalizeSettings(raw: unknown): SimpleSettings {
    const base = this.cloneSettings(DEFAULT_SIMPLE_SETTINGS);
    if (!raw || typeof raw !== 'object') return base;
    const input = raw as Partial<SimpleSettings>;
    const finiteAmount = (value: unknown, fallback: number): number =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
    return {
      lunchPrice: finiteAmount(input.lunchPrice, base.lunchPrice),
      dinnerPrice: finiteAmount(input.dinnerPrice, base.dinnerPrice),
      packagingPrice: finiteAmount(input.packagingPrice, base.packagingPrice),
      deliveryPrice: finiteAmount(input.deliveryPrice, base.deliveryPrice),
      lunchHours:
        typeof input.lunchHours === 'string' && input.lunchHours.trim()
          ? input.lunchHours.trim().slice(0, 40)
          : base.lunchHours,
      dinnerHours:
        typeof input.dinnerHours === 'string' && input.dinnerHours.trim()
          ? input.dinnerHours.trim().slice(0, 40)
          : base.dinnerHours,
      cutoffTime:
        typeof input.cutoffTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(input.cutoffTime)
          ? input.cutoffTime
          : base.cutoffTime,
      cutoffDaysBefore:
        typeof input.cutoffDaysBefore === 'number' &&
        Number.isInteger(input.cutoffDaysBefore) &&
        input.cutoffDaysBefore >= 0 &&
        input.cutoffDaysBefore <= 7
          ? input.cutoffDaysBefore
          : base.cutoffDaysBefore,
      closedDates: Array.isArray(input.closedDates)
        ? input.closedDates.filter(
            (date): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
          )
        : base.closedDates,
      deadlineOverrides:
        input.deadlineOverrides && typeof input.deadlineOverrides === 'object'
          ? Object.fromEntries(
              Object.entries(input.deadlineOverrides).filter(
                ([date, until]) =>
                  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
                  typeof until === 'string' &&
                  !Number.isNaN(Date.parse(until))
              )
            )
          : base.deadlineOverrides,
      extras: Array.isArray(input.extras)
        ? input.extras
            .filter(
              (extra): extra is SimpleExtraSetting =>
                Boolean(extra) &&
                typeof extra.name === 'string' &&
                extra.name.trim().length > 0 &&
                typeof extra.price === 'number' &&
                Number.isFinite(extra.price) &&
                extra.price >= 0
            )
            .slice(0, 20)
            .map((extra) => ({
              name: extra.name.trim().slice(0, 40),
              price: extra.price,
              perMeals:
                typeof extra.perMeals === 'number' &&
                Number.isInteger(extra.perMeals) &&
                extra.perMeals >= 1 &&
                extra.perMeals <= 30
                  ? extra.perMeals
                  : DEFAULT_SIMPLE_SETTINGS.extras.find(
                      (defaultExtra) => defaultExtra.name === extra.name.trim()
                    )?.perMeals || 1,
              families: Array.isArray(extra.families)
                ? extra.families
                    .filter((family): family is string => typeof family === 'string' && family.length > 0)
                    .slice(0, 12)
                : undefined,
            }))
        : base.extras,
    };
  }

  /** Enriches the Phase 1 seed with photos/Arabic labels and keeps a 7-day menu available. */
  private ensureSimpleDemo(): boolean {
    if (this.isEphemeral || process.env.JANITOU_AUTOSEED === '0') return false;
    let changed = false;

    if (this.staffUsers.length === 0) {
      this.seedStaffUsers();
      changed = true;
    }

    for (const seed of SIMPLE_DISH_CATALOG) {
      const recipe = this.recipes.find((entry) => entry.name === seed.name);
      if (!recipe) {
        this.recipes.push({
          id: seed.id,
          name: seed.name,
          nameAr: seed.nameAr,
          photoUrl: seed.photoUrl,
          category: seed.category,
          description: 'Plat du menu quotidien',
          yieldPortions: 1,
          preparationTimeMinutes: 30,
          allergens: [],
          ingredients: [],
          price: SIMPLE_DISH_PRICES[seed.id],
          isActive: true,
          family: seed.family,
          flags: seed.flags ? [...seed.flags] : undefined,
          mainIngredient: seed.mainIngredient,
        });
        changed = true;
      } else {
        if (recipe.nameAr !== seed.nameAr || recipe.photoUrl !== seed.photoUrl) {
          recipe.nameAr = seed.nameAr;
          recipe.photoUrl = seed.photoUrl;
          changed = true;
        }
        if (recipe.price === undefined && SIMPLE_DISH_PRICES[seed.id] !== undefined) {
          recipe.price = SIMPLE_DISH_PRICES[seed.id];
          changed = true;
        }
        if (recipe.isActive === undefined) {
          recipe.isActive = true;
          changed = true;
        }
        if (recipe.family !== seed.family || recipe.mainIngredient !== seed.mainIngredient) {
          recipe.family = seed.family;
          recipe.mainIngredient = seed.mainIngredient;
          changed = true;
        }
        if (seed.flags && JSON.stringify(recipe.flags || []) !== JSON.stringify(seed.flags)) {
          recipe.flags = [...seed.flags];
          changed = true;
        }
      }
    }

    // Demo case for BR-003: inactive account awaiting administrative review.
    if (!this.customers.some((customer) => customer.id === 'cust-review-demo')) {
      const { salt, hash } = hashPin('1234');
      this.customers.push({
        id: 'cust-review-demo',
        contactName: 'Nadia Saidi',
        companyName: 'Atelier Saidi',
        phone: '0770 44 55 66',
        email: '',
        deliveryAddress: '24 Rue des Oliviers, Alger',
        wilaya: 'Alger',
        commune: 'Alger Centre',
        dietaryPreferences: [],
        status: 'ACTIVE',
        accountStatus: 'ACTIVE',
        pinSalt: salt,
        pinHash: hash,
        registeredAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        accountBalance: 2500,
        whatsAppLink: 'https://wa.me/213770445566',
        subscriptionType: 'INDIVIDUAL',
        preferredDistributionType: 'STANDARD_DELIVERY',
      });
      changed = true;
    }

    // Demo customer accounts: active, with the provisional PIN 1234.
    for (const customer of this.customers) {
      if (!customer.accountStatus) {
        customer.accountStatus = 'ACTIVE';
        changed = true;
      }
      if (!customer.pinHash || !customer.pinSalt) {
        const { salt, hash } = hashPin('1234');
        customer.pinSalt = salt;
        customer.pinHash = hash;
        changed = true;
      }
    }

    const rotation = SIMPLE_DISH_CATALOG.filter((seed) => seed.family !== 'DESSERT')
      .map((seed) => this.recipes.find((recipe) => recipe.name === seed.name))
      .filter((recipe): recipe is DbRecipe => Boolean(recipe));
    if (rotation.length < 2) return changed;

    const today = toIsoDate(new Date());
    for (let offset = 0; offset < 7; offset++) {
      const date = addDaysIso(today, offset);
      const plans = this.mealPlans.filter((plan) => plan.date === date);
      const lunch = rotation[offset % rotation.length];
      let dinner = rotation[(offset + 1) % rotation.length];
      for (let attempt = 0; attempt < rotation.length; attempt++) {
        const candidate = rotation[(offset + 1 + attempt) % rotation.length];
        if (candidate.mainIngredient !== lunch.mainIngredient) {
          dinner = candidate;
          break;
        }
      }
      const services: { serviceTime: MealServiceTime; dishId: string }[] = [
        { serviceTime: MealServiceTime.LUNCH, dishId: lunch.id },
        { serviceTime: MealServiceTime.DINNER, dishId: dinner.id },
      ];
      for (const { serviceTime, dishId } of services) {
        if (plans.some((plan) => plan.serviceTime === serviceTime)) continue;
        this.mealPlans.push({
          id: `mp-auto-${date}-${serviceTime.toLowerCase()}`,
          date,
          serviceTime,
          mainCourseRecipeId: dishId,
          notes: 'Menu du jour (mode simple)',
          isArchived: false,
        });
        changed = true;
      }
    }

    return changed;
  }

  private toSimpleDishView(recipe: DbRecipe): SimpleDishView {
    return {
      id: recipe.id,
      name: recipe.name,
      nameAr: recipe.nameAr,
      displayName: recipe.nameAr?.trim() || recipe.name,
      photoUrl: recipe.photoUrl,
      category: recipe.category,
      family: recipe.family,
    };
  }

  private buildSimpleMenuDay(date: string, plans: DbMealPlan[]): SimpleMenuDayView {
    const lunchPlan = plans.find((plan) => plan.serviceTime === MealServiceTime.LUNCH);
    const dinnerPlan = plans.find((plan) => plan.serviceTime === MealServiceTime.DINNER);
    const lunchRecipe = lunchPlan ? this.getRecipeById(lunchPlan.mainCourseRecipeId) : undefined;
    const dinnerRecipe = dinnerPlan ? this.getRecipeById(dinnerPlan.mainCourseRecipeId) : undefined;
    return {
      date,
      archived: plans.length > 0 && plans.every((plan) => Boolean(plan.isArchived)),
      lunch: lunchRecipe ? this.toSimpleDishView(lunchRecipe) : null,
      dinner: dinnerRecipe ? this.toSimpleDishView(dinnerRecipe) : null,
    };
  }

  public getSimpleDishes(): SimpleDishView[] {
    return this.recipes.map((recipe) => this.toSimpleDishView(recipe));
  }

  public getSimpleMenuDay(date: string): SimpleMenuDayView {
    return this.buildSimpleMenuDay(
      date,
      this.mealPlans.filter((plan) => plan.date === date)
    );
  }

  public getSimpleMenuRange(
    from: string,
    to: string,
    scope: 'current' | 'archived'
  ): SimpleMenuDayView[] {
    if (scope === 'archived') {
      const dates = [
        ...new Set(
          this.mealPlans
            .filter((plan) => plan.isArchived && plan.date >= from && plan.date <= to)
            .map((plan) => plan.date)
        ),
      ].sort((left, right) => right.localeCompare(left));
      return dates.map((date) => this.getSimpleMenuDay(date));
    }

    const days: SimpleMenuDayView[] = [];
    let cursor = from;
    for (let guard = 0; guard < 62 && cursor <= to; guard++) {
      const day = this.getSimpleMenuDay(cursor);
      if (!day.archived) days.push(day);
      cursor = addDaysIso(cursor, 1);
    }
    return days;
  }

  private upsertMenuPlan(date: string, serviceTime: MealServiceTime, dishId?: string): void {
    if (!dishId) return;
    const existing = this.mealPlans.find(
      (plan) => plan.date === date && plan.serviceTime === serviceTime
    );
    if (existing) {
      existing.mainCourseRecipeId = dishId;
      existing.isArchived = false;
      return;
    }
    this.mealPlans.push({
      id: `mp-${date}-${serviceTime.toLowerCase()}`,
      date,
      serviceTime,
      mainCourseRecipeId: dishId,
      isArchived: false,
    });
  }

  public upsertSimpleMenuDay(input: {
    date: string;
    lunchDishId?: string;
    dinnerDishId?: string;
  }): SimpleMenuDayView {
    this.upsertMenuPlan(input.date, MealServiceTime.LUNCH, input.lunchDishId);
    this.upsertMenuPlan(input.date, MealServiceTime.DINNER, input.dinnerDishId);
    this.persist();
    return this.getSimpleMenuDay(input.date);
  }

  public changeSimpleMenuDish(
    date: string,
    serviceTime: MealServiceTime,
    dishId: string
  ): SimpleMenuDayView {
    this.upsertMenuPlan(date, serviceTime, dishId);
    this.persist();
    return this.getSimpleMenuDay(date);
  }

  public setSimpleMenuArchived(date: string, archived: boolean): SimpleMenuDayView | undefined {
    const plans = this.mealPlans.filter((plan) => plan.date === date);
    if (plans.length === 0) return undefined;
    for (const plan of plans) plan.isArchived = archived;
    this.persist();
    return this.getSimpleMenuDay(date);
  }

  public getSimpleHome(date: string): SimpleHomeView {
    const menu = this.getSimpleMenuDay(date);
    const orders = this.getOrders({ date });
    const activeOrders = orders.filter((order) => order.status !== OrderStatus.CANCELLED);
    const lunchPortions = activeOrders
      .filter((order) => order.serviceTime === MealServiceTime.LUNCH)
      .reduce((sum, order) => sum + order.totalPortions, 0);
    const dinnerPortions = activeOrders
      .filter((order) => order.serviceTime === MealServiceTime.DINNER)
      .reduce((sum, order) => sum + order.totalPortions, 0);
    const dishIds = [menu.lunch?.id, menu.dinner?.id].filter(
      (dishId): dishId is string => Boolean(dishId)
    );

    return {
      date,
      menu,
      stats: {
        dishesCount: new Set(dishIds).size,
        ordersCount: activeOrders.length,
        lunchPortions,
        dinnerPortions,
        totalPortions: lunchPortions + dinnerPortions,
      },
      orders: orders.map((order) => {
        const customer = this.getCustomerById(order.customerId);
        const view: SimpleOrderView = {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: customer?.companyName || customer?.contactName || 'Client',
          customerPhone: customer?.phone || '',
          serviceTime: order.serviceTime,
          status: order.status,
          totalPortions: order.totalPortions,
          deliveryAddress: order.deliveryAddress,
          notes: order.notes,
        };
        return view;
      }),
    };
  }

  public getSimpleSettings(): SimpleSettings {
    return this.cloneSettings(this.settings);
  }

  public updateSimpleSettings(settings: SimpleSettings): SimpleSettings {
    this.settings = this.normalizeSettings(settings);
    this.persist();
    return this.getSimpleSettings();
  }

  // ==========================================
  // Customer accounts (client app)
  // ==========================================
  public getCustomerByPhone(phone: string): DbCustomer | undefined {
    const normalized = normalizePhone(phone);
    return this.customers.find((customer) => normalizePhone(customer.phone) === normalized);
  }

  public createClientAccount(data: {
    contactName: string;
    phone: string;
    deliveryAddress: string;
    wilaya?: string;
    commune?: string;
    pinSalt: string;
    pinHash: string;
    companyName?: string;
    email?: string;
    active?: boolean;
    subscriptionType?: DbCustomer['subscriptionType'];
  }): DbCustomer {
    if (this.getCustomerByPhone(data.phone)) {
      throw new Error('PHONE_EXISTS');
    }
    const customer: DbCustomer = {
      id: `cust-${Date.now()}`,
      contactName: data.contactName,
      companyName: data.companyName,
      phone: data.phone,
      email: data.email || '',
      deliveryAddress: data.deliveryAddress,
      wilaya: data.wilaya || '',
      commune: data.commune || '',
      dietaryPreferences: [],
      status: 'ACTIVE',
      accountStatus: data.active ? 'ACTIVE' : 'PENDING',
      pinSalt: data.pinSalt,
      pinHash: data.pinHash,
      registeredAt: new Date().toISOString(),
      accountBalance: 0,
      whatsAppLink: `https://wa.me/${normalizePhone(data.phone)}`,
      subscriptionType: data.subscriptionType || 'INDIVIDUAL',
      preferredDistributionType: 'STANDARD_DELIVERY',
    };
    this.customers.push(customer);
    this.notify(
      'STAFF',
      'NEW_CLIENT',
      { customerId: customer.id, name: customer.contactName, phone: customer.phone },
      customer.id
    );
    this.persist();
    return customer;
  }

  private confirmPendingOrders(customer: DbCustomer): number {
    const pending = this.pendingOrders.filter((order) => order.customerId === customer.id);
    if (pending.length === 0) return 0;
    this.pendingOrders = this.pendingOrders.filter((order) => order.customerId !== customer.id);
    for (const order of pending) {
      order.status = OrderStatus.CONFIRMED;
      this.orders.push(order);
      this.issueOrderInvoice(customer, order);
      this.notify(
        'CLIENT',
        'ORDER_CREATED',
        { orderNumber: order.orderNumber, total: order.totalPrice, date: order.deliveryDate },
        customer.id
      );
      this.auditLogs.unshift({
        id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        userId: customer.id,
        userName: customer.contactName,
        action: 'APPROVE_ORDER',
        entityType: 'ORDER',
        entityId: order.id,
        beforeSnapshot: { orderNumber: order.orderNumber, status: OrderStatus.DRAFT },
        afterSnapshot: { orderNumber: order.orderNumber, status: order.status },
      });
    }
    return pending.length;
  }

  public setCustomerAccountStatus(
    customerId: string,
    accountStatus: NonNullable<DbCustomer['accountStatus']>
  ): DbCustomer | undefined {
    const customer = this.getCustomerById(customerId);
    if (!customer) return undefined;
    const before = this.cloneSnapshot(customer);
    customer.accountStatus = accountStatus;
    if (accountStatus === 'CANCELLED') customer.status = 'CANCELLED';
    if (accountStatus === 'SUSPENDED' || accountStatus === 'FROZEN') customer.status = 'SUSPENDED';
    if (accountStatus === 'ACTIVE') customer.status = 'ACTIVE';
    if (accountStatus === 'ACTIVE') this.confirmPendingOrders(customer);
    if (accountStatus === 'CANCELLED') {
      this.pendingOrders = this.pendingOrders.filter((order) => order.customerId !== customer.id);
    }
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: customer.id,
      userName: customer.contactName,
      action: 'UPDATE_CUSTOMER_STATUS',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      beforeSnapshot: { accountStatus: before.accountStatus, status: before.status },
      afterSnapshot: { accountStatus: customer.accountStatus, status: customer.status },
    });
    this.persist();
    return customer;
  }

  public getStaffUsers(): DbStaffUser[] {
    return this.staffUsers;
  }

  public getStaffUserByEmail(email: string): DbStaffUser | undefined {
    const normalized = email.trim().toLowerCase();
    return this.staffUsers.find((user) => user.email.toLowerCase() === normalized);
  }

  public getStaffUserById(id: string): DbStaffUser | undefined {
    return this.staffUsers.find((user) => user.id === id);
  }

  private activeAdminCount(): number {
    return this.staffUsers.filter((user) => user.role === 'ADMIN' && user.isActive).length;
  }

  public createStaffUser(
    data: { email: string; fullName: string; role: StaffRole; password: string },
    actor?: DbStaffUser
  ): DbStaffUser {
    const email = data.email.trim().toLowerCase();
    if (this.staffUsers.some((user) => user.email.toLowerCase() === email)) {
      throw new Error('EMAIL_EXISTS');
    }
    const { salt, hash } = hashPin(data.password);
    const user: DbStaffUser = {
      id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email,
      fullName: data.fullName.trim(),
      role: data.role,
      passwordSalt: salt,
      passwordHash: hash,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.staffUsers.push(user);
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: actor?.id || 'system',
      userName: actor?.fullName || 'System',
      action: 'CREATE_USER',
      entityType: 'STAFF_USER',
      entityId: user.id,
      afterSnapshot: { email: user.email, fullName: user.fullName, role: user.role },
    });
    this.persist();
    return user;
  }

  public updateStaffUser(
    userId: string,
    patch: { fullName?: string; role?: StaffRole; isActive?: boolean; password?: string },
    actor?: DbStaffUser
  ): DbStaffUser {
    const user = this.getStaffUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    const before = {
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    };
    const demotingAdmin = user.role === 'ADMIN' && patch.role && patch.role !== 'ADMIN';
    const deactivatingAdmin = user.role === 'ADMIN' && patch.isActive === false;
    if ((demotingAdmin || deactivatingAdmin) && this.activeAdminCount() <= 1) {
      throw new Error('LAST_ADMIN');
    }
    if (patch.isActive === false && actor?.id === user.id) {
      throw new Error('CANNOT_DISABLE_SELF');
    }
    if (patch.fullName) user.fullName = patch.fullName.trim();
    if (patch.role) user.role = patch.role;
    if (patch.isActive !== undefined) user.isActive = patch.isActive;
    let revokedSessions = 0;
    if (patch.password) {
      const { salt, hash } = hashPin(patch.password);
      user.passwordSalt = salt;
      user.passwordHash = hash;
    }
    if (patch.password || patch.role || patch.isActive === false) {
      const beforeCount = this.staffSessions.length;
      this.staffSessions = this.staffSessions.filter((session) => session.userId !== user.id);
      revokedSessions = beforeCount - this.staffSessions.length;
    }
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: actor?.id || 'system',
      userName: actor?.fullName || 'System',
      action: 'UPDATE_USER',
      entityType: 'STAFF_USER',
      entityId: user.id,
      beforeSnapshot: before,
      afterSnapshot: {
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        passwordChanged: Boolean(patch.password),
        revokedSessions,
      },
    });
    this.persist();
    return user;
  }

  public setStaffMfaSecret(userId: string, secret: string): void {
    const user = this.getStaffUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    user.mfaSecret = secret;
    user.mfaEnabled = false;
    this.persist();
  }

  public enableStaffMfa(userId: string, recoveryCodes: string[], actor?: DbStaffUser): void {
    const user = this.getStaffUserById(userId);
    if (!user || !user.mfaSecret) throw new Error('MFA_NOT_READY');
    user.mfaEnabled = true;
    user.recoveryCodeHashes = recoveryCodes.map((code) =>
      sha256(code.replace(/[^A-Z0-9]/gi, '').toUpperCase())
    );
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: actor?.id || user.id,
      userName: actor?.fullName || user.fullName,
      action: 'ENABLE_MFA',
      entityType: 'STAFF_USER',
      entityId: user.id,
      afterSnapshot: { recoveryCodes: user.recoveryCodeHashes.length },
    });
    this.persist();
  }

  public disableStaffMfa(userId: string, actor?: DbStaffUser): void {
    const user = this.getStaffUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.recoveryCodeHashes = undefined;
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: actor?.id || user.id,
      userName: actor?.fullName || user.fullName,
      action: 'DISABLE_MFA',
      entityType: 'STAFF_USER',
      entityId: user.id,
    });
    this.persist();
  }

  public consumeStaffRecoveryCode(userId: string, code: string): boolean {
    const user = this.getStaffUserById(userId);
    if (!user?.recoveryCodeHashes?.length) return false;
    const hash = sha256(code.replace(/[^A-Z0-9]/gi, '').toUpperCase());
    const index = user.recoveryCodeHashes.indexOf(hash);
    if (index === -1) return false;
    user.recoveryCodeHashes.splice(index, 1);
    this.persist();
    return true;
  }

  public listStaffSessions(): {
    tokenHash: string;
    userId: string;
    fullName: string;
    email: string;
    role: string;
    expiresAt: string;
  }[] {
    this.pruneSessions();
    return this.staffSessions.map((session) => {
      const user = this.getStaffUserById(session.userId);
      return {
        tokenHash: session.tokenHash,
        userId: session.userId,
        fullName: user?.fullName || '—',
        email: user?.email || '—',
        role: user?.role || '—',
        expiresAt: session.expiresAt,
      };
    });
  }

  public listClientSessions(): {
    tokenHash: string;
    customerId: string;
    contactName: string;
    phone: string;
    expiresAt: string;
  }[] {
    this.pruneSessions();
    return this.clientSessions.map((session) => {
      const customer = this.getCustomerById(session.customerId);
      return {
        tokenHash: session.tokenHash,
        customerId: session.customerId,
        contactName: customer?.contactName || '—',
        phone: customer?.phone || '—',
        expiresAt: session.expiresAt,
      };
    });
  }

  public revokeStaffSessionHash(tokenHash: string): boolean {
    const before = this.staffSessions.length;
    this.staffSessions = this.staffSessions.filter((session) => session.tokenHash !== tokenHash);
    if (this.staffSessions.length === before) return false;
    this.persist();
    return true;
  }

  public revokeClientSessionHash(tokenHash: string): boolean {
    const before = this.clientSessions.length;
    this.clientSessions = this.clientSessions.filter((session) => session.tokenHash !== tokenHash);
    if (this.clientSessions.length === before) return false;
    this.persist();
    return true;
  }

  public revokeAllSessionsForUser(userId: string): number {
    const before = this.staffSessions.length;
    this.staffSessions = this.staffSessions.filter((session) => session.userId !== userId);
    const removed = before - this.staffSessions.length;
    if (removed > 0) this.persist();
    return removed;
  }

  public async createStaffSession(userId: string): Promise<string> {
    const token = randomUUID();
    this.pruneSessions();
    this.staffSessions.push({
      tokenHash: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + STAFF_SESSION_TTL_MS).toISOString(),
    });
    await this.persistNow();
    return token;
  }

  public getStaffSessionUserId(token: string): string | undefined {
    this.pruneSessions();
    return this.staffSessions.find((session) => session.tokenHash === sha256(token))?.userId;
  }

  public async deleteStaffSession(token: string): Promise<void> {
    const tokenHash = sha256(token);
    this.staffSessions = this.staffSessions.filter((session) => session.tokenHash !== tokenHash);
    await this.persistNow();
  }

  public async createClientSession(customerId: string): Promise<string> {
    const token = randomUUID();
    this.pruneSessions();
    this.clientSessions.push({
      tokenHash: sha256(token),
      customerId,
      expiresAt: new Date(Date.now() + CLIENT_SESSION_TTL_MS).toISOString(),
    });
    await this.persistNow();
    return token;
  }

  public getClientSessionCustomerId(token: string): string | undefined {
    this.pruneSessions();
    return this.clientSessions.find((session) => session.tokenHash === sha256(token))?.customerId;
  }

  public async deleteClientSession(token: string): Promise<void> {
    const tokenHash = sha256(token);
    this.clientSessions = this.clientSessions.filter((session) => session.tokenHash !== tokenHash);
    await this.persistNow();
  }

  public getClientAccounts(): DbCustomer[] {
    return [...this.customers].sort((left, right) =>
      (left.registeredAt || '').localeCompare(right.registeredAt || '')
    );
  }

  private lastOrderDate(customerId: string): string | undefined {
    return this.orders
      .filter((order) => order.customerId === customerId && order.status !== OrderStatus.CANCELLED)
      .map((order) => order.deliveryDate)
      .sort()
      .at(-1);
  }

  public isClientReviewRequired(customer: DbCustomer): boolean {
    const reference =
      this.lastOrderDate(customer.id) ||
      customer.registeredAt?.slice(0, 10) ||
      new Date().toISOString().slice(0, 10);
    const referenceTime = new Date(`${reference}T00:00:00`).getTime();
    const inactiveDays = Math.floor((Date.now() - referenceTime) / (24 * 60 * 60 * 1000));
    if (inactiveDays <= 10) return false;
    return !customer.reviewClearedAt || customer.reviewClearedAt.slice(0, 10) < reference;
  }

  public markClientReviewed(customerId: string): DbCustomer | undefined {
    const customer = this.getCustomerById(customerId);
    if (!customer) return undefined;
    const beforeReview = customer.reviewClearedAt;
    customer.reviewClearedAt = new Date().toISOString();
    this.notify('CLIENT', 'ACCOUNT_REVIEWED', { customerId: customer.id }, customer.id);
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: customer.id,
      userName: customer.contactName,
      action: 'REVIEW_CLIENT',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      beforeSnapshot: { reviewClearedAt: beforeReview || null },
      afterSnapshot: { reviewClearedAt: customer.reviewClearedAt },
    });
    this.persist();
    return customer;
  }

  public updateClientProfile(
    customerId: string,
    patch: {
      contactName?: string;
      phone?: string;
      deliveryAddress?: string;
      distribution?: DbCustomer['distribution'];
    }
  ): DbCustomer | undefined {
    const customer = this.getCustomerById(customerId);
    if (!customer) return undefined;
    const before = this.cloneSnapshot(customer);
    if (patch.phone) {
      const duplicate = this.getCustomerByPhone(patch.phone);
      if (duplicate && duplicate.id !== customer.id) throw new Error('PHONE_EXISTS');
      customer.phone = patch.phone;
      customer.whatsAppLink = `https://wa.me/${normalizePhone(patch.phone)}`;
    }
    if (patch.contactName) customer.contactName = patch.contactName;
    if (patch.deliveryAddress) customer.deliveryAddress = patch.deliveryAddress;
    if (patch.distribution) customer.distribution = patch.distribution;
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: customer.id,
      userName: customer.contactName,
      action: 'UPDATE_CLIENT',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      beforeSnapshot: before,
      afterSnapshot: this.cloneSnapshot(customer),
    });
    this.persist();
    return customer;
  }

  public creditClientAccount(customerId: string, amount: number): DbCustomer | undefined {
    const customer = this.getCustomerById(customerId);
    if (!customer) return undefined;
    const beforeBalance = customer.accountBalance;
    customer.accountBalance = Math.round((customer.accountBalance + amount) * 100) / 100;
    this.notify(
      'CLIENT',
      'ACCOUNT_CREDITED',
      { amount, balance: customer.accountBalance },
      customer.id
    );
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: customer.id,
      userName: customer.contactName,
      action: 'CREDIT_ACCOUNT',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      beforeSnapshot: { balance: beforeBalance },
      afterSnapshot: { amount, balance: customer.accountBalance },
    });
    this.persist();
    return customer;
  }

  private notify(
    audience: DbNotification['audience'],
    type: string,
    data: DbNotification['data'],
    customerId?: string
  ): void {
    this.notifications.unshift({
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      audience,
      customerId,
      type,
      data,
      createdAt: new Date().toISOString(),
    });
    this.notifications = this.notifications.slice(0, 500);
    if (audience === 'CLIENT' && customerId) {
      this.enqueueOutboundForCustomer(customerId, type, data);
    }
  }

  private enqueueOutboundForCustomer(
    customerId: string,
    type: string,
    data: DbNotification['data']
  ): void {
    const customer = this.getCustomerById(customerId);
    if (!customer?.phone) return;
    const orderNumber = data.orderNumber ? String(data.orderNumber) : '';
    const total = data.total !== undefined ? `${Number(data.total).toLocaleString('en-US')} DA` : '';
    const date = data.date ? String(data.date) : '';
    const messages: Record<string, string> = {
      ORDER_CREATED: `جانيتو فود: تم تسجيل طلبكم ${orderNumber}${date ? ` ليوم ${date}` : ''}${total ? ` — ${total}` : ''}.`,
      ORDER_UPDATED: `جانيتو فود: تم تحديث طلبكم ${orderNumber}${total ? ` — ${total}` : ''}.`,
      ORDER_CANCELLED: `جانيتو فود: تم إلغاء طلبكم ${orderNumber}.`,
      ACCOUNT_CREDITED: `جانيتو فود: تمت تعبئة رصيدكم${data.amount !== undefined ? ` بمبلغ ${Number(data.amount).toLocaleString('en-US')} DA` : ''}.`,
      ACCOUNT_REVIEWED: 'جانيتو فود: تمت مراجعة حسابكم، يمكنكم استئناف الطلبات.',
    };
    const body = messages[type];
    if (!body) return;
    const channel: DbOutboundMessage['channel'] =
      process.env.MESSAGING_CHANNEL === 'SMS' ? 'SMS' : 'WHATSAPP';
    this.outboundMessages.unshift({
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      channel,
      to: customer.phone,
      body,
      status: 'QUEUED',
      attempts: 0,
      createdAt: new Date().toISOString(),
      orderNumber: orderNumber || undefined,
    });
    this.outboundMessages = this.outboundMessages.slice(0, 500);
  }

  public getQueuedOutboundMessages(limit = 10): DbOutboundMessage[] {
    return this.outboundMessages
      .filter((message) => message.status === 'QUEUED' && message.attempts < 5)
      .slice(0, limit);
  }

  public markOutboundMessage(
    messageId: string,
    status: DbOutboundMessage['status'],
    error?: string
  ): void {
    const message = this.outboundMessages.find((entry) => entry.id === messageId);
    if (!message) return;
    message.status = status;
    message.attempts += 1;
    message.lastError = error;
    if (status === 'SENT') message.sentAt = new Date().toISOString();
    this.persist();
  }

  public getClientNotifications(customerId: string): DbNotification[] {
    return this.notifications.filter(
      (notification) => notification.audience === 'CLIENT' && notification.customerId === customerId
    );
  }

  public markClientNotificationsRead(customerId: string): void {
    const now = new Date().toISOString();
    for (const notification of this.notifications) {
      if (notification.audience === 'CLIENT' && notification.customerId === customerId && !notification.readAt) {
        notification.readAt = now;
      }
    }
    this.persist();
  }

  public getStaffNotifications(): DbNotification[] {
    return this.notifications.filter((notification) => notification.audience === 'STAFF');
  }

  public markStaffNotificationsRead(): void {
    const now = new Date().toISOString();
    for (const notification of this.notifications) {
      if (notification.audience === 'STAFF' && !notification.readAt) notification.readAt = now;
    }
    this.persist();
  }

  private nextDocumentNumber(prefix: string, date: string): string {
    return `${prefix}-${date.replace(/-/g, '')}-${String(this.invoices.length + this.payments.length + 1).padStart(3, '0')}`;
  }

  private issueOrderInvoice(customer: DbCustomer, order: DbOrder): void {
    if (order.totalPrice <= 0) return;
    const date = new Date().toISOString().slice(0, 10);
    const invoice: DbInvoice = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      invoiceNumber: this.nextDocumentNumber('INV', date),
      customerId: customer.id,
      orderIds: [order.id],
      issueDate: date,
      dueDate: order.deliveryDate,
      totalAmount: order.totalPrice,
      paidAmount: 0,
      status: 'ISSUED',
    };

    if (customer.accountBalance >= order.totalPrice) {
      customer.accountBalance = Math.round((customer.accountBalance - order.totalPrice) * 100) / 100;
      invoice.paidAmount = order.totalPrice;
      invoice.status = 'PAID';
      order.isPaid = true;
      this.payments.push({
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        receiptNumber: this.nextDocumentNumber('REC', date),
        customerId: customer.id,
        invoiceId: invoice.id,
        paymentDate: date,
        amount: order.totalPrice,
        paymentMethod: 'PREPAID_CREDIT',
        notes: `Commande ${order.orderNumber}`,
      });
    } else {
      order.isPaid = false;
    }

    order.invoiceId = invoice.id;
    this.invoices.push(invoice);
  }

  private adjustOrderInvoice(customer: DbCustomer, order: DbOrder, newTotal: number): void {
    const invoice = this.invoices.find(
      (entry) => entry.id === order.invoiceId || entry.orderIds.includes(order.id)
    );
    if (!invoice) return;
    const previousTotal = invoice.totalAmount;
    if (previousTotal === newTotal) return;

    if (invoice.status === 'PAID' || order.isPaid) {
      const delta = newTotal - previousTotal;
      if (delta > 0 && customer.accountBalance < delta) {
        throw new Error('INSUFFICIENT_BALANCE');
      }
      customer.accountBalance = Math.round((customer.accountBalance - delta) * 100) / 100;
      invoice.totalAmount = newTotal;
      invoice.paidAmount = newTotal;
      order.isPaid = true;
      this.payments.push({
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        receiptNumber: this.nextDocumentNumber('REC', new Date().toISOString().slice(0, 10)),
        customerId: customer.id,
        invoiceId: invoice.id,
        paymentDate: new Date().toISOString().slice(0, 10),
        amount: delta,
        paymentMethod: 'PREPAID_CREDIT',
        notes: `Ajustement ${order.orderNumber}`,
      });
    } else {
      invoice.totalAmount = newTotal;
    }
  }

  private cancelOrderInvoice(customer: DbCustomer, order: DbOrder): void {
    const invoice = this.invoices.find(
      (entry) => entry.id === order.invoiceId || entry.orderIds.includes(order.id)
    );
    if (!invoice || invoice.status === 'CANCELLED') return;
    if (invoice.status === 'PAID' && invoice.paidAmount > 0) {
      customer.accountBalance = Math.round((customer.accountBalance + invoice.paidAmount) * 100) / 100;
      this.payments.push({
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        receiptNumber: this.nextDocumentNumber('REC', new Date().toISOString().slice(0, 10)),
        customerId: customer.id,
        invoiceId: invoice.id,
        paymentDate: new Date().toISOString().slice(0, 10),
        amount: -invoice.paidAmount,
        paymentMethod: 'PREPAID_CREDIT',
        notes: `Remboursement ${order.orderNumber}`,
      });
      order.isPaid = false;
    }
    invoice.status = 'CANCELLED';
    invoice.paidAmount = 0;
  }

  private toClientDishView(recipe: DbRecipe): ClientDishView {
    return {
      ...this.toSimpleDishView(recipe),
      price: recipe.price ?? this.settings.lunchPrice,
    };
  }

  public getClientDishes(): ClientDishView[] {
    return this.recipes
      .filter((recipe) => recipe.isActive !== false)
      .map((recipe) => this.toClientDishView(recipe));
  }

  private orderDeadline(date: string): Date {
    const override = this.settings.deadlineOverrides?.[date];
    if (override) {
      const parsed = new Date(override);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const [hours, minutes] = this.settings.cutoffTime.split(':').map(Number);
    const deadline = new Date(`${date}T00:00:00`);
    deadline.setDate(deadline.getDate() - this.settings.cutoffDaysBefore);
    deadline.setHours(hours, minutes, 0, 0);
    return deadline;
  }

  public getClientMenuRange(from: string, to: string): ClientMenuDayView[] {
    return this.getSimpleMenuRange(from, to, 'current').map((day) => {
      const lunchRecipe = day.lunch ? this.getRecipeById(day.lunch.id) : undefined;
      const dinnerRecipe = day.dinner ? this.getRecipeById(day.dinner.id) : undefined;
      const alternatives = this.recipes
        .filter(
          (recipe) =>
            recipe.isActive !== false &&
            recipe.id !== day.lunch?.id &&
            recipe.id !== day.dinner?.id
        )
        .map((recipe) => this.toClientDishView(recipe));
      const deadline = this.orderDeadline(day.date);
      return {
        date: day.date,
        archived: day.archived,
        lunch: lunchRecipe ? this.toClientDishView(lunchRecipe) : null,
        dinner: dinnerRecipe ? this.toClientDishView(dinnerRecipe) : null,
        alternatives,
        orderDeadline: deadline.toISOString(),
        closed:
          Date.now() > deadline.getTime() ||
          (this.settings.closedDates || []).includes(day.date),
      };
    });
  }

  private priceClientOrder(
    day: ClientMenuDayView,
    input: {
      lunchPortions: number;
      dinnerPortions: number;
      lunchPackaging?: PackagingType;
      dinnerPackaging?: PackagingType;
      alternatives: { dishId: string; portions: number }[];
      extras: { name: string; quantity: number }[];
    },
    allowEmpty = false
  ): {
    items: DbOrderItem[];
    extras: NonNullable<DbOrder['extras']>;
    lunchPortions: number;
    dinnerPortions: number;
    mealsCount: number;
    totalPrice: number;
  } {
    const portionValue = (value: unknown): number | null => {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) return null;
      return value;
    };
    const lunchPortions = portionValue(input.lunchPortions);
    const dinnerPortions = portionValue(input.dinnerPortions);
    if (lunchPortions === null || dinnerPortions === null) throw new Error('QUANTITY_INVALID');
    if (lunchPortions + dinnerPortions === 0) {
      const hasAlternatives = input.alternatives.some((entry) => Number(entry.portions) > 0);
      const hasExtras = input.extras.some((entry) => Number(entry.quantity) > 0);
      if (allowEmpty && !hasAlternatives && !hasExtras) {
        return {
          items: [],
          extras: [],
          lunchPortions: 0,
          dinnerPortions: 0,
          mealsCount: 0,
          totalPrice: 0,
        };
      }
      throw new Error('QUANTITY_EMPTY');
    }
    if (lunchPortions > 0 && !day.lunch) throw new Error('NO_LUNCH_DISH');
    if (dinnerPortions > 0 && !day.dinner) throw new Error('NO_DINNER_DISH');
    if (lunchPortions > 0 && !input.lunchPackaging) throw new Error('PACKAGING_REQUIRED');
    if (dinnerPortions > 0 && !input.dinnerPackaging) throw new Error('PACKAGING_REQUIRED');

    const items: DbOrderItem[] = [];
    let totalPrice = 0;
    if (lunchPortions > 0 && day.lunch) {
      items.push({
        id: `item-${Date.now()}-lunch`,
        recipeId: day.lunch.id,
        portions: lunchPortions,
        unitPrice: this.settings.lunchPrice,
      });
      totalPrice += lunchPortions * this.settings.lunchPrice;
    }
    if (dinnerPortions > 0 && day.dinner) {
      items.push({
        id: `item-${Date.now()}-dinner`,
        recipeId: day.dinner.id,
        portions: dinnerPortions,
        unitPrice: this.settings.dinnerPrice,
      });
      totalPrice += dinnerPortions * this.settings.dinnerPrice;
    }

    const familyCounts = new Map<string, number>();
    const addFamily = (family: string | undefined, portions: number): void => {
      if (!family) return;
      familyCounts.set(family, (familyCounts.get(family) || 0) + portions);
    };
    addFamily(day.lunch?.family, lunchPortions);
    addFamily(day.dinner?.family, dinnerPortions);

    const mainDishIds = new Set([day.lunch?.id, day.dinner?.id].filter(Boolean));
    let alternativePortions = 0;
    for (const alternative of input.alternatives) {
      const portions = portionValue(alternative.portions);
      if (portions === null) throw new Error('QUANTITY_INVALID');
      if (portions === 0) continue;
      const recipe = this.getRecipeById(alternative.dishId);
      if (!recipe || recipe.isActive === false || mainDishIds.has(recipe.id)) {
        throw new Error('ALTERNATIVE_UNAVAILABLE');
      }
      const unitPrice = recipe.price ?? this.settings.lunchPrice;
      items.push({
        id: `item-${Date.now()}-${items.length}`,
        recipeId: recipe.id,
        portions,
        unitPrice,
      });
      alternativePortions += portions;
      addFamily(recipe.family, portions);
      totalPrice += portions * unitPrice;
    }

    const mealsCount = lunchPortions + dinnerPortions;
    const totalMeals = mealsCount + alternativePortions;
    const extras: NonNullable<DbOrder['extras']> = [];
    for (const requested of input.extras) {
      const configured = this.settings.extras.find((extra) => extra.name === requested.name);
      if (!configured) throw new Error('EXTRA_UNAVAILABLE');
      const quantity = portionValue(requested.quantity);
      const perMeals = configured.perMeals && configured.perMeals > 0 ? configured.perMeals : 1;
      const eligibleMeals = configured.families?.length
        ? configured.families.reduce((sum, family) => sum + (familyCounts.get(family) || 0), 0)
        : totalMeals;
      const suggested = Math.ceil(eligibleMeals / perMeals);
      if (quantity === null || quantity > suggested) throw new Error('EXTRA_QUANTITY_INVALID');
      if (quantity === 0) continue;
      extras.push({ name: configured.name, quantity, unitPrice: configured.price });
      totalPrice += quantity * configured.price;
    }
    totalPrice += this.settings.deliveryPrice + this.settings.packagingPrice * mealsCount;

    return { items, extras, lunchPortions, dinnerPortions, mealsCount, totalPrice };
  }

  public placeClientOrder(input: {
    customer: DbCustomer;
    date: string;
    lunchPortions: number;
    dinnerPortions: number;
    lunchPackaging?: PackagingType;
    dinnerPackaging?: PackagingType;
    alternatives: { dishId: string; portions: number }[];
    extras: { name: string; quantity: number }[];
    notes?: string;
    source?: 'CLIENT' | 'AUTOMATIC';
    bypassCutoff?: boolean;
    allowEmpty?: boolean;
  }): DbOrder {
    const customer = this.getCustomerById(input.customer.id);
    if (!customer) throw new Error('ACCOUNT_NOT_FOUND');
    if (customer.accountStatus !== 'ACTIVE') throw new Error('ACCOUNT_NOT_ACTIVE');
    if (this.isClientReviewRequired(customer)) throw new Error('REVIEW_REQUIRED');

    const day = this.getClientMenuRange(input.date, input.date)[0];
    if (!day || (!day.lunch && !day.dinner)) throw new Error('NO_MENU');
    if (day.closed && !input.bypassCutoff) throw new Error('ORDER_CLOSED');

    const priced = this.priceClientOrder(day, input, input.allowEmpty);
    const zeroOrder = priced.mealsCount === 0 && priced.items.length === 0;
    const order: DbOrder = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      orderNumber: `JNT-${input.date.replace(/-/g, '')}-${String(this.orders.length + 1).padStart(3, '0')}`,
      customerId: customer.id,
      deliveryDate: input.date,
      serviceTime: priced.lunchPortions > 0 ? MealServiceTime.LUNCH : MealServiceTime.DINNER,
      status: zeroOrder ? OrderStatus.CANCELLED : OrderStatus.CONFIRMED,
      cancellationReason: zeroOrder ? 'ZERO_QUANTITY' : undefined,
      totalPortions: priced.mealsCount,
      lunchPortions: priced.lunchPortions,
      dinnerPortions: priced.dinnerPortions,
      deliveryAddress: customer.deliveryAddress,
      notes: input.notes?.trim() || undefined,
      items: priced.items,
      packaging: {
        lunch: priced.lunchPortions > 0 ? input.lunchPackaging : undefined,
        dinner: priced.dinnerPortions > 0 ? input.dinnerPackaging : undefined,
      },
      extras: priced.extras,
      source: input.source || 'CLIENT',
      orderMode: 'MENU',
      createdAt: new Date().toISOString(),
      orderType:
        input.source === 'AUTOMATIC'
          ? 'WEEKLY'
          : customer.companyName
            ? 'CORPORATE'
            : 'INDIVIDUAL',
      supplementsCost: priced.extras.reduce(
        (sum, extra) => sum + extra.quantity * extra.unitPrice,
        0
      ),
      totalPrice: priced.totalPrice,
      isPaid: false,
    };
    this.orders.push(order);
    if (!zeroOrder) {
      this.issueOrderInvoice(customer, order);
      this.notify(
        'CLIENT',
        'ORDER_CREATED',
        { orderNumber: order.orderNumber, total: order.totalPrice, date: order.deliveryDate },
        customer.id
      );
      this.notify(
        'STAFF',
        'ORDER_CREATED',
        {
          orderNumber: order.orderNumber,
          customer: customer.contactName,
          total: order.totalPrice,
          date: order.deliveryDate,
        },
        customer.id
      );
    }
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: customer.id,
      userName: customer.contactName,
      action: 'CREATE_ORDER',
      entityType: 'ORDER',
      entityId: order.id,
      afterSnapshot: {
        orderNumber: order.orderNumber,
        totalPrice: order.totalPrice,
        source: order.source,
      },
    });
    this.persist();
    return order;
  }

  public getOrCreateGuestCustomer(data: {
    contactName: string;
    phone: string;
    deliveryAddress: string;
  }): DbCustomer {
    const existing = this.getCustomerByPhone(data.phone);
    if (existing) {
      if (!existing.deliveryAddress && data.deliveryAddress) {
        existing.deliveryAddress = data.deliveryAddress;
      }
      return existing;
    }
    return this.createClientAccount({
      contactName: data.contactName,
      phone: data.phone,
      deliveryAddress: data.deliveryAddress,
      pinSalt: '',
      pinHash: '',
      active: false,
    });
  }

  public placeClientCatalogueOrder(input: {
    customer: DbCustomer;
    date: string;
    serviceTime: MealServiceTime;
    items: { dishId: string; portions: number }[];
    packaging: PackagingType;
    extras: { name: string; quantity: number }[];
    notes?: string;
    pending?: boolean;
  }): DbOrder {
    const customer = this.getCustomerById(input.customer.id);
    if (!customer) throw new Error('ACCOUNT_NOT_FOUND');
    if (input.pending) {
      if (['SUSPENDED', 'FROZEN', 'CANCELLED'].includes(customer.accountStatus || 'ACTIVE')) {
        throw new Error('ACCOUNT_NOT_ACTIVE');
      }
    } else {
      if (customer.accountStatus !== 'ACTIVE') throw new Error('ACCOUNT_NOT_ACTIVE');
      if (this.isClientReviewRequired(customer)) throw new Error('REVIEW_REQUIRED');
    }
    if (input.serviceTime !== MealServiceTime.LUNCH && input.serviceTime !== MealServiceTime.DINNER) {
      throw new Error('SERVICE_INVALID');
    }
    if ((this.settings.closedDates || []).includes(input.date)) throw new Error('ORDER_CLOSED');
    if (Date.now() > this.orderDeadline(input.date).getTime()) throw new Error('ORDER_CLOSED');
    if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 30) {
      throw new Error('CATALOGUE_EMPTY');
    }

    const merged = new Map<string, number>();
    for (const entry of input.items) {
      const recipe = this.getRecipeById(String(entry.dishId));
      if (!recipe || recipe.isActive === false) throw new Error('DISH_UNAVAILABLE');
      const portions = Number(entry.portions);
      if (!Number.isInteger(portions) || portions < 1 || portions > 100) throw new Error('QUANTITY_INVALID');
      merged.set(recipe.id, (merged.get(recipe.id) || 0) + portions);
    }

    const familyCounts = new Map<string, number>();
    const items: DbOrderItem[] = [];
    let totalPortions = 0;
    let itemsTotal = 0;
    for (const [dishId, portions] of merged) {
      const recipe = this.getRecipeById(dishId)!;
      const unitPrice = recipe.price ?? this.settings.lunchPrice;
      items.push({
        id: `item-${Date.now()}-${items.length}`,
        recipeId: recipe.id,
        portions,
        unitPrice,
      });
      totalPortions += portions;
      itemsTotal += portions * unitPrice;
      if (recipe.family) {
        familyCounts.set(recipe.family, (familyCounts.get(recipe.family) || 0) + portions);
      }
    }

    const extras: NonNullable<DbOrder['extras']> = [];
    let extrasTotal = 0;
    for (const requested of input.extras) {
      const configured = this.settings.extras.find((extra) => extra.name === requested.name);
      if (!configured) throw new Error('EXTRA_UNAVAILABLE');
      const quantity = Number(requested.quantity);
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100) throw new Error('QUANTITY_INVALID');
      if (quantity === 0) continue;
      const perMeals = configured.perMeals && configured.perMeals > 0 ? configured.perMeals : 1;
      const eligible = configured.families?.length
        ? configured.families.reduce((sum, family) => sum + (familyCounts.get(family) || 0), 0)
        : totalPortions;
      if (quantity > Math.ceil(eligible / perMeals)) throw new Error('EXTRA_QUANTITY_INVALID');
      extras.push({ name: configured.name, quantity, unitPrice: configured.price });
      extrasTotal += quantity * configured.price;
    }

    const totalPrice =
      itemsTotal +
      extrasTotal +
      this.settings.deliveryPrice +
      this.settings.packagingPrice * totalPortions;

    const order: DbOrder = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      orderNumber: `JNT-${input.date.replace(/-/g, '')}-${String(this.orders.length + this.pendingOrders.length + 1).padStart(3, '0')}`,
      customerId: customer.id,
      deliveryDate: input.date,
      serviceTime: input.serviceTime,
      status: input.pending ? OrderStatus.DRAFT : OrderStatus.CONFIRMED,
      totalPortions,
      lunchPortions: 0,
      dinnerPortions: 0,
      deliveryAddress: customer.deliveryAddress,
      notes: input.notes?.trim() || undefined,
      items,
      packaging:
        input.serviceTime === MealServiceTime.LUNCH
          ? { lunch: input.packaging }
          : { dinner: input.packaging },
      extras,
      source: 'CLIENT',
      orderMode: 'CATALOGUE',
      createdAt: new Date().toISOString(),
      orderType: customer.companyName ? 'CORPORATE' : 'INDIVIDUAL',
      supplementsCost: extrasTotal,
      totalPrice,
      isPaid: false,
    };
    if (input.pending) {
      this.pendingOrders.push(order);
    } else {
      this.orders.push(order);
      this.issueOrderInvoice(customer, order);
      this.notify(
        'CLIENT',
        'ORDER_CREATED',
        { orderNumber: order.orderNumber, total: order.totalPrice, date: order.deliveryDate },
        customer.id
      );
    }
    this.notify(
      'STAFF',
      input.pending ? 'ORDER_PENDING' : 'ORDER_CREATED',
      {
        orderNumber: order.orderNumber,
        customer: customer.contactName,
        total: order.totalPrice,
        date: order.deliveryDate,
      },
      customer.id
    );
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: customer.id,
      userName: customer.contactName,
      action: input.pending ? 'CREATE_PENDING_ORDER' : 'CREATE_ORDER',
      entityType: 'ORDER',
      entityId: order.id,
      afterSnapshot: {
        orderNumber: order.orderNumber,
        totalPrice: order.totalPrice,
        totalPortions: order.totalPortions,
        orderMode: 'CATALOGUE',
        status: order.status,
        items: items.map((item) => ({ dishId: item.recipeId, portions: item.portions })),
      },
    });
    this.persist();
    return order;
  }

  public getClientOrders(customerId: string): ClientOrderView[] {
    return this.orders
      .filter((order) => order.customerId === customerId)
      .sort((left, right) => right.deliveryDate.localeCompare(left.deliveryDate) || right.createdAt.localeCompare(left.createdAt))
      .map((order) => {
        const day = this.getSimpleMenuDay(order.deliveryDate);
        const lunchItem = order.items.find((item) => item.recipeId === day.lunch?.id);
        const dinnerItem = order.items.find((item) => item.recipeId === day.dinner?.id);
        const lunchPortions = order.lunchPortions ?? lunchItem?.portions ?? 0;
        const dinnerPortions = order.dinnerPortions ?? dinnerItem?.portions ?? 0;
        const alternatives = order.orderMode === 'CATALOGUE'
          ? []
          : order.items
              .filter((item) => item.recipeId !== day.lunch?.id && item.recipeId !== day.dinner?.id)
              .map((item) => ({ dishId: item.recipeId, portions: item.portions }));
        const deadline = this.orderDeadline(order.deliveryDate);
        const invoice = this.invoices.find(
          (entry) => entry.id === order.invoiceId || entry.orderIds.includes(order.id)
        );
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          deliveryDate: order.deliveryDate,
          serviceTime: order.serviceTime,
          status: order.status,
          totalPortions: order.totalPortions,
          totalPrice: order.totalPrice,
          lunchPortions,
          dinnerPortions,
          alternatives,
          packaging: order.packaging,
          extras: order.extras || [],
          notes: order.notes,
          source: order.source,
          orderMode: order.orderMode || 'MENU',
          items:
            order.orderMode === 'CATALOGUE'
              ? order.items.map((item) => ({
                  dishId: item.recipeId,
                  name: this.getRecipeById(item.recipeId)?.nameAr || this.getRecipeById(item.recipeId)?.name || '—',
                  portions: item.portions,
                  unitPrice: item.unitPrice ?? 0,
                }))
              : undefined,
          editable:
            order.orderMode !== 'CATALOGUE' &&
            order.status === OrderStatus.CONFIRMED &&
            (order.source || 'CLIENT') !== 'ADMIN' &&
            Date.now() <= deadline.getTime(),
          invoiceNumber: invoice?.invoiceNumber,
          isPaid: Boolean(order.isPaid),
        };
      });
  }

  public getPendingClientOrders(customerId: string): ClientOrderView[] {
    return this.pendingOrders
      .filter((order) => order.customerId === customerId)
      .map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        deliveryDate: order.deliveryDate,
        serviceTime: order.serviceTime,
        status: 'PENDING_APPROVAL',
        totalPortions: order.totalPortions,
        totalPrice: order.totalPrice,
        lunchPortions: 0,
        dinnerPortions: 0,
        alternatives: [],
        packaging: order.packaging,
        extras: order.extras || [],
        notes: order.notes,
        source: order.source,
        orderMode: order.orderMode || 'CATALOGUE',
        items: order.items.map((item) => ({
          dishId: item.recipeId,
          name: this.getRecipeById(item.recipeId)?.nameAr || this.getRecipeById(item.recipeId)?.name || '—',
          portions: item.portions,
          unitPrice: item.unitPrice ?? 0,
        })),
        editable: false,
        isPaid: false,
      }));
  }

  public updateClientOrder(
    customerId: string,
    orderId: string,
    input: {
      lunchPortions: number;
      dinnerPortions: number;
      lunchPackaging?: PackagingType;
      dinnerPackaging?: PackagingType;
      alternatives: { dishId: string; portions: number }[];
      extras: { name: string; quantity: number }[];
      notes?: string;
    }
  ): DbOrder {
    const order = this.orders.find((entry) => entry.id === orderId && entry.customerId === customerId);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    if (order.orderMode === 'CATALOGUE') throw new Error('ORDER_NOT_EDITABLE');
    if (order.status !== OrderStatus.CONFIRMED) throw new Error('ORDER_NOT_EDITABLE');
    const before = this.cloneSnapshot(order);
    const day = this.getClientMenuRange(order.deliveryDate, order.deliveryDate)[0];
    if (!day || (!day.lunch && !day.dinner)) throw new Error('NO_MENU');
    if (day.closed) throw new Error('ORDER_CLOSED');

    const customer = this.getCustomerById(customerId);
    if (!customer) throw new Error('ACCOUNT_NOT_FOUND');
    const priced = this.priceClientOrder(day, input);
    this.adjustOrderInvoice(customer, order, priced.totalPrice);
    order.items = priced.items;
    order.extras = priced.extras;
    order.lunchPortions = priced.lunchPortions;
    order.dinnerPortions = priced.dinnerPortions;
    order.totalPortions = priced.mealsCount;
    order.totalPrice = priced.totalPrice;
    order.supplementsCost = priced.extras.reduce(
      (sum, extra) => sum + extra.quantity * extra.unitPrice,
      0
    );
    order.packaging = {
      lunch: priced.lunchPortions > 0 ? input.lunchPackaging : undefined,
      dinner: priced.dinnerPortions > 0 ? input.dinnerPackaging : undefined,
    };
    order.serviceTime = priced.lunchPortions > 0 ? MealServiceTime.LUNCH : MealServiceTime.DINNER;
    order.notes = input.notes?.trim() || undefined;
    this.notify(
      'CLIENT',
      'ORDER_UPDATED',
      { orderNumber: order.orderNumber, total: order.totalPrice, date: order.deliveryDate },
      customerId
    );
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: customerId,
      userName: this.getCustomerById(customerId)?.contactName || 'Client',
      action: 'UPDATE_ORDER',
      entityType: 'ORDER',
      entityId: order.id,
      beforeSnapshot: { orderNumber: before.orderNumber, totalPrice: before.totalPrice, items: before.items, extras: before.extras },
      afterSnapshot: { orderNumber: order.orderNumber, totalPrice: order.totalPrice, items: order.items, extras: order.extras },
    });
    this.persist();
    return order;
  }

  public cancelClientOrder(customerId: string, orderId: string): DbOrder {
    const order = this.orders.find((entry) => entry.id === orderId && entry.customerId === customerId);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    if (order.status !== OrderStatus.CONFIRMED) throw new Error('ORDER_NOT_EDITABLE');
    const before = this.cloneSnapshot(order);
    const deadline = this.orderDeadline(order.deliveryDate);
    if (Date.now() > deadline.getTime()) throw new Error('ORDER_CLOSED');
    const customer = this.getCustomerById(customerId);
    if (!customer) throw new Error('ACCOUNT_NOT_FOUND');
    this.cancelOrderInvoice(customer, order);
    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date().toISOString();
    order.cancellationReason = 'CLIENT_CANCELLED';
    this.notify(
      'CLIENT',
      'ORDER_CANCELLED',
      { orderNumber: order.orderNumber, date: order.deliveryDate },
      customerId
    );
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: customerId,
      userName: this.getCustomerById(customerId)?.contactName || 'Client',
      action: 'CANCEL_ORDER',
      entityType: 'ORDER',
      entityId: order.id,
      beforeSnapshot: { orderNumber: before.orderNumber, status: before.status, totalPrice: before.totalPrice },
      afterSnapshot: { orderNumber: order.orderNumber, status: order.status, cancellationReason: order.cancellationReason },
    });
    this.persist();
    return order;
  }

  public getClientProgram(customerId: string): ClientProgramEntry[] {
    const customer = this.getCustomerById(customerId);
    return Array.from({ length: 7 }, (_, weekday) => {
      const entry = customer?.weeklyProgram?.find((item) => item.weekday === weekday);
      return {
        weekday,
        lunchPortions: entry?.lunchPortions || 0,
        dinnerPortions: entry?.dinnerPortions || 0,
        lunchPackaging: entry?.lunchPackaging || 'INDIVIDUAL',
        dinnerPackaging: entry?.dinnerPackaging || 'INDIVIDUAL',
      };
    });
  }

  public updateClientProgram(
    customerId: string,
    entries: ClientProgramEntry[]
  ): ClientProgramEntry[] {
    const customer = this.getCustomerById(customerId);
    if (!customer) throw new Error('ACCOUNT_NOT_FOUND');
    customer.weeklyProgram = entries
      .filter((entry) => entry.lunchPortions + entry.dinnerPortions > 0)
      .map((entry) => ({
        weekday: entry.weekday,
        lunchPortions: entry.lunchPortions,
        dinnerPortions: entry.dinnerPortions,
        lunchPackaging: entry.lunchPortions > 0 ? entry.lunchPackaging || 'INDIVIDUAL' : undefined,
        dinnerPackaging: entry.dinnerPortions > 0 ? entry.dinnerPackaging || 'INDIVIDUAL' : undefined,
      }));
    this.persist();
    return this.getClientProgram(customerId);
  }

  public generateProgramOrders(from: string, to: string, customerId?: string): DbOrder[] {
    const created: DbOrder[] = [];
    const customers = customerId
      ? [this.getCustomerById(customerId)].filter(
          (customer): customer is DbCustomer => Boolean(customer)
        )
      : this.customers;
    let cursor = from;
    for (let guard = 0; guard < 31 && cursor <= to; guard++) {
      if ((this.settings.closedDates || []).includes(cursor)) {
        cursor = addDaysIso(cursor, 1);
        continue;
      }
      const weekday = new Date(`${cursor}T12:00:00`).getDay();
      for (const customer of customers) {
        if (customer.accountStatus !== 'ACTIVE') continue;
        const entry = customer.weeklyProgram?.find((item) => item.weekday === weekday);
        if (!entry || entry.lunchPortions + entry.dinnerPortions === 0) continue;
        // A cancelled order still blocks regeneration: cancellation is the
        // customer's decision for that specific day.
        const duplicate = this.orders.some(
          (order) => order.customerId === customer.id && order.deliveryDate === cursor
        );
        if (duplicate) continue;
        try {
          created.push(
            this.placeClientOrder({
              customer,
              date: cursor,
              lunchPortions: entry.lunchPortions,
              dinnerPortions: entry.dinnerPortions,
              lunchPackaging: entry.lunchPackaging || 'INDIVIDUAL',
              dinnerPackaging: entry.dinnerPackaging || 'INDIVIDUAL',
              alternatives: [],
              extras: [],
              notes: 'طلب تلقائي — البرنامج الأسبوعي',
              source: 'AUTOMATIC',
              bypassCutoff: true,
            })
          );
        } catch {
          // No published menu or missing dish for that date: skip.
        }
      }
      cursor = addDaysIso(cursor, 1);
    }
    return created;
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
    this.persist();
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
      orderType: 'EXCEPTIONAL',
      supplementsCost: 0,
      totalPrice: 0,
      isPaid: false,
    };

    this.orders.unshift(newOrder);
    this.persist();
    return newOrder;
  }

  public updateOrderStatus(id: string, status: OrderStatus): DbOrder | undefined {
    const order = this.getOrderById(id);
    if (order) {
      const beforeStatus = order.status;
      order.status = status;
      this.auditLogs.unshift({
        id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        userId: 'system',
        userName: 'Workflow',
        action: 'UPDATE_ORDER_STATUS',
        entityType: 'ORDER',
        entityId: order.id,
        beforeSnapshot: { orderNumber: order.orderNumber, status: beforeStatus },
        afterSnapshot: { orderNumber: order.orderNumber, status: order.status },
      });
      this.persist();
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
        supplierId: ing.supplierId || '',
        supplierName: supplier ? supplier.name : 'Fournisseur non assigné',
      });
    }

    const totalMealPortions = recipes.reduce((sum, r) => sum + r.totalPortions, 0);

    return {
      date: targetDate,
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
    this.persist();
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
    this.persist();
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
    this.persist();
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
    this.persist();
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
      this.persist();
    }
    return batch;
  }

  // ==========================================
  // Phase 1: Audit Trail Logging
  // ==========================================
  private pruneAuditLogs(): void {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - AUDIT_RETENTION_YEARS);
    const cutoffIso = cutoff.toISOString();
    this.auditLogs = this.auditLogs.filter((entry) => entry.timestamp >= cutoffIso);
  }

  public logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const log: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    this.pruneAuditLogs();
    this.persist();
    return log;
  }

  public getAuditLogs(filters?: { entityType?: string; action?: string; limit?: number }): AuditLogEntry[] {
    this.pruneAuditLogs();
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
      const lunchHasFries =
        Boolean(lunchMain?.flags?.includes('FRIES')) ||
        lunchName.includes('frite') ||
        lunchName.includes('pommes de terre');
      const dinnerHasFries =
        Boolean(dinnerMain?.flags?.includes('FRIES')) ||
        dinnerName.includes('frite') ||
        dinnerName.includes('pommes de terre');
      if (lunchHasFries && dinnerHasFries) {
        violations.push({
          date,
          ruleName: 'INTERDICTION_FRITES_MIDI_SOIR',
          severity: 'ERROR',
          message: `Règle enfreinte le ${date} : Interdiction de servir des frites/pommes de terre à la fois au déjeuner (${lunchMain?.name}) et au dîner (${dinnerMain?.name}).`,
        });
      }

      // Rule 6: Interdiction viande hachée midi + soir le même jour
      const lunchHasMinced =
        Boolean(lunchMain?.flags?.includes('MINCED')) ||
        lunchName.includes('haché') ||
        lunchName.includes('boulette');
      const dinnerHasMinced =
        Boolean(dinnerMain?.flags?.includes('MINCED')) ||
        dinnerName.includes('haché') ||
        dinnerName.includes('boulette');
      if (lunchHasMinced && dinnerHasMinced) {
        violations.push({
          date,
          ruleName: 'INTERDICTION_VIANDE_HACHEE_MIDI_SOIR',
          severity: 'ERROR',
          message: `Règle enfreinte le ${date} : Interdiction de servir de la viande hachée au déjeuner et au dîner le même jour.`,
        });
      }

      // Rule 2: Pâtes/Spaghetti 1x/semaine max au déjeuner
      if (
        lunchMain?.family === 'PASTA' ||
        lunchMain?.flags?.includes('PASTA') ||
        lunchName.includes('pâte') ||
        lunchName.includes('spaghetti') ||
        lunchName.includes('macaroni')
      ) {
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

      // BR-025: éviter le même composant principal midi + soir.
      if (
        lunchMain?.mainIngredient &&
        lunchMain.mainIngredient === dinnerMain?.mainIngredient
      ) {
        violations.push({
          date,
          ruleName: 'MEME_COMPOSANT_PRINCIPAL',
          severity: 'WARNING',
          message: `Alerte le ${date} : le même composant principal (${lunchMain.mainIngredient}) est programmé au déjeuner et au dîner.`,
        });
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

  public validateMenuRange(from: string, to: string): { isValid: boolean; violations: MenuRuleViolation[] } {
    return this.validateMenuCalendarRules(
      this.mealPlans.filter((plan) => plan.date >= from && plan.date <= to)
    );
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
    this.persist();
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
    this.persist();
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
        staffUsers: this.staffUsers,
        notifications: this.notifications,
        outboundMessages: this.outboundMessages,
        settings: this.settings,
      },
    };
  }

  public restoreDatabaseFromBackup(backup: { data: Record<string, unknown> }): boolean {
    if (!backup || typeof backup.data !== 'object') return false;
    const d = backup.data;
    if (Array.isArray(d.customers)) this.customers = d.customers as DbCustomer[];
    if (Array.isArray(d.orders)) this.orders = d.orders as DbOrder[];
    if (Array.isArray(d.pendingOrders)) this.pendingOrders = d.pendingOrders as DbOrder[];
    if (Array.isArray(d.recipes)) this.recipes = d.recipes as DbRecipe[];
    if (Array.isArray(d.ingredients)) this.ingredients = d.ingredients as DbIngredient[];
    if (Array.isArray(d.invoices)) this.invoices = d.invoices as DbInvoice[];
    if (Array.isArray(d.payments)) this.payments = d.payments as DbPayment[];
    if (Array.isArray(d.staffUsers)) this.staffUsers = d.staffUsers as DbStaffUser[];
    if (Array.isArray(d.notifications)) this.notifications = d.notifications as DbNotification[];
    if (Array.isArray(d.outboundMessages)) this.outboundMessages = d.outboundMessages as DbOutboundMessage[];
    if (d.settings) this.settings = this.normalizeSettings(d.settings);
    this.persist();
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
