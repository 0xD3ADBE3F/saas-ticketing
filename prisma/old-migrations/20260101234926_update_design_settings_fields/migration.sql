/*
  Warnings:

  - You are about to drop the column `portalTheme` on the `organizations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "portalTheme",
ADD COLUMN     "showTicketAvailability" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "websiteUrl" TEXT;

-- DropEnum
DROP TYPE "PortalTheme";
