/*
  Warnings:

  - You are about to drop the column `streetAddress` on the `organizations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "streetAddress",
ADD COLUMN     "registrationNumber" TEXT,
ADD COLUMN     "streetAndNumber" TEXT;
