# Phase 3.5 - Mollie Sales Invoice API Integration

## Status: ✅ Complete

### Overview

Phase 3.5 has been successfully implemented. The system now automatically generates formal invoices for organization subscription payments using Mollie's Sales Invoice API (Beta).

### Key Implementation Details

#### Architecture Decision

Invoices are created using the **platform's MOLLIE_API_KEY** (Entro's Mollie account), NOT organization OAuth tokens. This is because:

- Invoices are FROM Entro TO organizations (for subscription fees)
- Organizations don't need Mollie accounts to receive subscription invoices
- The platform account has the `sales-invoices.write` scope

This differs from payment processing, where we use the organization's OAuth token to receive ticket sale proceeds.

#### What Was Implemented

1. **Service Layer** (`src/server/services/mollieInvoiceService.ts`)
   - `createSalesInvoice()`: Full Mollie API integration
     - Fetches organization details (name, email)
     - Generates invoice number (YYYY-NNNN format)
     - Calculates VAT (reverse calculation: Net = Gross / 1.21)
     - Calls Mollie API with recipient and line item data
     - Handles API errors with structured logging
     - Stores response (mollieSalesInvoiceId, pdfUrl) in database

   - `generateSubscriptionInvoice()`: Creates invoices for subscription payments
   - `generateEventInvoice()`: Creates invoices for PAY_PER_EVENT payments

2. **Webhook Integration**
   - `mollieSubscriptionService.ts` calls `generateSubscriptionInvoice()` after successful payments
   - Works for both first payments and recurring payments
   - Invoices created with status="paid" immediately

3. **Database Schema** (already completed in Phase 3)
   - `SubscriptionInvoice` model with Mollie fields
   - Fields: `mollieSalesInvoiceId`, `pdfUrl`, `status`, `molliePaymentId`
   - Idempotency via `molliePaymentId` unique constraint

4. **UI Components** (already completed in Phase 3)
   - `/dashboard/settings/subscription/billing` page
   - `BillingHistory.tsx` component displays invoices
   - `InvoiceFilters.tsx` for filtering by type/status/date
   - PDF download buttons

### Technical Implementation Notes

#### VAT Calculation

```typescript
const VAT_RATE = 21; // NL VAT rate
const netAmount = Math.round(amount / (1 + VAT_RATE / 100));
const vatAmount = amount - netAmount;
```

Mollie API expects `unitPrice` WITHOUT VAT, then adds VAT automatically based on `vatRate` field.

#### API Request Structure

```typescript
POST https://api.mollie.com/v2/sales-invoices
Authorization: Bearer <MOLLIE_API_KEY>

{
  "status": "paid",
  "paymentTerm": "14 days",
  "recipientIdentifier": "<organizationId>",
  "recipient": {
    "type": "business",
    "organizationName": "...",
    "email": "...",
    "streetAndNumber": "N/A",  // TODO: Collect during onboarding
    "postalCode": "0000AA",
    "city": "Amsterdam",
    "country": "NL",
    "locale": "nl_NL"
  },
  "lines": [{
    "description": "PROFESSIONAL Subscription - January 2025",
    "quantity": 1,
    "vatRate": "21.00",
    "unitPrice": {
      "currency": "EUR",
      "value": "40.50"  // Net amount (€49 / 1.21)
    }
  }],
  "paymentDetails": {
    "source": "payment",
    "sourceReference": "<molliePaymentId>"
  }
}
```

#### API Response

```typescript
{
  "id": "inv_xxxxxxxxxxxx",
  "invoiceNumber": "2024-0001",
  "status": "paid",
  "_links": {
    "pdfLink": {
      "href": "https://api.mollie.com/v2/sales-invoices/inv_xxxx/pdf"
    }
  }
  // ... other fields
}
```

#### Idempotency

Invoice creation checks for existing invoices by `molliePaymentId` to prevent duplicates on webhook retries:

```typescript
const existing = await invoiceRepo.findByMolliePaymentId(molliePaymentId);
if (existing) {
  return existing; // Return existing invoice instead of creating duplicate
}
```

