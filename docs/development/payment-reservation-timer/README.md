# Payment Reservation Timer

**Status:** 🚧 In Progress
**Priority:** High
**Estimated Effort:** 6-8 hours (1-2 days)

## Overview

Implement a configurable payment reservation timer that displays a countdown to buyers on the checkout confirmation page, automatically expires unpaid orders after the timeout period, and releases reserved tickets back to inventory. This prevents inventory lockup from abandoned carts and creates urgency for buyers to complete their purchase.

## Current State

### ✅ Completed

- Order model with `expiresAt` field already exists
- Order status tracking with PENDING, PAID, FAILED, CANCELLED states
- Basic order expiration check in checkout page (`isExpired` logic)
- Ticket reservation system (tickets deducted when order created)
- Organization settings page with design configuration
- Public checkout flow with status banners

### ⬜ To Build

- Configurable payment timeout setting in Organization model (default 10 minutes)
- UI for configuring payment timeout in organization settings
- Visible countdown timer component on checkout page
- Client-side timer expiration handling with redirect + error message
- Background job/API endpoint to expire old orders
- Service logic to mark orders as expired and release tickets
- Error state management for expired orders

---

## Business Requirements

### User Story

**As a buyer**, I want to see how much time I have left to complete my payment so that I understand the urgency and don't lose my reserved tickets.

**As an organization admin**, I want to configure how long tickets are reserved during checkout so that I can balance buyer convenience with inventory availability.

**As the platform**, I want to automatically release unpaid reservations so that tickets don't get locked indefinitely by abandoned carts.

### Acceptance Criteria

- [x] Organization can configure payment timeout in minutes (default: 10, range: 5-30)
- [x] Countdown timer is prominently displayed on checkout confirmation page
- [x] Timer shows minutes and seconds remaining (e.g., "9:45")
- [x] Timer updates in real-time every second
- [x] When timer expires, buyer is redirected to event page with error message
- [x] Error message clearly states "Payment window expired, tickets released"
- [x] Background job runs periodically to expire orders past their `expiresAt` time
- [x] Expired orders are marked with appropriate status
- [x] Tickets from expired orders are released back to available inventory
- [x] Multi-tenancy: timeout is scoped per organization
- [x] Timer respects server time (prevents client-side manipulation)

### Use Cases

1. **Primary Use Case: Happy Path**
   - Buyer completes ticket selection → Order created with `expiresAt = now() + timeout`
   - Buyer sees countdown timer on checkout page: "Je tickets zijn gereserveerd voor 9:32"
   - Buyer clicks payment button and completes payment before timer expires
   - Order status becomes PAID, tickets remain allocated

2. **Timeout Expiration - Client Side**
   - Buyer sits on checkout page without paying
   - Timer counts down to 0:00
   - Page displays error: "Reservering verlopen, tickets vrijgegeven"
   - Buyer is redirected to event page with error toast
   - Background job catches order and marks as EXPIRED

3. **Timeout Expiration - Background Job**
   - Buyer leaves checkout page (closes tab)
   - Order remains PENDING with past `expiresAt`
   - Background job runs every minute
   - Job finds expired orders (status=PENDING, expiresAt < now())
   - Job marks order as EXPIRED and releases tickets

4. **Configuration Change**
   - Admin navigates to Settings > Ontwerp
   - Admin changes "Payment Reservation Time" from 10 to 15 minutes
   - New orders created after change use 15-minute timeout
   - Existing pending orders keep their original timeout

5. **Edge Cases:**
   - **Buyer returns after expiration**: Order shows expired banner, cannot pay
   - **Concurrent orders**: Multiple buyers can race for last tickets, first to pay wins
   - **Browser refresh**: Timer recalculates from `expiresAt` (server time)
   - **Browser time manipulation**: Timer uses server-provided `expiresAt`, not client clock

---

## Technical Implementation

### A) Database Schema

**Existing Schema (no changes):**

```prisma
model Order {
  expiresAt DateTime?   // Already exists - used for timer
  status    OrderStatus @default(PENDING)
  createdAt DateTime    @default(now())
  // ... other fields
}

enum OrderStatus {
  PENDING
  PAID
  FAILED
  CANCELLED
  REFUNDED
  EXPIRED // ← NEW: Add this status for expired orders
}
```

