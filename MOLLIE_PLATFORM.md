# Mollie Connect for Platforms - Implementation Guide

> **Status:** 🔴 Not Started
> **Docs:** https://docs.mollie.com/docs/connect-platforms-getting-started

This document tracks the implementation of Mollie Connect for Platforms, which enables our multi-tenant ticketing SaaS to process payments on behalf of organizations (customers).

---

## Overview

Mollie Connect for Platforms allows us to:

- Onboard organizations as connected Mollie accounts
- Process payments on behalf of organizations
- Collect **Application fees** (platform fees) per transaction
- Provide organizations with their own Mollie dashboard

### Why Mollie Connect?

For our ticketing platform:

- **Organizations** are our customers (tenants)
- **Buyers** purchase tickets from organizations
- **Platform fee** is charged per order (using Mollie Application Fees)
- Each organization needs their own Mollie account for payouts

---

## Implementation Progress

### Phase 1: Setup & Configuration

| Task                                 | Status         | Notes                       |
| ------------------------------------ | -------------- | --------------------------- |
| Register as Mollie Partner           | ⬜ Not Started | Apply at partner.mollie.com |
| Create OAuth App in Mollie Dashboard | ⬜ Not Started | Get Client ID & Secret      |
| Configure OAuth redirect URIs        | ⬜ Not Started | Production + dev URLs       |
| Set up webhook endpoints             | ⬜ Not Started | Payment status updates      |
| Configure API idempotency            | ⬜ Not Started | Prevent duplicate payments  |

### Phase 2: OAuth Implementation

| Task                              | Status         | Notes                       |
| --------------------------------- | -------------- | --------------------------- |
| Install OAuth library             | ⬜ Not Started | `simple-oauth2` for Node.js |
| Create "Connect with Mollie" flow | ⬜ Not Started | Onboarding page             |
| Implement token exchange endpoint | ⬜ Not Started | `/api/auth/mollie/callback` |
| Store access/refresh tokens       | ⬜ Not Started | Encrypted in DB             |
| Implement token refresh logic     | ⬜ Not Started | Before API calls            |
| Define OAuth scopes               | ⬜ Not Started | See scopes section below    |

### Phase 3: Organization Onboarding

| Task                                   | Status         | Notes                |
| -------------------------------------- | -------------- | -------------------- |
| Create Client Links API integration    | ⬜ Not Started | Prefilled onboarding |
| Build onboarding status tracking       | ⬜ Not Started | Capabilities API     |
| Handle KYC status updates              | ⬜ Not Started | Webhooks             |
| Create organization profile management | ⬜ Not Started | Profiles API         |
| Design onboarding UI for organizations | ⬜ Not Started | Dashboard flow       |

### Phase 4: Payment Processing

| Task                                       | Status         | Notes                   |
| ------------------------------------------ | -------------- | ----------------------- |
| Update payment creation with access tokens | ⬜ Not Started | Per-organization        |
| Implement Application fees                 | ⬜ Not Started | Platform fee collection |
| Update webhook handlers                    | ⬜ Not Started | Multi-tenant aware      |
| Handle payment methods per organization    | ⬜ Not Started | Methods API             |

### Phase 5: Reporting & Reconciliation

| Task                        | Status         | Notes                  |
| --------------------------- | -------------- | ---------------------- |
| Integrate Settlements API   | ⬜ Not Started | Payout tracking        |
| Integrate Balances API      | ⬜ Not Started | Balance overview       |
| Build payout reporting UI   | ⬜ Not Started | Organization dashboard |
| Platform fee reconciliation | ⬜ Not Started | Admin dashboard        |

### Phase 6: Testing & Go-Live

| Task                       | Status         | Notes               |
| -------------------------- | -------------- | ------------------- |
| Test OAuth flow end-to-end | ⬜ Not Started | Test organization   |
| Test payment processing    | ⬜ Not Started | With test tokens    |
| Test Application fees      | ⬜ Not Started | Fee collection      |
| Test webhook reliability   | ⬜ Not Started | Retry scenarios     |
| Security audit             | ⬜ Not Started | Token storage, etc. |
| Go-live checklist          | ⬜ Not Started | Mollie approval     |

---

## Technical Details

### Required OAuth Scopes

```
payments.read
payments.write
profiles.read
profiles.write
organizations.read
onboarding.read
settlements.read
balances.read
```

### Environment Variables (New)

