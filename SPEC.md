# SPEC.md – Entro Specification

> Living document. Update when behavior or requirements change.

## 1. Business Model

### Target Market

- Small organizations in the Netherlands
- Event types: concerts, festivals, workshops, community events

### Revenue Model

| Fee Type     | Who Pays  | When Charged | Calculation                        |
| ------------ | --------- | ------------ | ---------------------------------- |
| Service Fee  | Buyer     | Per order    | (€0.29 Mollie + €0.15 + 2%) × 1.21 |
| Platform Fee | Organizer | On payout    | 2% per ticket sold                 |

**Service Fee Details (as of 31 Dec 2024):**

The service fee consists of two components, both subject to 21% Dutch VAT:

1. **Mollie Payment Processing Fee**: €0.29 excl. VAT
   - With 21% VAT: €0.29 + €0.06 = €0.35 incl. VAT
   - Fixed cost per transaction

2. **Platform Service Fee**: (€0.15 fixed + 2% variable) × 1.21
   - Subject to 21% Dutch VAT (standard rate for digital services)
   - Covers ticketing platform service

**Example (€50.00 ticket order):**

- Mollie fee incl. VAT: €0.35
- Platform excl VAT: €0.15 + (€50.00 × 2%) = €1.15
- Platform VAT (21%): €1.15 × 0.21 = €0.24
- **Total service fee: €1.74** (shown to buyer as "Servicekosten (incl. betalingskosten)")

**Database Storage:**

- `Order.serviceFee`: Total charged to buyer (incl VAT)
- `Order.serviceFeeExclVat`: Mollie excl VAT + Platform excl VAT
- `Order.serviceFeeVat`: VAT amount (on both Mollie and Platform)

**Future:**

- Event-specific service fee configuration not yet implemented (marked as TODO in code)
- Would allow platform admin to customize platform portion per event

### Key Insight

Platform fee is calculated **per ticket sold** (2% of ticket price). This keeps the model simple:

- Predictable costs for organizers
- No complexity around tracking usage for billing
- Fair and transparent pricing

---

## 2. VAT Handling

### Dutch VAT Rates

Entro implements Dutch BTW (VAT) with three rates:

| Rate     | Percentage | Use Case                       | Enum Value  |
| -------- | ---------- | ------------------------------ | ----------- |
| Standard | 21%        | Most events                    | STANDARD_21 |
| Reduced  | 9%         | Cultural events (theater, etc) | REDUCED_9   |
| Exempt   | 0%         | Free events                    | EXEMPT      |

**Configuration:**

- VAT rate is set **per event** during event creation
- Default: STANDARD_21 (21%)
- Only shown for paid events (isPaid=true)

### VAT-Inclusive Pricing

All ticket prices are **VAT-inclusive** (matches Dutch market expectations):

```
€50.00 ticket with 21% VAT:
├─ Price excl VAT: €41.32
├─ VAT amount: €8.68
└─ Price incl VAT: €50.00 (displayed to customer)
```

**Database Storage:**

- `TicketType.priceInclVat`: Customer-facing price (input from organizer)
- `TicketType.priceExclVat`: Calculated backwards using rate
- `TicketType.vatAmount`: Tax portion
- All stored in cents (integers)

### Service Fee VAT

Service fees have **uniform VAT treatment** - both components subject to 21% Dutch VAT:

1. **Mollie portion (€0.29 excl. VAT)**: 21% VAT = €0.35 incl. VAT
   - Payment processing subject to standard VAT rate
   - Total: €0.29 + €0.06 VAT

2. **Platform portion (€0.15 + 2% excl. VAT)**: 21% VAT
   - Ticketing service subject to standard VAT
   - Applied to fixed and variable portions

**Example (€50 ticket order):**

```
Service Fee Breakdown:
├─ Mollie fee excl VAT: €0.29
├─ Mollie VAT (21%): €0.06
├─ Platform excl VAT: €1.15
├─ Platform VAT (21%): €0.24
├─ Service fee excl VAT total: €1.44
├─ Service fee VAT total: €0.30
└─ Total service fee incl VAT: €1.74
```

**Database Storage:**

