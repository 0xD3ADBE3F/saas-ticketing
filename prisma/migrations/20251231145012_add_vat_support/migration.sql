-- CreateEnum
CREATE TYPE "VatRate" AS ENUM ('STANDARD_21', 'REDUCED_9', 'EXEMPT');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "vatRate" "VatRate" NOT NULL DEFAULT 'STANDARD_21';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "serviceFeeExclVat" INTEGER,
ADD COLUMN     "serviceFeeVat" INTEGER;

-- AlterTable
ALTER TABLE "ticket_types" ADD COLUMN     "priceExclVat" INTEGER,
ADD COLUMN     "vatAmount" INTEGER;

-- Data migration: Calculate VAT breakdown for existing ticket types
-- Assumes all existing events use 21% VAT (STANDARD_21)
UPDATE "ticket_types"
SET
  "vatAmount" = ROUND("price" * 0.21 / 1.21),
  "priceExclVat" = "price" - ROUND("price" * 0.21 / 1.21)
WHERE "priceExclVat" IS NULL;

-- Data migration: Calculate VAT breakdown for existing orders' service fees
-- Service fees always use 21% VAT
UPDATE "orders"
SET
  "serviceFeeVat" = ROUND("serviceFee" * 0.21 / 1.21),
  "serviceFeeExclVat" = "serviceFee" - ROUND("serviceFee" * 0.21 / 1.21)
WHERE "serviceFeeExclVat" IS NULL;
