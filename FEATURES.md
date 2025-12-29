# FEATURES.md — Ticketing SaaS (NL-first, Offline Scanning MVP)

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

- ✅ Unit test: service fee calculation, capacity validation (25 tests)

---

### Slice 5: Payments (NL iDEAL) + Webhooks

- ⬜ Payment provider integration
- ⬜ Webhook handler (idempotent)
- ⬜ Order statuses:
  `pending_payment | paid | failed | cancelled | refunded`
- ⬜ On `paid`: issue tickets

**DoD**

- Unit test: webhook idempotency (no duplicate tickets)

---

### Slice 6: Tickets + QR + Delivery

- ⬜ Ticket model with UUID + signed QR token
- ⬜ Ticket statuses: `valid | used | refunded`
- ⬜ Email delivery with QR + event info
- ⬜ “Resend tickets” action in backend
- ⬜ PDF ticket attachment (fallback)

**DoD**

- E2E: paid order → tickets generated → resend works

---

## Fase 3 — Scanning (Offline-ready MVP) (Slice 7–9)

### Slice 7: Online scanning + ScanLogs

- ⬜ ScanLog model (log every scan attempt)
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

### Slice 9: Organizer “Door dashboard”

- ⬜ Live stats: sold vs scanned vs duplicates
- ⬜ Search ticket/order by email
- ⬜ Manual override (admin only) + audit log

**DoD**

- Manual override always creates audit log entry

---

## Fase 4 — Fees, Reporting & Payouts (Slice 10–12)

### Slice 10: Service fee per order (buyer-paid)

- ⬜ Configurable service fee rules
- ⬜ Correct calculation in checkout
- ⬜ Stored as immutable snapshot on Order

**DoD**

- Unit test: service fee applies once per order

---

### Slice 11: Platform fee on **scanned tickets only**

- ⬜ Fee engine: % × price of `used` tickets
- ⬜ Snapshot calculation per event/payout period
- ⬜ Edge cases:
  - refunded before scan → no fee
  - refunded after scan → fee remains

**DoD**

- Unit tests for all fee edge cases

---

### Slice 12: Payout reporting

- ⬜ Payout overview per event
- ⬜ Gross / scanned / fee / net breakdown
- ⬜ CSV export (orders, tickets, scans)
- ⬜ Audit log for refunds & overrides

**DoD**

- Export totals match database calculations

---

## Fase 5 — Ops, Security & Polish (Slice 13–15)

### Slice 13: Observability

- ⬜ Error tracking
- ⬜ Structured logs (payments, scans)
- ⬜ Health check endpoint

### Slice 14: Security & privacy

- ⬜ Rate limiting on scan endpoints
- ⬜ Brute-force protection on QR validation
- ⬜ PII minimization + retention hooks

### Slice 15: UX polish

- ⬜ Organizer onboarding wizard
- ⬜ Improved email templates
- ⬜ Event FAQ page

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