```env
# Mollie OAuth App (Connect for Platforms)
MOLLIE_CLIENT_ID=
MOLLIE_CLIENT_SECRET=
MOLLIE_REDIRECT_URI=https://your-domain.com/api/auth/mollie/callback

# Existing (keep for fallback/admin)
MOLLIE_API_KEY=
```

### Database Schema Changes

New fields needed on `Organization` model:

```prisma
model Organization {
  // ... existing fields

  // Mollie Connect
  mollieOrganizationId  String?   @unique
  mollieAccessToken     String?   // Encrypted
  mollieRefreshToken    String?   // Encrypted
  mollieTokenExpiresAt  DateTime?
  mollieOnboardingStatus String?  // pending, in_review, completed
  mollieProfileId       String?
}
```

### Key API Endpoints

| Endpoint                | Purpose                            |
| ----------------------- | ---------------------------------- |
| `POST /oauth2/tokens`   | Exchange auth code for tokens      |
| `POST /v2/client-links` | Create onboarding link             |
| `GET /v2/onboarding/me` | Check onboarding status            |
| `GET /v2/profiles`      | List organization profiles         |
| `POST /v2/payments`     | Create payment (with access token) |
| `GET /v2/settlements`   | Get settlement data                |
| `GET /v2/balances`      | Get balance data                   |

### Application Fees (Platform Fees)

When creating a payment on behalf of an organization:

```typescript
const payment = await mollieClient.payments.create(
  {
    amount: { value: "25.00", currency: "EUR" },
    description: "Ticket for Event XYZ",
    redirectUrl: "https://...",
    webhookUrl: "https://...",

    // Application fee - goes to our platform account
    applicationFee: {
      amount: { value: "1.25", currency: "EUR" }, // Platform fee per order
      description: "Platform fee",
    },
  },
  {
    // Use organization's access token
    accessToken: organization.mollieAccessToken,
  }
);
```

### Platform Fee Model

✅ **Application Fee per Order** (Mollie native)

- Platform fee is charged **per order** when payment succeeds
- Uses Mollie's built-in Application Fees feature
- Fee is automatically transferred to our platform account
- Simple and straightforward - no post-event reconciliation needed

**Fee Calculation Example:**

```typescript
// Calculate platform fee based on order total
function calculatePlatformFee(orderTotal: number): number {
  // Example: 5% of order total, minimum €0.50
  const percentageFee = orderTotal * 0.05;
  return Math.max(percentageFee, 0.5);
}
```

---

## File Structure (Planned)

```
src/
├── server/
│   ├── services/
│   │   ├── mollieConnectService.ts    # OAuth & token management
│   │   ├── paymentService.ts          # Update for multi-tenant
│   │   └── payoutService.ts           # Settlement & fees
│   └── repos/
│       └── organizationRepo.ts        # Update for Mollie fields
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── mollie/
│   │           ├── connect/route.ts   # Start OAuth flow
│   │           └── callback/route.ts  # Handle OAuth callback
│   └── (dashboard)/
│       └── dashboard/
│           └── settings/
│               └── payments/          # Mollie connection UI
```

---

## Resources

- [Mollie Connect Overview](https://docs.mollie.com/docs/connect-platforms-getting-started)
- [OAuth Setup Guide](https://docs.mollie.com/docs/setting-up-oauth)
- [Client Links API](https://docs.mollie.com/reference/create-client-link)
- [Application Fees](https://docs.mollie.com/docs/application-fees)
- [Settlements API](https://docs.mollie.com/reference/list-settlements)
- [Balances API](https://docs.mollie.com/reference/list-balances)
- [Go-Live Checklist](https://docs.mollie.com/docs/go-live-checklist)

---

## Notes & Decisions

### Decision Log

| Date       | Decision           | Rationale                                                     |
| ---------- | ------------------ | ------------------------------------------------------------- |
| 2025-12-29 | Platform fee model | **Per order** using Mollie Application Fees - simple & native |
| TBD        | Token encryption   | Need to choose encryption method for stored tokens            |
| TBD        | Fallback handling  | What happens if org's Mollie account has issues?              |

### Open Questions

- [ ] How to handle organizations that haven't completed Mollie onboarding?
- [ ] Should we allow events to be published before Mollie is connected?
- [ ] How to handle refunds when platform fee was already collected?

---

## Changelog

| Date       | Change                   |
| ---------- | ------------------------ |
| 2025-12-29 | Initial document created |
