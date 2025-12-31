-- Remove subscription system and simplify to platform fee invoicing

-- Step 1: Remove subscription-related columns from organizations and events FIRST
DROP INDEX IF EXISTS "organizations_currentPlan_idx";

ALTER TABLE "organizations" DROP COLUMN IF EXISTS "currentPlan";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "kvkNumber";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "kvkRejectionReason";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "kvkVerifiedAt";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "nonProfitStatus";

ALTER TABLE "events" DROP COLUMN IF EXISTS "feeOverrideReason";
ALTER TABLE "events" DROP COLUMN IF EXISTS "feeOverrideSetAt";
ALTER TABLE "events" DROP COLUMN IF EXISTS "feeOverrideSetBy";
ALTER TABLE "events" DROP COLUMN IF EXISTS "overageFeeOverride";
ALTER TABLE "events" DROP COLUMN IF EXISTS "platformFeeOverride";

-- Step 2: Drop subscription tables and related foreign keys
ALTER TABLE "subscription_invoices" DROP CONSTRAINT IF EXISTS "subscription_invoices_organizationId_fkey";
ALTER TABLE "subscription_invoices" DROP CONSTRAINT IF EXISTS "subscription_invoices_subscriptionId_fkey";
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_organizationId_fkey";
ALTER TABLE "usage_records" DROP CONSTRAINT IF EXISTS "usage_records_organizationId_fkey";

DROP TABLE IF EXISTS "subscription_invoices";
DROP TABLE IF EXISTS "subscriptions";
DROP TABLE IF EXISTS "usage_records";

-- Step 3: Drop subscription-related enums
DROP TYPE IF EXISTS "NonProfitStatus";
DROP TYPE IF EXISTS "PricingPlan";
DROP TYPE IF EXISTS "SubscriptionStatus";

-- Drop InvoiceType enum and recreate with only PLATFORM_FEE
DROP TYPE IF EXISTS "InvoiceType";
CREATE TYPE "InvoiceType" AS ENUM ('PLATFORM_FEE');

-- Step 4: Create new invoices table
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

-- Step 5: Create indexes on invoices
CREATE UNIQUE INDEX "invoices_mollieSalesInvoiceId_key" ON "invoices"("mollieSalesInvoiceId");
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE UNIQUE INDEX "invoices_molliePaymentId_key" ON "invoices"("molliePaymentId");
CREATE INDEX "invoices_organizationId_idx" ON "invoices"("organizationId");
CREATE INDEX "invoices_eventId_idx" ON "invoices"("eventId");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_molliePaymentId_idx" ON "invoices"("molliePaymentId");
CREATE INDEX "invoices_invoiceDate_idx" ON "invoices"("invoiceDate");

-- Step 6: Add foreign key
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Add billing fields to organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "billingEmail" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "vatNumber" TEXT;

