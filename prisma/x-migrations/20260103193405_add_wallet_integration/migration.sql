-- CreateEnum
CREATE TYPE "WalletPlatform" AS ENUM ('APPLE', 'GOOGLE');

-- CreateTable
CREATE TABLE "wallet_passes" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "platform" "WalletPlatform" NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "passUrl" TEXT,
    "googlePassId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_passes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_certificates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" "WalletPlatform" NOT NULL,
    "passTypeId" TEXT,
    "teamId" TEXT,
    "certificatePem" TEXT,
    "privateKeyPem" TEXT,
    "issuerId" TEXT,
    "serviceAccount" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_passes_ticketId_key" ON "wallet_passes"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_passes_serialNumber_key" ON "wallet_passes"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_passes_googlePassId_key" ON "wallet_passes"("googlePassId");

-- CreateIndex
CREATE INDEX "wallet_passes_ticketId_idx" ON "wallet_passes"("ticketId");

-- CreateIndex
CREATE INDEX "wallet_passes_serialNumber_idx" ON "wallet_passes"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_certificates_organizationId_key" ON "wallet_certificates"("organizationId");

-- CreateIndex
CREATE INDEX "wallet_certificates_organizationId_idx" ON "wallet_certificates"("organizationId");

-- CreateIndex
CREATE INDEX "wallet_certificates_expiresAt_idx" ON "wallet_certificates"("expiresAt");

-- AddForeignKey
ALTER TABLE "wallet_passes" ADD CONSTRAINT "wallet_passes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_certificates" ADD CONSTRAINT "wallet_certificates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

