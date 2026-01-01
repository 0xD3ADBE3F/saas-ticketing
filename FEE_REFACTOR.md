# Fee Calculation Refactor Summary

## Overview

Consolidated scattered fee calculation logic into a single, centralized service with clear constants and straightforward calculations.

## Changes Made

### 1. Created Unified Fee Service

**File:** `src/server/services/feeService.ts`

**Constants (Single Source of Truth):**

- `MOLLIE_FEE_EXCL_VAT = 32` (€0.32 excl. VAT)
- `PLATFORM_FIXED_FEE_EXCL_VAT = 35` (€0.35 excl. VAT per order)
- `PLATFORM_VARIABLE_FEE_PERCENTAGE = 0.02` (2%)
- `VAT_RATE = 0.21` (21%)

**Main Functions:**

- `calculateServiceFee(ticketTotal)` - Returns complete service fee breakdown
- `calculatePaymentFee(paymentMethod)` - Returns payment fee breakdown
- `calculateOrderFees(ticketTotal, passPaymentFeesToBuyer)` - Returns complete order calculation
- `calculatePayoutFees(grossRevenue)` - Returns payout breakdown with platform fee deduction

**Types:**

- `ServiceFeeBreakdown` - Complete service fee details (platform fee + VAT)
- `PaymentFeeBreakdown` - Payment processing fee details (Mollie + VAT)
- `OrderFeeBreakdown` - Complete order with all fees
- `PayoutFeeBreakdown` - Payout calculation for organizers

### 2. Updated Order Service

**File:** `src/server/services/orderService.ts`

- Removed old `calculateServiceFee()` function
- Replaced scattered fee calculations with calls to `feeService.calculateOrderFees()`
- Simplified `calculateOrderSummary()` and `createOrder()` functions
- Now imports only from `feeService` for all fee calculations

### 3. Removed Deprecated Files

- **Deleted:** `src/server/lib/paymentFees.ts` (consolidated into feeService)
- **Deleted:** `tests/paymentFees.test.ts` (replaced by feeService.test.ts)

### 4. Updated Legacy Files

**File:** `src/server/lib/vat.ts`

- Marked old constants as `@deprecated`
- Updated values to match new fee structure
- Points to `feeService` for current values

### 5. Created Comprehensive Tests

**File:** `tests/feeService.test.ts`

- 29 tests covering all fee calculations
- Tests constants, service fees, payment fees, order fees, payout fees
- Includes edge cases and integration scenarios
- All tests passing ✓

### 6. Updated Existing Tests

**Files:**

- `tests/serviceFeeVat.test.ts` - Updated to use new feeService (17 tests passing)
- `tests/order.test.ts` - Updated imports and calculations (27 tests passing)

### 7. Type System Updates

**File:** `src/server/services/eventService.ts`

- Added `passPaymentFeesToBuyer?: boolean` to `CreateEventData`
- Added `passPaymentFeesToBuyer?: boolean` to `UpdateEventData`

**File:** `src/components/events/EventForm.tsx`

- Fixed syntax error in comment

## Fee Structure (New)

### Service Fee (Charged to Buyer)

```
Platform Fixed:    €0.35 excl. VAT
Platform Variable: ticketTotal × 2%
Platform VAT:      platformFee × 21%
Total Service Fee: platformFee + VAT
```

**Example (€50 ticket):**

- Platform fixed: €0.35
- Platform variable: €50 × 2% = €1.00
- Platform excl VAT: €1.35
- Platform VAT: €1.35 × 21% = €0.28
- **Total: €1.63**

### Payment Fee (Optional, Charged to Buyer)

```
Mollie Fee: €0.32 excl. VAT
VAT:        €0.32 × 21% = €0.07
Total:      €0.39
```

### Platform Revenue (Deducted from Payout)

```
Platform Fee: ticketRevenue × 2%
```

## Benefits

1. **Single Source of Truth:** All fee constants in one place
2. **Clear Separation:** Service fees vs payment fees vs platform revenue
3. **Easy to Update:** Change constants in one location
4. **Type Safe:** Full TypeScript support with proper interfaces
5. **Well Tested:** Comprehensive test coverage (73 tests)
6. **Simple API:** One function call for complete order calculation
7. **Proper VAT Handling:** Clear breakdown of excl/incl/VAT amounts

## Migration Notes

### Before:

```typescript
import { calculateServiceFeeWithVat } from "@/server/lib/vat";
import { calculatePaymentFeeWithVat } from "@/server/lib/paymentFees";

const serviceFee = calculateServiceFeeWithVat(ticketTotal);
const paymentFee = calculatePaymentFeeWithVat("ideal");
// Manual calculation of totals...
```

### After:

```typescript
import { calculateOrderFees } from "@/server/services/feeService";

const fees = calculateOrderFees(ticketTotal, passPaymentFeesToBuyer);
// fees.serviceFee.serviceFeeInclVat
// fees.paymentFee?.paymentFeeInclVat
// fees.totalAmount
```

## Verification

- ✅ Build successful: `npm run build`
- ✅ All fee tests passing: 73/73 tests
- ✅ TypeScript compilation: No errors
- ✅ Code structure: Clean and maintainable

## Constants Reference

| Constant                           | Value    | Description               |
| ---------------------------------- | -------- | ------------------------- |
| `MOLLIE_FEE_EXCL_VAT`              | 32 cents | €0.32 excl. VAT           |
| `PLATFORM_FIXED_FEE_EXCL_VAT`      | 35 cents | €0.35 excl. VAT per order |
| `PLATFORM_VARIABLE_FEE_PERCENTAGE` | 0.02     | 2% of ticket total        |
| `VAT_RATE`                         | 0.21     | 21% Dutch standard rate   |

## Next Steps (Optional)

1. Update `molliePaymentService.ts` to use new fee constants
2. Update payout calculations to use `feeService.calculatePayoutFees()`
3. Add support for multiple payment methods (currently hardcoded to "ideal")
4. Consider event-specific fee configuration (marked as TODO)
