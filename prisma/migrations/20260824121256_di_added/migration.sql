/*
  Warnings:

  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "diNo" TEXT,
ALTER COLUMN "deliveryStatus" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'OPERATOR';

-- CreateIndex
CREATE INDEX "Delivery_diNo_idx" ON "Delivery"("diNo");
