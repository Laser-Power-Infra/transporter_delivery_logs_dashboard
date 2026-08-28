-- DropIndex
DROP INDEX "Delivery_invoiceNo_key";

-- AlterTable
ALTER TABLE "Delivery" ALTER COLUMN "invoiceNo" DROP NOT NULL;
