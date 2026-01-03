-- CreateEnum
CREATE TYPE "PortalTheme" AS ENUM ('LIGHT', 'DARK');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "portalTheme" "PortalTheme" NOT NULL DEFAULT 'LIGHT';
