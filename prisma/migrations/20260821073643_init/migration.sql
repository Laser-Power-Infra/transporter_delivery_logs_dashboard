-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
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
    "deliveryStatus" TEXT,
    "remarks" TEXT,
    "deliveryRemarks" TEXT,
    "vehicleReachedDate" TEXT,
    "deliveryDate" TEXT,
    "hasMismatch" BOOLEAN NOT NULL DEFAULT false,
    "mismatchDetails" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT,
    "invoiceNo" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_invoiceNo_key" ON "Delivery"("invoiceNo");

-- CreateIndex
CREATE INDEX "Delivery_invoiceNo_idx" ON "Delivery"("invoiceNo");

-- CreateIndex
CREATE INDEX "Delivery_deliveryStatus_idx" ON "Delivery"("deliveryStatus");

-- CreateIndex
CREATE INDEX "Delivery_transporterName_idx" ON "Delivery"("transporterName");

-- CreateIndex
CREATE INDEX "AuditLog_invoiceNo_idx" ON "AuditLog"("invoiceNo");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
