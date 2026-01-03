/*
  Warnings:

  - The values [SUBSCRIPTION,PAY_PER_EVENT,OVERAGE] on the enum `InvoiceType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `feeOverrideReason` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `feeOverrideSetAt` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `feeOverrideSetBy` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `overageFeeOverride` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `platformFeeOverride` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `currentPlan` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `kvkNumber` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `kvkRejectionReason` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `kvkVerifiedAt` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `nonProfitStatus` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the `subscription_invoices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscriptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usage_records` table. If the table is not empty, all the data it contains will be lost.

*/

-- Step 1: Create new invoices table (PLATFORM_FEE was added in previous migration)
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT,
    "type" "InvoiceType" NOT NULL DEFAULT 'PLATFORM_FEE',
    "mollieSalesInvoiceId" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "amount" INTEGER NOT NULL,
    "vatAmount" INTEGER NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 21.00,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "molliePaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- Step 2: Migrate existing invoice data from subscription_invoices to invoices
INSERT INTO "invoices" (
    "id",
    "organizationId",
    "eventId",
    "type",
    "mollieSalesInvoiceId",
    "invoiceNumber",
    "invoiceDate",
    "dueDate",
    "amount",
    "vatAmount",
    "vatRate",
    "currency",
    "status",
    "molliePaymentId",
    "paidAt",
    "pdfUrl",
    "description",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "organizationId",
    NULL as "eventId", -- No event link in old data
    'PLATFORM_FEE'::"InvoiceType" as "type", -- Convert all old types to PLATFORM_FEE
    "mollieSalesInvoiceId",
    "invoiceNumber",
    "invoiceDate",
    "dueDate",
    "amount",
    "vatAmount",
    "vatRate",
    "currency",
    "status",
    "molliePaymentId",
    "paidAt",
    "pdfUrl",
    "description",
    "createdAt",
    "updatedAt"
FROM "subscription_invoices";

-- Step 3: Create indexes
CREATE UNIQUE INDEX "invoices_mollieSalesInvoiceId_key" ON "invoices"("mollieSalesInvoiceId");
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE UNIQUE INDEX "invoices_molliePaymentId_key" ON "invoices"("molliePaymentId");
CREATE INDEX "invoices_organizationId_idx" ON "invoices"("organizationId");
CREATE INDEX "invoices_eventId_idx" ON "invoices"("eventId");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_molliePaymentId_idx" ON "invoices"("molliePaymentId");
CREATE INDEX "invoices_invoiceDate_idx" ON "invoices"("invoiceDate");

-- Step 4: Add foreign key
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Now drop old subscription tables
-- DropForeignKey
ALTER TABLE "subscription_invoices" DROP CONSTRAINT "subscription_invoices_organizationId_fkey";
ALTER TABLE "subscription_invoices" DROP CONSTRAINT "subscription_invoices_subscriptionId_fkey";
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_organizationId_fkey";
ALTER TABLE "usage_records" DROP CONSTRAINT "usage_records_organizationId_fkey";

-- DropTable
DROP TABLE "subscription_invoices";
DROP TABLE "subscriptions";
DROP TABLE "usage_records";

-- Step 6: Update InvoiceType enum to only have PLATFORM_FEE
-- Create new enum type
CREATE TYPE "InvoiceType_new" AS ENUM ('PLATFORM_FEE');

-- Drop default first
ALTER TABLE "invoices" ALTER COLUMN "type" DROP DEFAULT;

-- Convert column to new enum
ALTER TABLE "invoices" ALTER COLUMN "type" TYPE "InvoiceType_new" USING ("type"::text::"InvoiceType_new");

-- Swap enum types
ALTER TYPE "InvoiceType" RENAME TO "InvoiceType_old";
ALTER TYPE "InvoiceType_new" RENAME TO "InvoiceType";
DROP TYPE "InvoiceType_old";

-- Re-add default
ALTER TABLE "invoices" ALTER COLUMN "type" SET DEFAULT 'PLATFORM_FEE'::"InvoiceType";

-- Step 7: Drop subscription-related organization columns
-- DropIndex
DROP INDEX "organizations_currentPlan_idx";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "feeOverrideReason",
DROP COLUMN "feeOverrideSetAt",
DROP COLUMN "feeOverrideSetBy",
DROP COLUMN "overageFeeOverride",
DROP COLUMN "platformFeeOverride";

-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "currentPlan",
DROP COLUMN "kvkNumber",
DROP COLUMN "kvkRejectionReason",
DROP COLUMN "kvkVerifiedAt",
DROP COLUMN "nonProfitStatus",
ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "vatNumber" TEXT;

-- Step 8: Drop subscription-related enums
DROP TYPE "NonProfitStatus";
DROP TYPE "PricingPlan";
DROP TYPE "SubscriptionStatus";

