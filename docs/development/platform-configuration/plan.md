# Platform Configuration Management

**Status:** 🟨 Partially Complete
**Priority:** Low
**Estimated Effort:** 10-15 hours (1-2 days)

## Overview

Build platform-level configuration management tools for SuperAdmins to control global settings, fee structures, email templates, and feature flags.

## Current State

### ✅ Completed

- Platform routes (`/platform/*`)
- SuperAdmin authentication
- Basic dashboard layout

### ⬜ To Build (Slice 20)

- Global settings management UI
- Email template editor
- Feature flags system
- Maintenance mode controls
- Rate limit configuration

---

## Feature Requirements

### 1. Global Settings Management

**Route:** `/platform/settings`

#### A) Default Fee Configuration

**Current Implementation:**

```typescript
// src/server/lib/fees.ts
export const SERVICE_FEE_CONFIG = {
  fixedFee: 50, // €0.50 in cents
  percentageFee: 2, // 2%
  minimumFee: 50, // €0.50
  maximumFee: 500, // €5.00
};
```

**UI Requirements:**

- Form to edit default values
- Preview calculation with example orders
- Validation: min <= max, percentage 0-100
- Save button with confirmation
- Audit log: Track who changed settings + when

**Display:**

```
Default Service Fee Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fixed Fee:       €0.50
Percentage Fee:  2%
Minimum Fee:     €0.50
Maximum Fee:     €5.00

Preview:
- Order €10.00: Service fee = €0.50
- Order €50.00: Service fee = €1.50
- Order €300.00: Service fee = €5.00 (capped)

[Edit Configuration]
```

**Implementation:**

- Store in database table: `platform_settings`
- Cache in Redis for performance
- Invalidate cache on update
- Fallback to hardcoded defaults if DB unavailable

#### B) Payment Provider Settings

**Mollie OAuth Configuration:**

- Client ID: `app_xxxxx`
- Client Secret: `********` (masked)
- Redirect URI: `https://app.entro.nl/api/mollie/callback`
- Webhook URL: `https://app.entro.nl/api/webhooks/mollie`
- Status: Connected / Not Connected

**Actions:**

- Test connection
- Rotate client secret
- View webhook logs

**Security:**

- Secrets stored encrypted in database
- Only SuperAdmins can view/edit
- Changes create audit log entry

#### C) Email Configuration

**SMTP/Resend Settings:**

- Provider: Resend
- API Key: `re_xxxxxxx` (masked)
- From Address: `noreply@entro.nl`
- From Name: `Entro`
- Status: Active / Inactive

**Test Email:**

- Button: "Send Test Email"
- Recipient: SuperAdmin email
- Verifies configuration works

---

### 2. Email Templates Management

**Route:** `/platform/settings/email-templates`

#### Templates to Manage

**A) Order Confirmation**

- Subject: "Bestelling bevestiging - {{eventTitle}}"
- Variables: `{{buyerName}}`, `{{eventTitle}}`, `{{orderTotal}}`, `{{orderNumber}}`
- Preview with sample data

**B) Ticket Delivery**

- Subject: "Je tickets voor {{eventTitle}}"
- Variables: `{{buyerEmail}}`, `{{eventTitle}}`, `{{ticketCount}}`, `{{qrCodes}}`
- Includes QR codes

**C) Refund Notification**

- Subject: "Terugbetaling bevestiging - {{eventTitle}}"
- Variables: `{{refundAmount}}`, `{{reason}}`, `{{eventTitle}}`

**D) Organizer Welcome**

- Subject: "Welkom bij Entro!"
- Sent on first organization creation
- Variables: `{{organizationName}}`, `{{adminName}}`

**E) Payment Reminder (Future)**

- Subject: "Betaalherinnering - {{invoiceNumber}}"
- Sent 7 days before due date
- Variables: `{{organizationName}}`, `{{amount}}`, `{{dueDate}}`

#### Template Editor UI

**Components:**

- Template selector dropdown
- Subject line input
- Rich text editor (TipTap or similar)
- Variable inserter (dropdown with available variables)
- Preview panel (live rendering with sample data)
- Test send button (send to own email)
- Save button
- Revert to default button

**Preview:**

```
Subject: Bestelling bevestiging - Festival XYZ

Hi John Doe,

Bedankt voor je bestelling!

Evenement: Festival XYZ
Datum: 15 januari 2026
Aantal tickets: 2
Totaal: €45.00

[Button: Bekijk je tickets]

Met vriendelijke groet,
Het Entro Team
```

**Data Model:**

