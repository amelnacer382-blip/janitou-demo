import {
  MealServiceTime,
  OrderStatus,
  ComponentCategory,
  UnitOfMeasure,
  UserRole,
} from '@janitou/common';

export interface DbSupplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
}

export interface DbIngredient {
  id: string;
  name: string;
  unit: UnitOfMeasure;
  currentStock: number;
  minimumThreshold: number;
  unitCost: number; // in DZD / local currency
  supplierId: string;
}

export interface DbRecipeIngredient {
  ingredientId: string;
  quantityPerPortion: number;
  unit: UnitOfMeasure;
}

export interface DbRecipe {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  yieldPortions: number;
  preparationTimeMinutes: number;
  allergens: string[];
  ingredients: DbRecipeIngredient[];
}

export interface DbCustomer {
  id: string;
  companyName?: string;
  contactName: string;
  phone: string;
  email: string;
  deliveryAddress: string;
  wilaya: string;
  commune: string;
  deliveryNotes?: string;
  dietaryPreferences: string[];
  parentCompanyId?: string;
  isSubsidiary?: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  accountBalance: number; // in DZD (solde prépayé/crédit)
  whatsAppLink: string;
  subscriptionType: 'INDIVIDUAL' | 'CORPORATE' | 'SUBSIDIARY';
  preferredDistributionType: 'STANDARD_DELIVERY' | 'EXPRESS' | 'PICKUP';
}

export interface DbMealPlan {
  id: string;
  date: string; // YYYY-MM-DD
  serviceTime: MealServiceTime;
  starterRecipeId?: string;
  mainCourseRecipeId: string;
  sideDishRecipeId?: string;
  dessertRecipeId?: string;
  notes?: string;
}

export interface DbOrderItem {
  id: string;
  recipeId: string;
  portions: number;
  specialNotes?: string;
}

export interface DbOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  deliveryDate: string; // YYYY-MM-DD
  serviceTime: MealServiceTime;
  status: OrderStatus;
  totalPortions: number;
  deliveryAddress: string;
  notes?: string;
  items: DbOrderItem[];
  createdAt: string;
  orderType: 'AUTOMATIC' | 'WEEKLY' | 'EXCEPTIONAL' | 'SUBSIDIARY' | 'CORPORATE' | 'INDIVIDUAL';
  supplementsCost: number; // in DZD
  totalPrice: number; // in DZD
  isPaid: boolean;
  invoiceId?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface DbInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  orderIds: string[];
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE';
}

export interface DbPayment {
  id: string;
  receiptNumber: string;
  customerId: string;
  invoiceId?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'CASH' | 'CHECK' | 'BANK_TRANSFER' | 'PREPAID_CREDIT';
  notes?: string;
}

export interface DbProductionBatch {
  id: string;
  productionDate: string; // YYYY-MM-DD
  serviceTime: MealServiceTime;
  recipeId: string;
  plannedPortions: number;
  actualProducedPortions?: number;
  status: 'PLANNED' | 'IN_PREPARATION' | 'COMPLETED';
  notes?: string;
}

export interface DbPurchaseOrderItem {
  ingredientId: string;
  quantity: number;
  unitCost: number;
}

export interface DbPurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  orderDate: string;
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';
  totalCost: number;
  items: DbPurchaseOrderItem[];
  notes?: string;
}

export interface DbDeliveryStop {
  id: string;
  orderId: string;
  sequence: number;
  deliveryStatus: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  deliveredAt?: string;
  driverComment?: string;
}

export interface DbDeliveryRun {
  id: string;
  runDate: string; // YYYY-MM-DD
  serviceTime: MealServiceTime;
  driverName: string;
  driverPhone: string;
  status: 'PLANNED' | 'DISPATCHED' | 'COMPLETED';
  stops: DbDeliveryStop[];
}