- `Order.serviceFee`: Total charged (€1.74)
- `Order.serviceFeeExclVat`: Mollie + Platform excl VAT (€1.44)
- `Order.serviceFeeVat`: VAT on both portions (€0.30)

### Payout Reporting

Payouts include VAT breakdown for tax compliance:

**Per Event Summary:**

- Gross revenue excl VAT (ticket sales)
- VAT on tickets (aggregated by rate)
- Service fees excl VAT (organizer keeps)
- Service fees VAT (platform keeps, reports to tax authority)
- Net payout to organizer

This allows organizers and platform to file accurate VAT returns with Dutch tax authorities.

### Implementation

- **Core utilities**: `src/server/lib/vat.ts`
  - `calcVatFromInclusive()` - Extract VAT from inclusive price
  - `getPriceBreakdown()` - Full price decomposition
  - `calculateServiceFeeWithVat()` - Service fee with split VAT treatment
- **Tests**: `tests/vat.test.ts` (27 tests), `tests/serviceFeeVat.test.ts` (17 tests)
- **Database**: Migration `20251231145012_add_vat_support`

---

## 3. Domain Model

### Entity Relationships

```
Organization (tenant)
  └── Event
        └── TicketType (price, capacity, name)
              └── Ticket (individual, has status)
                    └── ScanLog (audit trail)
  └── Order (buyer info, service fee)
        └── OrderItem → Ticket
  └── Payout (calculated fees, transfer record)
```

### Ticket Lifecycle

```
┌─────────┐    scan    ┌──────┐
│  valid  │ ─────────► │ used │
└─────────┘            └──────┘
     │
     │ refund
     ▼
┌──────────┐
│ refunded │
└──────────┘
```

**Rules:**

- Only `valid` tickets can be scanned successfully
- Only `valid` tickets can be refunded
- `used` and `refunded` are terminal states
- Every scan attempt creates a `ScanLog`, regardless of outcome

---

## 3. Scanning System

### QR Code Content

```
{ticketId}:{signature}
```

- `ticketId`: UUID v4
- `signature`: HMAC-SHA256 of ticketId with `TICKET_SIGNING_SECRET`

### Scan Flow

1. Scanner app reads QR code
2. Validates signature locally (optional, for offline)
3. Sends to `/api/scan` endpoint
4. Server validates:
   - Signature matches
   - Ticket exists
   - Ticket belongs to org
   - Ticket status is `valid`
5. Creates `ScanLog` entry
6. If valid: updates ticket to `used`
7. Returns result to scanner

### Offline Support

- Scanner app queues scans when offline
- Includes `scannedAt` timestamp from device
- On sync: server processes in order
- Conflict resolution: server timestamp wins for status, but original scan time preserved in log

### ScanLog Schema

```typescript
{
  id: string;
  ticketId: string;
  organizationId: string;
  scannedAt: Date; // When scan occurred
  syncedAt: Date | null; // When synced (null if online)
  scannedBy: string; // User ID
  deviceId: string; // For rate limiting & audit
  result: "valid" | "already_used" | "invalid" | "refunded";
  offlineSync: boolean;
}
```

---

## 4. Payment Integration

### Provider: Mollie

- Primary method: iDEAL (NL focus)
- Webhook-driven status updates

### Order Flow

1. Buyer selects tickets
2. System calculates: `ticketTotal + serviceFee`
3. Creates Order with status `pending`
4. Redirects to Mollie
5. Webhook receives payment status
6. If paid: creates Tickets with status `valid`
7. Sends confirmation email with QR codes

### Webhook Idempotency

```typescript
// Webhook handler
const order = await orderRepo.findByPaymentId(paymentId);
if (order?.status === "paid") {
  return { already_processed: true };
}
// Process payment...
```

---

## 5. Payout Calculation

### When

- On-demand or scheduled (e.g., after event ends)
- Manual trigger by organizer or admin

### Calculation

```typescript
const usedTickets = await ticketRepo.findUsedByEvent(eventId, orgId);
const grossRevenue = sum(usedTickets.map((t) => t.price));
const platformFee = grossRevenue * PLATFORM_FEE_RATE;
const netPayout = grossRevenue - platformFee;
```

