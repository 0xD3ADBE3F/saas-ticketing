# Fix: soldCount Double-Counting Bug

**Date:** 2026-01-04
**Issue:** Ticket statistics showing 2x the actual number of tickets sold on `/dashboard/events/[id]`
**Status:** ✅ Fixed

## Problem

The ticket statistics on the event dashboard page showed double the correct number of tickets sold. The scanning page showed the correct count.

### Root Cause

The `soldCount` field in the `TicketType` table was being incremented **twice**:

1. **First increment**: When an order is created in `orderService.ts` (line 248-254)

   ```typescript
   await tx.ticketType.update({
     where: { id: ticketType.id },
     data: {
       soldCount: { increment: item.quantity },
     },
   });
   ```

2. **Second increment**: When payment is marked as paid in `paymentService.ts` (line 155-165)
   ```typescript
   // This was the duplicate increment (now removed)
   for (const item of order.orderItems) {
     await tx.ticketType.update({
       where: { id: item.ticketTypeId },
       data: {
         soldCount: { increment: item.quantity },
       },
     });
   }
   ```

### Why the Scanning Page Was Correct

The scanning page uses `getEventScanningStats()` from `scanningStatsService.ts`, which counts actual `Ticket` records from the database:

```typescript
const totalSold = await prisma.ticket.count({
  where: {
    ticketType: { eventId },
    order: { status: "PAID" },
  },
});
```

This gives the correct count because tickets are only created once.

## Solution

### Code Changes

**File:** `src/server/services/paymentService.ts`

Removed the duplicate `soldCount` increment loop (lines 155-165), leaving only the increment in `orderService.ts` which happens when the order is first created.

```typescript
// Before (INCORRECT - double counting):
// 2. Create all tickets
await tx.ticket.createMany({ data: ticketsToCreate });

// 3. Update sold counts for each ticket type
for (const item of order.orderItems) {
  await tx.ticketType.update({
    where: { id: item.ticketTypeId },
    data: { soldCount: { increment: item.quantity } },
  });
}

// After (CORRECT - single counting):
// 2. Create all tickets
await tx.ticket.createMany({ data: ticketsToCreate });

// Note: soldCount is already incremented when order is created in orderService.ts
// We don't increment it again here to avoid double-counting
```

### Data Migration Script

Created: `scripts/fix-soldcount-double-counting.ts`

This script recalculates the correct `soldCount` for all existing ticket types by:

1. Finding all ticket types
2. Summing the `quantity` from all `orderItems` with `order.status === "PAID"`
3. Updating the `soldCount` if it differs from the calculated value

**To run (on production):**

```bash
npx tsx scripts/fix-soldcount-double-counting.ts
```

## Verification

### Before Fix

- Event dashboard: Shows `X * 2` tickets sold
- Scanning page: Shows `X` tickets sold (correct)

### After Fix

- Event dashboard: Shows `X` tickets sold (correct)
- Scanning page: Shows `X` tickets sold (correct)

## Testing

Existing tests continue to pass. The fix doesn't break any functionality because:

- Order creation flow remains unchanged (soldCount incremented once in orderService)
- Order expiration correctly decrements soldCount
- No other code paths increment soldCount

## Related Files

- `src/server/services/paymentService.ts` - Removed duplicate increment
- `src/server/services/orderService.ts` - Correct increment location
- `src/server/services/ticketTypeService.ts` - Uses soldCount for stats
- `src/server/services/scanningStatsService.ts` - Uses actual ticket count
- `scripts/fix-soldcount-double-counting.ts` - Data migration script

## Prevention

Added comment in `paymentService.ts` explaining why soldCount is NOT incremented there, to prevent future developers from re-introducing this bug.
