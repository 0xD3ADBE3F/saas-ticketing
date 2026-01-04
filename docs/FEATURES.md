# Entro - Feature Development Roadmap

> **Last Updated:** 1 January 2026

## 📋 Overview

This document provides a high-level overview of Entro's development status and links to detailed feature plans. For specific feature implementation details, see the individual plan documents in [docs/development/](./docs/development/).

## 🎉 Production-Ready Features

### Core Platform (Slices 0-12)

- ✅ **Multi-tenant ticketing** - Full CRUD with organization scoping
- ✅ **Authentication & Authorization** - Supabase Auth with role-based access
- ✅ **Events & Ticket Types** - CRUD with capacity management and status transitions
- ✅ **Public Event Pages** - Buyer-facing checkout flow with ticket selection
- ✅ **Payment Processing** - Mollie Connect (Platform mode) with iDEAL support
- ✅ **Service Fee Model** - €0.50 + 2% per order (buyer-paid), configurable per event
- ✅ **Platform Revenue Model** - Application fees (service fee - €0.35 Mollie fee)
- ✅ **Ticket Generation** - UUID + signed tokens with QR codes
- ✅ **Email Delivery** - Resend integration for ticket delivery
- ✅ **Ticket Scanning** - Online scanning with first-scan-wins rule
- ✅ **Offline Sync** - Batch upload with conflict resolution
- ✅ **Mobile Scanner** - Terminal codes with camera QR scanning
- ✅ **Payout Reporting** - Mollie Settlements API with fee breakdowns
- ✅ **CSV Exports** - Orders, tickets, and scan logs
- ✅ **Dashboard Statistics** - Real-time metrics for organizers
- ✅ **Platform Admin Dashboard** - SuperAdmin role with organization oversight
- ✅ **Audit Logging** - Comprehensive tracking of admin actions
- ✅ **VAT/BTW Handling** - Per-event VAT rates (9%, 21%, exempt) with automatic calculations

### Documentation

- ✅ [SPEC.md](./SPEC.md) - Business rules and core concepts
- ✅ [README.md](./README.md) - Setup and development guide
- ✅ [docs/MOLLIE_PLATFORM.md](./docs/MOLLIE_PLATFORM.md) - Mollie Connect integration details
- ✅ [docs/ONBOARDING_FLOW.md](./docs/ONBOARDING_FLOW.md) - Organizer onboarding
- ✅ [docs/SCANNER_UI.md](./docs/SCANNER_UI.md) - Scanner interface documentation

### Testing

- ✅ **80+ unit tests** passing across all domains
- ✅ Multi-tenancy enforced and tested
- ✅ Idempotency for payments and webhooks
- ✅ Fee calculations verified

---

## 🚧 Planned Features

The following features are planned for future development. Each has a detailed implementation plan in [docs/development/](./docs/development/).

### High Priority

#### 1. Mollie Sales Invoice API

- Automatic invoice generation after events end
- Mollie Sales Invoice API integration
- Organizer dashboard for invoice viewing
- Webhook-based payment status updates
- Email notifications for invoices

### Medium Priority

#### 3. Platform Admin - Organizations Management

**Status:** 🟨 Partially Complete
**Effort:** 15-20 hours
**Plan:** [docs/development/platform-admin/plan.md](./docs/development/platform-admin/plan.md)

Enhanced organization management for SuperAdmins:

- Organizations list with search and filters
- Organization detail view with metrics
- Suspend/unsuspend accounts
- Impersonation for support
- Internal notes system

#### 4. Platform Analytics & Monitoring

**Status:** 🟨 Partially Complete
**Effort:** 20-25 hours
**Plan:** [docs/development/analytics-monitoring/plan.md](./docs/development/analytics-monitoring/plan.md)

Comprehensive analytics and system health:

- Enhanced business metrics dashboard
- Financial reporting and reconciliation
- Failed payments/webhooks monitoring
- Customer support tools (global search)
- Fraud detection and alerts

#### 5. Operations, Security & Polish

**Status:** 🟨 Partially Complete
**Effort:** 15-20 hours
**Plan:** [docs/development/ops-polish/plan.md](./docs/development/ops-polish/plan.md)

Production hardening and UX improvements:

- Error tracking integration (Sentry)
- Health check endpoint
- Rate limiting on critical endpoints
- PII retention and cleanup automation
- Enhanced email templates
- Loading states and error handling

