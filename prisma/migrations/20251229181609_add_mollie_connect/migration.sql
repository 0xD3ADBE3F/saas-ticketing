/*
  Warnings:

  - A unique constraint covering the columns `[mollieOrganizationId]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MollieOnboardingStatus" AS ENUM ('PENDING', 'NEEDS_DATA', 'IN_REVIEW', 'COMPLETED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "mollieAccessToken" TEXT,
ADD COLUMN     "mollieClientLinkUrl" TEXT,
ADD COLUMN     "mollieOnboardingStatus" "MollieOnboardingStatus",
ADD COLUMN     "mollieOrganizationId" TEXT,
ADD COLUMN     "mollieProfileId" TEXT,
ADD COLUMN     "mollieRefreshToken" TEXT,
ADD COLUMN     "mollieTokenExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "response" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idempotency_keys_organizationId_idx" ON "idempotency_keys"("organizationId");

-- CreateIndex
CREATE INDEX "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_key_organizationId_key" ON "idempotency_keys"("key", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_mollieOrganizationId_key" ON "organizations"("mollieOrganizationId");

-- CreateIndex
CREATE INDEX "organizations_mollieOrganizationId_idx" ON "organizations"("mollieOrganizationId");

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
