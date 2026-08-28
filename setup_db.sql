-- PostgreSQL Initialization Script for DeliveryDB
-- Database: DeliveryDB

-- 1. Create User table
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'OPERATOR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Delivery table (DI NO + Columns B to R)
CREATE TABLE IF NOT EXISTS "Delivery" (
  "id" TEXT PRIMARY KEY,
  "diNo" TEXT,
  "invoiceNo" TEXT UNIQUE NOT NULL,
  "date" TEXT,
  "buyerName" TEXT,
  "transporterName" TEXT,
  "truckNumber" TEXT,
  "driverContactNo" TEXT,
  "lrNo" TEXT,
  "freightOrder" TEXT,
  "toPlaceName" TEXT,
  "address" TEXT,
  "itemName" TEXT,
  "drumQty" TEXT,
  "deliveryStatus" TEXT DEFAULT 'PENDING',
  "remarks" TEXT,
  "deliveryRemarks" TEXT,
  "vehicleReachedDate" TEXT,
  "deliveryDate" TEXT,
  "hasMismatch" BOOLEAN NOT NULL DEFAULT FALSE,
  "mismatchDetails" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create AuditLog table
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "deliveryId" TEXT REFERENCES "Delivery"("id") ON DELETE CASCADE,
  "invoiceNo" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "userName" TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS "Delivery_invoiceNo_idx" ON "Delivery"("invoiceNo");
CREATE INDEX IF NOT EXISTS "Delivery_deliveryStatus_idx" ON "Delivery"("deliveryStatus");
CREATE INDEX IF NOT EXISTS "Delivery_transporterName_idx" ON "Delivery"("transporterName");
CREATE INDEX IF NOT EXISTS "Delivery_diNo_idx" ON "Delivery"("diNo");

CREATE INDEX IF NOT EXISTS "AuditLog_invoiceNo_idx" ON "AuditLog"("invoiceNo");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- 5. Insert Initial Default Users
INSERT INTO "User" ("id", "name", "email", "role", "updatedAt")
VALUES 
  ('usr_admin_1', 'Admin', 'admin@delivery.com', 'ADMIN', CURRENT_TIMESTAMP),
  ('usr_operator_1', 'Niloy Logistics', 'operator@delivery.com', 'OPERATOR', CURRENT_TIMESTAMP)
ON CONFLICT ("email") 
DO UPDATE SET "name" = EXCLUDED."name";
