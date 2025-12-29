# Copilot Instructions – Entro

## Project Overview

Entro is a multi-tenant ticketing platform for small organizations in the Netherlands.

### Key Business Rules

- Buyer pays service fees **per order** (€0,99 fixed, not per ticket)
- Platform fee is **2% per ticket sold** (charged on payout)
- NL-only market (iDEAL payments)
- Offline scanning required in MVP (Capacitor app later, backend must support sync + scan logs)

---

## Tech Stack

- **Framework:** Next.js 16+ (App Router)
- **Monorepo:** Single repo structure
- **Server logic:** `src/server/*` for domain logic
- **Database:** Supabase (PostgreSQL)
- **ORM:** Prisma
- **Auth:** Supabase Auth
- **Payments:** Mollie (iDEAL focus)
- **Email:** Resend
- **UI:** Tailwind CSS + Radix UI
- **Language:** TypeScript (strict mode)

---

## Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public routes (events, checkout)
│   ├── (dashboard)/       # Org dashboard (auth required)
│   ├── api/               # Route handlers
│   └── webhooks/          # Payment webhooks
├── components/            # React components (keep dumb)
├── server/
│   ├── domain/            # Domain entities & types
│   ├── services/          # Business logic
│   ├── repos/             # Repository layer (DB access)
│   └── lib/               # Shared utilities
└── lib/                   # Client-side utilities
```

### Domain Entities

- `Organization` - Tenant (multi-tenancy root)
- `Event` - Belongs to Organization
- `TicketType` - Belongs to Event (price, capacity)
- `Order` - Buyer's purchase (service fee here)
- `Ticket` - Individual ticket (status: valid | used | refunded)
- `ScanLog` - Every scan attempt (audit trail)
- `Payout` - Platform fee calculation & payouts

### Ticket Status Flow

```
valid → used (first scan)
valid → refunded
used → (cannot change)
refunded → (cannot change)
```

---

## Non-Negotiables

### 1. Multi-Tenancy

```typescript
// ❌ NEVER do this
const events = await prisma.event.findMany();

