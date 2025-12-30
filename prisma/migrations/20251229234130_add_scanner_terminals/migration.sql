-- CreateTable
CREATE TABLE "scanner_terminals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scanner_terminals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scanner_terminals_code_key" ON "scanner_terminals"("code");

-- CreateIndex
CREATE INDEX "scanner_terminals_organizationId_idx" ON "scanner_terminals"("organizationId");

-- CreateIndex
CREATE INDEX "scanner_terminals_eventId_idx" ON "scanner_terminals"("eventId");

-- CreateIndex
CREATE INDEX "scanner_terminals_code_idx" ON "scanner_terminals"("code");

-- CreateIndex
CREATE INDEX "scanner_terminals_isActive_idx" ON "scanner_terminals"("isActive");

-- AddForeignKey
ALTER TABLE "scanner_terminals" ADD CONSTRAINT "scanner_terminals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scanner_terminals" ADD CONSTRAINT "scanner_terminals_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
