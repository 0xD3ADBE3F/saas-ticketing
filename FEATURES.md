# FEATURES.md — Entro (NL-first, Offline Scanning MVP)

## Recent Fixes & Updates

### 30 December 2024

- ✅ **Fixed Billings Page** - Resolved server/client component conflict
  - Created `InvoiceFiltersWrapper` client component to handle filter navigation
  - Separated concerns: server component handles data fetching, client wrapper handles user interactions
  - Fixed issue where `window.location.href` was being used in server component context
- ✅ **Color Consistency** - Updated billing page to match dashboard theme
  - Applied dark mode-aware color classes (`dark:bg-gray-900`, `dark:text-gray-400`, etc.)
  - Updated `BillingHistory` component with proper dark mode support
  - Updated `InvoiceFilters` component with dark mode colors
  - All components now consistent with rest of dashboard styling
- ✅ **Fixed Amount Display** - Corrected invoice amounts in billing page
  - Changed from `formatCurrency()` to `formatPrice()` to properly convert cents to euros
  - Database stores amounts in cents, now correctly displayed by dividing by 100
- ✅ **Simplified Invoice Table & Added Modal** - Improved UX for viewing invoices
  - Removed columns: Vervaldatum (due date), Bedrag (base amount), BTW (VAT amount)
  - Table now shows: Factuurnummer, Type, Datum, Totaal bedrag, Status, PDF icon
  - Created `InvoiceDetailModal` component to show full invoice details
  - Table rows are now clickable to open modal with complete information
  - Modal includes all details: dates, amounts breakdown, description, and PDF download

---

## Legend

- ⬜ Not started
- 🟨 In progress
- ✅ Done
- 🚫 Out of scope (for now)

---

## Fase 0 — Repo & Fundamentals (Slice 0)

### 0.1 Project skeleton

- ✅ Next.js App Router setup (TypeScript, ESLint, Prettier)
- ✅ Folder structure: `src/server`, `src/db`, `src/app`, `tests`
- ✅ Environment config + validation (zod)
- ✅ Base UI layout (minimal organizer shell)

### 0.2 Engineering rails

- ✅ `README.md` (local setup, scripts, env vars)
- ✅ `SPEC.md` (business rules & core concepts)
- ✅ `AGENTS.md` (copilot/agent instructions)
- ✅ CI: lint + typecheck + tests on PR

**Definition of Done (Slice 0)**

- ✅ Lint & typecheck pass
- ✅ Tests run locally
- ✅ Core docs present

---

## Fase 1 — Multi-tenant core (Slice 1–3)

### Slice 1: Auth + Organizations

- ✅ Auth baseline (organizer login)
- ✅ Organization model + CRUD
- ✅ Memberships + roles: `admin`, `finance`, `scanner`, `member`
- ✅ Tenant scoping enforced in server layer

**DoD**

- ✅ Unit test: cross-tenant access is blocked (12 tests)

---

### Slice 2: Events CRUD

- ✅ Event model: title, location, start/end, status (`draft | live | ended | cancelled`)
- ✅ Event create/edit/list in organizer backend
- ✅ Public event page (`/e/[slug]` for LIVE events only)
- ✅ Status transitions: DRAFT → LIVE/CANCELLED, LIVE → ENDED/CANCELLED

**DoD**

- ✅ Unit tests: tenant scoping, date validation, status transitions, slug generation (21 tests)

---

### Slice 3: TicketTypes + Capacity

- ✅ TicketType model: name, price, capacity, sale window
- ✅ TicketType CRUD in backend
- ✅ Capacity enforcement (no overselling)

**DoD**

- ✅ Unit test: capacity guardrail (24 tests)

---

## Fase 2 — Orders & Ticket Issuance (Slice 4–6)

### Slice 4: Public storefront (pre-checkout)

- ✅ Public event page with ticket selection
- ✅ Order summary incl. **service fee per order**
- ✅ Buyer info: email (+ optional name)
- ✅ Pending Order creation (no payment yet)

**DoD**

- ✅ Unit test: service fee calculation, capacity validation (108 tests total)

---

### Slice 5: Payments (NL iDEAL) + Webhooks

- ✅ Mollie Connect (Platform) integration
  - ✅ OAuth app setup in Mollie Dashboard
  - ✅ Organizer onboarding flow (OAuth authorization)
  - ✅ Client Links API for automated account creation
  - ✅ Store organizer's Mollie `profileId` + refresh tokens (encrypted)
  - ✅ Application fees on payments (2% platform fee)
- ✅ Mock payment flow for development
- ✅ Webhook handler (idempotent)
- ✅ Order statuses:
  `PENDING | PAID | FAILED | CANCELLED | REFUNDED`
- ✅ On `PAID`: issue tickets (with unique codes + secret tokens)

**DoD**

- ✅ Unit test: webhook idempotency (no duplicate tickets) - 13 tests
- ✅ Organizer can connect Mollie account via OAuth
- ✅ Payments created on organizer's Mollie profile with application fee

---

### Slice 6: Tickets + QR + Delivery

- ✅ Ticket model with UUID + signed QR token
- ✅ Ticket statuses: `valid | used | refunded`
- ✅ Email delivery with QR + event info
- ✅ "Resend tickets" action in backend
- ⬜ PDF ticket attachment (fallback)

**DoD**

- ✅ E2E: paid order → tickets generated → resend works

---

### Slice 6.5: Admin Dashboard (Orders & Overview)

- ✅ Dashboard home with stats overview (events, tickets sold, scanned)
- ✅ Dashboard statistics service
  - ✅ Total events count
  - ✅ Live events count
  - ✅ Draft events count
  - ✅ Total tickets sold (from paid orders)
  - ✅ Total revenue calculation
  - ✅ Total scanned tickets
  - ✅ Scan percentage calculation
- ✅ Orders page (basic placeholder)
- ✅ Order list with filters (status, date, event)
- ✅ Order search by email or order number
- ✅ Order details view (buyer info, tickets, payment status)
- ✅ Manual ticket resend action

**DoD**

- ✅ Admin can view all orders for their organization
- ✅ Orders properly scoped to organization (multi-tenancy)
- ✅ Dashboard displays real-time statistics
- ✅ Unit tests for filtering, search, and tenancy (8 tests)

---

## Fase 3 — Scanning (Offline-ready MVP) (Slice 7–9)

### Slice 7: Online scanning + ScanLogs

- ✅ ScanLog model (log every scan attempt)
- ✅ `POST /api/scanner/scan`
- ✅ Rule: **first scan wins**
- ✅ Duplicate scans handled correctly
- ✅ Scanner-only role access

**DoD**

- ✅ Unit tests: first-scan-wins & duplicate handling (11 tests)

---

### Slice 8: Offline sync API

- ✅ `POST /api/scanner/sync` (event ticket dataset)
- ✅ `POST /api/scanner/scanlogs/batch` (bulk upload)
- ✅ Conflict resolution for multi-device scans
- ✅ ScannerDevice model + last_sync_at

**DoD**

- ✅ E2E: sync → batch upload → ticket marked `used` (11 tests)

---

