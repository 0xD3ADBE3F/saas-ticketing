-- CreateTable
CREATE TABLE "scanner_devices" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scanner_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scanner_devices_organizationId_idx" ON "scanner_devices"("organizationId");

-- CreateIndex
CREATE INDEX "scanner_devices_deviceId_idx" ON "scanner_devices"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "scanner_devices_organizationId_deviceId_key" ON "scanner_devices"("organizationId", "deviceId");
