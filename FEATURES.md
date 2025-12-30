# FEATURES.md — Entro (NL-first, Offline Scanning MVP)

## Project Status Overview

### 🎉 Major Milestones Completed

- ✅ **Multi-tenant ticketing platform** - Full CRUD with tenant scoping
- ✅ **Mollie Connect (Platform)** - OAuth integration with Application Fees (see [docs/MOLLIE_PLATFORM.md](./docs/MOLLIE_PLATFORM.md))
- ✅ **Subscription billing system** - 4-tier pricing with usage tracking (see [PRICING.md](./PRICING.md))
- ✅ **Mobile-friendly scanner interface** - Online + offline sync, manual override
- ✅ **Standalone mobile scanner** - Terminal codes with camera QR scanning
- ✅ **Platform admin dashboard** - SuperAdmin role with organization oversight
- ✅ **Automatic invoice generation** - Mollie Sales Invoice API integration (Phase 3.5)
- ✅ **Payout reporting** - Mollie Settlements API integration with CSV exports

### 📊 Feature Completion by Phase

| Phase                   | Status | Slices  | Notes                                  |
| ----------------------- | ------ | ------- | -------------------------------------- |
| **Fase 0** Setup        | ✅     | 0.1-0.2 | Repo, docs, CI/CD                      |
| **Fase 1** Multi-tenant | ✅     | 1-3     | Auth, orgs, events, ticket types       |
| **Fase 2** Orders       | ✅     | 4-6.5   | Checkout, payments, tickets, dashboard |
| **Fase 3** Scanning     | ✅     | 7-9.5   | Online/offline scan, mobile app        |
| **Fase 4** Fees         | ✅     | 10-12   | Service fees, platform fees, payouts   |
| **Fase 5** Ops/Polish   | 🟨     | 13-15   | Observability (partial), UX polish     |
| **Fase 6** Platform     | 🟨     | 16-20   | Admin (partial), subscriptions done    |

### 🧪 Test Coverage

- ✅ **108 unit tests** passing (events, orders, tickets, scanning, subscriptions, plan limits)
- ✅ Multi-tenancy enforced across all services
- ✅ Idempotency for payments and webhooks
- ⬜ E2E tests (manual testing completed for critical flows)

### 🔐 Security & Compliance

- ✅ Token encryption (AES-256-GCM for Mollie OAuth tokens)
- ✅ Multi-tenant data scoping (all queries organization-scoped)
- ✅ Audit logging (refunds, overrides, admin actions)
- ✅ First-scan-wins rule (no double-entry)
- ✅ Idempotency support (webhooks, payments)
- ⬜ Rate limiting (TODO: scan endpoints, checkout)

### 🚀 Ready for Production?

**Core Features:** ✅ YES

- Multi-tenant ticketing with full CRUD
- Payment processing via Mollie (iDEAL)
- Ticket scanning (online + offline)
- Subscription billing with 4 tiers
- Automatic invoice generation
- Payout reporting

**Nice-to-Haves (Post-MVP):**

- Platform admin organization management (Slice 17)
- Enhanced analytics dashboard (Slice 19)
- Platform configuration UI (Slice 20)
- Rate limiting
- Improved email templates
- KVK verification for NON_PROFIT plan

---

## Recent Fixes & Updates

### 30 December 2024

#### Invoice & Billing UI Improvements

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

#### Mollie Sales Invoice API Integration (Phase 3.5)

- ✅ **Automatic Invoice Generation** - Full Mollie Sales Invoice API integration
  - Invoices created using platform's MOLLIE_API_KEY (not organization OAuth tokens)
  - `mollieInvoiceService.ts` with full API integration and error handling
  - Generates invoice number in YYYY-NNNN format
  - Calculates VAT (reverse calculation: Net = Gross / 1.21)
  - Stores mollieSalesInvoiceId and pdfUrl in database
  - Structured logging with mollieLogger
- ✅ **Webhook Integration** - Invoices created after successful payments
  - Works for both first payments and recurring subscription payments
  - Invoices created with status="paid" immediately
  - Idempotency via molliePaymentId unique constraint
- ✅ **PDF Proxy Endpoint** - Secure invoice PDF downloads
  - `GET /api/invoices/[id]/pdf` authenticated proxy endpoint
  - Validates user authentication and organization ownership
  - Never exposes direct Mollie PDF URLs to client
  - Returns 401 if not authenticated, 404 if not found/not owned

**Known Technical Debt:**

- Address placeholders (streetAndNumber: "N/A", postalCode: "0000AA", city: "Amsterdam")
- TODO: Collect actual organization address during onboarding for Dutch tax compliance

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
  - ✅ Store organizer's Mollie `profileId` + refresh tokens (encrypted with AES-256-GCM)
  - ✅ Application fees on payments (2% platform fee, non-refundable)
  - ✅ Token refresh logic with auto-refresh on expiry
  - ✅ Settlements API integration (list & detail endpoints)
  - ✅ Balances API integration (balance & open settlement)