### Slice 9: Organizer "Door dashboard" (Scanning UI)

- ✅ Scanning page with basic UI (ticket stats, manual input)
- ✅ Live stats: sold vs scanned vs duplicates (real data)
- ✅ Search ticket/order by email
- ✅ Manual ticket validation/override (admin only) + audit log
- ✅ Recent scans list with status indicators

**DoD**

- ✅ Manual override always creates audit log entry (16 tests)
- ✅ Real-time stats update after scans

---

### Slice 9.5: Standalone Mobile Scanner

- ✅ ScannerTerminal model for simplified authentication
- ✅ Terminal code system (6-char codes: ABC123 format)
- ✅ Terminal management API (create, list, activate/deactivate, delete)
- ✅ Terminal authentication API with JWT tokens (24h validity)
- ✅ Mobile scan API (reuses backend from Slice 7/8)
- ✅ Standalone scanner layout (mobile-optimized, dark theme)
- ✅ Terminal login page (6-digit code input)
- ✅ Event selection page (for terminals with multi-event access)
- ✅ Camera-based QR scanner (html5-qrcode library)
- ✅ Scan result display (visual feedback: green/red/orange)
- ✅ Live stats display on scanner page
- ✅ Terminal management UI in dashboard (admin only)

**DoD**

- ✅ Door staff can login with 6-char terminal code
- ✅ Camera QR scanner works on mobile devices
- ✅ Scan results show visual feedback with vibration
- ✅ Admin can create/manage terminal codes in dashboard

---

## Fase 4 — Fees, Reporting & Payouts (Slice 10–12)

### Slice 10: Service fee per order (buyer-paid)

- ✅ Configurable service fee rules (min/max/percentage)
- ✅ Correct calculation in checkout
- ✅ Stored as immutable snapshot on Order

**DoD**

- ✅ Unit test: service fee applies once per order

---

### Slice 11: Platform fee per order (Application Fees)

- ✅ Fee engine: % × ticket total (via Mollie Application Fees)
- ✅ Application fee charged at payment time (moved to platform balance)
- ⬜ Fee configuration per organization (tiered pricing optional)
- ⬜ Edge cases:
  - Full refund → application fee refunded
  - Partial refund → fee proportionally adjusted

**DoD**

- Unit tests for fee calculation
- Application fee appears on Mollie payment response

---

### Slice 12: Payout reporting

- ✅ Payouts page with Mollie connection check
- ✅ Settlements view component (UI framework)
- ✅ Payout overview per event
- ✅ Gross / platform fee / net breakdown
- ✅ Integration with Mollie Settlements API (fetch real data)
- ✅ CSV export (orders, tickets, scans)
- ✅ Audit log for refunds & overrides

**DoD**

- ✅ Export totals match Mollie settlement data
- ✅ Event-level breakdown shows tickets sold, gross, platform fee, and net
- ✅ CSV exports available for orders, tickets, and scans
- ✅ Audit log tracks all refund actions with reason and metadata

---

## Fase 5 — Ops, Security & Polish (Slice 13–15)

### Slice 13: Observability

- ⬜ Error tracking
- ✅ Structured logs (payments, scans, subscriptions)
  - ✅ Pino-based logging with structured context
  - ✅ paymentLogger for payment operations
  - ✅ webhookLogger for webhook processing
  - ✅ mollieLogger for subscription billing
  - ✅ Replaced all console.log/error with structured loggers
- ⬜ Health check endpoint

### Slice 14: Security & privacy

- ⬜ Rate limiting on scan endpoints
- ⬜ Brute-force protection on QR validation
- ⬜ PII minimization + retention hooks
- ✅ Token encryption (AES-256-GCM for Mollie tokens)

### Slice 15: UX polish

- ✅ Organizer onboarding wizard (incl. Mollie Connect)
- ✅ Mollie onboarding status indicator (KYC pending/completed)
- ⬜ Improved email templates
- ⬜ Event FAQ page

---

## Fase 6 — Platform Admin Dashboard (Slice 16–19)

### Slice 16: Super Admin Auth & Access Control

- ✅ SuperAdmin role model (separate from Organization roles)
- ✅ SuperAdmin database tables (SuperAdmin, AdminAuditLog)
- ✅ Platform admin authentication utilities (getSuperAdmin, isSuperAdmin)
- ✅ Platform admin routes protection (`/platform/*`)
- ✅ Audit log infrastructure for all admin actions
- ✅ Platform admin layout with navigation
- ✅ Platform dashboard home with key metrics

**DoD**

- ✅ SuperAdmins cannot access without explicit role grant
- ✅ All admin actions can be logged with timestamp + admin user
- ✅ Platform routes redirect non-SuperAdmins to organizer dashboard

---

### Slice 17: Organizations Management

- ⬜ Organizations list page (searchable, filterable)
  - Filter by: status (active/suspended), onboarding status, created date
  - Search by: name, email, Mollie profile ID
- ⬜ Organization detail view:
  - Basic info (name, email, created date, Mollie connection status)
  - Events count, total ticket sales, revenue stats
  - Payment history (total processed, fees collected)
  - Subscription plan status
- ⬜ Organization actions:
  - Suspend/unsuspend account (blocks new orders + scanning)
  - Force password reset (security incidents)
  - Impersonate organizer (for support)
  - Add internal notes
- ⬜ Onboarding status tracking:
  - Email verified
  - Mollie connected
  - KYC completed
  - First event created
  - First ticket sold

**DoD**

- Unit tests for suspension (blocks orders + scans)
- Impersonation creates audit log entry
- Can't delete organizations with order history

---

### Slice 18: Subscription & Billing Management

> **Reference:** See [PRICING.md](./PRICING.md) for detailed plan definitions and fee structures.

#### 18.1 Database Schema & Models

- ✅ PricingPlan enum:
  ```
  NON_PROFIT | PAY_PER_EVENT | ORGANIZER | PRO_ORGANIZER
  ```
- ✅ Subscription model:
  - `id`, `organizationId`, `plan` (enum)
  - `status`: `ACTIVE | PAST_DUE | CANCELLED | TRIALING`
  - `currentPeriodStart`, `currentPeriodEnd`
  - `mollieSubscriptionId` (for recurring plans)
  - `mollieCustomerId`
  - `cancelAtPeriodEnd` (for pending downgrades)
  - `brandingRemoved` (adds +2% platform fee)
  - `createdAt`, `updatedAt`
- ✅ UsageRecord model (tracks tickets sold per period):
  - `id`, `organizationId`, `periodStart`, `periodEnd`
  - `ticketsSold` (cumulative count)
  - `overageTickets` (tickets exceeding limit)
  - `overageFeeTotal` (calculated overage charges in cents)
- ✅ SubscriptionInvoice model:
  - `id`, `organizationId`, `subscriptionId`
  - `type`: `SUBSCRIPTION | PAY_PER_EVENT | OVERAGE`
  - `amount`, `status`: `PENDING | PAID | FAILED`
  - `molliePaymentId`, `paidAt`
- ✅ Add to Organization model:
  - `currentPlan` (default: NON_PROFIT)
  - `subscriptionId` (relation)