**New Schema:**

```prisma
model Organization {
  id                       String   @id @default(uuid())
  name                     String
  // ... existing fields ...

  // NEW: Payment timeout configuration
  paymentTimeoutMinutes    Int      @default(10) // Time in minutes for payment reservation

  // ... rest of fields
}
```

**Migration:**

```sql
-- Migration: add_payment_timeout_config
-- Add payment timeout configuration to organizations

ALTER TABLE organizations
  ADD COLUMN "paymentTimeoutMinutes" INTEGER NOT NULL DEFAULT 10;

-- Add EXPIRED status to OrderStatus enum
ALTER TYPE "OrderStatus" ADD VALUE 'EXPIRED';

-- Add index for efficient background job queries
CREATE INDEX "idx_orders_pending_expired"
  ON "orders"("status", "expiresAt")
  WHERE "status" = 'PENDING' AND "expiresAt" IS NOT NULL;
```

---

### B) Services

**File:** `src/server/services/orderExpirationService.ts`

```typescript
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";

export const orderExpirationService = {
  /**
   * Find and expire all orders that have passed their expiresAt time
   * Releases tickets back to available inventory
   * @returns Number of orders expired
   */
  async expireOldOrders(): Promise<number> {
    const now = new Date();

    // Find all PENDING orders that have expired
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: now, // Less than current time
        },
      },
      include: {
        tickets: true,
        event: {
          include: {
            ticketTypes: true,
          },
        },
      },
    });

    if (expiredOrders.length === 0) {
      logger.info("No expired orders found");
      return 0;
    }

    logger.info(`Found ${expiredOrders.length} expired orders`);

    let successCount = 0;

    for (const order of expiredOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Mark order as EXPIRED
          await tx.order.update({
            where: { id: order.id },
            data: { status: "EXPIRED" },
          });

          // 2. Delete tickets (cascade will handle cleanup)
          // This releases the capacity back to the ticket types
          await tx.ticket.deleteMany({
            where: { orderId: order.id },
          });

          logger.info(
            `Expired order ${order.orderNumber} and released ${order.tickets.length} tickets`
          );
        });

        successCount++;
      } catch (error) {
        logger.error(`Failed to expire order ${order.id}:`, error);
      }
    }

    logger.info(
      `Successfully expired ${successCount}/${expiredOrders.length} orders`
    );
    return successCount;
  },

  /**
   * Calculate expiration time for a new order based on organization settings
   * @param organizationId - Organization ID
   * @returns Date when order should expire
   */
  async calculateExpirationTime(organizationId: string): Promise<Date> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { paymentTimeoutMinutes: true },
    });

    const timeoutMinutes = org?.paymentTimeoutMinutes ?? 10; // Default 10 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + timeoutMinutes);

    return expiresAt;
  },
};
```

**Update:** `src/server/services/orderService.ts`

```typescript
// Add to existing orderService

import { orderExpirationService } from "./orderExpirationService";

// Update createOrder to use dynamic timeout
export async function createOrder(data: CreateOrderData) {
  // ... existing validation ...

  // Calculate expiration time based on organization settings
  const expiresAt = await orderExpirationService.calculateExpirationTime(
    event.organizationId
  );

  // Create order with calculated expiration
  const order = await prisma.order.create({
    data: {
      // ... existing fields ...
      expiresAt, // Use calculated time
      // ... rest of fields
    },
  });

  // ... rest of function
}
```

---

### C) API Routes

**File:** `src/app/api/cron/expire-orders/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { orderExpirationService } from "@/server/services/orderExpirationService";
import { logger } from "@/server/lib/logger";

/**
 * Cron job endpoint to expire old orders
 * Should be called every minute by a cron service (Vercel Cron, etc.)
 *
 * Authorization: Bearer token from env variable
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting order expiration cron job");
    const expiredCount = await orderExpirationService.expireOldOrders();

    return NextResponse.json({
      success: true,
      expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Cron job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Allow GET requests only
export const runtime = "edge"; // Optional: use edge runtime
export const dynamic = "force-dynamic";
```