- ✅ Mock payment flow for development
- ✅ Webhook handler (idempotent)
- ✅ Order statuses:
  `PENDING | PAID | FAILED | CANCELLED | REFUNDED`
- ✅ On `PAID`: issue tickets (with unique codes + secret tokens)
- ✅ Payment retry for failed orders (reset status to PENDING)
- ✅ Payment status polling UI (PaymentStatusPoller component)
- ✅ Structured logging (paymentLogger, webhookLogger with Pino)

**DoD**

- ✅ Unit test: webhook idempotency (no duplicate tickets) - 13 tests
- ✅ Organizer can connect Mollie account via OAuth
- ✅ Payments created on organizer's Mollie profile with application fee
- ✅ Security audit: token encryption, auth on routes, tenant scoping (see docs/MOLLIE_PLATFORM.md)

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
  - ✅ List settlements endpoint (`/api/organizations/[id]/mollie/settlements`)
  - ✅ Settlement detail endpoint (`/api/organizations/[id]/mollie/settlements/[settlementId]`)
  - ✅ Balance overview endpoint (`/api/organizations/[id]/mollie/balance`)
  - ✅ Open settlement endpoint (`/api/organizations/[id]/mollie/settlements/open`)
- ✅ CSV export (orders, tickets, scans)
- ✅ Audit log for refunds & overrides

**DoD**

- ✅ Export totals match Mollie settlement data
- ✅ Event-level breakdown shows tickets sold, gross, platform fee, and net
- ✅ CSV exports available for orders, tickets, and scans
- ✅ Audit log tracks all refund actions with reason and metadata
- ✅ Settlements UI displays real Mollie settlement data with status badges

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
  - ✅ Total organizations count
  - ✅ Total events count (all statuses)
  - ✅ Total revenue calculation (from paid orders)
  - ✅ Platform fees collected (2% of ticket sales)
  - ✅ Top 10 organizations by revenue
  - ✅ Quick links to org management and analytics
- ✅ Super admin creation script (`scripts/create-super-admin.ts`)

**DoD**

- ✅ SuperAdmins cannot access without explicit role grant
- ✅ All admin actions can be logged with timestamp + admin user
- ✅ Platform routes redirect non-SuperAdmins to organizer dashboard
- ✅ Platform dashboard displays accurate metrics across all organizations

---

### Slice 17: Organizations Management

- ✅ SuperAdmin infrastructure in place (from Slice 16)
- ✅ Platform dashboard with organization metrics
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
- ✅ Cancellation flow:
  - ✅ Cancel at period end (no immediate revocation)
  - ✅ Cancels plan completely (no automatic downgrade to NON_PROFIT)
  - ✅ Organization will have no active plan after cancellation
  - ✅ Mollie subscription cancelled by cron job at period end
  - ✅ CancelSubscriptionModal component with confirmation
  - ✅ Shows effective date and what happens next
  - ✅ Undo cancellation button in warning notice
  - ✅ Server actions: cancelSubscriptionAction() and undoCancellationAction()
  - ✅ Cron job API endpoint: /api/cron/process-subscriptions

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
- ✅ `/dashboard/settings/subscription/billing` - Billing history (Mollie-powered)

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

- ✅ Fetch payment history from Mollie Subscriptions API
- ✅ Display: Date | Description | Amount | Status
- ✅ Link to Mollie-hosted invoice PDF
- ✅ Show subscription status (active, past_due, cancelled)

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

**CancelSubscriptionModal** ✅

- ✅ Effective date notice
- ✅ What you'll lose (features comparison)
- ✅ Shows downgrade to NON_PROFIT plan details
- ✅ Displays end date of current billing cycle
- ✅ Confirm cancellation button
- ✅ Error handling and loading states
- ⬜ Retention offer (optional)
- ⬜ Cancellation survey (optional)

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
- ✅ `cancelSubscriptionAction()` - Cancel at period end
- ✅ `undoCancellationAction()` - Undo pending cancellation

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

| Task                                               | Status |
| -------------------------------------------------- | ------ |
| Database schema with invoice fields                | ✅     |
| Database migration (add_invoice_fields)            | ✅     |
| `invoiceRepo.ts` repository layer                  | ✅     |
| `mollieInvoiceService.ts` service layer (full API) | ✅     |
| Invoice generation in webhooks                     | ✅     |
| Billing page route                                 | ✅     |
| `BillingHistory` component                         | ✅     |
| `InvoiceFilters` component                         | ✅     |
| `InvoiceDetailModal` component                     | ✅     |
| Navigation link to billing page                    | ✅     |
| PDF proxy endpoint (`/api/invoices/[id]/pdf`)      | ✅     |
| Dark mode support                                  | ✅     |
| Amount display fix (cents → euros)                 | ✅     |
| Server/client component separation                 | ✅     |

**Phase 3.5: Sales Invoice API Integration** (For Organization Subscription Invoicing) ✅

> **Goal:** Automatically generate formal invoices for organization subscription payments using Mollie's Sales Invoice API (Beta).
>
> **Status:** ✅ Implementation complete. Invoice generation integrated with subscription payment webhooks. Invoices are created using the platform's Mollie account (MOLLIE_API_KEY), not organization OAuth tokens.
>
> **See:** [docs/PHASE_3_5_COMPLETE.md](./docs/PHASE_3_5_COMPLETE.md) for full implementation details.

