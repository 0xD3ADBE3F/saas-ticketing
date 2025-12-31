-- AlterTable
ALTER TABLE "events" ADD COLUMN     "serviceFeeFixed" INTEGER,
ADD COLUMN     "serviceFeeMaximum" INTEGER,
ADD COLUMN     "serviceFeeMinimum" INTEGER,
ADD COLUMN     "serviceFeePercentage" DOUBLE PRECISION;