```prisma
model EmailTemplate {
  id            String   @id @default(uuid())
  type          EmailTemplateType @unique
  subject       String
  bodyHtml      String   @db.Text
  bodyText      String   @db.Text // Plain text fallback
  variables     Json     // Available variables
  updatedAt     DateTime @updatedAt
  updatedBy     String?  // SuperAdmin ID
}

enum EmailTemplateType {
  ORDER_CONFIRMATION
  TICKET_DELIVERY
  REFUND_NOTIFICATION
  ORGANIZER_WELCOME
  PAYMENT_REMINDER
}
```

---

### 3. Feature Flags System

**Route:** `/platform/settings/feature-flags`

#### Purpose

Control feature rollout without code deploys

#### Flag Types

**A) Global Flags (Platform-wide)**

- `MOLLIE_INVOICING_ENABLED` - Enable Sales Invoice API
- `VAT_HANDLING_ENABLED` - Show VAT configuration UI
- `MAINTENANCE_MODE` - Show maintenance banner
- `NEW_DASHBOARD_UI` - A/B test new dashboard design

**B) Organization-level Flags**

- Can enable feature for specific organizations
- Gradual rollout strategy
- Beta testing with select customers

**UI:**

```
Feature Flags
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[✓] Mollie Invoicing
    Status: Enabled globally
    [Disable]

[✗] New Dashboard UI
    Status: Beta testing
    Enabled for: 5 organizations
    [Manage Access]

[✗] Advanced Analytics
    Status: In development
    Enabled for: Platform admins only
    [Enable]
```

**Data Model:**

```prisma
model FeatureFlag {
  id                  String   @id @default(uuid())
  key                 String   @unique // SNAKE_CASE identifier
  name                String   // Display name
  description         String?
  enabledGlobally     Boolean  @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Organizations with access (if not globally enabled)
  organizations OrganizationFeatureAccess[]
}

model OrganizationFeatureAccess {
  id             String       @id @default(uuid())
  organizationId String
  featureFlagId  String
  enabledAt      DateTime     @default(now())
  enabledBy      String?      // SuperAdmin ID

  organization   Organization @relation(fields: [organizationId], references: [id])
  featureFlag    FeatureFlag  @relation(fields: [featureFlagId], references: [id])

  @@unique([organizationId, featureFlagId])
}
```

**Usage in Code:**

```typescript
// Check feature flag
const isEnabled = await featureFlagService.isEnabled(
  "VAT_HANDLING_ENABLED",
  organizationId
);

if (isEnabled) {
  // Show VAT configuration UI
}
```

---

### 4. Maintenance Mode

**Route:** `/platform/settings/maintenance`

#### Purpose

Display maintenance banner to organizers without full downtime

#### Configuration

**Maintenance Banner:**

- Enabled: Yes / No
- Message: Custom text (max 200 chars)
- Link URL: Optional (e.g., status page)
- Link Text: Optional
- Show from: DateTime
- Show until: DateTime

**Example Banner:**

```
⚠️ Scheduled maintenance: 2 Jan 02:00-04:00 (UTC+1)
   Some features may be unavailable.
   [View Status Page]
```

**Affected Areas:**

- Shown on all organizer dashboard pages
- NOT shown on public event pages (buyers unaffected)
- NOT shown to platform admins

**Emergency Mode:**

- Toggle: "Enable Emergency Maintenance"
- Blocks all organizer actions (read-only)
- Public event pages still work
- Checkout still works (critical path)

**Data Model:**

```prisma
model MaintenanceWindow {
  id          String   @id @default(uuid())
  enabled     Boolean  @default(false)
  message     String
  linkUrl     String?
  linkText    String?
  startAt     DateTime
  endAt       DateTime
  emergency   Boolean  @default(false)
  createdBy   String   // SuperAdmin ID
  createdAt   DateTime @default(now())
}
```

---

### 5. Rate Limit Configuration

**Route:** `/platform/settings/rate-limits`

#### Configurable Limits

**Scanning Endpoints:**

- `/api/scanner/scan`
  - Default: 60 requests/minute per device
  - Burst: 120 requests
- `/api/scanner/sync`
  - Default: 10 requests/minute per device

**Checkout Endpoints:**

- `/api/checkout/create-order`
  - Default: 10 requests/minute per IP
- `/api/checkout/payment`
  - Default: 5 requests/minute per IP

**Webhook Endpoints:**

- `/api/webhooks/mollie`
  - Default: 100 requests/minute
  - Trusted source (Mollie IPs only)

**UI:**