// ✅ ALWAYS scope to organization
const events = await prisma.event.findMany({
  where: { organizationId },
});
```

### 2. Secure Ticket Identifiers

- Use UUID + signed token for ticket QR codes
- Never expose sequential IDs
- Validate signature on every scan

### 3. Idempotency-Key Support

All payment-related APIs and critical state-changing operations **must** support the `Idempotency-Key` header (industry standard).

```typescript
// Route handler example
export async function POST(req: Request) {
  const idempotencyKey = req.headers.get("idempotency-key");
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: "Idempotency-Key header required" },
      { status: 400 }
    );
  }

  // Check if request with this key was already processed
  const existing = await idempotencyRepo.findByKey(idempotencyKey);
  if (existing) {
    return NextResponse.json(existing.response, { status: existing.statusCode });
  }

  // Process request...
  const result = await paymentService.createPayment(...);

  // Store result with idempotency key (24h TTL)
  await idempotencyRepo.store({
    key: idempotencyKey,
    response: result,
    statusCode: 200,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return NextResponse.json(result);
}
```

**Requirements:**

- Accept `Idempotency-Key` header on all POST/PUT/PATCH endpoints
- Store key + response for 24 hours minimum
- Return same response for duplicate requests
- Generate UUID v4 if client doesn't provide one
- Scope keys to organization for multi-tenancy

**Applies to:**

- Payment creation (`/api/checkout`)
- Order creation
- Refund requests
- Ticket activation/deactivation
- Webhook handlers (use webhook ID as key)

### 4. Auditable Scanning

```typescript
// Every scan creates a ScanLog, even failures
await scanLogRepo.create({
  ticketId,
  scannedAt: new Date(),
  scannedBy: userId,
  result: "valid" | "already_used" | "invalid" | "refunded",
  deviceId,
  offlineSync: boolean,
});
```

### 5. Migration Safety

- Never modify existing migrations
- Always create new migrations for changes
- Test migrations on copy of production data

---

## Code Patterns

### Repository Pattern

```typescript
// src/server/repos/ticketRepo.ts
export const ticketRepo = {
  findById: (id: string, orgId: string) =>
    prisma.ticket.findFirst({ where: { id, organizationId: orgId } }),

  markAsUsed: (id: string, orgId: string) =>
    prisma.ticket.update({
      where: { id, organizationId: orgId },
      data: { status: "used", usedAt: new Date() },
    }),
};
```

### Service Layer

```typescript
// src/server/services/scanService.ts
export async function scanTicket(
  ticketToken: string,
  orgId: string,
  scannedBy: string
): Promise<ScanResult> {
  // 1. Validate token signature
  // 2. Find ticket (scoped to org)
  // 3. Check current status
  // 4. Create ScanLog (always)
  // 5. Update ticket if valid
  // 6. Return result
}
```

### Route Handlers

```typescript
// src/app/api/scan/route.ts
export async function POST(req: Request) {
  const { ticketToken } = await req.json();
  const org = await getAuthenticatedOrg(req);

  // Call service, never raw DB
  const result = await scanService.scanTicket(ticketToken, org.id, user.id);

  return NextResponse.json(result);
}
```

### Dumb Components

```typescript
// ✅ Components receive data, don't fetch
function TicketCard({ ticket }: { ticket: Ticket }) {
  return <div>{ticket.code}</div>;
}

// ❌ Components don't access DB
function TicketCard({ ticketId }: { ticketId: string }) {
  const ticket = await prisma.ticket.findUnique(...); // NO!
}
```

---

## Fee Calculation

### Service Fee (per order, buyer pays)

```typescript
const serviceFee = calculateServiceFee(orderTotal);
// Fixed amount or % based on business rules
```

### Platform Fee (per ticket sold)

```typescript
const PLATFORM_FEE_PERCENT = 0.02; // 2%
const platformFee = tickets.reduce(
  (sum, t) => sum + t.price * PLATFORM_FEE_PERCENT,
  0
);
```

---

## Security & Privacy

### Data Minimization

- Store only: email, optional name
- No addresses unless required for specific events
- Retain scan logs for audit, anonymize after retention period

### Rate Limiting

```typescript
// Scan endpoint: max 60 requests/minute per device
// Checkout: max 10 attempts/minute per IP
```

### Logging

Log these actions with timestamp, actor, and orgId:

- Ticket status changes
- Refunds
- Payout calculations
- Failed scan attempts (potential fraud)

---

## Testing Requirements

### Unit Tests (Required)

- [ ] Fee calculation (service fee + platform fee)
- [ ] Scan conflict rules (first scan wins)
- [ ] Ticket status transitions
- [ ] Token signature validation

### Integration Tests

- [ ] Repository methods with test DB
- [ ] Webhook idempotency

### E2E Tests

- [ ] Create event → sell ticket → scan → fee reflected
- [ ] Offline sync flow

---

## Work Style

### Before Coding

1. Summarize the plan
2. List files to be touched
3. Identify potential risks

### After Coding Checklist

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Tests added/updated
- [ ] SPEC.md updated if behavior changed
- [ ] Migration added (not modified)

### Commit Style

```
feat(scanning): add offline sync support

- Add deviceId to ScanLog
- Queue offline scans for sync
- Resolve conflicts with server timestamp

Closes #123
```

---

## When Uncertain

1. Add a `// TODO:` comment with the question
2. Document assumption in SPEC.md
3. Implement the safest minimal default
4. Flag for review

---

## Quick Reference

### Common Queries

```typescript
// Get org's events
eventRepo.findByOrg(orgId);

// Get ticket with validation
ticketRepo.findByToken(token, orgId);

// Calculate payout
payoutService.calculate(orgId, dateRange);
```

### Status Codes

- `valid` - Can be scanned
- `used` - Already scanned (first scan wins)
- `refunded` - Money returned, cannot use

### Environment Variables

```
# Supabase
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
MOLLIE_API_KEY=
TICKET_SIGNING_SECRET=
NEXT_PUBLIC_APP_URL=
```
