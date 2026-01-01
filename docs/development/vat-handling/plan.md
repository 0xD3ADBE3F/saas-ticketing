# VAT/BTW Handling Implementation

**Status:** ✅ Complete
**Priority:** High
**Completed:** 1 January 2026

## Overview

VAT-compliant pricing and reporting for the Entro ticketing platform, supporting NL tax requirements (9%, 21%, and exempt rates).

## Current State

### ✅ Fully Implemented

**Database Schema:**

- ✅ `VatRate` enum in Prisma (STANDARD_21, REDUCED_9, EXEMPT)
- ✅ `Event.vatRate` field with default STANDARD_21
- ✅ `TicketType.priceExclVat` and `TicketType.vatAmount` fields
- ✅ `Order.serviceFeeVat` field for service fee VAT tracking

**VAT Utilities:**

- ✅ `src/server/lib/vat.ts` - Complete VAT calculation library
- ✅ `calcVatFromInclusive()` - Calculate VAT from inclusive price
- ✅ `calcPriceExclVat()` - Calculate exclusive price
- ✅ `calcVatAmount()` - Calculate VAT from exclusive price
- ✅ `calcPriceInclVat()` - Calculate inclusive price
- ✅ `getPriceBreakdown()` - Full price breakdown with VAT
- ✅ All functions fully tested (tests/vat.test.ts - 207 lines)

**Event Management:**

- ✅ VAT rate selection in event form (EventForm.tsx)
- ✅ VAT rate stored on event creation/update
- ✅ API validation for VAT rates

**Ticket Type Integration:**

- ✅ Automatic VAT calculation on ticket type creation
- ✅ `priceExclVat` and `vatAmount` computed and stored
- ✅ Uses event's VAT rate for calculations

**Reporting:**

- ✅ VAT rate included in payout service
- ✅ Event breakdown shows VAT information

**Testing:**

- ✅ Comprehensive unit tests (tests/vat.test.ts)
- ✅ Tests for all VAT rates (21%, 9%, exempt)
- ✅ Rounding edge cases covered
- ✅ Integration with ticket type service tested

---

## Implementation Complete ✅

This feature is **production-ready**. All core VAT functionality is implemented and tested.

### Key Files

- `src/server/lib/vat.ts` - VAT calculation utilities
- `prisma/schema.prisma` - VatRate enum, Event.vatRate, TicketType VAT fields
- `src/components/events/EventForm.tsx` - VAT rate selector UI
- `src/server/services/ticketTypeService.ts` - Automatic VAT calculations
- `tests/vat.test.ts` - Comprehensive test coverage

### Optional Enhancements (Future)

1. **VAT Change Prevention** - Block VAT rate changes after tickets sold
2. **Enhanced CSV Exports** - Add dedicated VAT breakdown columns
3. **Payout Dashboard** - Show VAT breakdown in organizer reports
4. **Invoice Integration** - VAT details on platform fee invoices (requires Mollie Invoicing feature)

### Usage

Organizers select VAT rate (21%, 9%, or exempt) when creating events. System automatically calculates and stores VAT breakdowns for all ticket types. All prices shown to buyers are VAT-inclusive.