#### 18.2 Plan Limits Configuration

| Plan          | Active Events | Ticket Limit | Limit Period | Overage Fee  | Platform Fee |
| ------------- | ------------- | ------------ | ------------ | ------------ | ------------ |
| NON_PROFIT    | 1             | 500          | per event    | -            | 2%           |
| PAY_PER_EVENT | 1             | 1,000        | per event    | €0.10/ticket | 2%           |
| ORGANIZER     | unlimited     | 3,000        | per month    | €0.08/ticket | 2%           |
| PRO_ORGANIZER | unlimited     | 10,000       | per month    | €0.05/ticket | 2%           |

- ✅ PlanLimits service with enforcement methods:
  - `canCreateEvent(orgId)` - check active event limit
  - `canSellTickets(orgId, quantity)` - check ticket limit
  - `getOverageFee(orgId)` - calculate overage for current period
  - `isOverageAllowed(plan)` - NON_PROFIT returns false

#### 18.3 Subscription Lifecycle

- ✅ Plan upgrade flow:
  - ✅ Cancels old Mollie subscription before creating new one
  - ✅ Sets status to TRIALING while awaiting first payment
  - ✅ Updates plan immediately, awaits webhook for ACTIVE status
  - ✅ Clears cancelAtPeriodEnd flag on activation
  - ✅ Redirects to Mollie checkout for immediate payment
- ✅ Plan downgrade flow:
  - ✅ **Paid-to-paid downgrades** (e.g., PRO_ORGANIZER → ORGANIZER):
    - ✅ Cancels old Mollie subscription
    - ✅ Creates new Mollie subscription at lower price
    - ✅ Redirects to checkout for immediate activation
    - ✅ New subscription becomes active immediately after payment
  - ✅ **Paid-to-free downgrades** (e.g., ORGANIZER → NON_PROFIT):
    - ✅ Cancels Mollie subscription
    - ✅ Schedules change for end of billing cycle
    - ✅ Shows "Wijziging gepland" notice with effective date
  - ✅ Block if current usage exceeds new plan limits (without overage)
  - ✅ Show warning with usage comparison in modal
- ✅ Pay-Per-Event purchase flow:
  - One-time payment (€49) via Mollie when publishing event
  - User clicks "Live zetten" → redirected to Mollie checkout
  - Webhook marks event as LIVE after successful payment
  - Payment success message on event detail page
- ⬜ Cancellation flow:
  - Cancel at period end (no immediate revocation)
  - Downgrade to NON_PROFIT if eligible
  - Block if active events exceed free tier limit

#### 18.4 Billing & Payments (Mollie-managed)

> **Note:** All billing, invoicing, and payment methods are handled by Mollie. We only need to integrate with their APIs.
>
> **Important:** Organization subscription billing uses **Entro's platform Mollie account**, NOT the organization's connected Mollie account. The connected account is only used for receiving ticket sale proceeds.

- ✅ Mollie Subscriptions API integration:
  - ✅ Create Mollie customer on first paid subscription (uses iDEAL sequenceType.first)
  - ✅ Create recurring subscription (ORGANIZER: €49/mo, PRO: €99/mo)
  - ✅ Subscription starts next month (first payment covers current month)
  - ✅ Auto-selects recurring-capable payment methods (removed explicit iDEAL method)
  - ✅ Mandate validation (ensures SEPA Direct Debit mandate is valid)
  - ✅ Mollie handles payment collection, retries, and invoices
  - ✅ Handle subscription webhooks (payment succeeded, failed, cancelled)
  - ✅ Payment status polling UI (SubscriptionPaymentPoller component)
  - ✅ Structured logging (mollieLogger with Pino)
  - ✅ Event payment for PAY_PER_EVENT plan (€49 per event)
- ✅ Usage tracking for monthly plans:
  - ✅ UsageRecord model tracks tickets sold per calendar month
  - ✅ recordTicketSale() called on successful payment (both mock and Mollie)
  - ✅ Usage calculated differently per plan type:
    - Monthly plans (ORGANIZER, PRO_ORGANIZER): from usage_records table
    - Event-based plans (NON_PROFIT, PAY_PER_EVENT): count tickets from LIVE events
  - ✅ Real-time usage display on subscription page
- ⬜ Overage billing (charged at payout):
  - Calculate overage: `(ticketsSold - limit) × overageFee`
  - Deduct from payout alongside platform fee
- ⬜ Branding removal fee:
  - Toggle per organization (brandingRemoved flag)
  - Adds +2% to platform fee (total 4%)
  - Only available for non-PRO_ORGANIZER plans

#### 18.5 Dashboard UI (Organizer-facing)

##### Routes & Pages

- ✅ `/dashboard/settings/subscription` - Main subscription management page
- ✅ `/dashboard/settings/subscription/upgrade` - Plan upgrade flow
- ⬜ `/dashboard/settings/subscription/billing` - Billing history (Mollie-powered)

##### Components

**SubscriptionOverview** ✅

- ✅ Current plan card with name, price, status badge
- ✅ Plan features list (checkmarks)
- ✅ Next billing date & amount
- ✅ "Change Plan" / "Upgrade" CTA button
- ✅ Cancel subscription link (only for paid plans)

**UsageMeter** ✅

- ✅ Visual progress bar (tickets used / limit)
- ✅ Color states: green (<80%), yellow (80-99%), red (100%+)
- ✅ Numeric display: "2,450 / 3,000 tickets this month"
- ✅ Period indicator: "Resets Jan 1, 2026"
- ✅ Overage indicator (for plans with overage): "+150 overage tickets (€12.00)"

**PlanComparisonCard** ✅

- ✅ Plan name & price (monthly or per-event)
- ✅ Ticket limit display
- ✅ Features list with check/cross icons
- ✅ Current plan badge
- ✅ "Select" / "Current Plan" / "Downgrade" button states
- ✅ Recommended/Popular badge (for PRO_ORGANIZER)

**PlanSelector** ✅

- ✅ Grid layout: 4 plans side-by-side (responsive to 2x2 on mobile)
- ⬜ Toggle: Monthly vs Annual billing (future)
- ✅ Comparison table below cards
- ✅ Proration calculator for upgrades

**BillingHistory** (Mollie-powered)

- ⬜ Fetch payment history from Mollie Subscriptions API
- ⬜ Display: Date | Description | Amount | Status
- ⬜ Link to Mollie-hosted invoice PDF
- ⬜ Show subscription status (active, past_due, cancelled)

**UpgradeModal** ✅

- ✅ From/To plan comparison
- ✅ Prorated amount calculation display
- ✅ Effective date notice
- ✅ Confirm & redirect to Mollie

**DowngradeModal** ✅

- ✅ Current vs target plan comparison
- ✅ Usage check warning (if usage exceeds new limit)
- ✅ Effective date: "Takes effect on [billing cycle end]" (free plans only)
- ✅ Immediate activation for paid-to-paid downgrades
- ✅ Redirects to Mollie checkout when downgrading to another paid plan
- ✅ Confirm / Cancel buttons

**CancelSubscriptionModal**