// Initial Realistic Seed Data for JANITOU FOOD
export const initialSuppliers: DbSupplier[] = [
  {
    id: 'sup-1',
    name: 'Marché Central Frais',
    contactPerson: 'Mourad Cherif',
    phone: '0550 12 34 56',
    email: 'contact@marchecentral.dz',
    address: 'Halles Centrales, Alger',
    paymentTerms: 'Paiement à 30 jours',
  },
  {
    id: 'sup-2',
    name: 'Boucherie & Volailles Atlas',
    contactPerson: 'Samir Brahimi',
    phone: '0661 98 76 54',
    email: 'volailles.atlas@mail.dz',
    address: 'Zone Industrielle Oued Smar, Alger',
    paymentTerms: 'Comptant à la livraison',
  },
  {
    id: 'sup-3',
    name: 'Épicerie & Grains El Bahia',
    contactPerson: 'Karim Zouaoui',
    phone: '0770 45 67 89',
    email: 'elbahia.grains@mail.dz',
    address: 'Route de Dar El Beïda, Alger',
    paymentTerms: 'Paiement à 15 jours',
  },
  {
    id: 'sup-4',
    name: 'Packaging & Emballages Éco-Vert',
    contactPerson: 'Nadia Belkacem',
    phone: '0560 33 22 11',
    email: 'contact@ecovert-packaging.dz',
    address: 'Zone d’Activité Chéraga, Alger',
    paymentTerms: 'Paiement à 30 jours',
  },
];

export const initialIngredients: DbIngredient[] = [
  { id: 'ing-1', name: 'Filet de Poulet Frais', unit: UnitOfMeasure.KILOGRAM, currentStock: 35.5, minimumThreshold: 20.0, unitCost: 850, supplierId: 'sup-2' },
  { id: 'ing-2', name: 'Riz Basmati Extra', unit: UnitOfMeasure.KILOGRAM, currentStock: 60.0, minimumThreshold: 25.0, unitCost: 320, supplierId: 'sup-3' },
  { id: 'ing-3', name: 'Huile d’Olive Vierge', unit: UnitOfMeasure.LITER, currentStock: 18.0, minimumThreshold: 10.0, unitCost: 1100, supplierId: 'sup-3' },
  { id: 'ing-4', name: 'Carottes Maraîchères', unit: UnitOfMeasure.KILOGRAM, currentStock: 22.0, minimumThreshold: 15.0, unitCost: 90, supplierId: 'sup-1' },
  { id: 'ing-5', name: 'Courgettes Fraîches', unit: UnitOfMeasure.KILOGRAM, currentStock: 14.0, minimumThreshold: 12.0, unitCost: 140, supplierId: 'sup-1' },
  { id: 'ing-6', name: 'Pommes de Terre Spéciales Four', unit: UnitOfMeasure.KILOGRAM, currentStock: 45.0, minimumThreshold: 30.0, unitCost: 85, supplierId: 'sup-1' },
  { id: 'ing-7', name: 'Tomates Rondes', unit: UnitOfMeasure.KILOGRAM, currentStock: 28.0, minimumThreshold: 15.0, unitCost: 110, supplierId: 'sup-1' },
  { id: 'ing-8', name: 'Oignons Jaunes', unit: UnitOfMeasure.KILOGRAM, currentStock: 30.0, minimumThreshold: 20.0, unitCost: 70, supplierId: 'sup-1' },
  { id: 'ing-9', name: 'Semoule Moyenne de Blé Dur', unit: UnitOfMeasure.KILOGRAM, currentStock: 40.0, minimumThreshold: 25.0, unitCost: 160, supplierId: 'sup-3' },
  { id: 'ing-10', name: 'Chocolat Noir Pâtissier 64%', unit: UnitOfMeasure.KILOGRAM, currentStock: 8.5, minimumThreshold: 5.0, unitCost: 1450, supplierId: 'sup-3' },
  { id: 'ing-11', name: 'Oeufs Frais Fermiers', unit: UnitOfMeasure.PIECE, currentStock: 180, minimumThreshold: 90, unitCost: 22, supplierId: 'sup-2' },
  { id: 'ing-12', name: 'Barquettes Kraft Écologiques 750ml', unit: UnitOfMeasure.PIECE, currentStock: 450, minimumThreshold: 200, unitCost: 35, supplierId: 'sup-4' },
];

