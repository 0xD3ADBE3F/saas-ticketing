/*
  Warnings:

  - A unique constraint covering the columns `[unlimitedTicketsPaymentId]` on the table `events` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "unlimitedTicketsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unlimitedTicketsPaidAt" TIMESTAMP(3),
ADD COLUMN     "unlimitedTicketsPaymentId" TEXT;

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- CreateIndex
CREATE INDEX "platform_settings_key_idx" ON "platform_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "events_unlimitedTicketsPaymentId_key" ON "events"("unlimitedTicketsPaymentId");

-- CreateIndex
CREATE INDEX "events_unlimitedTicketsEnabled_idx" ON "events"("unlimitedTicketsEnabled");
