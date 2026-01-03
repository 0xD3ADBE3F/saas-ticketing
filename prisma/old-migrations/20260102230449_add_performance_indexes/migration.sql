-- Performance Indexes Migration
-- This migration adds composite and covering indexes to improve query performance

-- Orders table optimizations
-- Composite index for buyer queries with date filtering (analytics & filtering)
CREATE INDEX IF NOT EXISTS "orders_buyerEmail_createdAt_idx" ON "orders"("buyerEmail", "createdAt" DESC);

-- Composite index for organization revenue queries (frequently accessed for dashboard)
CREATE INDEX IF NOT EXISTS "orders_organizationId_status_paidAt_idx" ON "orders"("organizationId", "status", "paidAt" DESC) WHERE "status" = 'PAID';

-- Index for event-based order filtering
CREATE INDEX IF NOT EXISTS "orders_eventId_status_idx" ON "orders"("eventId", "status");

-- Index for payment lookup and reconciliation
CREATE INDEX IF NOT EXISTS "orders_paymentId_status_idx" ON "orders"("paymentId", "status") WHERE "paymentId" IS NOT NULL;

-- Tickets table optimizations
-- Composite index for event scanning statistics (most common query)
CREATE INDEX IF NOT EXISTS "tickets_eventId_status_usedAt_idx" ON "tickets"("eventId", "status", "usedAt" DESC);

-- Index for order ticket lookups (frequently accessed together)
CREATE INDEX IF NOT EXISTS "tickets_orderId_status_idx" ON "tickets"("orderId", "status");

-- Composite index for ticket type performance analytics
CREATE INDEX IF NOT EXISTS "tickets_ticketTypeId_status_idx" ON "tickets"("ticketTypeId", "status");

-- ScanLogs table optimizations
-- Composite index for recent scans per event (scanner dashboard)
CREATE INDEX IF NOT EXISTS "scan_logs_ticketId_result_scannedAt_idx" ON "scan_logs"("ticketId", "result", "scannedAt" DESC);

-- Index for offline sync queries
CREATE INDEX IF NOT EXISTS "scan_logs_offlineSync_syncedAt_idx" ON "scan_logs"("offlineSync", "syncedAt") WHERE "offlineSync" = true;

-- Index for scan analytics by scanner
CREATE INDEX IF NOT EXISTS "scan_logs_scannedBy_scannedAt_idx" ON "scan_logs"("scannedBy", "scannedAt" DESC);

-- Events table optimizations
-- Composite index for public events listing (most common public query)
CREATE INDEX IF NOT EXISTS "events_status_startsAt_idx" ON "events"("status", "startsAt" DESC) WHERE "status" = 'LIVE';

-- Composite index for organization event management
CREATE INDEX IF NOT EXISTS "events_organizationId_status_startsAt_idx" ON "events"("organizationId", "status", "startsAt" DESC);

-- Index for location-based queries (if implementing map features)
CREATE INDEX IF NOT EXISTS "events_latitude_longitude_idx" ON "events"("latitude", "longitude") WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;

-- Memberships table optimization
-- Composite index for user organization lookups (authentication checks)
CREATE INDEX IF NOT EXISTS "memberships_userId_role_idx" ON "memberships"("userId", "role");

-- AuditLogs table optimizations
-- Composite index for entity audit trail
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_entityId_createdAt_idx" ON "audit_logs"("entityType", "entityId", "createdAt" DESC);

-- Composite index for user activity tracking
CREATE INDEX IF NOT EXISTS "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt" DESC);

-- Composite index for organization audit filtering
CREATE INDEX IF NOT EXISTS "audit_logs_organizationId_action_idx" ON "audit_logs"("organizationId", "action");

-- IdempotencyKeys table optimization
-- Partial index for active keys (excluding expired)
CREATE INDEX IF NOT EXISTS "idempotency_keys_key_organizationId_expiresAt_idx" ON "idempotency_keys"("key", "organizationId", "expiresAt") WHERE "expiresAt" > NOW();

-- Invoices table optimizations
-- Composite index for organization invoice queries
CREATE INDEX IF NOT EXISTS "invoices_organizationId_status_invoiceDate_idx" ON "invoices"("organizationId", "status", "invoiceDate" DESC);

-- Composite index for event invoicing
CREATE INDEX IF NOT EXISTS "invoices_eventId_type_status_idx" ON "invoices"("eventId", "type", "status") WHERE "eventId" IS NOT NULL;

-- Index for overdue invoice queries
CREATE INDEX IF NOT EXISTS "invoices_status_dueDate_idx" ON "invoices"("status", "dueDate") WHERE "status" IN ('PENDING', 'SENT') AND "dueDate" IS NOT NULL;

-- ScannerTerminals table optimization
-- Composite index for active terminal lookups
CREATE INDEX IF NOT EXISTS "scanner_terminals_isActive_expiresAt_idx" ON "scanner_terminals"("isActive", "expiresAt") WHERE "isActive" = true;

-- Composite index for event terminal management
CREATE INDEX IF NOT EXISTS "scanner_terminals_eventId_isActive_idx" ON "scanner_terminals"("eventId", "isActive") WHERE "eventId" IS NOT NULL;

-- TicketTypes table optimizations
-- Composite index for public ticket type queries (capacity checks)
CREATE INDEX IF NOT EXISTS "ticket_types_eventId_sortOrder_idx" ON "ticket_types"("eventId", "sortOrder");

-- Index for available ticket types (sales window)
CREATE INDEX IF NOT EXISTS "ticket_types_eventId_saleStart_saleEnd_idx" ON "ticket_types"("eventId", "saleStart", "saleEnd");

-- OrderItems table optimization
-- Composite index for revenue analytics by ticket type
CREATE INDEX IF NOT EXISTS "order_items_ticketTypeId_orderId_idx" ON "order_items"("ticketTypeId", "orderId");