export const initialRecipes: DbRecipe[] = [
  {
    id: 'rec-1',
    name: 'Poulet Mariné Rôti aux Herbes & Pommes au Four',
    category: ComponentCategory.MAIN_COURSE,
    description: 'Blancs de poulet marinés au romarin et à l’huile d’olive, accompagnés de pommes de terre rôties et carottes caramélisées.',
    yieldPortions: 1,
    preparationTimeMinutes: 45,
    allergens: [],
    ingredients: [
      { ingredientId: 'ing-1', quantityPerPortion: 0.22, unit: UnitOfMeasure.KILOGRAM }, // 220g poulet
      { ingredientId: 'ing-6', quantityPerPortion: 0.25, unit: UnitOfMeasure.KILOGRAM }, // 250g pommes de terre
      { ingredientId: 'ing-4', quantityPerPortion: 0.10, unit: UnitOfMeasure.KILOGRAM }, // 100g carottes
      { ingredientId: 'ing-3', quantityPerPortion: 0.02, unit: UnitOfMeasure.LITER },   // 20ml huile d'olive
      { ingredientId: 'ing-12', quantityPerPortion: 1, unit: UnitOfMeasure.PIECE },      // 1 barquette
    ],
  },
  {
    id: 'rec-2',
    name: 'Couscous Royal Artisanal au Poulet & Légumes',
    category: ComponentCategory.MAIN_COURSE,
    description: 'Couscous roulé vapeur servi avec bouillon parfumé aux épices douces, courgettes, carottes et pois chiches.',
    yieldPortions: 1,
    preparationTimeMinutes: 60,
    allergens: ['Gluten'],
    ingredients: [
      { ingredientId: 'ing-9', quantityPerPortion: 0.18, unit: UnitOfMeasure.KILOGRAM }, // 180g semoule
      { ingredientId: 'ing-1', quantityPerPortion: 0.20, unit: UnitOfMeasure.KILOGRAM }, // 200g poulet
      { ingredientId: 'ing-5', quantityPerPortion: 0.12, unit: UnitOfMeasure.KILOGRAM }, // 120g courgettes
      { ingredientId: 'ing-4', quantityPerPortion: 0.10, unit: UnitOfMeasure.KILOGRAM }, // 100g carottes
      { ingredientId: 'ing-8', quantityPerPortion: 0.05, unit: UnitOfMeasure.KILOGRAM }, // 50g oignons
      { ingredientId: 'ing-12', quantityPerPortion: 1, unit: UnitOfMeasure.PIECE },
    ],
  },
  {
    id: 'rec-3',
    name: 'Salade Méditerranéenne Croquante',
    category: ComponentCategory.STARTER,
    description: 'Tomates rondes mûres, concombres, oignons rouges et vinaigrette légère à l’huile d’olive vierge.',
    yieldPortions: 1,
    preparationTimeMinutes: 15,
    allergens: [],
    ingredients: [
      { ingredientId: 'ing-7', quantityPerPortion: 0.15, unit: UnitOfMeasure.KILOGRAM }, // 150g tomates
      { ingredientId: 'ing-8', quantityPerPortion: 0.03, unit: UnitOfMeasure.KILOGRAM }, // 30g oignon
      { ingredientId: 'ing-3', quantityPerPortion: 0.015, unit: UnitOfMeasure.LITER },  // 15ml huile
    ],
  },
  {
    id: 'rec-4',
    name: 'Mousse Artisanale au Chocolat Noir',
    category: ComponentCategory.DESSERT,
    description: 'Mousse onctueuse élaborée au chocolat noir 64% et œufs frais.',
    yieldPortions: 1,
    preparationTimeMinutes: 30,
    allergens: ['Oeufs'],
    ingredients: [
      { ingredientId: 'ing-10', quantityPerPortion: 0.06, unit: UnitOfMeasure.KILOGRAM }, // 60g chocolat
      { ingredientId: 'ing-11', quantityPerPortion: 1, unit: UnitOfMeasure.PIECE },       // 1 oeuf
    ],
  },
];

