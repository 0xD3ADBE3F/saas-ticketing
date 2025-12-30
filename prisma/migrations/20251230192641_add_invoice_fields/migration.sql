/*
  Warnings:

  - A unique constraint covering the columns `[mollieSalesInvoiceId]` on the table `subscription_invoices` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `subscription_invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvoiceStatus" ADD VALUE 'DRAFT';
ALTER TYPE "InvoiceStatus" ADD VALUE 'SENT';
ALTER TYPE "InvoiceStatus" ADD VALUE 'OVERDUE';
ALTER TYPE "InvoiceStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "subscription_invoices" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "mollieSalesInvoiceId" TEXT,
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "vatAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 21.00;

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_mollieSalesInvoiceId_key" ON "subscription_invoices"("mollieSalesInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_invoiceNumber_key" ON "subscription_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "subscription_invoices_invoiceDate_idx" ON "subscription_invoices"("invoiceDate");

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