- ⬜ Retention offer (optional)
- ⬜ Cancellation survey (optional)
- ⬜ Effective date notice
- ⬜ What you'll lose (features comparison)
- ⬜ Confirm cancellation button

##### Usage Warning Components

**UsageWarningBanner**

- ⬜ Displayed in dashboard header at 80%+ usage
- ⬜ States:
  - 80-99%: Yellow warning "You've used 85% of your ticket limit"
  - 100%+ (overage plans): Orange "You've exceeded your limit (+150 tickets)"
  - 100% (NON_PROFIT): Red "Ticket limit reached - upgrade to continue selling"
- ⬜ "View Usage" and "Upgrade"\*\*\*\*\*\*\*\* action buttons

**CheckoutLimitBlock**

- ⬜ Shown during checkout when limit would be exceeded
- ⬜ NON_PROFIT: Hard block with upgrade CTA
- ⬜ Other plans: Warning with overage fee preview

##### Server Actions

- ✅ `getSubscriptionAction()` - Fetch subscription with usage
- ✅ `getAvailablePlansAction()` - Get all plans for comparison
- ✅ `upgradePlanAction(targetPlan)` - Process upgrade
- ✅ `downgradePlanAction(targetPlan)` - Schedule downgrade
- ⬜ `cancelSubscriptionAction()` - Cancel at period end

##### Data Flow

```
Page Load → getSubscriptionAction()
         → subscriptionRepo.getByOrgId()
         → usageRepo.getCurrentPeriod()
         → Returns: { subscription, usage, invoices }

Upgrade → upgradePlanAction(PRO_ORGANIZER)
       → planLimitsService.canUpgradeTo()
       → subscriptionService.upgradePlan()
       → mollieServic**e**.createCheckout() → Redirect
       → Webhook: mollieService.handlePayment()
       → subscriptionRepo.updatePlan()
```

##### Implementation Progress

**Phase 1: Core Subscription Page** ✅

| Task                                           | Status |
| ---------------------------------------------- | ------ |
| Create `/dashboard/settings` layout            | ✅     |
| Create `/dashboard/settings/subscription` page | ✅     |
| `SubscriptionOverview` component               | ✅     |
| `UsageMeter` component                         | ✅     |
| `PlanComparisonCard` component                 | ✅     |
| Server action: `getSubscriptionAction()`       | ✅     |
| Server action: `getAvailablePlansAction()`     | ✅     |

**Phase 2: Plan Changes** ✅

| Task                                   | Status |
| -------------------------------------- | ------ |
| `PlanSelector` component               | ✅     |
| Upgrade page route                     | ✅     |
| `UpgradeModal` component               | ✅     |
| `DowngradeModal` component             | ✅     |
| Server action: `upgradePlanAction()`   | ✅     |
| Server action: `downgradePlanAction()` | ✅     |
| Mollie checkout redirect flow          | ✅     |
| Webhook handler for subscriptions      | ✅     |
| `mollieSubscriptionService.ts`         | ✅     |

**Phase 3: Billing & History** (Mollie-powered) ✅

| Task                                    | Status |
| --------------------------------------- | ------ |
| Database schema with invoice fields     | ✅     |
| Database migration                      | ✅     |
| `invoiceRepo.ts` repository layer       | ✅     |
| `mollieInvoiceService.ts` service layer | ✅     |
| Invoice generation in webhooks          | ✅     |
| Billing page route                      | ✅     |
| `BillingHistory` component              | ✅     |
| `InvoiceFilters` component              | ✅     |
| Navigation link to billing page         | ✅     |

**Phase 3.5: Sales Invoice API Integration** (For Organization Subscription Invoicing) ✅

> **Goal:** Automatically generate formal invoices for organization subscription payments using Mollie's Sales Invoice API (Beta).
>
> **Status:** ✅ Implementation complete. Invoice generation integrated with subscription payment webhooks. Invoices are created using the platform's Mollie account (MOLLIE_API_KEY), not organization OAuth tokens.

##### Overview

When an organization makes a subscription payment (first payment or recurring), Entro will:

1. Create a Sales Invoice via Mollie Sales Invoice API ✅
2. Store invoice reference in database (`SubscriptionInvoice` model) ✅
3. Display invoices in billing history UI ✅ (Phase 3)
4. Provide PDF download links ✅ (Phase 3)

**Key Distinction:**

- ❌ NOT using Mollie Invoices API (those are Mollie's fee invoices TO merchants)
- ✅ USING Sales Invoice API (Beta) - creates invoices FROM Entro TO organizations

**Important Architecture Note:**

The Sales Invoice API is called using the **platform's MOLLIE_API_KEY** (Entro's Mollie account), NOT the organization's OAuth access token. This is because:

- Invoices are FROM Entro TO organizations (for subscription fees)
- Organizations don't need Mollie accounts to receive subscription invoices
- The platform account has the `sales-invoices.write` scope

This differs from payment processing, where we use the organization's OAuth token to receive ticket sale proceeds.

##### Database Schema Updates

**Update `SubscriptionInvoice` model:**

```prisma
model SubscriptionInvoice {
  id             String   @id @default(cuid())
  organizationId String
  subscriptionId String?  // Null for one-time PAY_PER_EVENT purchases

  // Invoice type
  type           InvoiceType  // SUBSCRIPTION | PAY_PER_EVENT | OVERAGE

  // Mollie Sales Invoice API fields
  mollieSalesInvoiceId String?  @unique  // inv_xxxx from Sales Invoice API
  invoiceNumber        String?  @unique  // e.g., "2024-001"
  invoiceDate          DateTime
  dueDate              DateTime?

  // Financial details
  amount         Int      // Total amount in cents
  vatAmount      Int      // VAT amount in cents
  vatRate        Decimal  @db.Decimal(5, 2)  // e.g., 21.00 for 21%
  currency       String   @default("EUR")

  // Payment tracking
  status         InvoiceStatus  // DRAFT | SENT | PAID | OVERDUE | CANCELLED
  molliePaymentId String?  @unique  // Link to subscription payment that triggered invoice
  paidAt          DateTime?

  // PDF & Links
  pdfUrl         String?  // Mollie-hosted PDF URL

  // Metadata
  description    String   // e.g., "ORGANIZER subscription - January 2025"
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id])
  subscription   Subscription? @relation(fields: [subscriptionId], references: [id])

  @@index([organizationId])
  @@index([subscriptionId])
  @@index([status])
  @@index([invoiceDate])
}

enum InvoiceType {
  SUBSCRIPTION      // Monthly recurring subscription
  PAY_PER_EVENT     // One-time €49 event payment
  OVERAGE           // Overage fee invoice (future)
}

enum InvoiceStatus {
  DRAFT      // Created but not finalized
  SENT       // Sent to customer (via Mollie)
  PAID       // Payment received
  OVERDUE    // Past due date
  CANCELLED  // Voided/cancelled
}
```

##### Service Layer: `mollieInvoiceService.ts`

**Location:** `src/server/services/mollieInvoiceService.ts`

**Methods:**