**File:** `vercel.json` (Cron Configuration)

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-orders",
      "schedule": "* * * * *"
    }
  ]
}
```

---

### D) UI Components

**File:** `src/components/checkout/PaymentTimer.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PaymentTimerProps {
  expiresAt: Date | string;
  orderNumber: string;
  eventSlug: string;
}

export function PaymentTimer({ expiresAt, orderNumber, eventSlug }: PaymentTimerProps) {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Calculate initial time remaining
    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const remaining = Math.max(0, expiryTime - now);

    if (remaining === 0) {
      setIsExpired(true);
      // Redirect after showing expired message
      setTimeout(() => {
        router.push(`/e/${eventSlug}?error=payment-expired`);
      }, 3000);
      return;
    }

    setTimeRemaining(remaining);

    // Update every second
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, expiryTime - now);

      setTimeRemaining(remaining);

      if (remaining === 0) {
        setIsExpired(true);
        clearInterval(interval);
        // Redirect to event page with error
        setTimeout(() => {
          router.push(`/e/${eventSlug}?error=payment-expired`);
        }, 3000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, eventSlug, router]);

  // Format milliseconds to MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (isExpired) {
    return (
      <Alert variant="destructive" className="animate-fade-in">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription>
          <span className="font-semibold block mb-1">
            Reservering verlopen
          </span>
          <p className="text-sm">
            Je tickets zijn vrijgegeven. Je wordt doorgestuurd naar het evenement...
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (timeRemaining === null) {
    return null;
  }

  const isUrgent = timeRemaining < 2 * 60 * 1000; // Less than 2 minutes

  return (
    <Alert
      variant={isUrgent ? "destructive" : "default"}
      className={isUrgent ? "animate-pulse" : ""}
    >
      <Clock className="h-5 w-5" />
      <AlertDescription>
        <span className="font-semibold block mb-1">
          Je tickets zijn gereserveerd voor:
        </span>
        <p className="text-2xl font-mono font-bold">
          {formatTime(timeRemaining)}
        </p>
        <p className="text-sm mt-2">
          {isUrgent
            ? "⚠️ Betaal snel om je tickets te behouden!"
            : "Rond je betaling af binnen deze tijd om je reservering te behouden."}
        </p>
      </AlertDescription>
    </Alert>
  );
}
```

**File:** `src/app/(public)/e/[slug]/page.tsx` (Add error handling)

```typescript
// Add to existing event page

export default async function EventPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  // ... existing code ...

  const { error } = await searchParams;

  return (
    <div>
      {/* Show error banner if payment expired */}
      {error === "payment-expired" && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>
            <span className="font-semibold block mb-1">
              Reservering verlopen
            </span>
            <p className="text-sm">
              Je betaalvenster is verlopen en de tickets zijn weer vrijgegeven.
              Je kunt opnieuw tickets bestellen.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Rest of page */}
    </div>
  );
}
```

**Update:** `src/app/(public)/checkout/[orderId]/page.tsx`

```typescript
// Add timer to checkout page

import { PaymentTimer } from "@/components/checkout/PaymentTimer";

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  // ... existing code ...

  return (
    <div>
      {/* Add timer above payment section for pending orders */}
      {isPending && order.expiresAt && (
        <div className="mb-6">
          <PaymentTimer
            expiresAt={order.expiresAt}
            orderNumber={order.orderNumber}
            eventSlug={event.slug}
          />
        </div>
      )}

      {/* Rest of checkout page */}
    </div>
  );
}
```

---

### E) Settings UI

**File:** `src/app/(dashboard)/dashboard/settings/design/page.tsx`

```typescript
// Add to existing design settings page