| Task                                            | Status |
| ----------------------------------------------- | ------ |
| Full Mollie Sales Invoice API integration       | ✅     |
| VAT calculation (reverse: Net = Gross / 1.21)   | ✅     |
| Invoice number generation (YYYY-NNNN format)    | ✅     |
| Webhook integration (subscription + event)      | ✅     |
| Idempotency (molliePaymentId unique constraint) | ✅     |
| Structured logging (mollieLogger)               | ✅     |
| Error handling with detailed logs               | ✅     |
| PDF proxy endpoint for secure downloads         | ✅     |

**Key Architecture Points:**

- Invoices created with **platform's MOLLIE_API_KEY** (not org OAuth)
- Invoices are FROM Entro TO organizations (for subscription fees)
- Status set to "paid" immediately after successful payment
- Organizations don't need Mollie accounts to receive subscription invoices

**Testing Completed:**

- Manual testing via subscription upgrade flow
- Invoice appears in Mollie dashboard
- PDF download works correctly
- Billing history displays invoices with all details

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
| `CancelSubscriptionModal` component         | ✅     |
| Server action: `cancelSubscriptionAction()` | ✅     |
| Server action: `undoCancellationAction()`   | ✅     |
| Cancellation notice with undo button        | ✅     |
| Reactivate subscription flow                | ✅     |
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
    ├── BillingHistory.tsx ✅
    ├── CancelSubscriptionModal.tsx ✅
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

> **Database Schema:** ✅ Already implemented
>
> - `Organization.kvkNumber` (String, nullable)
> - `Organization.kvkVerifiedAt` (DateTime, nullable)
> - `Organization.kvkRejectionReason` (String, nullable)
> - `Organization.nonProfitStatus`: `PENDING | VERIFIED | REJECTED | NOT_APPLICABLE`
>
> **Mollie KVK Verification:** ⚠️ Limited availability
>
> - Mollie's Onboarding API **does not expose KVK verification status** directly
> - Mollie collects `registrationNumber` (KVK) during onboarding via Client Links API
> - Mollie performs KYC/KVK verification internally, but only returns: `status: "needs-data" | "in-review" | "completed"`
> - Organization API does not include legal entity type (stichting vs BV)
> - **Conclusion:** Cannot reliably fetch from Mollie whether organization is a non-profit

**Recommended Approach:**

**Option 1: KVK API Direct Integration** (Preferred)

- Use [KVK Zoeken API](https://developers.kvk.nl/apis/zoeken) (official Dutch Chamber of Commerce API)
- Free tier: 10 requests/day (sufficient for manual verification)
- Paid tier: €50/month for automated checks
- Returns: legal form (`rechtsvorm`), e.g., "Stichting", "Vereniging", "BV", "Eenmanszaak"
- Implementation:
  1. User enters KVK number during NON_PROFIT plan selection
  2. Backend calls KVK API: `GET /api/v1/basisprofielen/{kvkNummer}`
  3. Check if `rechtsvorm` is "Stichting" or "Vereniging"
  4. Auto-verify if match, otherwise require manual admin review

**Option 2: Manual Verification Workflow** (MVP Fallback)

- ⬜ User enters KVK number during NON_PROFIT plan signup
- ⬜ Status set to `PENDING`
- ⬜ Platform Admin UI shows pending verifications queue
- ⬜ Admin manually looks up KVK number on kvk.nl
- ⬜ Admin approves (status → `VERIFIED`) or rejects with reason (status → `REJECTED`)
- ⬜ Until verified: can create DRAFT events but cannot publish to LIVE

**Verification Workflow:**

- ⬜ NON_PROFIT plan selection → enter KVK number → submit for verification
- ⬜ `planLimitsService.canPublishEvent()` checks `nonProfitStatus === 'VERIFIED'` for NON_PROFIT plan
- ⬜ On verification: full NON_PROFIT plan access unlocked
- ⬜ On rejection: notify user via email, must upgrade to paid plan or appeal
- ⬜ Platform Admin verification UI:
  - Queue of pending verifications (filterable: pending/verified/rejected)
  - Manual approve/reject with mandatory reason field
  - View KVK details via link to kvk.nl or API response
- ⬜ Auto-downgrade if verification rejected:
  - Block event publishing until resolved
  - Email notification with rejection reason
  - Option to appeal or upgrade to PAY_PER_EVENT plan

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

### Slice 19: Platform Analytics (Platform Admin) & Monitoring

- ✅ Platform dashboard home (from Slice 16):
  - Total organizations (active count)
  - Total revenue (from paid orders)
  - Platform fees collected (2% calculation)
  - Total events (all statuses)
  - Top 10 organizations by revenue
- ⬜ Enhanced metrics:
  - Organizations (active/suspended/churned breakdown)
  - GMV (Gross Merchandise Value)
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

- ✅ Platform routes and layout (from Slice 16)
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
