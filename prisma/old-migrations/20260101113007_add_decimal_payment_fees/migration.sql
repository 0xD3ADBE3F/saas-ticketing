-- AlterTable
ALTER TABLE "events" ADD COLUMN     "passPaymentFeesToBuyer" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentFeeBuyerExclVat" DECIMAL(10,2),
ADD COLUMN     "paymentFeeBuyerInclVat" DECIMAL(10,2),
ADD COLUMN     "paymentFeeBuyerVatAmount" DECIMAL(10,2);
