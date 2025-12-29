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
- ⬜ `POST /api/scanner/scan`
- ⬜ Rule: **first scan wins**
- ⬜ Duplicate scans handled correctly
- ⬜ Scanner-only role access

**DoD**

- Unit tests: first-scan-wins & duplicate handling

---

### Slice 8: Offline sync API

- ⬜ `POST /api/scanner/sync` (event ticket dataset)
- ⬜ `POST /api/scanner/scanlogs/batch` (bulk upload)
- ⬜ Conflict resolution for multi-device scans
- ⬜ ScannerDevice model + last_sync_at

**DoD**

- E2E: sync → batch upload → ticket marked `used`

---

### Slice 9: Organizer "Door dashboard" (Scanning UI)

- ✅ Scanning page with basic UI (ticket stats, manual input)
- ⬜ Live stats: sold vs scanned vs duplicates (real data)
- ⬜ Search ticket/order by email
- ⬜ Manual ticket validation/override (admin only) + audit log
- ⬜ Recent scans list with status indicators

**DoD**

- Manual override always creates audit log entry
- Real-time stats update after scans

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
- ⬜ Payout overview per event
- ⬜ Gross / platform fee / net breakdown
- ⬜ Integration with Mollie Settlements API (fetch real data)
- ⬜ CSV export (orders, tickets, scans)
- ⬜ Audit log for refunds & overrides

**DoD**

- Export totals match Mollie settlement data

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

- ⬜ Subscription plans model:
  - **Non-Profit (Stichting)**: Free platform usage, 1 event/year limit, 1000 tickets/event, no setup fee
    - Higher platform fee per ticket (e.g., 3% vs standard 2%)
    - Requires KVK verification for non-profit status
  - **Starter**: €250 one-time setup fee, unlimited events/month, 1000 tickets/event limit
    - Standard 2% platform fee per ticket
  - **Pro**: €999 one-time setup fee, unlimited events, unlimited tickets
    - Standard 2% platform fee per ticket
  - **Custom/Enterprise**: Manual pricing & setup fees, custom limits, negotiated platform fees
- ⬜ Plan assignment UI:
  - View current plan with setup fee status (paid/pending)
  - Change plan (with confirmation + fee payment if applicable)
  - Override limits for special cases
  - Manual invoicing/credits for setup fees
  - Non-profit verification workflow (KVK number validation)
- ⬜ Usage monitoring:
  - Current period: events created, tickets sold
  - Limit warnings (approaching plan limits)
  - Event count tracking for non-profit annual limit
- ⬜ Platform fee configuration per organization:
  - Default: 2% per ticket (3% for non-profits)
  - Custom rates for special deals (Enterprise tier)
  - Fee history (audit trail)
- ⬜ Setup fee tracking:
  - Payment status (pending/paid/waived)
  - Invoice generation for setup fees
  - Payment link integration (Mollie)

**DoD**

- Unit tests for plan limits enforcement
- Plan changes take effect immediately
- Usage stats update in real-time
- Cannot downgrade if current usage exceeds new plan limits

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
