# Mollie Sales Invoice API Integration

**Status:** 🚧 Planned
**Priority:** High
**Estimated Effort:** 20-25 hours (3-4 days)

## Overview

Automate platform fee invoicing using Mollie's Sales Invoice API. After events end, automatically generate and send invoices to organizers for platform fees collected during the event.

## Business Context

**What Gets Invoiced:**

- Platform fee per event = Service Fees Collected - Mollie Transaction Fees
- Example: 100 orders × (€0.50 + 2%) - (100 × €0.35) = Platform fee

**Why Mollie Sales Invoice API:**

- Professional invoices with hosted PDFs
- Leverage Mollie's payment infrastructure
- Unified billing experience (same provider for payments and invoices)
- Automated payment collection

---

## Current State

### ✅ Database Schema Ready

- `Invoice` model exists with all required fields
- `mollieSalesInvoiceId`, `invoiceNumber`, `pdfUrl` fields present
- `InvoiceType` enum: `PLATFORM_FEE`
- `InvoiceStatus` enum: `DRAFT`, `SENT`, `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`

### ⬜ To Build

- Mollie Sales Invoice service
- Invoice generation workflow
- Automated cronjob for post-event invoicing
- Webhook handler for payment status updates
- Organizer dashboard UI
- Email notifications

---

## Technical Implementation

### 1. Mollie Sales Invoice Service

**File:** `src/server/services/mollieSalesInvoiceService.ts`

```typescript
import { createMollieClient } from "@mollie/api-client";

interface CreateSalesInvoiceParams {
  organizationId: string;
  eventId: string;
  amount: number; // Platform fee in cents (excl VAT)
  description: string;
  recipientEmail: string;
  recipientName: string;
  vatNumber?: string;
  address: {
    streetAndNumber: string;
    postalCode: string;
    city: string;
    country: string; // Default: "NL"
  };
  paymentTerm?: "7 days" | "14 days" | "30 days"; // Default: 30 days
}

export const mollieSalesInvoiceService = {
  /**
   * Create a sales invoice via Mollie API
   * POST https://api.mollie.com/v2/sales-invoices
   */
  async create(params: CreateSalesInvoiceParams): Promise<MollieSalesInvoice> {
    const mollie = createMollieClient({
      apiKey: process.env.MOLLIE_API_KEY!,
    });

    const invoice = await mollie.salesInvoices.create({
      recipientIdentifier: params.organizationId,
      recipient: {
        type: "business",
        organizationName: params.recipientName,
        email: params.recipientEmail,
        vatNumber: params.vatNumber,
        streetAndNumber: params.address.streetAndNumber,
        postalCode: params.address.postalCode,
        city: params.address.city,
        country: params.address.country,
        locale: "nl_NL",
      },
      lines: [
        {
          description: params.description,
          quantity: 1,
          vatRate: "21.00", // 21% BTW
          unitPrice: {
            currency: "EUR",
            value: (params.amount / 100).toFixed(2), // Convert cents to euros
          },
        },
      ],
      status: "issued", // Send invoice + enable payment immediately
      vatMode: "exclusive", // Apply 21% VAT on top
      paymentTerm: params.paymentTerm || "30 days",
      emailDetails: {
        subject: `Invoice for ${params.description}`,
        body: `Dear ${params.recipientName},\n\nThank you for using Entro!\n\nPlease find attached your invoice.\n\nPayment is due within ${params.paymentTerm || "30 days"}.\n\nBest regards,\nThe Entro Team`,
      },
    });

    return invoice;
  },

  /**
   * Get sales invoice from Mollie
   * GET https://api.mollie.com/v2/sales-invoices/:id
   */
  async get(mollieSalesInvoiceId: string): Promise<MollieSalesInvoice> {
    const mollie = createMollieClient({
      apiKey: process.env.MOLLIE_API_KEY!,
    });

    return await mollie.salesInvoices.get(mollieSalesInvoiceId);
  },

  /**
   * Sync invoice status from Mollie (for webhook handler)
   */
  async syncStatus(mollieSalesInvoiceId: string): Promise<{
    status: string;
    paidAt?: Date;
    paymentId?: string;
  }> {
    const mollieInvoice = await this.get(mollieSalesInvoiceId);

    return {
      status: mollieInvoice.status,
      paidAt: mollieInvoice.paidAt ? new Date(mollieInvoice.paidAt) : undefined,
      paymentId: mollieInvoice.paymentDetails?.[0]?.sourceReference,
    };
  },
};
```

