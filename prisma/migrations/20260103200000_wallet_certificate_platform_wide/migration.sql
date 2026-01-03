/*
  Warnings:

  - You are about to drop the column `organizationId` on the `wallet_certificates` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[platform]` on the table `wallet_certificates` will be added. If there are existing duplicate entries, this will fail.

*/
-- DropForeignKey
ALTER TABLE "wallet_certificates" DROP CONSTRAINT IF EXISTS "wallet_certificates_organizationId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "wallet_certificates_organizationId_idx";

-- DropIndex
DROP INDEX IF EXISTS "wallet_certificates_organizationId_key";

-- AlterTable
ALTER TABLE "wallet_certificates" DROP COLUMN IF EXISTS "organizationId";

-- CreateIndex
CREATE UNIQUE INDEX "wallet_certificates_platform_key" ON "wallet_certificates"("platform");
