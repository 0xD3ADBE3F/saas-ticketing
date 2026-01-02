# Operations, Security & Polish

**Status:** 🟨 Partially Complete
**Priority:** Medium
**Estimated Effort:** 15-20 hours (2-3 days)

## Overview

Implement operational excellence, security hardening, and UX polish to make the platform production-ready and reliable.

## Current State

### ✅ Completed

- Structured logging (Pino with context)
  - paymentLogger for payment operations
  - webhookLogger for webhook processing
  - mollieLogger for Mollie API calls
- Token encryption (AES-256-GCM for Mollie tokens)
- Multi-tenant data scoping
- Audit logging for admin actions
- Organizer onboarding wizard

### ⬜ To Build (Slices 13-15)

- Error tracking integration
- Health check endpoint
- Rate limiting
- Brute-force protection
- PII retention and cleanup
- Enhanced email templates
- UX polish

---

## Feature Requirements

### Slice 13: Observability

#### A) Error Tracking Integration

**Tool:** Sentry (recommended) or similar

**Setup:**

```typescript
// src/lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter PII
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
```

**Integration Points:**

- API route errors
- Payment processing failures
- Webhook processing errors
- Database connection issues
- Mollie API failures

**Example Usage:**

```typescript
try {
  await mollieSalesInvoiceService.create(params);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      service: "invoice-generation",
      organizationId: params.organizationId,
    },
    extra: {
      eventId: params.eventId,
      amount: params.amount,
    },
  });
  throw error;
}
```

**Alerts:**

- Payment failure rate >5%
- Webhook failure rate >10%
- API error rate >1%
- Database connection errors

---

#### B) Health Check Endpoint

**Route:** `/api/health`

**Purpose:** Monitor system availability and dependencies

**Response Format:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-01T12:00:00Z",
  "checks": {
    "database": { "status": "healthy", "latency": 12 },
    "redis": { "status": "healthy", "latency": 3 },
    "mollie": { "status": "healthy", "latency": 145 },
    "email": { "status": "healthy", "latency": 89 }
  },
  "version": "1.2.3",
  "uptime": 86400
}
```

**Implementation:**

```typescript
// src/app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    mollie: await checkMollie(),
    email: await checkEmail(),
  };

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      version: process.env.APP_VERSION || "0.0.0",
      uptime: process.uptime(),
    },
    { status: allHealthy ? 200 : 503 }
  );
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "healthy", latency: Date.now() - start };
  } catch (error) {
    return {
      status: "unhealthy",
      latency: Date.now() - start,
      error: error.message,
    };
  }
}
```

**Monitoring:**

- UptimeRobot or similar checks every 5 minutes
- Alert if unhealthy for >2 consecutive checks
- Dashboard displays current health status

---

### Slice 14: Security & Privacy

#### A) Rate Limiting

**Implementation:** Use `@upstash/ratelimit` with Redis

**File:** `src/server/middleware/rateLimit.ts`

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Scanner endpoints
export const scannerRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 req/min
  analytics: true,
  prefix: "ratelimit:scanner",
});

// Checkout endpoints
export const checkoutRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 req/min
  analytics: true,
  prefix: "ratelimit:checkout",
});

// Webhook endpoints
export const webhookRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 req/min
  analytics: true,
  prefix: "ratelimit:webhook",
});

// Helper function
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number }> {
  const { success, limit, reset, remaining } = await limiter.limit(identifier);

  if (!success) {
    logger.warn("Rate limit exceeded", {
      identifier,
      limit,
      reset: new Date(reset),
    });
  }

  return { success, remaining };
}
```

**Usage in Route:**

```typescript
// src/app/api/scanner/scan/route.ts
export async function POST(request: Request) {
  const deviceId = request.headers.get("x-device-id");

  const { success, remaining } = await checkRateLimit(
    scannerRateLimit,
    deviceId || "unknown"
  );

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "X-RateLimit-Remaining": remaining.toString() },
      }
    );
  }

  // Process scan...
}
```

**Endpoints to Protect:**

- `/api/scanner/scan` - 60 req/min per device
- `/api/scanner/sync` - 10 req/min per device
- `/api/checkout/create-order` - 10 req/min per IP
- `/api/checkout/payment` - 5 req/min per IP
- `/api/webhooks/mollie` - 100 req/min (global)

---

#### B) Brute-Force Protection on QR Validation

**Problem:** Attacker tries many QR codes to find valid tickets

**Solution:** Exponential backoff after failed attempts

**Implementation:**

```typescript
// src/server/services/scanService.ts
async function validateTicket(
  token: string,
  deviceId: string
): Promise<ScanResult> {
  // Check recent failed attempts
  const failedAttempts = await redis.get(`scan:failed:${deviceId}`);

  if (failedAttempts && parseInt(failedAttempts) >= 5) {
    const ttl = await redis.ttl(`scan:failed:${deviceId}`);
    return {
      status: "rate_limited",
      message: `Too many invalid scans. Try again in ${ttl} seconds.`,
    };
  }

  // Validate token
  const ticket = await verifyAndFindTicket(token);

  if (!ticket) {
    // Increment failed attempts
    await redis.incr(`scan:failed:${deviceId}`);
    await redis.expire(`scan:failed:${deviceId}`, 300); // 5 minute window

    return {
      status: "invalid",
      message: "Invalid ticket",
    };
  }

  // Clear failed attempts on success
  await redis.del(`scan:failed:${deviceId}`);

  return {
    status: "valid",
    ticket,
  };
}
```