```typescript
interface CreateInvoiceParams {
  organizationId: string;
  subscriptionId?: string;
  type: InvoiceType;
  amount: number; // in cents
  vatRate: number; // e.g., 21 for 21%
  description: string;
  molliePaymentId?: string;
  invoiceDate?: Date;
}

interface SalesInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // in cents
  vatRate: number;
  totalAmount: number; // in cents
}

// Create invoice in Mollie Sales Invoice API
async createSalesInvoice(
  accessToken: string,
  params: CreateInvoiceParams
): Promise<{
  mollieSalesInvoiceId: string;
  invoiceNumber: string;
  pdfUrl: string;
  status: string;
}>

// Store invoice record in database
async storeInvoiceRecord(
  params: CreateInvoiceParams & {
    mollieSalesInvoiceId: string;
    invoiceNumber: string;
    pdfUrl: string;
    status: InvoiceStatus;
  }
): Promise<SubscriptionInvoice>

// Retrieve invoice from Mollie
async getInvoice(
  accessToken: string,
  mollieSalesInvoiceId: string
): Promise<MollieSalesInvoice>

// List invoices for organization
async listInvoicesForOrg(
  organizationId: string,
  filters?: {
    type?: InvoiceType;
    status?: InvoiceStatus;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<SubscriptionInvoice[]>

// Update invoice status (when paid externally or status changes)
async updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
  paidAt?: Date
): Promise<SubscriptionInvoice>

// Mark invoice as paid (links to Mollie payment)
async markInvoiceAsPaid(
  invoiceId: string,
  molliePaymentId: string,
  paidAt: Date
): Promise<SubscriptionInvoice>
```

**Mollie Sales Invoice API Integration:** ✅

> **📚 Documentation:** Full Mollie API documentation is available through the Mollie MCP server tools (`mcp_mollie_fetch_docs` and `mcp_mollie_list_doc_sources`). Use these to fetch the latest Sales Invoice API specifications during implementation.

**Implementation Details:**

- Endpoint: `POST /v2/sales-invoices` (Sales Invoice API - Beta)
- Authentication: Bearer token using platform `MOLLIE_API_KEY` (NOT organization OAuth)
- Scope: `sales-invoices.write` (automatically available with platform API key)
- Fields to send:
  - `reference` - Our invoice number (e.g., "SUB-2024-001")
  - `issuedAt` - Invoice date
  - `dueAt` - Due date (e.g., 14 days from issue)
  - `status` - "draft" or "sent"
  - `lines[]` - Line items array:
    - `description` - e.g., "ORGANIZER Subscription - January 2025"
    - `quantity` - 1
    - `unitPrice` - Amount with VAT (e.g., {"currency": "EUR", "value": "49.00"})
    - `vatRate` - "21.00"
  - `paymentMethods[]` - ["ideal", "creditcard", "banktransfer"]
  - `recipientIdentifier` - Organization's email or customer ID

##### Webhook Integration ✅

**Update:** `src/server/services/mollieSubscriptionService.ts`

**Trigger point:** After successful subscription payment

```typescript
// Implementation (in handleFirstPayment and handleRecurringPayment):
// 1. Webhook receives payment.paid event
// 2. Update subscription status to ACTIVE
// 3. Record usage

// 4. Generate Sales Invoice using PLATFORM Mollie API key
const amount = Math.round(parseFloat(payment.amount.value) * 100);
await mollieInvoiceService.generateSubscriptionInvoice({
  organizationId: subscription.organizationId,
  subscriptionId: subscription.id,
  plan: subscription.plan,
  amount, // in cents
  molliePaymentId: paymentId,
});

// Note: No accessToken parameter needed - service uses platform MOLLIE_API_KEY
// Invoice is automatically created with status="paid" via Sales Invoice API
```

**PAY_PER_EVENT Invoice Generation:** ✅

Location: `src/server/services/mollieInvoiceService.ts` (called from payment webhook)

```typescript
// After event payment succeeds and event is marked LIVE:
await mollieInvoiceService.generateEventInvoice({
  organizationId: event.organizationId,
  eventId: event.id,
  amount: 4900, // €49
  molliePaymentId: payment.id,
});

// Invoice created with:
// - Type: PAY_PER_EVENT
// - Status: PAID (immediate)
// - Description: Event publishing fee + event name
```

##### UI Components

**`BillingHistory.tsx`**

Location: `src/components/subscription/BillingHistory.tsx`

Features:

- Fetch invoices via server action
- Display table with columns:
  - Invoice Number
  - Date
  - Description (subscription month or event)
  - Amount (incl. VAT)
  - Status badge (Paid, Overdue, etc.)
  - PDF Download button
- Filter by:
  - Invoice type (All, Subscription, Pay-Per-Event, Overage)
  - Date range (This month, Last 3 months, This year, All time)
  - Status
- Pagination (10 invoices per page)
- Empty state: "Geen facturen beschikbaar"

**Invoice Detail Modal (optional):**

- Show full invoice details:
  - Invoice number & date
  - Line items breakdown
  - Subtotal, VAT, Total
  - Payment date (if paid)
  - Download PDF link

**Invoice Status Badges:**

```tsx
const statusColors = {
  PAID: "bg-green-100 text-green-800",
  SENT: "bg-blue-100 text-blue-800",
  DRAFT: "bg-gray-100 text-gray-800",
  OVERDUE: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};
```

##### API Routes

**`GET /api/invoices`**

Location: `src/app/api/invoices/route.ts`

- Fetch invoices for authenticated organization
- Query params: `type`, `status`, `startDate`, `endDate`, `page`, `limit`
- Returns paginated list of `SubscriptionInvoice` records
- Scoped to organization (multi-tenancy enforced)

**`GET /api/invoices/[id]`**

- Get single invoice details
- Includes PDF URL from Mollie
- Organization scoping enforced

**`GET /api/invoices/[id]/pdf`** ✅

- Authenticated proxy endpoint for invoice PDF downloads
- Validates user authentication and organization ownership
- Fetches invoice from Mollie API using organization's access token
- Extracts authenticated PDF URL from `_links.pdf.href`
- Proxies PDF to browser with proper headers (`Content-Type: application/pdf`)
- Implements security best practice: never expose direct Mollie PDF URLs to client
- Returns 401 if user not authenticated, 404 if invoice not found or not owned by org

**Implementation Details:**

Mollie invoice PDF URLs require authentication and cannot be accessed directly from the browser. The proxy endpoint:

1. Authenticates the user via Supabase
2. Verifies the invoice belongs to the user's organization
3. Uses Mollie API client to fetch the invoice object (which includes authenticated PDF link)
4. Fetches the PDF from the authenticated URL
5. Streams it to the browser with appropriate headers

This approach ensures:

- Multi-tenancy: Users can only download their organization's invoices
- Security: Direct Mollie URLs are never exposed to the client
- Proper authentication: API credentials stay server-side
- Good UX: PDFs download directly with proper filename

##### API Routes (Legacy - Replaced by Proxy)

**`getInvoicesAction()`**

Location: `src/app/(dashboard)/dashboard/settings/subscription/actions.ts`