---

### 2. Invoice Generation Workflow

**Trigger:** Event status changes to `ENDED`

**File:** `src/server/services/invoiceGenerationService.ts`

```typescript
export const invoiceGenerationService = {
  /**
   * Generate invoice for a completed event
   */
  async generateEventInvoice(eventId: string): Promise<Invoice | null> {
    // 1. Get event and organization
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organization: true },
    });

    if (!event || event.status !== "ENDED") {
      logger.warn("Event not in ENDED status", { eventId });
      return null;
    }

    // 2. Calculate platform fee breakdown
    const breakdown = await payoutService.getEventPayoutBreakdown(
      eventId,
      event.organizationId
    );

    // 3. Skip if platform fee = €0 (free event or no sales)
    if (breakdown.platformFee === 0) {
      logger.info("No platform fee to invoice", { eventId });
      return null;
    }

    // 4. Check for existing invoice
    const existing = await prisma.invoice.findFirst({
      where: { eventId },
    });

    if (existing) {
      logger.info("Invoice already exists", {
        eventId,
        invoiceId: existing.id,
      });
      return existing;
    }

    // 5. Validate billing info
    const org = event.organization;
    if (!org.billingEmail || !org.billingStreetAndNumber || !org.billingCity) {
      logger.error("Incomplete billing info", {
        organizationId: org.id,
        missing: {
          email: !org.billingEmail,
          address: !org.billingStreetAndNumber,
          city: !org.billingCity,
        },
      });

      // Create draft invoice (admin can complete manually)
      return await prisma.invoice.create({
        data: {
          organizationId: org.id,
          eventId,
          type: "PLATFORM_FEE",
          amount: breakdown.platformFee,
          vatAmount: Math.round(breakdown.platformFee * 0.21),
          vatRate: 21.0,
          currency: "EUR",
          status: "DRAFT",
          description: `Platform fees - ${event.title}`,
        },
      });
    }

    // 6. Create Mollie sales invoice
    try {
      const mollieInvoice = await mollieSalesInvoiceService.create({
        organizationId: org.id,
        eventId,
        amount: breakdown.platformFee,
        description: `Platform fees - ${event.title} (${formatDate(event.endsAt)})`,
        recipientEmail: org.billingEmail,
        recipientName: org.billingName || org.name,
        vatNumber: org.billingVatNumber || undefined,
        address: {
          streetAndNumber: org.billingStreetAndNumber!,
          postalCode: org.billingPostalCode!,
          city: org.billingCity!,
          country: org.billingCountry || "NL",
        },
        paymentTerm: "30 days",
      });

      // 7. Store in database
      const invoice = await prisma.invoice.create({
        data: {
          organizationId: org.id,
          eventId,
          type: "PLATFORM_FEE",
          mollieSalesInvoiceId: mollieInvoice.id,
          invoiceNumber: mollieInvoice.invoiceNumber,
          invoiceDate: new Date(mollieInvoice.issuedAt),
          dueDate: new Date(mollieInvoice.dueAt),
          amount: breakdown.platformFee,
          vatAmount: Math.round(breakdown.platformFee * 0.21),
          vatRate: 21.0,
          currency: "EUR",
          status: "SENT",
          pdfUrl: mollieInvoice._links.pdfLink?.href,
          description: `Platform fees - ${event.title}`,
        },
      });

      logger.info("Invoice generated successfully", {
        invoiceId: invoice.id,
        mollieSalesInvoiceId: mollieInvoice.id,
        eventId,
        amount: breakdown.platformFee,
      });

      // 8. Send email notification
      await emailService.sendInvoiceCreatedEmail(invoice);

      return invoice;
    } catch (error) {
      logger.error("Failed to create Mollie invoice", {
        eventId,
        error: error.message,
      });
      throw error;
    }
  },

  /**
   * Find events that need invoices (cronjob)
   */
  async generateMissingInvoices(): Promise<Invoice[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const eventsNeedingInvoices = await prisma.event.findMany({
      where: {
        status: "ENDED",
        endsAt: {
          gte: yesterday,
          lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
        },
        invoices: {
          none: {}, // No invoice yet
        },
      },
      include: { organization: true },
    });

    const results: Invoice[] = [];

    for (const event of eventsNeedingInvoices) {
      try {
        const invoice = await this.generateEventInvoice(event.id);
        if (invoice) {
          results.push(invoice);
        }
      } catch (error) {
        logger.error("Invoice generation failed", {
          eventId: event.id,
          error: error.message,
        });
      }
    }

    logger.info("Invoice generation complete", {
      processed: eventsNeedingInvoices.length,
      created: results.length,
    });

    return results;
  },
};
```

