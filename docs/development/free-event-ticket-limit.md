# Free Event Ticket Limit

**Status:** 🟨 Planned
**Priority:** Medium
**Estimated Effort:** 12-16 hours (2-3 days)

## Overview

Implement a configurable ticket limit for free events (event isPaid false), with an option for organizers to bypass this limit by paying a one-time unlock fee. This creates a "pay per event" monetization model specifically for free events (e.g., bingo nights, community gatherings) while preventing abuse of the platform for large-scale free ticketing without revenue.

**Note:** There is a separate system-wide hard limit of **2500 tickets per event** (all events, paid or free) to prevent system overload. This is a non-configurable constant that applies regardless of event type or unlock status.

## Current State

### ✅ Completed

- Event model with `isPaid` boolean (indicates if event requires Mollie)
- TicketType model with `price` field (can be 0 for free tickets)
- Platform admin role (`Role.SUPER_ADMIN`)
- Organization scoping for all event operations
- Platform Mollie account for system payments (unlock fees)
- Mollie Invoice Sales API integration (used for event close invoices)
- System-wide hard limit: **2500 tickets per event** (hardcoded constant)

### ⬜ To Build

- Platform-wide settings table for system configuration
- Ticket limit enforcement during ticket type creation/updates
- One-time unlock fee payment flow for organizers
- Platform admin UI to configure default limits and unlock fee
- Validation in event/ticket type services
- Unlock status tracking per event

---

## Business Requirements

### User Story

**As a platform administrator**, I want to limit the number of tickets for free events to prevent abuse, while allowing organizers to pay a one-time fee to lift this restriction for legitimate large-scale free events.

**As an event organizer**, I want to create free events with a reasonable ticket limit, and have the option to pay a fee to increase capacity for events like bingo nights that need more tickets.

### Acceptance Criteria

