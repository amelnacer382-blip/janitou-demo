import { ComponentCategory } from '@janitou/common';

/**
 * Simple mode ("mode simple") demo catalog.
 *
 * The simple mobile app shows one dish per service with a photo. Existing
 * recipes from the Phase 1 seed are reused (matched by name) and enriched with
 * an Arabic label and a photo; the remaining dishes are added once so a fresh
 * or stale database still has a usable weekly menu.
 */
export interface SimpleDishSeed {
  id: string;
  name: string;
  nameAr: string;
  photoUrl: string;
  category: ComponentCategory;
  /** Operational family used by extras rules and menu alerts. */
  family: string;
  flags?: ('FRIES' | 'MINCED' | 'PASTA')[];
  mainIngredient?: string;
}

export const SIMPLE_DISH_CATALOG: SimpleDishSeed[] = [
  {
    id: 'dish-couscous',
    name: 'Couscous Royal Artisanal au Poulet & Légumes',
    nameAr: 'كسكس ملكي بالدجاج والخضار',
    photoUrl: '/app/dishes/couscous.jpg',
    category: ComponentCategory.MAIN_COURSE,
    family: 'COUSCOUS',
    mainIngredient: 'POULET',
  },
  {
    id: 'dish-poulet',
    name: 'Poulet Mariné Rôti aux Herbes & Pommes au Four',
    nameAr: 'دجاج مشوي بالأعشاب والبطاطا',
    photoUrl: '/app/dishes/poulet.jpg',
    category: ComponentCategory.MAIN_COURSE,
    family: 'GRILL',
    mainIngredient: 'POULET',
  },
  {
    id: 'dish-tajine',
    name: 'Tajine Poulet aux Olives & Citron Confit',
    nameAr: 'طاجين الدجاج بالزيتون',
    photoUrl: '/app/dishes/tagine.jpg',
    category: ComponentCategory.MAIN_COURSE,
    family: 'TAGINE',
    mainIngredient: 'POULET',
  },
  {
    id: 'dish-chorba',
    name: 'Chorba Frik Traditionnelle',
    nameAr: 'شوربة فريك',
    photoUrl: '/app/dishes/chorba.jpg',
    category: ComponentCategory.STARTER,
    family: 'SOUP',
    mainIngredient: 'AGNEAU',
  },
  {
    id: 'dish-rechta',
    name: 'Rechta Algéroise au Poulet',
    nameAr: 'رشتة بالدجاج',
    photoUrl: '/app/dishes/rechta.jpg',
    category: ComponentCategory.MAIN_COURSE,
    family: 'PASTA',
    flags: ['PASTA'],
    mainIngredient: 'POULET',
  },
  {
    id: 'dish-chakhchoukha',
    name: 'Chakhchoukha Biskra',
    nameAr: 'شخشوخة بسكرة',
    photoUrl: '/app/dishes/chakhchoukha.jpg',
    category: ComponentCategory.MAIN_COURSE,
    family: 'CHAKHCHOUKHA',
    mainIngredient: 'AGNEAU',
  },
  {
    id: 'dish-salade',
    name: 'Salade Méditerranéenne Croquante',
    nameAr: 'سلطة متوسطية مقرمشة',
    photoUrl: '/app/dishes/salade.jpg',
    category: ComponentCategory.STARTER,
    family: 'SALAD',
    mainIngredient: 'LEGUMES',
  },
  {
    id: 'dish-mousse',
    name: 'Mousse Artisanale au Chocolat Noir',
    nameAr: 'موس الشوكولاتة الداكنة',
    photoUrl: '/app/dishes/mousse.jpg',
    category: ComponentCategory.DESSERT,
    family: 'DESSERT',
    mainIngredient: 'CHOCOLAT',
  },
];

/** Reference selling price per demo dish (DZD). */
export const SIMPLE_DISH_PRICES: Record<string, number> = {
  'dish-couscous': 550,
  'dish-poulet': 500,
  'dish-tajine': 520,
  'dish-chorba': 200,
  'dish-rechta': 480,
  'dish-chakhchoukha': 450,
  'dish-salade': 250,
  'dish-mousse': 180,
};

export interface SimpleExtraSetting {
  name: string;
  price: number;
  /** One suggested unit per N meals (default 1 = one per meal). */
  perMeals?: number;
  /** Restrict the suggestion to these dish families (empty = all). */
  families?: string[];
}