export const initialCustomers: DbCustomer[] = [
  {
    id: 'cust-1',
    companyName: 'Cabinet Médical Dr. Amrani',
    contactName: 'Dr. Yacine Amrani',
    phone: '0555 44 33 22',
    email: 'yacine.amrani@sante.dz',
    deliveryAddress: '14 Boulevard Colonel Amirouche, Alger Centre',
    wilaya: 'Alger',
    commune: 'Alger Centre',
    deliveryNotes: '3ème étage avec ascenseur. Déposer à l’accueil.',
    dietaryPreferences: ['Standard'],
    status: 'ACTIVE',
    accountBalance: 15000,
    whatsAppLink: 'https://wa.me/213555443322',
    subscriptionType: 'CORPORATE',
    preferredDistributionType: 'STANDARD_DELIVERY',
  },
  {
    id: 'cust-2',
    companyName: 'TechSolutions Maghreb (Siège)',
    contactName: 'Amine Slimani',
    phone: '0561 77 88 99',
    email: 'contact@techsolutions.dz',
    deliveryAddress: 'Centre d’Affaires El Qods, Niveau 6, Chéraga',
    wilaya: 'Alger',
    commune: 'Chéraga',
    deliveryNotes: 'Livraison groupée pour l’équipe de développement.',
    dietaryPreferences: ['Standard', 'Sans Porc'],
    status: 'ACTIVE',
    accountBalance: 42000,
    whatsAppLink: 'https://wa.me/213561778899',
    subscriptionType: 'CORPORATE',
    preferredDistributionType: 'STANDARD_DELIVERY',
  },
  {
    id: 'cust-3',
    contactName: 'Meriem Haddad',
    phone: '0772 11 22 33',
    email: 'meriem.haddad@gmail.com',
    deliveryAddress: 'Résidence Les Pins, Bâtiment C, Hydra',
    wilaya: 'Alger',
    commune: 'Hydra',
    deliveryNotes: 'Appeler avant de monter, interphone B3.',
    dietaryPreferences: ['Sans Gluten'],
    status: 'ACTIVE',
    accountBalance: 3500,
    whatsAppLink: 'https://wa.me/213772112233',
    subscriptionType: 'INDIVIDUAL',
    preferredDistributionType: 'STANDARD_DELIVERY',
  },
  {
    id: 'cust-4',
    companyName: 'TechSolutions Annexe Bab Ezzouar (Filiale)',
    contactName: 'Karim Hadj',
    phone: '0550 88 99 00',
    email: 'karim.hadj@techsolutions.dz',
    deliveryAddress: 'Cyberparc de Sidi Abdellah, Alger',
    wilaya: 'Alger',
    commune: 'Rahmania',
    deliveryNotes: 'Filiale rattachée au compte société mère TechSolutions Maghreb.',
    dietaryPreferences: ['Standard'],
    parentCompanyId: 'cust-2',
    isSubsidiary: true,
    status: 'ACTIVE',
    accountBalance: 12000,
    whatsAppLink: 'https://wa.me/213550889900',
    subscriptionType: 'SUBSIDIARY',
    preferredDistributionType: 'STANDARD_DELIVERY',
  },
];

export const initialInvoices: DbInvoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'FAC-202610-001',
    customerId: 'cust-1',
    orderIds: ['ord-101'],
    issueDate: '2026-10-18',
    dueDate: '2026-11-18',
    totalAmount: 3900,
    paidAmount: 3900,
    status: 'PAID',
  },
  {
    id: 'inv-2',
    invoiceNumber: 'FAC-202610-002',
    customerId: 'cust-2',
    orderIds: ['ord-102'],
    issueDate: '2026-10-19',
    dueDate: '2026-11-19',
    totalAmount: 9100,
    paidAmount: 9100,
    status: 'PAID',
  },
];