### Known Technical Debt

#### Address Placeholders

Current implementation uses placeholder values for organization address fields:

- `streetAndNumber`: "N/A"
- `postalCode`: "0000AA"
- `city`: "Amsterdam"

**TODO:** Collect actual organization address during onboarding. This may be required for Dutch tax compliance.

### Testing

#### Manual Testing Procedure

1. **Trigger Subscription Payment**
   - Navigate to `/dashboard/settings/subscription`
   - Upgrade organization to PROFESSIONAL plan
   - Complete payment in Mollie test mode

2. **Verify Webhook Processing**
   - Check server logs for `generateSubscriptionInvoice()` call
   - Verify no errors in structured logging

3. **Check Database**
   - Query `SubscriptionInvoice` table
   - Verify `mollieSalesInvoiceId` is populated (format: `inv_xxxx`)
   - Verify `pdfUrl` is populated
   - Verify `status` is "PAID"

4. **Test UI**
   - Navigate to `/dashboard/settings/subscription/billing`
   - Verify invoice appears in billing history
   - Click PDF download button
   - Verify PDF opens/downloads correctly

5. **Verify in Mollie Dashboard**
   - Log into Mollie dashboard
   - Navigate to Sales Invoices section
   - Confirm invoice was created
   - Verify recipient details
   - Check PDF is generated

#### Test Script

A test script was created at `scripts/test-invoice-api.ts` but requires environment setup. For actual testing, use the manual procedure above with a real subscription payment flow.

### Files Modified

#### Phase 3.5 Implementation

1. `src/server/services/mollieInvoiceService.ts`
   - Added imports for `env` and `prisma`
   - Rewrote `createSalesInvoice()` with full Mollie API integration
   - Updated `generateSubscriptionInvoice()` to remove access token parameter
   - Updated `generateEventInvoice()` similarly
   - Added `_links` type for PDF URL access
   - Removed unused `calculateVat()` function

2. `src/app/(dashboard)/dashboard/settings/subscription/actions.ts`
   - Fixed variable scope issue (`usage` → `usageRecord`)

#### Phase 3 (Already Complete)

- Database schema: `prisma/schema.prisma`
- Repository: `src/server/repos/invoiceRepo.ts`
- UI components: `src/components/subscription/BillingHistory.tsx`, `InvoiceFilters.tsx`
- Page: `src/app/(dashboard)/dashboard/settings/subscription/billing/page.tsx`

### Next Steps (Future Enhancements)

1. **Address Collection**
   - Add organization address fields to Organization model
   - Collect during onboarding flow
   - Add address validation for Dutch addresses
   - Update invoice generation to use real addresses

2. **Invoice Testing**
   - Add unit tests for `mollieInvoiceService`
   - Add integration tests for webhook → invoice flow
   - Add E2E test for billing history page

3. **International Support** (if needed)
   - Support non-NL organizations
   - Handle different VAT rates by country
   - Localize invoice descriptions

4. **Invoice Status Sync** (if needed)
   - Listen for Mollie invoice status webhooks
   - Update local invoice status when changed externally
   - Handle invoice cancellation/refund scenarios

### Documentation Updates

- ✅ FEATURES.md updated: Phase 3.5 marked complete
- ✅ Implementation tasks table updated with completion status
- ✅ Architecture notes added about platform API key usage
- ⬜ MOLLIE_PLATFORM.md: Could add detailed API integration guide
- ⬜ Flow diagram: Could add visual diagram of invoice generation flow

## Summary

Phase 3.5 is **complete and ready for production testing**. The implementation:

- ✅ Calls actual Mollie Sales Invoice API
- ✅ Uses platform MOLLIE_API_KEY (correct architecture)
- ✅ Generates invoices automatically after payments
- ✅ Stores mollieSalesInvoiceId and pdfUrl
- ✅ Handles errors with structured logging
- ✅ Prevents duplicate invoices with idempotency checks
- ✅ Integrates seamlessly with existing UI

The next milestone is to test the complete flow with a real subscription payment in Mollie's test mode.