---

### 3. Cronjob Setup

**Route:** `/api/cron/generate-invoices`

**File:** `src/app/api/cron/generate-invoices/route.ts`

```typescript
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoices = await invoiceGenerationService.generateMissingInvoices();

    return NextResponse.json({
      success: true,
      invoicesGenerated: invoices.length,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        organizationId: inv.organizationId,
        eventId: inv.eventId,
        amount: inv.amount,
      })),
    });
  } catch (error) {
    logger.error("Cronjob failed", { error: error.message });
    return NextResponse.json(
      { error: "Invoice generation failed" },
      { status: 500 }
    );
  }
}
```

**Vercel Cron Configuration:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/generate-invoices",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Runs daily at 2 AM UTC (3 AM CET).

---

### 4. Webhook Handler

**Route:** `/api/webhooks/mollie/invoices`

**File:** `src/app/api/webhooks/mollie/invoices/route.ts`

```typescript
export async function POST(request: Request) {
  const { id } = await request.json(); // Mollie invoice ID

  try {
    // 1. Fetch latest status from Mollie
    const { status, paidAt, paymentId } =
      await mollieSalesInvoiceService.syncStatus(id);

    // 2. Find local invoice
    const invoice = await prisma.invoice.findUnique({
      where: { mollieSalesInvoiceId: id },
    });

    if (!invoice) {
      logger.warn("Invoice not found for webhook", {
        mollieSalesInvoiceId: id,
      });
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // 3. Update status
    if (status === "paid" && invoice.status !== "PAID") {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "PAID",
          paidAt,
          molliePaymentId: paymentId,
        },
      });

      logger.info("Invoice marked as paid", {
        invoiceId: invoice.id,
        mollieSalesInvoiceId: id,
      });

      // Send confirmation email
      await emailService.sendInvoicePaidEmail(invoice);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Invoice webhook failed", {
      mollieSalesInvoiceId: id,
      error: error.message,
    });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
```

---

### 5. Organizer Dashboard UI

**Route:** `/dashboard/instellingen/facturatie`

**File:** `src/app/(dashboard)/instellingen/facturatie/page.tsx`

```typescript
export default async function InvoicesPage() {
  const org = await getAuthenticatedOrg();
  const invoices = await prisma.invoice.findMany({
    where: { organizationId: org.id },
    include: { event: true },
    orderBy: { invoiceDate: 'desc' },
  });

  return (
    <DashboardLayout>
      <h1>Facturatie</h1>

      <InvoiceFilters />

      <InvoiceTable invoices={invoices} />
    </DashboardLayout>
  );
}
```

**Table Component:**

```tsx
function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Factuur #</th>
          <th>Evenement</th>
          <th>Datum</th>
          <th>Bedrag</th>
          <th>Status</th>
          <th>Vervaldatum</th>
          <th>Acties</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice) => (
          <tr key={invoice.id}>
            <td>{invoice.invoiceNumber}</td>
            <td>{invoice.event?.title || "N/A"}</td>
            <td>{formatDate(invoice.invoiceDate)}</td>
            <td>{formatCurrency(invoice.amount + invoice.vatAmount)}</td>
            <td>
              <StatusBadge status={invoice.status} />
            </td>
            <td>{formatDate(invoice.dueDate)}</td>
            <td>
              <Button href={invoice.pdfUrl} target="_blank">
                PDF
              </Button>
              {invoice.status === "PENDING" && (
                <Button
                  onClick={() =>
                    (window.location.href = `https://www.mollie.com/payscreen/...`)
                  }
                >
                  Betaal nu
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

### 6. Email Notifications

**A) Invoice Created Email**