```
Rate Limits Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scanner Endpoints
- Scan:  60 req/min per device  [Edit]
- Sync:  10 req/min per device  [Edit]

Checkout Endpoints
- Create Order: 10 req/min per IP  [Edit]
- Payment: 5 req/min per IP  [Edit]

[Save Changes] [Reset to Defaults]
```

**Implementation:**

- Use Redis for rate limiting (atomic counters)
- Key format: `ratelimit:{endpoint}:{identifier}:{window}`
- TTL: 60 seconds
- Return `429 Too Many Requests` when exceeded

**Library:** `@upstash/ratelimit` or custom Redis implementation

---

## Technical Implementation

### Database Schema

```sql
-- Platform settings (key-value store)
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES super_admins(id)
);

-- Cache frequently accessed settings
CREATE INDEX idx_platform_settings_key ON platform_settings(key);
```

### Services

**File:** `src/server/services/platformSettingsService.ts`

```typescript
export const platformSettingsService = {
  // Get setting (with caching)
  async get<T>(key: string): Promise<T | null>,

  // Update setting
  async set<T>(
    key: string,
    value: T,
    updatedBy: string
  ): Promise<void>,

  // Get all settings
  async getAll(): Promise<Record<string, any>>,

  // Feature flags
  async isFeatureEnabled(
    flagKey: string,
    organizationId?: string
  ): Promise<boolean>,

  async enableFeatureForOrg(
    flagKey: string,
    organizationId: string,
    enabledBy: string
  ): Promise<void>,

  // Email templates
  async getEmailTemplate(
    type: EmailTemplateType
  ): Promise<EmailTemplate>,

  async updateEmailTemplate(
    type: EmailTemplateType,
    subject: string,
    bodyHtml: string,
    updatedBy: string
  ): Promise<void>,

  // Maintenance
  async isMaintenanceMode(): Promise<boolean>,

  async getMaintenanceWindow(): Promise<MaintenanceWindow | null>,

  async setMaintenanceMode(
    enabled: boolean,
    message: string,
    startAt: Date,
    endAt: Date,
    createdBy: string
  ): Promise<void>,
};
```

### Caching Strategy

**Redis Keys:**

```
settings:SERVICE_FEE_CONFIG       TTL: 1 hour
settings:MOLLIE_CONFIG            TTL: 1 hour
featureflag:VAT_HANDLING_ENABLED  TTL: 5 minutes
maintenance:active                TTL: 1 minute
```

**Cache Invalidation:**

- On setting update: delete cache key
- On feature flag toggle: delete cache key
- On maintenance window change: delete cache key

---

## Implementation Checklist

### Phase 1: Database & Core Services (Day 1)

- [ ] Create `platform_settings` table
- [ ] Create `feature_flags` tables
- [ ] Create `email_templates` table
- [ ] Create `maintenance_windows` table
- [ ] Implement `platformSettingsService`
- [ ] Add caching layer (Redis)

### Phase 2: Settings UI (Day 1-2)

- [ ] Create `/platform/settings` page
- [ ] Build fee configuration form
- [ ] Add payment provider settings
- [ ] Add email configuration
- [ ] Implement test connections

### Phase 3: Email Templates (Day 2)

- [ ] Create `/platform/settings/email-templates` page
- [ ] Build template editor with rich text
- [ ] Add variable inserter
- [ ] Implement preview panel
- [ ] Add test send functionality

### Phase 4: Feature Flags (Day 2-3)

- [ ] Create `/platform/settings/feature-flags` page
- [ ] Build flag toggle UI
- [ ] Implement organization-level access
- [ ] Add usage tracking
- [ ] Update codebase to check flags

### Phase 5: Maintenance & Rate Limits (Day 3)

- [ ] Create maintenance mode UI
- [ ] Build maintenance banner component
- [ ] Implement emergency mode
- [ ] Add rate limit configuration UI
- [ ] Implement rate limiting middleware

### Phase 6: Testing (Day 3)

- [ ] Test settings persistence
- [ ] Test cache invalidation
- [ ] Test feature flag rollout
- [ ] Test maintenance mode display
- [ ] Document admin workflows

---

## Success Criteria

- ✅ Settings changes persist correctly
- ✅ Cache invalidates on updates
- ✅ Feature flags control feature visibility
- ✅ Email templates render correctly
- ✅ Maintenance banner shows at correct times
- ✅ Rate limits prevent abuse
- ✅ All changes create audit log entries

---

## Future Enhancements

- Role-based settings access (not just SuperAdmin)
- Settings versioning/history
- A/B testing framework
- Scheduled setting changes
- Settings export/import
- Multi-environment sync (staging → production)