**Thresholds:**

- 5 failed attempts → 5 minute lockout
- 10 failed attempts → 15 minute lockout
- 20 failed attempts → 1 hour lockout

---

#### C) PII Minimization & Retention

**Current Data Stored:**

- Buyer email (required)
- Buyer name (optional)
- Scanner device IDs
- Scan logs with timestamps

**Retention Policy:**

- Order data: Keep indefinitely (financial/legal)
- Buyer emails: Anonymize after 2 years
- Scan logs: Anonymize after 1 year
- Audit logs: Keep indefinitely (compliance)

**Implementation:**

```typescript
// src/server/services/dataRetentionService.ts
export const dataRetentionService = {
  /**
   * Anonymize old buyer data (cronjob: monthly)
   */
  async anonymizeBuyerData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);

    const result = await prisma.order.updateMany({
      where: {
        createdAt: { lt: cutoffDate },
        buyerEmail: { not: null },
      },
      data: {
        buyerEmail: "anonymized@getentro.app",
        buyerName: "Anonymized",
      },
    });

    logger.info("Buyer data anonymized", { count: result.count });
  },

  /**
   * Anonymize old scan logs
   */
  async anonymizeScanLogs(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);

    const result = await prisma.scanLog.updateMany({
      where: {
        scannedAt: { lt: cutoffDate },
      },
      data: {
        deviceId: "anonymized",
      },
    });

    logger.info("Scan logs anonymized", { count: result.count });
  },

  /**
   * Delete temporary data (expired QR codes, etc.)
   */
  async cleanupTemporaryData(): Promise<void> {
    // Delete expired scanner sessions
    const expiredSessions = await prisma.scannerSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    logger.info("Temporary data cleaned", { sessions: expiredSessions.count });
  },
};
```

**Cronjob:** Run monthly at 3 AM

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/data-retention",
      "schedule": "0 3 1 * *"
    }
  ]
}
```

---

### Slice 15: UX Polish

#### A) Improved Email Templates

**Current State:** Basic HTML emails

**Improvements:**

- Professional design with branding
- Responsive layout (mobile-friendly)
- Clear CTAs (buttons)
- QR codes embedded properly
- Consistent styling

**Tool:** React Email or MJML

**Example Template:**

```tsx
// src/emails/TicketDelivery.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Img,
} from "@react-email/components";

export default function TicketDeliveryEmail({
  buyerName,
  eventTitle,
  eventDate,
  tickets,
}: {
  buyerName: string;
  eventTitle: string;
  eventDate: string;
  tickets: { id: string; qrCode: string; type: string }[];
}) {
  return (
    <Html>
      <Head />
      <Body
        style={{ backgroundColor: "#f6f9fc", fontFamily: "Arial, sans-serif" }}
      >
        <Container
          style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}
        >
          <Section
            style={{
              backgroundColor: "#ffffff",
              padding: "40px",
              borderRadius: "8px",
            }}
          >
            <Text
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                marginBottom: "20px",
              }}
            >
              Je tickets voor {eventTitle}
            </Text>

            <Text
              style={{ fontSize: "16px", color: "#555", marginBottom: "30px" }}
            >
              Hoi {buyerName},<br />
              <br />
              Bedankt voor je bestelling! Je tickets voor{" "}
              <strong>{eventTitle}</strong> op {eventDate} zijn klaar.
            </Text>

            {tickets.map((ticket, index) => (
              <Section
                key={ticket.id}
                style={{
                  marginBottom: "30px",
                  padding: "20px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                }}
              >
                <Text
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    marginBottom: "10px",
                  }}
                >
                  Ticket {index + 1}: {ticket.type}
                </Text>
                <Img
                  src={ticket.qrCode}
                  alt="QR Code"
                  style={{ width: "200px", height: "200px" }}
                />
                <Text
                  style={{ fontSize: "14px", color: "#888", marginTop: "10px" }}
                >
                  Toon deze QR-code bij de ingang
                </Text>
              </Section>
            ))}

            <Button
              href={`https://app.getentro.app/orders/${tickets[0].id}`}
              style={{
                backgroundColor: "#007bff",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "4px",
                textDecoration: "none",
                display: "inline-block",
                marginTop: "20px",
              }}
            >
              Bekijk je bestelling
            </Button>

            <Text
              style={{ fontSize: "14px", color: "#888", marginTop: "40px" }}
            >
              Zie je je tickets niet? Check je spam folder of{" "}
              <a href="https://app.getentro.app/support">neem contact op</a>.
            </Text>
          </Section>

          <Text
            style={{
              fontSize: "12px",
              color: "#999",
              textAlign: "center",
              marginTop: "20px",
            }}
          >
            © 2026 Entro • <a href="https://getentro.app/privacy">Privacy</a> •{" "}
            <a href="https://getentro.app/terms">Voorwaarden</a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Templates to Redesign:**

