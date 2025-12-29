# SPEC.md – Ticketing SaaS Specification

> Living document. Update when behavior or requirements change.

## 1. Business Model

### Target Market

- Small organizations in the Netherlands
- Event types: concerts, festivals, workshops, community events

### Revenue Model

| Fee Type     | Who Pays  | When Charged | Calculation            |
| ------------ | --------- | ------------ | ---------------------- |
| Service Fee  | Buyer     | Per order    | TBD (fixed or %)       |
| Platform Fee | Organizer | On payout    | % of used tickets only |

### Key Insight

Platform fee is calculated **only on tickets that are actually scanned/used**. This aligns incentives:

- Organizers only pay for value delivered
- Encourages accurate attendance tracking
- Fair for events with no-shows

---

## 2. Domain Model

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

- [ ] **TODO:** Define service fee structure (fixed vs. percentage vs. tiered)
- [ ] **TODO:** Define platform fee percentage
- [ ] **TODO:** Minimum order amount?

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
