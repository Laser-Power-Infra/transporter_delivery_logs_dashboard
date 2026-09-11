-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN IF NOT EXISTS "storeRemarks" TEXT,
ADD COLUMN IF NOT EXISTS "storeOtherDetails" TEXT;