- [ ] Platform admin can configure the default free event ticket limit (e.g., 50, 100, 200 tickets)
- [ ] Platform admin can configure the one-time unlock fee amount
- [ ] System automatically detects if an event is "free" (all ticket types have `price = 0`)
- [ ] When creating/editing ticket types for free events, system enforces total capacity ≤ limit (unless unlocked)
- [ ] System enforces absolute hard limit of 2500 tickets per event (all events, regardless of unlock status)
- [ ] Organizer sees clear error message when exceeding free ticket limit
- [ ] Organizer sees clear error message when exceeding system hard limit (2500)
- [ ] Organizer can view unlock option with price displayed
- [ ] Organizer can pay unlock fee via Mollie (iDEAL) using platform's Mollie account
- [ ] After successful payment, event is marked as "unlimited" and capacity restrictions are lifted (up to system limit)
- [ ] Invoice is automatically created via Mollie Invoice Sales API
- [ ] Payment is idempotent (duplicate payments don't charge twice)
- [ ] Audit log records unlock payments
- [ ] Platform admin can see which events have paid for unlimited tickets

### Use Cases

1. **Primary Use Case: Free Event Creation**
   - Organizer creates event with all free tickets (total capacity 120)
   - Platform limit is set to 100 tickets
   - EventForm shows unlock option with message: "Free events are limited to 100 tickets. Upgrade to unlimited for €X.XX"
   - Organizer clicks "Unlock Unlimited Tickets" button in EventForm
   - Organizer pays €25.00 via iDEAL (processed through platform's Mollie account)
   - Event status updates to `unlimitedTicketsEnabled = true`
   - Organizer can now set any capacity (up to 2500 system limit)

2. **Edge Cases:**
   - **Mixed paid/free tickets:** Limit does NOT apply (event has revenue)
   - **Changing from paid to free:** If total capacity > limit, show upgrade prompt
   - **Changing from free to paid:** Unlock status remains (organizer keeps benefit)
   - **Refund unlock fee:** Not supported in MVP (admin manual intervention)
   - **Multiple unlock payments:** Use idempotency key to prevent double-charging

---

## Technical Implementation

### A) Database Schema

**New Table: PlatformSettings**

```prisma
model PlatformSettings {
  id    String @id @default(uuid())
  key   String @unique  // e.g., "FREE_EVENT_TICKET_LIMIT", "FREE_EVENT_UNLOCK_FEE"
  value String          // JSON-encoded value for flexibility
  description String?   // Human-readable description

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([key])
  @@map("platform_settings")
}
```

**Event Model Update:**

```prisma
model Event {
  // ... existing fields ...

  // Free event unlock feature
  unlimitedTicketsEnabled Boolean @default(false) // Has organizer paid to lift ticket limit?
  unlimitedTicketsPaymentId String? @unique       // Mollie payment ID for unlock fee
  unlimitedTicketsPaidAt    DateTime?             // When unlock was purchased

  // ... existing relations ...
}
```

**Migration:**

```sql
-- Migration: add_free_event_ticket_limit
CREATE TABLE platform_settings (
  id          TEXT PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  value       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_settings_key ON platform_settings(key);

-- Insert default settings
INSERT INTO platform_settings (id, key, value, description) VALUES
  (gen_random_uuid(), 'FREE_EVENT_TICKET_LIMIT', '100', 'Maximum tickets allowed for free events without unlock'),
  (gen_random_uuid(), 'FREE_EVENT_UNLOCK_FEE', '2500', 'One-time fee (in cents) to unlock unlimited tickets for free events');

-- Add unlock tracking to events
ALTER TABLE events
  ADD COLUMN unlimited_tickets_enabled BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN unlimited_tickets_payment_id TEXT UNIQUE,
  ADD COLUMN unlimited_tickets_paid_at TIMESTAMP;

CREATE INDEX idx_events_unlimited_tickets ON events(unlimited_tickets_enabled);
```

---

### B) Services

**File:** `src/server/services/platformSettingsService.ts`

```typescript
import { prisma } from "@/lib/prisma";

export const platformSettingsService = {
  /**
   * Get a platform setting by key
   * @param key - Setting key (e.g., "FREE_EVENT_TICKET_LIMIT")
   * @returns Parsed setting value or null if not found
   */
  async get<T = any>(key: string): Promise<T | null> {
    const setting = await prisma.platformSettings.findUnique({
      where: { key },
    });

    if (!setting) return null;

    try {
      return JSON.parse(setting.value) as T;
    } catch {
      // If not JSON, return as-is
      return setting.value as T;
    }
  },

  /**
   * Get free event ticket limit (defaults to 100 if not configured)
   */
  async getFreeEventTicketLimit(): Promise<number> {
    const limit = await this.get<number>("FREE_EVENT_TICKET_LIMIT");
    return limit ?? 100;
  },

  /**
   * Get unlock fee amount in cents (defaults to €25.00)
   */
  async getUnlockFeeAmount(): Promise<number> {
    const fee = await this.get<number>("FREE_EVENT_UNLOCK_FEE");
    return fee ?? 2500; // €25.00
  },

  /**
   * Set a platform setting (admin only)
   */
  async set(key: string, value: any, description?: string): Promise<void> {
    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);

    await prisma.platformSettings.upsert({
      where: { key },
      create: {
        id: crypto.randomUUID(),
        key,
        value: stringValue,
        description,
      },
      update: {
        value: stringValue,
        description,
        updatedAt: new Date(),
      },
    });
  },

  /**
   * List all platform settings (admin only)
   */
  async listAll() {
    return prisma.platformSettings.findMany({
      orderBy: { key: "asc" },
    });
  },
};
```

**File:** `src/server/services/freeEventLimitService.ts`

```typescript
import { prisma } from "@/lib/prisma";
import { platformSettingsService } from "./platformSettingsService";
import { SYSTEM_MAX_TICKETS_PER_EVENT } from "@/lib/system-constants";

export const freeEventLimitService = {
  /**
   * Check if an event is "free" (all ticket types have price = 0)
   */
  async isEventFree(eventId: string, orgId: string): Promise<boolean> {
    const ticketTypes = await prisma.ticketType.findMany({
      where: {
        eventId,
        event: { organizationId: orgId },
      },
      select: { price: true },
    });

    // No ticket types = not determined yet (allow creation)
    if (ticketTypes.length === 0) return false;

    // All ticket types must have price = 0
    return ticketTypes.every((tt) => tt.price === 0);
  },

  /**
   * Get total capacity for an event
   */
  async getTotalCapacity(eventId: string, orgId: string): Promise<number> {
    const result = await prisma.ticketType.aggregate({
      where: {
        eventId,
        event: { organizationId: orgId },
      },
      _sum: { capacity: true },
    });

    return result._sum.capacity ?? 0;
  },

  /**
   * Check if event can add/update tickets without exceeding limits
   * Enforces both: 1) Free event limit (configurable), 2) System hard limit (2500)
   * @returns { allowed: boolean, limit: number, current: number, unlockFee: number, systemLimit?: number }
   */
  async checkFreeEventLimit(
    eventId: string,
    orgId: string,
    newCapacity: number
  ) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId: orgId },
      select: { unlimitedTicketsEnabled: true },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    const currentCapacity = await this.getTotalCapacity(eventId, orgId);
    const totalCapacity = currentCapacity + newCapacity;

    // ALWAYS enforce system hard limit (2500 tickets)
    if (totalCapacity > SYSTEM_MAX_TICKETS_PER_EVENT) {
      return {
        allowed: false,
        limit: SYSTEM_MAX_TICKETS_PER_EVENT,
        current: currentCapacity,
        unlockFee: 0,
        systemLimit: SYSTEM_MAX_TICKETS_PER_EVENT,
      };
    }

    // If unlimited is enabled, only system limit applies
    if (event.unlimitedTicketsEnabled) {
      return {
        allowed: true,
        limit: SYSTEM_MAX_TICKETS_PER_EVENT,
        current: currentCapacity,
        unlockFee: 0,
      };
    }

    // Check if event is free
    const isFree = await this.isEventFree(eventId, orgId);
    if (!isFree) {
      // Not a free event, only system limit applies
      return {
        allowed: true,
        limit: SYSTEM_MAX_TICKETS_PER_EVENT,
        current: currentCapacity,
        unlockFee: 0,
      };
    }

    // For free events without unlock, enforce configurable limit
    const limit = await platformSettingsService.getFreeEventTicketLimit();
    const unlockFee = await platformSettingsService.getUnlockFeeAmount();

    const allowed = totalCapacity <= limit;

    return {
      allowed,
      limit,
      current: currentCapacity,
      unlockFee,
    };
  },

  /**
   * Create Mollie payment for unlock fee
   * Uses PLATFORM's Mollie account (not organization's)
   */
  async createUnlockPayment(
    eventId: string,
    orgId: string,
    redirectUrl: string
  ): Promise<{ paymentUrl: string; paymentId: string }> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, email: true },
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    const unlockFee = await platformSettingsService.getUnlockFeeAmount();
    const amountInEuros = (unlockFee / 100).toFixed(2);

    // Use PLATFORM's Mollie API key (not organization's)
    const platformMollieKey = process.env.MOLLIE_API_KEY;

    // Create payment via platform's Mollie account
    const payment = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${platformMollieKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: {
          currency: "EUR",
          value: amountInEuros,
        },
        description: `Unlock unlimited tickets - ${org.name}`,
        redirectUrl,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/unlock-payment`,
        metadata: {
          eventId,
          organizationId: orgId,
          type: "EVENT_UNLOCK",
        },
      }),
    });

    const paymentData = await payment.json();

    return {
      paymentUrl: paymentData._links.checkout.href,
      paymentId: paymentData.id,
    };
  },

  /**
   * Process successful unlock payment (called from webhook)
   */
  async processUnlockPayment(
    paymentId: string,
    eventId: string,
    orgId: string
  ) {
    const unlockFee = await platformSettingsService.getUnlockFeeAmount();

    // Update event
    await prisma.event.update({
      where: {
        id: eventId,
        organizationId: orgId,
      },
      data: {
        unlimitedTicketsEnabled: true,
        unlimitedTicketsPaymentId: paymentId,
        unlimitedTicketsPaidAt: new Date(),
      },
    });

    // Create invoice via Mollie Invoice Sales API
    await this.createUnlockInvoice(paymentId, eventId, orgId, unlockFee);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: null, // System action
        action: "EVENT_UNLOCK_PURCHASED",
        entityType: "Event",
        entityId: eventId,
        details: { paymentId, amount: unlockFee },
      },
    });
  },

  /**
   * Create invoice for unlock payment via Mollie Invoice Sales API
   * Same API used for event close invoices
   */
  async createUnlockInvoice(
    paymentId: string,
    eventId: string,
    orgId: string,
    amount: number
  ) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        email: true,
        billingEmail: true,
        streetAndNumber: true,
        postalCode: true,
        city: true,
        country: true,
        vatNumber: true,
      },
    });

    if (!org) throw new Error("Organization not found");

    const platformMollieKey = process.env.MOLLIE_API_KEY;
    const vatRate = 0.21; // 21% VAT
    const amountExclVat = Math.round(amount / (1 + vatRate));
    const vatAmount = amount - amountExclVat;

    // Create invoice via Mollie Invoice Sales API
    const invoice = await fetch("https://api.mollie.com/v2/invoices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${platformMollieKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reference: `UNLOCK-${eventId.slice(0, 8).toUpperCase()}`,
        vatNumber: org.vatNumber || undefined,
        status: "open",
        lines: [
          {
            description: "Unlock unlimited tickets for free event",
            quantity: 1,
            vatRate: vatRate * 100, // 21%
            unitPrice: {
              currency: "EUR",
              value: (amountExclVat / 100).toFixed(2),
            },
          },
        ],
        to: {
          name: org.name,
          email: org.billingEmail || org.email || "",
          address: {
            streetAndNumber: org.streetAndNumber || "",
            postalCode: org.postalCode || "",
            city: org.city || "",
            country: org.country || "NL",
          },
        },
      }),
    });

    const invoiceData = await invoice.json();

    // Store invoice reference in database if needed
    // await prisma.invoice.create({ ... });

    return invoiceData;
  },
};
```

---

### C) API Routes

**Route:** `/api/platform/settings` (Super Admin Only)

**Method:** `GET`, `PATCH`

```typescript
// src/app/api/platform/settings/route.ts
import { NextResponse } from "next/server";
import { platformSettingsService } from "@/server/services/platformSettingsService";
import { getSuperAdminUser } from "@/server/auth";