export default function DesignSettingsPage() {
  return (
    <div>
      {/* Existing design settings */}

      {/* Add Payment Settings Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Betaalinstellingen</h3>
          <p className="text-sm text-muted-foreground">
            Configureer hoe lang tickets gereserveerd blijven tijdens het afrekenproces.
          </p>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="text-sm font-medium">
              Reserveringstijd betaling (minuten)
            </label>
            <p className="text-sm text-muted-foreground mb-2">
              Hoe lang blijven tickets gereserveerd voordat ze worden vrijgegeven? (5-30 minuten)
            </p>
            <input
              type="number"
              min="5"
              max="30"
              defaultValue={10}
              name="paymentTimeoutMinutes"
              className="w-32"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Standaard: 10 minuten. Langere tijden geven kopers meer tijd,
              maar kunnen leiden tot geblokkeerde voorraad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Implementation Checklist

### Phase 1: Database & Configuration

- [ ] Add `paymentTimeoutMinutes` field to Organization model
- [ ] Add `EXPIRED` status to OrderStatus enum
- [ ] Create and run migration
- [ ] Add index on (status, expiresAt) for efficient queries
- [ ] Update organization settings page UI

### Phase 2: Services

- [ ] Create orderExpirationService with expireOldOrders()
- [ ] Add calculateExpirationTime() helper
- [ ] Update orderService.createOrder() to use dynamic timeout
- [ ] Add tests for expiration logic

### Phase 3: Cron Job

- [ ] Create /api/cron/expire-orders route
- [ ] Add CRON_SECRET to environment variables
- [ ] Configure vercel.json for cron schedule
- [ ] Test manual cron execution

### Phase 4: UI Components

- [ ] Create PaymentTimer component with countdown
- [ ] Add timer to checkout page (pending orders only)
- [ ] Implement client-side expiration redirect
- [ ] Add error banner to event page
- [ ] Style timer with urgency states (normal vs urgent)

### Phase 5: Testing

- [ ] Test timer counts down correctly
- [ ] Test expiration redirects to event page with error
- [ ] Test background job expires orders
- [ ] Test tickets are released after expiration
- [ ] Test configuration changes affect new orders
- [ ] Test edge cases (refresh, back button, concurrent orders)

---

## Environment Variables

```bash
# .env
CRON_SECRET=your-secret-token-here  # Generate with: openssl rand -base64 32
```

---

## Testing Scenarios

### 1. Timer Display

- Create order → Go to checkout → Timer shows correct countdown
- Refresh page → Timer recalculates from server time
- Multiple tabs → All timers sync (server-driven)

### 2. Client Expiration

- Create order → Wait for timer to reach 0:00
- Verify expired message shows
- Verify redirect to event page after 3 seconds
- Verify error banner on event page

### 3. Background Expiration

- Create order → Close tab immediately
- Wait 10 minutes
- Run cron job (or wait for automatic run)
- Verify order status = EXPIRED
- Verify tickets released (can be ordered again)

### 4. Configuration

- Admin sets timeout to 15 minutes
- Create new order
- Verify order.expiresAt = createdAt + 15 minutes
- Verify timer shows 15:00 countdown

### 5. Edge Cases

- Order with 1 second left → Payment succeeds → Order becomes PAID
- Multiple concurrent orders for last ticket → First to pay wins
- Expired order → Buyer tries to pay → Payment fails (order expired)

---

## Performance Considerations

- **Index**: Add composite index on (status, expiresAt) for fast cron queries
- **Batch size**: Cron job processes all expired orders in single query
- **Transaction**: Use Prisma transaction for atomic order expiration + ticket release
- **Client polling**: Timer runs client-side only, no server polling needed
- **Cron frequency**: Running every minute is sufficient, prevents ticket lockup

---

## Security Considerations

- **Cron authentication**: Use Bearer token to prevent unauthorized access
- **Server time**: Use server-provided `expiresAt`, ignore client time
- **Idempotency**: Cron job is idempotent (safe to run multiple times)
- **Race conditions**: Transaction ensures atomic ticket release

---

## Future Enhancements

- Email notification 2 minutes before expiration
- Extend timer button (one-time 5-minute extension)
- Analytics: track how many orders expire vs complete
- Different timeouts per event (override organization default)
- SMS notification for expiring high-value orders

---

## References

- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [React useEffect Timer Pattern](https://overreacted.io/making-setinterval-declarative-with-react-hooks/)
