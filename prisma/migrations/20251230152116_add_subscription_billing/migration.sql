-- CreateEnum
CREATE TYPE "PricingPlan" AS ENUM ('NON_PROFIT', 'PAY_PER_EVENT', 'ORGANIZER', 'PRO_ORGANIZER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SUBSCRIPTION', 'PAY_PER_EVENT', 'OVERAGE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "NonProfitStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'NOT_APPLICABLE');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "feeOverrideReason" TEXT,
ADD COLUMN     "feeOverrideSetAt" TIMESTAMP(3),
ADD COLUMN     "feeOverrideSetBy" TEXT,
ADD COLUMN     "overageFeeOverride" INTEGER,
ADD COLUMN     "platformFeeOverride" INTEGER;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "currentPlan" "PricingPlan" DEFAULT 'NON_PROFIT',
ADD COLUMN     "kvkNumber" TEXT,
ADD COLUMN     "kvkRejectionReason" TEXT,
ADD COLUMN     "kvkVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "nonProfitStatus" "NonProfitStatus" DEFAULT 'NOT_APPLICABLE';

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" "PricingPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "mollieSubscriptionId" TEXT,
    "mollieCustomerId" TEXT,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "brandingRemoved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "ticketsSold" INTEGER NOT NULL DEFAULT 0,
    "overageTickets" INTEGER NOT NULL DEFAULT 0,
    "overageFeeTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "type" "InvoiceType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "molliePaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organizationId_key" ON "subscriptions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_mollieSubscriptionId_key" ON "subscriptions"("mollieSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_organizationId_idx" ON "subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_mollieSubscriptionId_idx" ON "subscriptions"("mollieSubscriptionId");

-- CreateIndex
CREATE INDEX "usage_records_organizationId_idx" ON "usage_records"("organizationId");

-- CreateIndex
CREATE INDEX "usage_records_periodStart_periodEnd_idx" ON "usage_records"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "usage_records_organizationId_periodStart_periodEnd_key" ON "usage_records"("organizationId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_molliePaymentId_key" ON "subscription_invoices"("molliePaymentId");

-- CreateIndex
CREATE INDEX "subscription_invoices_organizationId_idx" ON "subscription_invoices"("organizationId");

-- CreateIndex
CREATE INDEX "subscription_invoices_subscriptionId_idx" ON "subscription_invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_invoices_status_idx" ON "subscription_invoices"("status");

-- CreateIndex
CREATE INDEX "subscription_invoices_molliePaymentId_idx" ON "subscription_invoices"("molliePaymentId");

-- CreateIndex
CREATE INDEX "organizations_currentPlan_idx" ON "organizations"("currentPlan");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
