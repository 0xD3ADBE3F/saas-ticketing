-- CreateIndex
CREATE INDEX "order_items_ticketTypeId_idx" ON "order_items"("ticketTypeId");

-- CreateIndex
CREATE INDEX "orders_organizationId_paidAt_idx" ON "orders"("organizationId", "paidAt" DESC);

-- CreateIndex
CREATE INDEX "orders_organizationId_createdAt_idx" ON "orders"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "scan_logs_ticketId_scannedAt_idx" ON "scan_logs"("ticketId", "scannedAt" DESC);

-- CreateIndex
CREATE INDEX "tickets_eventId_status_idx" ON "tickets"("eventId", "status");