### Payout Record

```typescript
{
  id: string;
  organizationId: string;
  eventId: string | null; // null = org-wide
  periodStart: Date;
  periodEnd: Date;
  grossRevenue: number;
  platformFee: number;
  netPayout: number;
  status: "calculated" | "approved" | "paid";
  paidAt: Date | null;
  mollieTransferId: string | null;
}
```

---

## 6. Multi-Tenancy

### Isolation Strategy

- Row-level: `organizationId` on all tenant data
- Every query MUST include org scope
- Middleware validates org access on API routes

### Shared Resources

- Platform admin dashboard
- Payment webhook handlers (extract org from payment metadata)

### Data Access Pattern

```typescript
// Repository enforces scoping
export const eventRepo = {
  findAll: (orgId: string) =>
    prisma.event.findMany({ where: { organizationId: orgId } }),

  findById: (id: string, orgId: string) =>
    prisma.event.findFirst({ where: { id, organizationId: orgId } }),
};
```

---

## 7. Security

### Authentication (Supabase Auth)

- Organization members: Supabase Auth (email/password, OAuth providers)
- Scanner app: Supabase Auth session + organization API key
- Use `@supabase/ssr` for Next.js App Router integration
- Link Supabase `auth.users` to `Organization` via membership table

### Authorization

- Org admin: full access to org data
- Org member: configurable permissions
- Scanner: scan endpoint only

### Data Protection

| Data            | Stored      | Retention              |
| --------------- | ----------- | ---------------------- |
| Email           | Yes         | Account lifetime       |
| Name            | Optional    | Account lifetime       |
| Payment details | No (Mollie) | N/A                    |
| Scan logs       | Yes         | 2 years (configurable) |
| IP addresses    | Hashed      | 30 days                |

### Rate Limits

| Endpoint        | Limit | Window   |
| --------------- | ----- | -------- |
| `/api/scan`     | 60    | 1 minute |
| `/api/checkout` | 10    | 1 minute |
| `/api/auth/*`   | 5     | 1 minute |

---

## 8. API Endpoints

### Public

- `GET /events/:slug` - Event details
- `POST /api/checkout` - Create order
- `POST /api/webhooks/mollie` - Payment webhook

### Authenticated (Org)

- `GET /api/events` - List org events
- `POST /api/events` - Create event
- `POST /api/scan` - Scan ticket
- `GET /api/orders` - List org orders
- `GET /api/payouts` - Payout history

### Admin

- `GET /api/admin/organizations` - All orgs
- `POST /api/admin/payouts/:id/approve` - Approve payout

---

## 9. Open Questions & TODOs

> Add questions here. Resolve with decisions or safe defaults.

### Pricing

- [x] **DONE:** Define service fee structure - €0.50 fixed + 2% of ticket total (max €5.00)
- [x] **DONE:** Define platform fee percentage - 2% per ticket sold
- [ ] **TODO:** Minimum order amount?
- [ ] **TODO:** Make service fee configurable per organization (tiered pricing)

### Features

- [ ] **TODO:** Ticket transfer between buyers?
- [ ] **TODO:** Waitlist functionality?
- [ ] **TODO:** Partial refunds?

### Technical

- [ ] **TODO:** Scan rate limit per device vs. per user vs. per org?
- [ ] **TODO:** Offline scan conflict resolution - current assumption: server timestamp wins
- [ ] **TODO:** Data retention policy for scan logs

---

## 10. Glossary

| Term         | Definition                                       |
| ------------ | ------------------------------------------------ |
| Organization | A tenant (event organizer) on the platform       |
| Event        | A specific occurrence that sells tickets         |
| TicketType   | A category of ticket (e.g., "Early Bird", "VIP") |
| Order        | A buyer's purchase transaction                   |
| Ticket       | An individual admission token                    |
| ScanLog      | Audit record of a scan attempt                   |
| Payout       | Calculated amount owed to organizer              |
| Service Fee  | Buyer-paid fee per order                         |
| Platform Fee | Organizer-paid fee on used tickets               |