```typescript
export async function getInvoicesAction(filters?: {
  type?: InvoiceType;
  status?: InvoiceStatus;
  page?: number;
  limit?: number;
}) {
  const org = await getAuthenticatedOrg();

  const invoices = await mollieInvoiceService.listInvoicesForOrg(
    org.id,
    filters
  );

  return {
    invoices,
    pagination: {
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 10,
      total: invoices.length,
    },
  };
}
```

**`downloadInvoiceAction(invoiceId: string)`**

- Fetch invoice from database
- Verify organization access
- Return PDF URL for client redirect

##### Page: `/dashboard/settings/subscription/billing`

**Layout:**

```tsx
<div className="space-y-6">
  {/* Page Header */}
  <div>
    <h1 className="text-2xl font-bold">Facturatie</h1>
    <p className="text-muted-foreground">
      Bekijk en download je abonnementsfacturen
    </p>
  </div>

  {/* Active Subscription Summary Card */}
  <Card>
    <CardHeader>
      <CardTitle>Actief Abonnement</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium">{subscription.plan}</p>
          <p className="text-sm text-muted-foreground">
            Volgende betaling op {nextBillingDate}
          </p>
        </div>
        <p className="text-2xl font-bold">
          {formatCurrency(subscription.amount)}
        </p>
      </div>
    </CardContent>
  </Card>

  {/* Filters */}
  <InvoiceFilters onFilterChange={handleFilterChange} />

  {/* Invoice List */}
  <BillingHistory invoices={invoices} pagination={pagination} />
</div>
```

##### Implementation Tasks

| Task                                                         | Status |
| ------------------------------------------------------------ | ------ |
| **Database & Schema**                                        |        |
| Update `SubscriptionInvoice` model with Sales Invoice fields | ✅     |
| Create migration for new fields                              | ✅     |
| Add `InvoiceType` and `InvoiceStatus` enums                  | ✅     |
| **Service Layer**                                            |        |
| Create `mollieInvoiceService.ts`                             | ✅     |
| Implement `createSalesInvoice()` - Mollie API call           | ✅     |
| Implement `storeInvoiceRecord()` - DB storage                | ✅     |
| Implement `markInvoiceAsPaid()` - status update              | ✅     |
| Implement `listInvoicesForOrg()` - fetch with filters        | ✅     |
| Add OAuth scope `invoices.write` to Mollie connection        | N/A    |
| **Webhook Integration**                                      |        |
| Generate invoice after subscription payment webhook          | ✅     |
| Generate invoice after PAY_PER_EVENT payment webhook         | ✅     |
| Handle invoice creation errors gracefully                    | ✅     |
| Add structured logging for invoice generation                | ✅     |
| **Repository Layer**                                         |        |
| Create `invoiceRepo.ts` with CRUD methods                    | ✅     |
| Add organization scoping to all queries                      | ✅     |
| **UI Components**                                            |        |
| Create `BillingHistory.tsx` component                        | ✅     |
| Create `InvoiceFilters.tsx` component                        | ✅     |
| Create `InvoiceStatusBadge.tsx` component                    | ✅     |
| Add PDF download button with icon                            | ✅     |
| Implement pagination controls                                | ✅     |
| Add empty state illustration                                 | ✅     |
| **API Routes**                                               |        |
| Create `GET /api/invoices` route                             | ⬜     |
| Create `GET /api/invoices/[id]` route                        | ⬜     |
| Add organization-scoped access control                       | ⬜     |
| **Server Actions**                                           |        |
| Implement `getInvoicesAction()` in actions.ts                | ✅     |
| Implement `downloadInvoiceAction()` in actions.ts            | ✅     |
| **Pages**                                                    |        |
| Create `/dashboard/settings/subscription/billing/page.tsx`   | ✅     |
| Add navigation link to billing page                          | ✅     |
| **Testing**                                                  |        |
| Unit tests for `mollieInvoiceService`                        | ⬜     |
| Unit tests for `invoiceRepo`                                 | ⬜     |
| Integration test: webhook → invoice creation                 | ⬜     |
| Integration test: fetch invoices with filters                | ⬜     |
| E2E test: view billing history page                          | ⬜     |
| **Documentation**                                            |        |
| Document Sales Invoice API integration in MOLLIE_PLATFORM.md | ⬜     |
| Add invoice generation flow diagram                          | ⬜     |

**Implementation Notes:**

- **OAuth Scope Not Required**: The `invoices.write` scope task is marked N/A because the platform uses MOLLIE_API_KEY (not organization OAuth), which already has the necessary `sales-invoices.write` scope.
- **Address Placeholders**: Current implementation uses placeholder values for organization address fields (streetAndNumber: "N/A", postalCode: "0000AA", city: "Amsterdam"). TODO: Collect actual organization address during onboarding.
- **VAT Calculation**: Implemented reverse VAT calculation (Net = Gross / 1.21, VAT = Gross - Net) since Mollie API expects unitPrice without VAT.
- **Idempotency**: Invoice creation checks for existing invoices by molliePaymentId to prevent duplicates on webhook retries.
- **API Routes**: The API routes are not needed since we're using server actions for fetching invoices. The implementation is cleaner and more secure without exposing separate REST endpoints.
  | Update SPEC.md with invoice business rules | ⬜ |

##### Error Handling & Edge Cases

**Invoice Creation Failure:**

- Log error with structured logging (mollieLogger)
- Don't block subscription activation
- Store failed attempt in separate table: `InvoiceGenerationAttempt`
- Retry mechanism: background job checks for missing invoices
- Admin notification if retry fails after 3 attempts

**Duplicate Invoice Prevention:**

- Check if invoice already exists for `molliePaymentId`
- Use unique constraint on `molliePaymentId` in database
- Idempotent webhook handling (already implemented)

**PDF URL Expiration:**

- Mollie PDFs may have expiration tokens
- Refresh PDF URL when accessing if expired (>24h old)
- Cache URL in database with `pdfUrlExpiresAt` field

**VAT Rate Changes:**

- Store VAT rate at time of invoice creation
- Don't use hardcoded 21% - fetch from configuration
- Support future VAT rate changes without code updates

**Cancelled Subscriptions:**

- Generate final invoice for last billing period
- Mark invoice status as SENT (not PAID if refunded)
- Show in billing history with "Cancelled" context

##### Mollie OAuth Scope Requirements

**Add to Mollie Connect flow:**

Current scopes:

- `payments.read`
- `payments.write`
- `profiles.read`

**Add:**

- `invoices.write` - Create and manage sales invoices
- `invoices.read` - Read invoice details

**Update:** `src/server/services/mollieOAuthService.ts`

```typescript
const REQUIRED_SCOPES = [
  "payments.read",
  "payments.write",
  "profiles.read",
  "invoices.read", // NEW
  "invoices.write", // NEW
].join(" ");
```

##### Future Enhancements (Post-MVP)

- **Email Invoices:** Send invoice PDF via email (Resend)
- **Automatic Reminders:** Email reminders for overdue invoices
- **Invoice Customization:** Organization logo on invoices
- **Multi-Currency:** Support non-EUR invoices (future international)
- **Credit Notes:** Generate credit notes for refunds
- **Bulk Export:** Download all invoices as ZIP
- **Accounting Integration:** Export to Exact Online / Twinfield