export async function GET(request: Request) {
  // Verify super admin
  const user = await getSuperAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const settings = await platformSettingsService.listAll();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const user = await getSuperAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { key, value, description } = await request.json();

  await platformSettingsService.set(key, value, description);

  return NextResponse.json({ success: true });
}
```

**Route:** `/api/events/[eventId]/check-limit`

**Method:** `POST`

```typescript
// src/app/api/events/[eventId]/check-limit/route.ts
import { NextResponse } from "next/server";
import { freeEventLimitService } from "@/server/services/freeEventLimitService";
import { getAuthenticatedOrganization } from "@/server/auth";

export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  const org = await getAuthenticatedOrganization(request);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newCapacity } = await request.json();

  const result = await freeEventLimitService.checkFreeEventLimit(
    params.eventId,
    org.id,
    newCapacity
  );

  return NextResponse.json(result);
}
```

**Route:** `/api/events/[eventId]/unlock`

**Method:** `POST`

```typescript
// src/app/api/events/[eventId]/unlock/route.ts
import { NextResponse } from "next/server";
import { freeEventLimitService } from "@/server/services/freeEventLimitService";
import { getAuthenticatedOrganization } from "@/server/auth";

export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: "Idempotency-Key header required" },
      { status: 400 }
    );
  }

  const org = await getAuthenticatedOrganization(request);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check idempotency
  const existing = await prisma.idempotencyKey.findUnique({
    where: { key: idempotencyKey },
  });

  if (existing) {
    return NextResponse.json(existing.response, {
      status: existing.statusCode,
    });
  }

  const { redirectUrl } = await request.json();

  const payment = await freeEventLimitService.createUnlockPayment(
    params.eventId,
    org.id,
    redirectUrl
  );

  // Store idempotency key
  await prisma.idempotencyKey.create({
    data: {
      id: crypto.randomUUID(),
      key: idempotencyKey,
      organizationId: org.id,
      response: payment,
      statusCode: 200,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json(payment);
}
```

**Route:** `/api/webhooks/unlock-payment`

**Method:** `POST`

```typescript
// src/app/api/webhooks/unlock-payment/route.ts
import { NextResponse } from "next/server";
import { freeEventLimitService } from "@/server/services/freeEventLimitService";

export async function POST(request: Request) {
  const { id: paymentId } = await request.json();

  // Verify payment with Mollie (fetch payment status)
  // Extract metadata (eventId, organizationId)
  // If status = 'paid', call processUnlockPayment

  const paymentData = await verifyMolliePayment(paymentId);

  if (paymentData.status === "paid") {
    await freeEventLimitService.processUnlockPayment(
      paymentId,
      paymentData.metadata.eventId,
      paymentData.metadata.organizationId
    );
  }

  return NextResponse.json({ success: true });
}
```

---

### D) UI Components

**Route:** `/platform/settings` (Super Admin Only)

**File:** `src/app/(platform)/settings/page.tsx`

```tsx
import { platformSettingsService } from "@/server/services/platformSettingsService";
import { PlatformSettingsForm } from "@/components/platform/PlatformSettingsForm";

export default async function PlatformSettingsPage() {
  const settings = await platformSettingsService.listAll();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Platform Settings</h1>
      <PlatformSettingsForm settings={settings} />
    </div>
  );
}
```

**Component:** `src/components/platform/PlatformSettingsForm.tsx`

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PlatformSettingsForm({ settings }: { settings: any[] }) {
  const [ticketLimit, setTicketLimit] = useState(
    settings.find((s) => s.key === "FREE_EVENT_TICKET_LIMIT")?.value ?? "100"
  );
  const [unlockFee, setUnlockFee] = useState(
    settings.find((s) => s.key === "FREE_EVENT_UNLOCK_FEE")?.value ?? "2500"
  );

  const handleSave = async () => {
    await fetch("/api/platform/settings", {
      method: "PATCH",
      body: JSON.stringify({
        key: "FREE_EVENT_TICKET_LIMIT",
        value: parseInt(ticketLimit),
      }),
    });

    await fetch("/api/platform/settings", {
      method: "PATCH",
      body: JSON.stringify({
        key: "FREE_EVENT_UNLOCK_FEE",
        value: parseInt(unlockFee),
      }),
    });

    alert("Settings saved");
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Label htmlFor="ticket-limit">Free Event Ticket Limit</Label>
        <Input
          id="ticket-limit"
          type="number"
          value={ticketLimit}
          onChange={(e) => setTicketLimit(e.target.value)}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Maximum tickets allowed for free events before requiring unlock fee
        </p>
      </div>

      <div>
        <Label htmlFor="unlock-fee">Unlock Fee (cents)</Label>
        <Input
          id="unlock-fee"
          type="number"
          value={unlockFee}
          onChange={(e) => setUnlockFee(e.target.value)}
        />
        <p className="text-sm text-muted-foreground mt-1">
          One-time fee to unlock unlimited tickets (e.g., 2500 = €25.00)
        </p>
      </div>

      <Button onClick={handleSave}>Save Settings</Button>
    </div>
  );
}
```

**Component:** `src/components/events/UnlockTicketsModal.tsx`

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UnlockTicketsModalProps {
  eventId: string;
  unlockFee: number; // in cents
  open: boolean;
  onClose: () => void;
}

export function UnlockTicketsModal({
  eventId,
  unlockFee,
  open,
  onClose,
}: UnlockTicketsModalProps) {
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    setLoading(true);

    const response = await fetch(`/api/events/${eventId}/unlock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        redirectUrl: `${window.location.origin}/dashboard/events/${eventId}?unlocked=true`,
      }),
    });

    const { paymentUrl } = await response.json();
    window.location.href = paymentUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlock Unlimited Tickets</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p>
            Free events are limited by default. Pay a one-time fee to remove all
            ticket capacity restrictions for this event.
          </p>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Unlock Fee</span>
              <span className="text-2xl font-bold">
                €{(unlockFee / 100).toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              One-time payment • Unlimited tickets for this event (up to 2500
              system limit)
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleUnlock} disabled={loading}>
              {loading ? "Processing..." : "Pay & Unlock"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Integration in EventForm:** `src/components/events/EventForm.tsx`

```tsx
// Add to EventForm component
import { UnlockTicketsModal } from "./UnlockTicketsModal";
import { freeEventLimitService } from "@/server/services/freeEventLimitService";

export function EventForm({ event, organization }: EventFormProps) {
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{
    allowed: boolean;
    limit: number;
    current: number;
    unlockFee: number;
  } | null>(null);

  // Check if event is free and needs unlock option
  useEffect(() => {
    if (event?.id) {
      checkEventLimit();
    }
  }, [event?.id]);

  const checkEventLimit = async () => {
    const response = await fetch(`/api/events/${event.id}/check-limit`, {
      method: "POST",
      body: JSON.stringify({ newCapacity: 0 }),
    });
    const data = await response.json();
    setLimitInfo(data);
  };

  return (
    <form>
      {/* Existing form fields */}

      {/* Show unlock option if event is free and not unlocked */}
      {limitInfo &&
        !event.unlimitedTicketsEnabled &&
        limitInfo.unlockFee > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900">
                  Free Event Ticket Limit
                </h4>
                <p className="text-sm text-amber-800 mt-1">
                  Free events are limited to {limitInfo.limit} tickets. Current
                  capacity: {limitInfo.current}/{limitInfo.limit}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUnlockModal(true)}
              >
                Unlock Unlimited (€{(limitInfo.unlockFee / 100).toFixed(2)})
              </Button>
            </div>
          </div>
        )}

      {/* Show unlocked badge */}
      {event.unlimitedTicketsEnabled && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-900">
              Unlimited Tickets Unlocked
            </span>
          </div>
          <p className="text-sm text-green-800 mt-1">
            This event can have up to 2,500 tickets (system limit)
          </p>
        </div>
      )}

      <UnlockTicketsModal
        eventId={event.id}
        unlockFee={limitInfo?.unlockFee || 0}
        open={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
      />
    </form>
  );
}
```

---

## Implementation Checklist

### Phase 1: Database & Core Services (Day 1)

- [x] Create `src/lib/system-constants.ts` with `SYSTEM_MAX_TICKETS_PER_EVENT = 2500`
- [x] Create migration for `platform_settings` table
- [x] Create migration to add unlock fields to `events` table
- [ ] Run migrations on development database (pending: needs `db push` or `migrate dev`)
- [x] Implement `platformSettingsService` with get/set functions
- [x] Implement `freeEventLimitService` with validation logic
- [ ] Add unit tests for service functions
- [ ] Test free event detection logic
- [ ] Test capacity calculation logic

### Phase 2: API Endpoints (Day 1-2)

- [x] Create `/api/platform/settings` route (GET/PATCH)
- [x] Add super admin authentication guard
- [x] Create `/api/events/[eventId]/check-limit` route
- [x] Create `/api/events/[eventId]/unlock` route with idempotency (uses platform Mollie key)
- [x] Create `/api/webhooks/unlock-payment` webhook handler
- [x] Implement invoice creation via Mollie Invoice Sales API
- [ ] Add request validation (Zod schemas)
- [ ] Test idempotency key handling
- [ ] Write API integration tests

### Phase 3: Platform Admin UI (Day 2)

- [ ] Create platform settings page (`/platform/settings`)
- [ ] Build `PlatformSettingsForm` component
- [ ] Add route protection for super admin only
- [ ] Test settings CRUD operations
- [ ] Add success/error notifications

### Phase 4: Organizer UI (Day 2-3)

- [ ] Add unlock status check to EventForm
- [ ] Show unlock option in EventForm when event is free and not yet unlocked
- [ ] Display current capacity vs. limit in EventForm
- [ ] Add validation to ticket type creation/edit forms
- [ ] Show error message when exceeding free ticket limit
- [ ] Build `UnlockTicketsModal` component
- [ ] Integrate unlock modal with EventForm (trigger from unlock button)
- [ ] Add "Unlocked" badge to EventForm when unlimited is enabled
- [ ] Handle unlock payment redirect flow
- [ ] Test responsive design on mobile

### Phase 5: Integration & Testing (Day 3)

- [ ] Test full flow: create free event → exceed limit → pay → unlocked → invoice created
- [ ] Test edge case: mixed paid/free ticket types
- [ ] Test edge case: changing from paid to free
- [ ] Test webhook payment processing with platform Mollie account
- [ ] Test invoice creation via Mollie Invoice Sales API
- [ ] Test idempotency for unlock payments
- [ ] Verify audit logs are created
- [ ] Performance test with large datasets

### Phase 6: Documentation & Deployment (Day 3)

- [ ] Update [SPEC.md](../../SPEC.md) with free event limit rules
- [ ] Document platform settings keys
- [ ] Add inline code comments
- [ ] Create migration instructions for production
- [ ] Deploy to staging environment
- [ ] Smoke test in staging with real Mollie test mode
- [ ] Create PR with detailed description

---

## Edge Cases & Error Handling

1. **System Hard Limit (2500 tickets)**
   - Problem: Organizer tries to exceed 2500 tickets (paid, free, or unlocked)
   - Solution: Always enforce system limit; show error: "Maximum 2500 tickets per event"
   - Example: Even with unlock, cannot create event with 3000 tickets
   - Note: This is non-negotiable for system stability

2. **Mixed Paid/Free Tickets**
   - Problem: Event has both free and paid ticket types
   - Solution: Limit only applies if ALL ticket types are free (price = 0)
   - Example: Event with €10 ticket + free ticket → no limit

3. **Changing Event from Paid to Free**
   - Problem: Organizer lowers all ticket prices to €0 after creating event with high capacity
   - Solution: When saving changes, validate total capacity against limit; show unlock modal if exceeded
   - Warn user before saving: "This will make your event free and may require unlock fee"

4. **Duplicate Unlock Payments**
   - Problem: User clicks "Pay & Unlock" multiple times
   - Solution: Use idempotency key; return existing payment URL if already created
   - Webhook handles duplicate notifications gracefully

5. **Webhook Timing Issues**
   - Problem: User returns from Mollie before webhook processes payment
   - Solution: Poll payment status on redirect landing page; show "Processing payment..." state
   - Allow manual "Refresh Status" button

6. **Invoice Generation Failure**
   - Problem: Payment succeeds but Mollie Invoice API fails
   - Solution: Retry invoice creation with exponential backoff; log error for manual intervention
   - Event remains unlocked (payment succeeded); invoice can be manually created by admin

7. **Refund Requests**
   - Problem: Organizer requests refund of unlock fee
   - Solution: Not supported in MVP; admin manual intervention required
   - Future: Add refund flow in platform admin panel

---

## Testing Strategy

### Unit Tests

- `tests/platformSettings.test.ts`
  - Test get/set platform settings
  - Test default value fallbacks

- `tests/freeEventLimit.test.ts`
  - Test free event detection (all prices = 0)
  - Test capacity calculation across ticket types
  - Test limit enforcement logic
  - Test unlock status bypass

### Integration Tests

- Test database interactions for platform settings
- Test event unlock payment creation
- Test webhook payment processing
- Test audit log creation

### E2E Tests

- **Test 1:** Create free event → add 101 tickets → see error → pay unlock → success
- **Test 2:** Create event with paid tickets → add unlimited capacity → no restriction
- **Test 3:** Platform admin updates limit from 100 → 50 → existing events unaffected, new events use new limit

**Example Test:**

```typescript
describe("Free Event Limit Service", () => {
  it("should enforce limit for free events", async () => {
    const event = await createTestEvent({ isPaid: false });
    await createTestTicketType({ eventId: event.id, price: 0, capacity: 120 });

    const result = await freeEventLimitService.checkFreeEventLimit(
      event.id,
      org.id,
      0
    );

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(100);
    expect(result.current).toBe(120);
  });

  it("should allow unlimited for unlocked events", async () => {
    const event = await createTestEvent({
      isPaid: false,
      unlimitedTicketsEnabled: true,
    });

    const result = await freeEventLimitService.checkFreeEventLimit(
      event.id,
      org.id,
      1000
    );

    expect(result.allowed).toBe(true);
  });

  it("should enforce system hard limit even for unlocked events", async () => {
    const event = await createTestEvent({
      isPaid: false,
      unlimitedTicketsEnabled: true,
    });
    await createTestTicketType({ eventId: event.id, price: 0, capacity: 2000 });

    const result = await freeEventLimitService.checkFreeEventLimit(
      event.id,
      org.id,
      600 // Would exceed 2500 total
    );

    expect(result.allowed).toBe(false);
    expect(result.systemLimit).toBe(2500);
  });
});
```

---

## Security Considerations

1. **Authentication:**
   - Platform settings page requires `SUPER_ADMIN` role
   - Unlock payment requires authenticated organization
   - Webhook validates Mollie signature
   - Platform Mollie API key stored securely in environment variables

2. **Authorization:**
   - Organizers can only unlock their own events (org scoping)
   - Platform settings not accessible to regular users

3. **Data Validation:**
   - Ticket limit must be positive integer (> 0)
   - Unlock fee must be positive integer (> 0)
   - Event ID must belong to authenticated organization

4. **Rate Limiting:**
   - Unlock payment endpoint: max 5 attempts per minute per organization
   - Platform settings update: max 10 per minute (admin only)

5. **Audit Logging:**
   - Log all unlock payments with payment ID
   - Log platform settings changes with admin user ID
   - Log failed unlock attempts

6. **Data Privacy:**
   - Payment IDs are Mollie-generated (not sensitive)
   - No personal data stored beyond payment reference
   - Audit logs follow standard retention policy

---

## Performance Considerations

1. **Database Queries:**
   - Add index on `events.unlimited_tickets_enabled` for admin reports
   - Add index on `platform_settings.key` for fast lookups
   - Cache platform settings in memory (TTL: 5 minutes)

2. **Caching:**
   - Cache free event limit value (Redis or in-memory)
   - Cache unlock fee amount
   - Invalidate cache on settings update
   - TTL: 5 minutes (balance freshness vs performance)

3. **Background Jobs:**
   - Webhook processing is async (doesn't block user)
   - Consider retry queue for failed webhook processing

---

## Success Criteria

- ✅ Platform admin can configure limit and unlock fee without code changes
- ✅ Free events with capacity ≤ limit work without interruption
- ✅ Organizers can pay to unlock unlimited tickets via Mollie
- ✅ After payment, organizers can set any capacity
- ✅ Mixed paid/free events are not restricted
- ✅ All tests passing (>80% coverage)
- ✅ Idempotency prevents double-charging
- ✅ Audit logs track all unlock payments
- ✅ Platform admin can view list of unlocked events
- ✅ Performance: Settings lookup <50ms (cached)
- ✅ Feature deployed to production without errors

---

## Dependencies

- ✅ Mollie integration (payment processing)
- ✅ Platform admin role (`SUPER_ADMIN`)
- ✅ Event and TicketType models
- ✅ Audit log system
- ✅ Idempotency key handling

**Blocks:** None (standalone feature)

---

## Rollout Strategy

1. **Feature Flag:** `FREE_EVENT_LIMIT_ENABLED`
   - Initially disabled globally
   - Enable in test environment first
   - Enable for 1-2 beta organizations
   - Monitor for 1 week
   - Enable globally after validation

2. **Migration Strategy:**
   - Run migrations during low-traffic period
   - Insert default platform settings (limit: 100, fee: €25)
   - Existing free events remain unaffected (grandfathered)
   - New free events use new limit from deployment date

3. **Monitoring:**
   - Track number of free events created per day
   - Track number of unlock payments per week
   - Monitor unlock payment success rate
   - Track average event capacity for free vs unlocked events
   - Alert on failed webhook processing

4. **Rollback Plan:**
   - Can disable feature flag (no limit enforced)
   - Migration is non-destructive (adds columns, doesn't drop)
   - Unlock status remains in database (organizers keep benefit)
   - Platform settings can be adjusted (increase limit to effectively disable)

---

## Future Enhancements

- Add "Free Event Pro" subscription tier (unlimited free events for monthly fee)
- Allow refunds of unlock fees (with admin approval)
- Add analytics dashboard showing free event trends
- Email notifications to organizers approaching limit
- Bulk unlock discount (pay once for multiple events)
- Regional limits (different limits per country)
- Event category-specific limits (bingo vs meetups)

---

## Related Documentation

- [SPEC.md](../../SPEC.md) - Business rules and fee calculations
- [MOLLIE_PLATFORM.md](../MOLLIE_PLATFORM.md) - Mollie Connect integration
- [prisma/schema.prisma](../../prisma/schema.prisma) - Database schema
- [Mollie Payments API](https://docs.mollie.com/reference/v2/payments-api) - Payment processing

---

## Questions & Decisions

**Decisions Made:**

- [x] Decision: Use `platform_settings` table instead of environment variables
  - Reason: Allows dynamic configuration without redeployment; admin UI control

- [x] Decision: Limit applies only when ALL tickets are free (price = 0)
  - Reason: Mixed events generate revenue, so abuse risk is lower

- [x] Decision: One-time unlock fee (not subscription)
  - Reason: Simpler for MVP; reduces billing complexity; matches "per event" model

- [x] Decision: Unlock status persists even if event becomes paid later
  - Reason: Organizer paid for benefit; no reason to revoke it

**Open Questions:**

- [ ] Question: Should unlock fee be VAT-inclusive or VAT-exclusive? (Platform team decision)
- [ ] Question: Should there be a trial period (e.g., first free event is unlimited)? (Business decision)
- [ ] Question: Should platform take commission on unlock fees? (Finance decision)

**Risks:**

- Risk: Organizers abuse refund system (create event, unlock, request refund)
  - Mitigation: No refunds in MVP; admin manual review only; add refund policy

- Risk: Platform settings get misconfigured (limit set to 0 or negative)
  - Mitigation: Add validation in settings service; UI prevents invalid values

- Risk: Webhook delays cause confusion (payment succeeds but unlock not instant)
  - Mitigation: Add polling on redirect page; show "Processing..." state; manual refresh button

---

## Notes

- Initial default values: Limit = 100 tickets, Unlock fee = €25.00
- System hard limit: **2500 tickets per event** (constant in code, not configurable)
- The free event limit must always be ≤ system hard limit
- **Payment flow:** Uses platform's Mollie account (not organization's) - free event organizers don't need Mollie connection
- **Invoice creation:** Automatically created via Mollie Invoice Sales API (same API used for event close invoices)
- Consider adding email notification to organizers when they approach limit (e.g., at 80/100 tickets)
- Platform admin should review unlock payments monthly for fraud detection
- Consider adding "Popular" badge to events that paid for unlock (social proof)
- System hard limit exists to prevent: database performance issues, memory issues during bulk operations, webhook processing delays
