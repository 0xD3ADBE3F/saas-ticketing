# FEATURES.md — Entro (NL-first, Offline Scanning MVP)

## Project Status Overview

### 🎉 Major Milestones Completed

- ✅ **Multi-tenant ticketing platform** - Full CRUD with tenant scoping
- ✅ **Mollie Connect (Platform)** - OAuth integration with Application Fees (see [docs/MOLLIE_PLATFORM.md](./docs/MOLLIE_PLATFORM.md))
- ✅ **Mobile-friendly scanner interface** - Online + offline sync, manual override
- ✅ **Standalone mobile scanner** - Terminal codes with camera QR scanning
- ✅ **Platform admin dashboard** - SuperAdmin role with organization oversight
- ✅ **Invoice generation** - For post-event platform fee invoicing
- ✅ **Payout reporting** - Mollie Settlements API integration with CSV exports
- ✅ **Simplified fee model** - Flat 2% platform fee for all organizations

### 📊 Feature Completion by Phase

| Phase                   | Status | Slices  | Notes                                  |
| ----------------------- | ------ | ------- | -------------------------------------- |
| **Fase 0** Setup        | ✅     | 0.1-0.2 | Repo, docs, CI/CD                      |
| **Fase 1** Multi-tenant | ✅     | 1-3     | Auth, orgs, events, ticket types       |
| **Fase 2** Orders       | ✅     | 4-6.5   | Checkout, payments, tickets, dashboard |
| **Fase 3** Scanning     | ✅     | 7-9.5   | Online/offline scan, mobile app        |
| **Fase 4** Fees         | ✅     | 10-12   | Service fees, platform fees, payouts   |
| **Fase 5** Ops/Polish   | 🟨     | 13-15   | Observability (partial), UX polish     |
| **Fase 6** Platform     | 🟨     | 16-17   | Admin dashboard (partial)              |

### 🧪 Test Coverage

- ✅ **80+ unit tests** passing (events, orders, tickets, scanning)
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
- Invoice generation for platform fees
- Payout reporting

**Nice-to-Haves (Post-MVP):**

- Platform admin organization management (Slice 17)
- Enhanced analytics dashboard
- Platform configuration UI
- Rate limiting
- Improved email templates

---

## Recent Fixes & Updates

### 31 December 2024

#### Subscription System Removed

- ✅ **Simplified to flat 2% platform fee** - Removed all subscription/plan-based logic
  - Deleted subscription models, services, and UI components
  - Removed `PricingPlan`, `Subscription`, `UsageRecord` database tables
  - Simplified `feeService` to use flat 2% platform fee for all organizations
  - Removed plan limit checks from event publishing flow
- ✅ **Invoice model refactored** - Now focused on platform fee invoicing
  - Renamed `SubscriptionInvoice` to `Invoice`
  - Updated `InvoiceType` enum to only have `PLATFORM_FEE`
  - Kept invoice generation infrastructure for post-event platform fee invoicing
  - Removed subscription-related foreign keys and fields
- ✅ **Database migration** - Clean removal with data preservation
  - Created migration `20251231091500_remove_subscription_system`
  - Dropped subscription tables and enums
  - Removed organization subscription fields (`currentPlan`, `nonProfitStatus`, etc.)
  - Removed event fee override fields
  - Added billing fields (`billingEmail`, `vatNumber`) for future invoicing
- ✅ **Updated documentation** - Removed all subscription references
  - Deleted `PRICING.md`, `CRON_SUBSCRIPTIONS.md`, `PHASE_3_5_COMPLETE.md`
  - Updated `FEATURES.md` to reflect simplified model
  - Removed plan configuration and billing info domain files

### 30 December 2024

#### Invoice & Billing UI Improvements (Removed with Subscription System)

_The invoice UI improvements from 30 December were part of the subscription system and have been removed. Invoice functionality will be reimplemented for platform fee invoicing in future updates._

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

### Slice 1.5: Organizer Onboarding Flow

- ✅ **First login detection** - Track `firstLoginCompleted` flag on Organization
- ✅ **Welcome screen** - Shown after organization creation with confetti animation
  - Headline: "Welkom bij Entro"
  - Primary CTA: "Maak je eerste evenement"
  - Secondary CTA: "Ik doe dit later"
  - Feature preview cards (ticket sales, payments, scanning)
- ✅ **Simplified event creation** - Minimal form for first event
  - Required fields: event name, date & time
  - Optional fields: location
  - New field: `isPaid` (boolean) - determines if Mollie is needed
  - Checkbox: "Dit is een gratis evenement"
- ✅ **Payment status banner** - Shown on event detail when:
  - Event is paid (`isPaid === true`)
  - AND Mollie is not activated (`mollieOnboardingStatus !== "COMPLETED"`)
  - CTA: "Betalingen activeren (≈ 2 minuten)"
  - Shows status: pending, needs_data, in_review, or not started
  - Info box explains: funds go direct to organizer, KYC required, 2% platform fee
- ✅ **Onboarding checklist** - Progress tracker component
  - Account created (always true)
  - Event created
  - Mollie connected (only for paid events)
  - Tickets created
  - Event published (status: LIVE)
- ✅ **Routing logic** - State-driven redirects
  - `/onboarding` → create organization
  - `/welcome` → shown when `firstLoginCompleted === false`
  - `/dashboard` → redirects to welcome if needed
  - Event creation with `?onboarding=true` parameter uses simplified form
- ✅ **Database migrations** - New fields added
  - `organizations.firstLoginCompleted` (boolean, default false)
  - `events.isPaid` (boolean, default true)
  - Indexes added for query performance

**Key Design Decisions**

1. **Free events never block** - Users can create free events without Mollie
2. **Mollie onboarding is opt-in** - Only required when trying to sell paid tickets
3. **State-driven UX** - No hard-coded flows, everything reacts to backend state
4. **MVP-friendly** - Minimal required fields, can always add more later
5. **Visual feedback** - Confetti, progress bars, status badges for engagement

**DoD**

- ✅ Welcome screen shown after first organization creation
- ✅ Simplified event form works with onboarding parameter
- ✅ Payment banner appears for paid events without Mollie
- ✅ Checklist tracks progress accurately
- ✅ Free events can be created without Mollie activation
- ✅ Routing redirects work correctly based on state

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