export interface SimpleSettings {
  lunchPrice: number;
  dinnerPrice: number;
  packagingPrice: number;
  deliveryPrice: number;
  extras: SimpleExtraSetting[];
  lunchHours: string;
  dinnerHours: string;
  /** Daily cutoff (HH:MM) for customer orders. */
  cutoffTime: string;
  /** Number of days before the delivery date when ordering closes. */
  cutoffDaysBefore: number;
  /** Dates (YYYY-MM-DD) where no order is accepted (holidays / days off). */
  closedDates: string[];
  /** Per-date deadline overrides (ISO datetime), BR-011. */
  deadlineOverrides: Record<string, string>;
}

export const DEFAULT_SIMPLE_SETTINGS: SimpleSettings = {
  lunchPrice: 450,
  dinnerPrice: 400,
  packagingPrice: 30,
  deliveryPrice: 150,
  extras: [
    { name: 'حلويات', price: 100, perMeals: 2 },
    { name: 'عصير', price: 80, perMeals: 3 },
  ],
  lunchHours: '11:30 - 13:30',
  dinnerHours: '18:00 - 20:00',
  cutoffTime: '18:00',
  cutoffDaysBefore: 1,
  closedDates: [],
  deadlineOverrides: {},
};

export interface SimpleDishView {
  id: string;
  name: string;
  nameAr?: string;
  displayName: string;
  photoUrl?: string;
  category: ComponentCategory;
  family?: string;
}

export interface SimpleMenuDayView {
  date: string;
  archived: boolean;
  lunch: SimpleDishView | null;
  dinner: SimpleDishView | null;
}

export interface SimpleOrderView {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  serviceTime: 'LUNCH' | 'DINNER';
  status: string;
  totalPortions: number;
  deliveryAddress: string;
  notes?: string;
}

export interface SimpleHomeView {
  date: string;
  menu: SimpleMenuDayView;
  stats: {
    dishesCount: number;
    ordersCount: number;
    lunchPortions: number;
    dinnerPortions: number;
    totalPortions: number;
  };
  orders: SimpleOrderView[];
}

export function toIsoDate(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Sunday → Saturday week containing `isoDate`. */
export function weekRange(isoDate: string): { from: string; to: string } {
  const dayOfWeek = new Date(`${isoDate}T12:00:00`).getDay();
  const from = addDaysIso(isoDate, -dayOfWeek);
  return { from, to: addDaysIso(from, 6) };
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

export type PackagingType = 'INDIVIDUAL' | 'COLLECTIVE';

export interface ClientDishView extends SimpleDishView {
  price: number;
}

export interface ClientMenuDayView {
  date: string;
  archived: boolean;
  lunch: ClientDishView | null;
  dinner: ClientDishView | null;
  alternatives: ClientDishView[];
  orderDeadline: string;
  closed: boolean;
}

export interface ClientAccountView {
  id: string;
  contactName: string;
  companyName?: string;
  phone: string;
  deliveryAddress: string;
  accountStatus: string;
  balance: number;
  distribution?: {
    type: 'STANDARD_DELIVERY' | 'EXPRESS' | 'PICKUP';
    label?: string;
    driverName?: string;
  };
  reviewRequired: boolean;
}

export interface ClientOrderView {
  id: string;
  orderNumber: string;
  deliveryDate: string;
  serviceTime: 'LUNCH' | 'DINNER';
  status: string;
  totalPortions: number;
  totalPrice: number;
  lunchPortions: number;
  dinnerPortions: number;
  alternatives: { dishId: string; portions: number }[];
  items?: { dishId: string; name: string; portions: number; unitPrice: number }[];
  packaging?: { lunch?: PackagingType; dinner?: PackagingType };
  extras: { name: string; quantity: number; unitPrice: number }[];
  notes?: string;
  source?: 'CLIENT' | 'ADMIN' | 'AUTOMATIC';
  orderMode?: 'MENU' | 'CATALOGUE';
  editable: boolean;
  invoiceNumber?: string;
  isPaid: boolean;
}

export interface NotificationView {
  id: string;
  type: string;
  data: Record<string, string | number>;
  createdAt: string;
  readAt?: string;
}

export interface ClientProgramEntry {
  weekday: number;
  lunchPortions: number;
  dinnerPortions: number;
  lunchPackaging?: PackagingType;
  dinnerPackaging?: PackagingType;
}