### Low Priority

#### 6. Platform Configuration Management

**Status:** 🟨 Partially Complete
**Effort:** 10-15 hours
**Plan:** [docs/development/platform-configuration/plan.md](./docs/development/platform-configuration/plan.md)

Platform-level settings management:

- Global fee configuration UI
- Email template editor
- Feature flags system
- Maintenance mode controls
- Rate limit configuration

---

## 💰 Fee Structure Reference

| Fee Type            | Amount              | Paid By  | Goes To        | Notes                             |
| ------------------- | ------------------- | -------- | -------------- | --------------------------------- |
| **Service Fee**     | €0.50 + 2%          | Buyer    | Platform       | Per order, configurable per event |
| **Mollie Fee**      | €0.35               | Platform | Mollie         | Per transaction                   |
| **Application Fee** | Service Fee - €0.35 | Platform | Platform (net) | Non-refundable                    |
| **Net Payout**      | Ticket Total        | Buyer    | Organizer      | Gross revenue                     |

**Example:** Order with €20 tickets

- Buyer pays: €20.00 (tickets) + €0.90 (service fee) = €20.90
- Organizer receives: €20.00 (via Mollie settlement)
- Platform receives: €0.90 - €0.35 = €0.55
- Mollie receives: €0.35

---

## 🔐 Security & Compliance

- ✅ Token encryption (AES-256-GCM for Mollie OAuth tokens)
- ✅ Multi-tenant data scoping (all queries organization-scoped)
- ✅ Audit logging (refunds, overrides, admin actions)
- ✅ First-scan-wins rule (no double-entry)
- ✅ Idempotency support (webhooks, payments)
- ⬜ Rate limiting (planned - see ops-polish plan)
- ⬜ PII retention automation (planned - see ops-polish plan)

---

## 📊 Development Phases

### Fase 0-2: Foundation ✅ Complete

- Repository setup, documentation, CI/CD
- Multi-tenant auth and organizations
- Events, ticket types, and capacity management
- Orders, checkout, and payment processing
- Ticket generation and email delivery

### Fase 3-4: Scanning & Fees ✅ Complete

- Online scanning with first-scan-wins
- Offline sync with conflict resolution
- Mobile scanner with terminal codes
- Service fee model (buyer-paid)
- Platform fee calculation and payouts

### Fase 5-6: Platform Operations 🟨 In Progress

- Slice 13-15: Observability, security, UX polish (partially complete)
- Slice 16: SuperAdmin infrastructure ✅ Complete
- Slice 17: Organizations management (planned)
- Slice 18: Mollie Sales Invoice API (planned)
- Slice 19: Platform analytics (partially complete)
- Slice 20: Platform configuration (partially complete)

### Future Phases 📋 Backlog

- Enhanced analytics and reporting
- Multi-currency support
- Wallet passes (Apple Wallet, Google Pay)
- Event templates and cloning
- Tiered pricing for organizations

---

## 🚀 Quick Start for Development

1. **Pick a Feature:** Choose from the planned features above
2. **Read the Plan:** Open the linked plan.md file for detailed requirements
3. **Check Dependencies:** Ensure prerequisite features are complete
4. **Follow the Checklist:** Each plan has an implementation checklist
5. **Test Thoroughly:** All features require unit + integration tests
6. **Update Docs:** Keep SPEC.md and related docs in sync

---

## 📝 Feature Plan Format

All feature plans follow this structure:

- **Overview:** What and why
- **Current State:** What's done, what's not
- **Requirements:** Detailed feature specs
- **Technical Implementation:** Code examples and services
- **Checklist:** Phased implementation steps
- **Success Criteria:** How to know it's done
- **Dependencies:** What's required first

---

## 🔗 Related Documentation

- [SPEC.md](./SPEC.md) - Business rules and domain concepts
- [TODO.md](./TODO.md) - Current sprint tasks
- [README.md](./README.md) - Setup and development guide
- [docs/MOLLIE_PLATFORM.md](./docs/MOLLIE_PLATFORM.md) - Mollie Connect details
- [docs/ONBOARDING_FLOW.md](./docs/ONBOARDING_FLOW.md) - Organizer onboarding

---

## 📞 Questions?

For questions about feature priority or implementation:
