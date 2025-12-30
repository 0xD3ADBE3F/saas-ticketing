-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'NL',
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "streetAddress" TEXT;
