-- Add PLATFORM_FEE to existing InvoiceType enum
-- This must be in a separate migration from any usage of the value
ALTER TYPE "InvoiceType" ADD VALUE IF NOT EXISTS 'PLATFORM_FEE';