```typescript
// src/server/services/emailService.ts
async function sendInvoiceCreatedEmail(invoice: Invoice): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: invoice.organizationId },
  });

  const event = invoice.eventId
    ? await prisma.event.findUnique({ where: { id: invoice.eventId } })
    : null;

  await resend.emails.send({
    from: "Entro <billing@entro.nl>",
    to: org!.billingEmail!,
    subject: `Nieuwe factuur - ${invoice.invoiceNumber}`,
    html: renderInvoiceEmail({
      organizationName: org!.name,
      invoiceNumber: invoice.invoiceNumber!,
      eventTitle: event?.title,
      totalAmount: formatCurrency(invoice.amount + invoice.vatAmount),
      dueDate: formatDate(invoice.dueDate!),
      pdfUrl: invoice.pdfUrl!,
      paymentUrl: `https://app.entro.nl/dashboard/instellingen/facturatie/${invoice.id}/pay`,
    }),
  });
}
```

**B) Invoice Paid Confirmation**

```typescript
async function sendInvoicePaidEmail(invoice: Invoice): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: invoice.organizationId },
  });

  await resend.emails.send({
    from: "Entro <billing@entro.nl>",
    to: org!.billingEmail!,
    subject: `Betaling ontvangen - ${invoice.invoiceNumber}`,
    html: `
      <h1>Betaling ontvangen</h1>
      <p>Bedankt voor je betaling!</p>
      <p>We hebben je betaling van €${formatCurrency(invoice.amount + invoice.vatAmount)} ontvangen.</p>
      <p>Factuurnummer: ${invoice.invoiceNumber}</p>
    `,
  });
}
```

---

## Implementation Checklist

### Phase 1: Core Service (Day 1)

- [ ] Install `@mollie/api-client` package
- [ ] Implement `mollieSalesInvoiceService`
- [ ] Add unit tests for service methods
- [ ] Test with Mollie sandbox

### Phase 2: Invoice Generation (Day 1-2)

- [ ] Implement `invoiceGenerationService`
- [ ] Add billing info validation
- [ ] Implement duplicate detection
- [ ] Add transaction handling
- [ ] Write integration tests

### Phase 3: Cronjob & Automation (Day 2)

- [ ] Create `/api/cron/generate-invoices` endpoint
- [ ] Add CRON_SECRET validation
- [ ] Configure Vercel Cron
- [ ] Test locally with manual trigger
- [ ] Deploy and verify runs

### Phase 4: Webhook Handler (Day 2-3)

- [ ] Create `/api/webhooks/mollie/invoices` endpoint
- [ ] Implement status synchronization
- [ ] Add idempotency
- [ ] Register webhook with Mollie
- [ ] Test with Mollie webhook simulator

### Phase 5: Dashboard UI (Day 3)

- [ ] Create `/dashboard/instellingen/facturatie` page
- [ ] Build `InvoiceTable` component
- [ ] Add filters (status, date)
- [ ] Implement PDF download
- [ ] Add "Pay Now" redirect

### Phase 6: Email Notifications (Day 3-4)

- [ ] Design invoice email templates
- [ ] Implement `sendInvoiceCreatedEmail`
- [ ] Implement `sendInvoicePaidEmail`
- [ ] Test email delivery
- [ ] Add retry logic for failed sends

### Phase 7: Testing & Documentation (Day 4)

- [ ] Unit tests: Service functions
- [ ] Integration tests: Full flow
- [ ] E2E test: Event end → invoice → payment
- [ ] Update SPEC.md
- [ ] Update docs/INVOICING.md

---

## Edge Cases

1. **Event with €0 platform fee:** Skip invoice generation
2. **Missing billing info:** Create DRAFT invoice, notify admin
3. **Mollie API failure:** Retry 3× with backoff, alert admin
4. **Duplicate attempts:** Check existing invoice before creating
5. **Organization deleted:** Keep invoice (accounting requirement)

---

## Success Criteria

- ✅ Invoices generated automatically for ended events
- ✅ Organizers receive email with PDF
- ✅ Invoices viewable in dashboard
- ✅ Status syncs via webhook
- ✅ Payment link works correctly
- ✅ 100% generation success rate (with retries)

---

## Dependencies

- ✅ Payout service (platform fee calculation)
- ✅ Invoice model in database
- ✅ Organization billing fields
- ⬜ Mollie Sales Invoice API access (beta - request needed)

---

## Future Enhancements

- Credit notes for refunds
- Multi-currency support
- Custom PDF branding
- Automated payment reminders
- SEPA Direct Debit
