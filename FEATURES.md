# FEATURES.md — Entro (NL-first, Offline Scanning MVP)

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
- ✅ Structured logs (payments, scans)
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

- ⬜ Plan upgrade flow:
  - Immediate effect
  - Prorated billing for remaining period
  - Reset usage counters on plan change
- ⬜ Plan downgrade flow:
  - Takes effect at end of current billing cycle
  - Block if current usage exceeds new plan limits
  - Show warning with usage comparison
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
  - ✅ Create Mollie customer on first paid subscription
  - ✅ Create recurring subscription (ORGANIZER: €49/mo, PRO: €99/mo)
  - ✅ Mollie handles payment collection, retries, and invoices
  - ✅ Handle subscription webhooks (payment succeeded, failed, cancelled)
  - ✅ Event payment for PAY_PER_EVENT plan (€49 per event)
- ⬜ Overage billing (charged at payout):
  - Track tickets sold per billing period
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
- ✅ Effective date: "Takes effect on [billing cycle end]"
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

**Phase 3: Billing & History** (Mollie-powered)

| Task                                    | Status |
| --------------------------------------- | ------ |
| Billing page route                      | ⬜     |
| `BillingHistory` component (Mollie API) | ⬜     |
| Link to Mollie invoices                 | ⬜     |

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
- ⬜ Integration test: Mollie subscription webhook handling
- ⬜ Integration test: KVK API verification (when available)
- ⬜ E2E: organizer can upgrade from NON_PROFIT to ORGANIZER
- ⬜ E2E: overage fees appear in payout calculation
- ⬜ E2E: platform admin can set fee override on event
- ⬜ E2E: user cannot publish event without Mollie onboarding
- ⬜ E2E: user cannot publish event without active subscription
- ⬜ E2E: NON_PROFIT user cannot publish without KVK verification
- ✅ Cannot downgrade if current usage exceeds new plan limits
- ⬜ Usage stats update in real-time after ticket sales
- ⬜ Fee override changes create audit log entries

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
