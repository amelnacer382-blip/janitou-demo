/**
 * JANITOU FOOD — Core Domain Types & Enumerations
 */

// User and Roles
export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  CHEF_KITCHEN = 'CHEF_KITCHEN',
  PURCHASING_MANAGER = 'PURCHASING_MANAGER',
  PACKING_LOGISTICS = 'PACKING_LOGISTICS',
  DELIVERY_DRIVER = 'DELIVERY_DRIVER',
  CLIENT = 'CLIENT',
}

// Service Timing
export enum MealServiceTime {
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
}

// Order Status Workflow
export enum OrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  PLANNED = 'PLANNED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  PORTIONED_PACKAGED = 'PORTIONED_PACKAGED',
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

// Meal and Recipe Components
export enum ComponentCategory {
  STARTER = 'STARTER',
  MAIN_COURSE = 'MAIN_COURSE',
  SIDE_DISH = 'SIDE_DISH',
  DESSERT = 'DESSERT',
  BEVERAGE = 'BEVERAGE',
  BREAD = 'BREAD',
}

export interface DietaryPreference {
  id: string;
  name: string; // e.g., 'Vegetarian', 'Gluten-Free', 'Low-Sodium', 'Halal'
  code: string;
}

// Customer Definition
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  wilaya?: string;
  commune?: string;
  deliveryNotes?: string;
  dietaryPreferences: DietaryPreference[];
  createdAt: Date;
  updatedAt: Date;
}

// Ingredient & Purchasing
export enum UnitOfMeasure {
  KILOGRAM = 'KG',
  GRAM = 'G',
  LITER = 'L',
  MILLILITER = 'ML',
  PIECE = 'PCS',
  PACK = 'PACK',
}

export interface Ingredient {
  id: string;
  name: string;
  unit: UnitOfMeasure;
  currentStock: number;
  minimumThreshold: number;
  unitCost: number;
  supplierId?: string;
}

// Recipe & Recipe Component
export interface RecipeIngredient {
  ingredientId: string;
  quantityPerPortion: number;
  unit: UnitOfMeasure;
}

export interface Recipe {
  id: string;
  name: string;
  category: ComponentCategory;
  description?: string;
  yieldPortions: number;
  ingredients: RecipeIngredient[];
  preparationTimeMinutes?: number;
  allergens: string[];
}

// Meal Planning Schedule
export interface MealPlanDay {
  id: string;
  date: string; // ISO date 'YYYY-MM-DD'
  serviceTime: MealServiceTime;
  starterRecipeId?: string;
  mainCourseRecipeId: string;
  sideDishRecipeId?: string;
  dessertRecipeId?: string;
  alternativeRecipes: string[];
}

// Production Batch Requirement
export interface ProductionBatchRequirement {
  date: string;
  serviceTime: MealServiceTime;
  recipeId: string;
  plannedPortions: number;
  actualProducedPortions?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

// Distribution & Delivery Stop
export interface DeliveryStop {
  orderId: string;
  customerId: string;
  deliveryAddress: string;
  phone: string;
  serviceTime: MealServiceTime;
  portions: number;
  status: 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';
  deliveryProof?: string;
}