export const initialPayments: DbPayment[] = [
  {
    id: 'pay-1',
    receiptNumber: 'REC-202610-001',
    customerId: 'cust-1',
    invoiceId: 'inv-1',
    paymentDate: '2026-10-18',
    amount: 3900,
    paymentMethod: 'PREPAID_CREDIT',
    notes: 'Règlement automatique sur compte prépayé',
  },
  {
    id: 'pay-2',
    receiptNumber: 'REC-202610-002',
    customerId: 'cust-2',
    invoiceId: 'inv-2',
    paymentDate: '2026-10-19',
    amount: 9100,
    paymentMethod: 'BANK_TRANSFER',
    notes: 'Virement bancaire professionnel BNA',
  },
];

export const getTodayDate = (): string => new Date().toLocaleDateString('en-CA');
const todayDate = getTodayDate();

export const initialMealPlans: DbMealPlan[] = [
  {
    id: 'mp-1',
    date: todayDate,
    serviceTime: MealServiceTime.LUNCH,
    starterRecipeId: 'rec-3',
    mainCourseRecipeId: 'rec-1',
    dessertRecipeId: 'rec-4',
    notes: 'Service Déjeuner du jour',
  },
  {
    id: 'mp-2',
    date: todayDate,
    serviceTime: MealServiceTime.DINNER,
    starterRecipeId: 'rec-3',
    mainCourseRecipeId: 'rec-2',
    dessertRecipeId: 'rec-4',
    notes: 'Service Dîner du jour - Couscous traditionnel',
  },
];

export const initialOrders: DbOrder[] = [
  {
    id: 'ord-101',
    orderNumber: 'JNT-20261019-001',
    customerId: 'cust-1',
    deliveryDate: todayDate,
    serviceTime: MealServiceTime.LUNCH,
    status: OrderStatus.CONFIRMED,
    totalPortions: 6,
    deliveryAddress: '14 Boulevard Colonel Amirouche, Alger Centre',
    notes: 'Plateaux repas individuels étiquetés',
    items: [
      { id: 'item-1', recipeId: 'rec-1', portions: 6 },
      { id: 'item-2', recipeId: 'rec-3', portions: 6 },
      { id: 'item-3', recipeId: 'rec-4', portions: 6 },
    ],
    createdAt: new Date().toISOString(),
    orderType: 'CORPORATE',
    supplementsCost: 0,
    totalPrice: 3900,
    isPaid: true,
    invoiceId: 'inv-1',
  },
  {
    id: 'ord-102',
    orderNumber: 'JNT-20261019-002',
    customerId: 'cust-2',
    deliveryDate: todayDate,
    serviceTime: MealServiceTime.LUNCH,
    status: OrderStatus.CONFIRMED,
    totalPortions: 14,
    deliveryAddress: 'Centre d’Affaires El Qods, Niveau 6, Chéraga',
    notes: 'Commande entreprise équipe technique',
    items: [
      { id: 'item-4', recipeId: 'rec-1', portions: 14 },
      { id: 'item-5', recipeId: 'rec-4', portions: 14 },
    ],
    createdAt: new Date().toISOString(),
    orderType: 'CORPORATE',
    supplementsCost: 0,
    totalPrice: 9100,
    isPaid: true,
    invoiceId: 'inv-2',
  },
  {
    id: 'ord-103',
    orderNumber: 'JNT-20261019-003',
    customerId: 'cust-3',
    deliveryDate: todayDate,
    serviceTime: MealServiceTime.DINNER,
    status: OrderStatus.CONFIRMED,
    totalPortions: 2,
    deliveryAddress: 'Résidence Les Pins, Bâtiment C, Hydra',
    notes: 'Formule Dîner duo',
    items: [
      { id: 'item-6', recipeId: 'rec-2', portions: 2 },
      { id: 'item-7', recipeId: 'rec-3', portions: 2 },
    ],
    createdAt: new Date().toISOString(),
    orderType: 'INDIVIDUAL',
    supplementsCost: 0,
    totalPrice: 1700,
    isPaid: false,
  },
];