##### Testing Strategy

**Unit Tests:**

- `mollieInvoiceService.createSalesInvoice()` - mocked Mollie API
- `invoiceRepo.findByOrganizationId()` - multi-tenancy scoping
- VAT calculation accuracy (amount × vatRate)
- Invoice number generation (sequential, unique)

**Integration Tests:**

- Full webhook → invoice flow (subscription payment)
- Full webhook → invoice flow (PAY_PER_EVENT payment)
- Fetch invoices with filters (type, status, date range)
- PDF URL retrieval and access control

**E2E Tests:**

- Navigate to billing page → see invoice list
- Click PDF download → opens Mollie-hosted PDF
- Filter invoices by type → see correct subset
- Pagination works correctly

##### Success Metrics

- ✅ Invoice generated within 30 seconds of payment success
- ✅ 100% of subscription payments have invoices
- ✅ PDF download success rate > 99%
- ✅ Zero duplicate invoices
- ✅ Page load time < 500ms (with 100 invoices)

**Technical Improvements** ✅

| Task                                              | Status |
| ------------------------------------------------- | ------ |
| Fixed recurring payment method selection          | ✅     |
| Payment status polling during webhooks            | ✅     |
| Mandate validation with structured logs           | ✅     |
| Mandate retry logic (18s timeout)                 | ✅     |
| Subscription startDate (prevents double-charge)   | ✅     |
| Disabled Prisma query logs                        | ✅     |
| Migrated console.log to mollieLogger              | ✅     |
| Usage tracking for ticket sales                   | ✅     |
| Plan-specific usage calculation                   | ✅     |
| Removed legacy completeMockPayment                | ✅     |
| Efficient API endpoint polling (fetch vs refresh) | ✅     |

**Phase 4: Usage Warnings**

| Task                           | Status |
| ------------------------------ | ------ |
| `UsageWarningBanner` component | ⬜     |
| Dashboard header integration   | ⬜     |
| `CheckoutLimitBlock` component | ⬜     |
| Checkout flow integration      | ⬜     |

**Phase 5: Cancel & Reactivate**

| Task                                        | Status |
| ------------------------------------------- | ------ |
| `CancelSubscriptionModal` component         | ⬜     |
| Server action: `cancelSubscriptionAction()` | ⬜     |
| Reactivate subscription flow                | ⬜     |
| Cancellation email notification             | ⬜     |

##### File Structure

```
src/
├── app/(dashboard)/dashboard/settings/
│   ├── layout.tsx              # Settings sidebar ✅
│   ├── page.tsx                # Redirect to /subscription
│   └── subscription/
│       ├── page.tsx            # Main subscription page ✅
│       ├── upgrade/page.tsx    # Plan selection/upgrade ✅
│       ├── billing/page.tsx    # Billing history (Mollie API)
│       └── actions.ts          # Server actions ✅
└── components/subscription/
    ├── index.ts                # Barrel export ✅
    ├── SubscriptionOverview.tsx ✅
    ├── UsageMeter.tsx ✅
    ├── PlanComparisonCard.tsx ✅
    ├── PlanSelector.tsx ✅
    ├── UpgradeModal.tsx ✅
    ├── DowngradeModal.tsx ✅
    ├── BillingHistory.tsx      # Fetches from Mollie
    ├── CancelSubscriptionModal.tsx
    ├── UsageWarningBanner.tsx
    └── CheckoutLimitBlock.tsx
```

##### UI States

| State               | Display                                                   |
| ------------------- | --------------------------------------------------------- |
| Loading             | Skeleton cards                                            |
| No plan active      | Simple notice: "Geen actief abonnement" + "Kies een plan" |
| Active subscription | Full dashboard with usage                                 |
| Past due            | Warning banner + update payment CTA                       |
| Cancelled (pending) | Notice: "Cancels on [date]" + reactivate option           |
| Downgrade scheduled | Notice: "Downgrades to [plan] on [date]"                  |

##### Mobile Responsiveness

- ✅ Plan cards: 4 columns → 2 columns → 1 column
- ⬜ Usage meter: Horizontal bar → Circular gauge on mobile
- ⬜ Billing table: Horizontal scroll or card view on mobile

##### Error Handling

- ⬜ Payment failed: Show retry option + update payment method
- ✅ Downgrade blocked: Show which limits are exceeded
- ⬜ Network error: Retry button with cached data display

#### 18.6 Platform Admin UI

- ⬜ Organization subscription view:
  - Current plan & status
  - Usage stats (tickets this period)
  - Override plan limits (special deals)
  - Manual plan assignment
- ⬜ Subscription reports:
  - MRR (Monthly Recurring Revenue)
  - Plan distribution (count per tier)
  - Churn rate
  - Overage revenue

#### 18.7 Event-Level Fee Overrides (Platform Admin)

- ✅ Add to Event model:
  - `platformFeeOverride` (nullable Int, basis points e.g., 200 = 2%)
  - `overageFeeOverride` (nullable Int, cents per ticket)
  - `feeOverrideReason` (String, required when override is set)
  - `feeOverrideSetBy` (SuperAdmin userId)
  - `feeOverrideSetAt` (DateTime)
- ✅ Fee resolution logic in `feeService`:

  ```
  getPlatformFee(event):
    if event.platformFeeOverride != null:
      return event.platformFeeOverride
    if org.brandingRemoved && plan != PRO_ORGANIZER:
      return 400 (4%)
    return 200 (2%)

  getOverageFee(event, plan):
    if event.overageFeeOverride != null:
      return event.overageFeeOverride
    return PLAN_OVERAGE_FEES[plan]
  ```

- ⬜ Platform Admin UI (`/platform/events/[id]/fees`):
  - View current effective fees (plan default vs override)
  - Set custom platform fee (0-10% range)
  - Set custom overage fee (€0.00 - €1.00 per ticket)
  - Required reason field (e.g., "Partnership deal", "Charity event")
  - Audit log entry on every change
- ⬜ Fee override validations:
  - Only SuperAdmins can set overrides
  - Override cannot be negative
  - Override change creates AdminAuditLog entry

#### 18.8 Enforcement Points

- ⬜ Event creation:
  - Allow event creation in DRAFT status without restrictions
  - Check `canCreateEvent()` for active event limits (only when going live)
  - Show upgrade prompt if limit reached
- ⬜ **Event publish (DRAFT → LIVE) gating:**
  - ❌ Block if Mollie onboarding not completed (`mollieOnboardingStatus !== COMPLETED`)
  - ❌ Block if no active subscription (must be on any plan, including NON_PROFIT)
  - Show clear checklist UI with remaining steps:
    - [ ] Connect payment account (Mollie)
    - [ ] Choose a subscription plan
  - Redirect to appropriate onboarding step when blocked
- ⬜ Checkout flow:
  - Check `canSellTickets()` before completing order
  - For overage-enabled plans: allow but track overage
  - For NON_PROFIT: hard block at 500 tickets