- [ ] Order confirmation
- [ ] Ticket delivery
- [ ] Refund notification
- [ ] Organizer welcome
- [ ] Invoice created
- [ ] Invoice paid

---

#### B) Event FAQ Page

**Route:** `/e/[slug]/faq`

**Purpose:** Reduce support questions by providing organizer-customizable FAQ

**Fields:**

```prisma
model Event {
  // ... existing fields
  faqEnabled Boolean @default(false)
  faqItems   Json?   // Array of { question: string, answer: string }
}
```

**UI:**

```tsx
<Accordion>
  {event.faqItems.map((item, index) => (
    <AccordionItem key={index}>
      <AccordionTrigger>{item.question}</AccordionTrigger>
      <AccordionContent>{item.answer}</AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

**Organizer Admin:**

- Add/edit/delete FAQ items
- Drag-and-drop reordering
- Preview before publishing

---

#### C) Loading States & Error Handling

**Current Issues:**

- Forms submit without feedback
- No loading spinners on slow operations
- Generic error messages

**Improvements:**

**1. Loading Skeletons:**

```tsx
// Dashboard stats loading state
{
  isLoading ? (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  ) : (
    <StatsCards data={stats} />
  );
}
```

**2. Form Submission States:**

```tsx
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Spinner className="mr-2" />
      Opslaan...
    </>
  ) : (
    "Opslaan"
  )}
</Button>
```

**3. User-Friendly Error Messages:**

```typescript
// Map error codes to messages
const ERROR_MESSAGES: Record<string, string> = {
  PAYMENT_FAILED:
    "Je betaling is mislukt. Probeer het opnieuw of kies een andere betaalmethode.",
  TICKET_SOLD_OUT:
    "Deze tickets zijn uitverkocht. Probeer een ander tickettype.",
  INVALID_QR: "Dit is geen geldig ticket. Neem contact op met de organisatie.",
  NETWORK_ERROR: "Verbindingsprobleem. Controleer je internetverbinding.",
};

function getErrorMessage(code: string): string {
  return (
    ERROR_MESSAGES[code] || "Er is iets misgegaan. Probeer het later opnieuw."
  );
}
```

**4. Toast Notifications:**

```tsx
import { toast } from "sonner";

// Success
toast.success("Evenement gepubliceerd!");

// Error
toast.error("Kon evenement niet publiceren", {
  description: "Controleer of alle verplichte velden zijn ingevuld.",
});

// Loading
const toastId = toast.loading("Tickets versturen...");
await sendTickets();
toast.success("Tickets verstuurd!", { id: toastId });
```

---

## Implementation Checklist

### Phase 1: Observability (Day 1)

- [ ] Install Sentry SDK
- [ ] Configure Sentry with environment settings
- [ ] Add error tracking to critical paths
- [ ] Implement `/api/health` endpoint
- [ ] Set up UptimeRobot monitoring
- [ ] Configure Slack/email alerts

### Phase 2: Rate Limiting (Day 1-2)

- [ ] Install `@upstash/ratelimit`
- [ ] Set up Upstash Redis account
- [ ] Implement rate limit middleware
- [ ] Apply to scanner endpoints
- [ ] Apply to checkout endpoints
- [ ] Test rate limit enforcement

### Phase 3: Security (Day 2)

- [ ] Implement brute-force protection
- [ ] Add exponential backoff for scan failures
- [ ] Test attack scenarios
- [ ] Document security measures

### Phase 4: Data Retention (Day 2-3)

- [ ] Implement `dataRetentionService`
- [ ] Create `/api/cron/data-retention` endpoint
- [ ] Configure monthly cronjob
- [ ] Test anonymization logic
- [ ] Document retention policy

### Phase 5: Email Templates (Day 3)

- [ ] Install React Email
- [ ] Redesign ticket delivery template
- [ ] Redesign order confirmation
- [ ] Redesign refund notification
- [ ] Redesign organizer welcome
- [ ] Test rendering across email clients

### Phase 6: UX Polish (Day 3-4)

- [ ] Add loading skeletons to dashboard
- [ ] Implement form submission states
- [ ] Improve error messages
- [ ] Add toast notifications
- [ ] Build event FAQ page
- [ ] Test on mobile devices

---

## Success Criteria

- ✅ Error tracking captures 100% of exceptions
- ✅ Health check endpoint responds within 500ms
- ✅ Rate limits prevent abuse without blocking legitimate users
- ✅ PII anonymized automatically after retention period
- ✅ Email templates render correctly on all major clients
- ✅ Loading states provide clear feedback
- ✅ Error messages are user-friendly and actionable

---

## Future Enhancements

- Real-user monitoring (RUM)
- Performance profiling (slow queries)
- A/B testing framework
- Dark mode
- Keyboard shortcuts
- Progressive Web App (PWA)
