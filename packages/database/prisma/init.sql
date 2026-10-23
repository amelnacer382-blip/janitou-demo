-- JANITOU FOOD — PostgreSQL Database Initialization Script
-- Automatically executed when starting PostgreSQL via Docker Compose

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATIONS_MANAGER', 'CHEF_KITCHEN', 'PURCHASING_MANAGER', 'PACKING_LOGISTICS', 'DELIVERY_DRIVER', 'CLIENT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ServiceTime" AS ENUM ('LUNCH', 'DINNER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PLANNED', 'IN_PRODUCTION', 'PORTIONED_PACKAGED', 'DISPATCHED', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ComponentCategory" AS ENUM ('STARTER', 'MAIN_COURSE', 'SIDE_DISH', 'DESSERT', 'BEVERAGE', 'BREAD');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "UnitOfMeasure" AS ENUM ('KG', 'G', 'L', 'ML', 'PCS', 'PACK');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT,
  "role" "Role" DEFAULT 'CLIENT' NOT NULL,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "customers" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE REFERENCES "users"("id") ON DELETE SET NULL,
  "companyName" TEXT,
  "contactName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "secondaryPhone" TEXT,
  "email" TEXT,
  "deliveryAddress" TEXT NOT NULL,
  "wilaya" TEXT,
  "commune" TEXT,
  "deliveryNotes" TEXT,
  "status" TEXT DEFAULT 'ACTIVE' NOT NULL,
  "accountBalance" NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  "whatsAppLink" TEXT,
  "subscriptionType" TEXT DEFAULT 'CORPORATE' NOT NULL,
  "preferredDistributionType" TEXT DEFAULT 'STANDARD_DELIVERY' NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "contactPerson" TEXT,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "address" TEXT,
  "paymentTerms" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "ingredients" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "unit" "UnitOfMeasure" NOT NULL,
  "currentStock" NUMERIC(10, 3) DEFAULT 0 NOT NULL,
  "minimumThreshold" NUMERIC(10, 3) DEFAULT 0 NOT NULL,
  "unitCost" NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  "supplierId" TEXT REFERENCES "suppliers"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipes" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "category" "ComponentCategory" NOT NULL,
  "description" TEXT,
  "yieldPortions" INTEGER DEFAULT 1 NOT NULL,
  "preparationTimeMinutes" INTEGER,
  "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipe_ingredients" (
  "recipeId" TEXT NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
  "ingredientId" TEXT NOT NULL REFERENCES "ingredients"("id") ON DELETE RESTRICT,
  "quantityPerPortion" NUMERIC(10, 4) NOT NULL,
  "unit" "UnitOfMeasure" NOT NULL,
  PRIMARY KEY ("recipeId", "ingredientId")
);

CREATE TABLE IF NOT EXISTS "meal_plans" (
  "id" TEXT PRIMARY KEY,
  "date" DATE NOT NULL,
  "serviceTime" "ServiceTime" NOT NULL,
  "starterRecipeId" TEXT REFERENCES "recipes"("id") ON DELETE SET NULL,
  "mainCourseRecipeId" TEXT NOT NULL REFERENCES "recipes"("id") ON DELETE RESTRICT,
  "sideDishRecipeId" TEXT REFERENCES "recipes"("id") ON DELETE SET NULL,
  "dessertRecipeId" TEXT REFERENCES "recipes"("id") ON DELETE SET NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE ("date", "serviceTime")
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" TEXT PRIMARY KEY,
  "orderNumber" TEXT UNIQUE NOT NULL,
  "customerId" TEXT NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
  "deliveryDate" DATE NOT NULL,
  "serviceTime" "ServiceTime" NOT NULL,
  "status" "OrderStatus" DEFAULT 'CONFIRMED' NOT NULL,
  "totalPortions" INTEGER DEFAULT 1 NOT NULL,
  "deliveryAddress" TEXT NOT NULL,
  "notes" TEXT,
  "orderType" TEXT DEFAULT 'CORPORATE' NOT NULL,
  "supplementsCost" NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  "totalPrice" NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  "isPaid" BOOLEAN DEFAULT false NOT NULL,
  "invoiceId" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "recipeId" TEXT NOT NULL REFERENCES "recipes"("id") ON DELETE RESTRICT,
  "portions" INTEGER DEFAULT 1 NOT NULL,
  "specialNotes" TEXT
);

CREATE TABLE IF NOT EXISTS "production_batches" (
  "id" TEXT PRIMARY KEY,
  "productionDate" DATE NOT NULL,
  "serviceTime" "ServiceTime" NOT NULL,
  "recipeId" TEXT NOT NULL REFERENCES "recipes"("id") ON DELETE RESTRICT,
  "plannedPortions" INTEGER NOT NULL,
  "actualProducedPortions" INTEGER,
  "status" TEXT DEFAULT 'PLANNED' NOT NULL,
  "batchNotes" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id" TEXT PRIMARY KEY,
  "poNumber" TEXT UNIQUE NOT NULL,
  "supplierId" TEXT NOT NULL REFERENCES "suppliers"("id") ON DELETE RESTRICT,
  "orderDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "status" "PurchaseOrderStatus" DEFAULT 'DRAFT' NOT NULL,
  "totalCost" NUMERIC(12, 2),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "purchase_order_items" (
  "id" TEXT PRIMARY KEY,
  "purchaseOrderId" TEXT NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
  "ingredientId" TEXT NOT NULL REFERENCES "ingredients"("id") ON DELETE RESTRICT,
  "quantity" NUMERIC(10, 3) NOT NULL,
  "unitCost" NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "delivery_runs" (
  "id" TEXT PRIMARY KEY,
  "runDate" DATE NOT NULL,
  "serviceTime" "ServiceTime" NOT NULL,
  "driverName" TEXT,
  "driverPhone" TEXT,
  "status" TEXT DEFAULT 'PLANNED' NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "delivery_stops" (
  "id" TEXT PRIMARY KEY,
  "deliveryRunId" TEXT NOT NULL REFERENCES "delivery_runs"("id") ON DELETE CASCADE,
  "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT,
  "sequence" INTEGER DEFAULT 0 NOT NULL,
  "deliveryStatus" TEXT DEFAULT 'PENDING' NOT NULL,
  "deliveredAt" TIMESTAMP(3),
  "driverComment" TEXT
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" TEXT PRIMARY KEY,
  "invoiceNumber" TEXT UNIQUE NOT NULL,
  "customerId" TEXT NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
  "issueDate" DATE NOT NULL,
  "dueDate" DATE NOT NULL,
  "totalAmount" NUMERIC(12, 2) NOT NULL,
  "status" TEXT DEFAULT 'PENDING' NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" TEXT PRIMARY KEY,
  "receiptNumber" TEXT UNIQUE NOT NULL,
  "customerId" TEXT NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
  "amount" NUMERIC(12, 2) NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "recordedBy" TEXT NOT NULL,
  "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "beforeSnapshot" JSONB,
  "afterSnapshot" JSONB
);

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON "customers"("phone");
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON "orders"("deliveryDate", "serviceTime");
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON "orders"("customerId");
CREATE INDEX IF NOT EXISTS idx_ingredients_supplier ON "ingredients"("supplierId");
CREATE INDEX IF NOT EXISTS idx_delivery_runs_date ON "delivery_runs"("runDate", "serviceTime");
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON "audit_logs"("timestamp" DESC);