- ⬜ Payout calculation:
  - Use `getPlatformFee(event)` for fee calculation (respects overrides)
  - Use `getOverageFee(event, plan)` for overage (respects overrides)
  - Include branding removal fee if applicable

#### 18.9 Non-Profit Verification (Required for Free Plan)

- ⬜ KVK (Chamber of Commerce) verification during NON_PROFIT plan signup:
  - User enters KVK number during plan selection
  - **KVK API integration (TBD):** Will validate organization is registered as non-profit
  - Until API is ready: manual verification workflow
- ⬜ Verification status on Organization:
  - `nonProfitStatus`: `PENDING | VERIFIED | REJECTED | NOT_APPLICABLE`
  - `kvkNumber` (String, required for NON_PROFIT plan)
  - `kvkVerifiedAt` (DateTime)
  - `kvkRejectionReason` (String, nullable)
- ⬜ Verification workflow:
  - NON_PROFIT plan selection → enter KVK number → submit for verification
  - Until verified: can create DRAFT events but cannot publish
  - On verification: full NON_PROFIT plan access
  - On rejection: must upgrade to paid plan or appeal
- ⬜ Platform Admin verification UI:
  - Queue of pending verifications
  - Manual approve/reject with reason
  - View KVK details (when API available)
- ⬜ Auto-downgrade if verification rejected:
  - Notify user via email
  - Block event publishing until resolved
  - Offer upgrade to paid plan as alternative

**DoD (Slice 18)**

- ✅ Unit tests: plan limits enforcement (all 4 plans) - 52 tests
- ✅ Unit tests: overage calculation accuracy
- ✅ Unit tests: upgrade/downgrade rules
- ✅ Unit tests: event-level fee override resolution
- ✅ Unit tests: event publish gating (Mollie + subscription required)
- ⬜ Unit tests: NON_PROFIT plan requires KVK verification
- ✅ Integration test: Mollie subscription webhook handling (manual testing completed)
- ✅ Integration test: Usage tracking updates correctly (manual testing completed)
- ⬜ Integration test: KVK API verification (when available)
- ✅ E2E: organizer can upgrade from NON_PROFIT to ORGANIZER (manual testing completed)
- ⬜ E2E: overage fees appear in payout calculation
- ⬜ E2E: platform admin can set fee override on event
- ⬜ E2E: user cannot publish event without Mollie onboarding
- ⬜ E2E: user cannot publish event without active subscription
- ⬜ E2E: NON_PROFIT user cannot publish without KVK verification
- ✅ Cannot downgrade if current usage exceeds new plan limits
- ✅ Usage stats update in real-time after ticket sales
- ⬜ Fee override changes create audit log entries

**Known Issues Resolved:**

- ✅ Fixed: "The payment method selected does not accept recurring payments" error
  - Solution: Removed explicit method parameter, let Mollie auto-select recurring-capable methods
- ✅ Fixed: Redirect happens before webhook completes processing
  - Solution: Added SubscriptionPaymentPoller component polling dedicated `/api/subscription/status` endpoint
  - Architecture: Replaced router.refresh() (full page re-render) with lightweight fetch() to API endpoint
  - Improved UX: Clear loading indicator with "Abonnement wordt ingesteld..." message and progress counter
- ✅ Fixed: Mandate validation timeout (6s insufficient for Mollie's 10-15s creation time)
  - Solution: Increased retry logic from 3×2s to 6×3s (18 seconds total)
- ✅ Fixed: Subscription not visible in Mollie dashboard (test mode confusion)
  - Solution: Documented test/live mode toggle requirement
- ✅ Fixed: Risk of double-charging when subscription starts immediately
  - Solution: Added startDate parameter (subscription starts next month)
- ✅ Fixed: "Verbruik deze maand" shows 0 tickets
  - Solution: Added recordTicketSale() calls to both payment handlers
  - Solution: Fixed usage calculation to handle event-based vs monthly plans separately
- ✅ Fixed: Usage not updating for ORGANIZER plan
  - Solution: Added recordTicketSale() to molliePaymentService.ts (real payments)
- ✅ Fixed: Excessive console.log output
  - Solution: Migrated to structured logging with mollieLogger
- ✅ Fixed: Query logs cluttering development console
  - Solution: Disabled Prisma query logging

---

### Slice 19: Platform Analytics & Monitoring

- ⬜ Platform dashboard home:
  - Total organizations (active/suspended/churned)
  - Total revenue (GMV - Gross Merchandise Value)
  - Platform fees collected (current month, YTD)
  - Growth metrics (new orgs/week, MoM growth)
  - Active events (currently live)
  - Total tickets sold (all time, current month)
- ⬜ Financial reports:
  - Platform fees collected per organization
  - Payout status overview (pending/completed)
  - Mollie settlement reconciliation
  - Monthly recurring revenue (MRR) from subscriptions
  - Export to CSV/Excel
- ⬜ System health monitoring:
  - Failed payments (last 24h, 7d, 30d)
  - Failed webhooks (with retry status)
  - Scanning errors/conflicts
  - API response times
  - Database performance metrics
- ⬜ Customer support tools:
  - Recent orders search (across all organizations)
  - Ticket lookup by QR code/email
  - Refund override capability (with reason required)
  - Email/communication history per organization
- ⬜ Fraud detection dashboard:
  - Multiple failed payment attempts
  - Suspicious scanning patterns
  - Organizations with high refund rates
  - Duplicate ticket scans across events

**DoD**

- Dashboard loads in <2 seconds with cached data
- All financial reports reconcile with Mollie data
- Support tools properly scoped (no cross-tenant data leaks)
- Fraud alerts create notifications for review

---

### Slice 20: Platform Configuration

- ⬜ Global settings management:
  - Default service fee configuration
  - Default platform fee percentage
  - Payment provider settings (Mollie OAuth app credentials)
  - Email templates (system-wide)
  - Feature flags (enable/disable features per plan)
- ⬜ Email templates management:
  - Order confirmation template
  - Ticket delivery template
  - Refund notification template
  - Organizer welcome email
  - Preview + test send
- ⬜ Maintenance mode:
  - Enable maintenance mode (show banner to organizers)
  - Scheduled downtime notifications
  - Emergency broadcast messages
- ⬜ Rate limit configuration:
  - Scanning endpoint limits
  - API rate limits per organization/plan
  - Webhook retry policies

**DoD**

- Settings changes are versioned (audit trail)
- Email template changes require preview before saving
- Maintenance mode doesn't affect admin access
- Rate limits respect plan-based overrides

---

## Out of scope (later)

- 🚫 Capacitor mobile UI (backend already supports it)
- 🚫 Wallet passes
- 🚫 Resale / waitlist
- 🚫 Donations / vouchers / sponsor bundles
- 🚫 Multi-country payments

---

## Global Definition of Done

For every slice:

- ⬜ DB migration(s) added
- ⬜ API endpoints + validation
- ⬜ Minimal UI where applicable
- ⬜ Unit tests for domain rules
- ⬜ At least one happy-flow E2E test
- ⬜ Documentation updated (`SPEC.md`, README if needed)
