# Platform Admin - Organizations Management

**Status:** 🟨 Partially Complete
**Priority:** Medium
**Estimated Effort:** 15-20 hours (2-3 days)

## Overview

Build comprehensive organization management tools for platform administrators (SuperAdmins) to oversee all organizations, support customers, and manage platform operations.

## Current State

### ✅ Completed (Slice 16)

- SuperAdmin role model and database tables
- SuperAdmin authentication (`getSuperAdmin`, `isSuperAdmin`)
- Platform route protection (`/platform/*`)
- Audit log infrastructure
- Platform dashboard with basic metrics:
  - Total organizations count
  - Total events count
  - Total revenue
  - Platform fees collected
  - Top 10 organizations by revenue
- Super admin creation script

### ⬜ To Build (Slice 17)

- Organizations list page with search/filters
- Organization detail view
- Organization actions (suspend, reset password, impersonate)
- Enhanced filtering and reporting

---

## Feature Requirements

### 1. Organizations List Page

**Route:** `/platform/organizations`

**UI Components:**

**Search & Filters:**

- Text search: Organization name, email, Mollie profile ID
- Status filter: Active / Suspended / All
- Onboarding status: Complete / Incomplete / Pending
- Date filter: Created date range
- Sort: Name (A-Z), Revenue (high-low), Created date (recent-old)

**Table Columns:**
| Name | Contact Email | Status | Mollie Status | Events | Revenue | Created | Actions |
|------|--------------|--------|---------------|---------|---------|---------|---------|
| Festival ABC | contact@abc.nl | Active | Connected | 5 | €2,340 | 1 Dec | [View] [•••] |
| Theater XYZ | info@xyz.nl | Active | Pending | 2 | €890 | 15 Dec | [View] [•••] |

**Status Badges:**

- Active: Green
- Suspended: Red
- Onboarding: Yellow

**Actions Menu (•••):**

- View Details
- Suspend Account
- Unsuspend Account
- Force Password Reset
- Impersonate (Support Mode)
- Add Internal Note

**Pagination:**

- 25 items per page
- Load more / pagination controls

---

### 2. Organization Detail View

**Route:** `/platform/organizations/[id]`

**Sections:**

#### A) Overview Card

- Organization name
- Contact email
- Billing email (if different)
- VAT number
- Created date
- Last active date
- Current status (Active/Suspended)

#### B) Mollie Integration Status

- Connection status: Connected / Pending / Not Started
- Profile ID: `prf_xxxxx`
- Onboarding status: Needs Data / In Review / Completed
- OAuth token status: Valid / Expired
- Last token refresh: timestamp
- Action: "Force Token Refresh"

#### C) Events Statistics

- Total events: 12
- Live events: 3
- Draft events: 5
- Ended events: 4
- Total tickets sold: 456
- Total revenue: €8,920

#### D) Financial Summary

- Gross revenue (ticket sales)
- Service fees collected
- Platform fees (our revenue)
- Net payout to organizer
- Outstanding invoices
- Last payout date

#### E) Recent Activity

- Last login
- Last event created
- Last order placed
- Last ticket scan
- Recent actions (audit log)

#### F) Admin Actions

- Suspend Account (requires reason)
- Unsuspend Account
- Force Password Reset
- Impersonate User (support mode)
- Add Internal Note
- View Audit Log

#### G) Internal Notes

- Private notes visible only to SuperAdmins
- Timestamps + admin user who added note
- Use cases: Support tickets, special agreements, issues

---

### 3. Organization Actions

#### A) Suspend Account

**Behavior:**

- Set `organization.status = 'SUSPENDED'`
- Block new orders (checkout returns 403)
- Block ticket scanning (scanner shows error)
- Block event publishing (cannot change DRAFT → LIVE)
- Existing tickets remain scannable (allow attendees to enter)
- Admin can still access dashboard (read-only)

**UI Flow:**

1. Click "Suspend Account"
2. Modal: "Why are you suspending this organization?"
   - Reason dropdown: Payment Issues / Terms Violation / Fraud Suspected / Other
   - Required text field: Detailed explanation
3. Confirm button: "Suspend Account"
4. Create audit log entry
5. Send email notification to organization

**Database:**

```prisma
model Organization {
  // ... existing fields
  status String @default("ACTIVE") // ACTIVE | SUSPENDED
}
```

**Audit Log:**

```typescript
{
  action: "ORGANIZATION_SUSPENDED",
  targetId: organizationId,
  performedBy: superAdminId,
  reason: "Payment issues - chargebacks",
  timestamp: new Date()
}
```

---

#### B) Force Password Reset

**Behavior:**

- Invalidate all active sessions
- Send password reset email
- User must create new password to login

**UI Flow:**

1. Click "Force Password Reset"
2. Confirmation modal
3. Call Supabase Admin API: `updateUserById({ password_reset: true })`
4. Create audit log entry
5. Email sent automatically by Supabase

---

#### C) Impersonate User (Support Mode)

**Behavior:**

- SuperAdmin logs in as organization admin
- Access full dashboard as if logged in as them
- Banner at top: "⚠️ Support Mode - Viewing as [Organization Name]"
- All actions audited with SuperAdmin + impersonation flag
- Exit button returns to platform admin

**UI Flow:**

1. Click "Impersonate"
2. Confirmation modal with warning
3. Create audit log: `IMPERSONATION_STARTED`
4. Generate special JWT with `impersonatedBy: superAdminId`
5. Redirect to `/dashboard` with banner
6. "Exit Support Mode" button → back to platform admin

**Security:**

- Require re-authentication before impersonation
- Time limit: 60 minutes max
- All actions logged with `impersonatedBy` field
- Cannot modify SuperAdmin settings while impersonating

---

#### D) Add Internal Note

**Database:**

```prisma
model OrganizationNote {
  id             String   @id @default(uuid())
  organizationId String
  superAdminId   String
  note           String   @db.Text
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id])
  superAdmin   SuperAdmin   @relation(fields: [superAdminId], references: [id])

  @@index([organizationId])
}
```

**UI:**

- Text area: "Add internal note"
- Submit button
- Display notes in reverse chronological order
- Show: Admin name, timestamp, note text

---

### 4. Onboarding Status Tracking

**Checklist Items:**

- [ ] Email verified
- [ ] Mollie connected
- [ ] Mollie KYC completed
- [ ] First event created
- [ ] First ticket type created
- [ ] First event published (LIVE)
- [ ] First ticket sold

**Display:**

- Organization detail page: Progress bar (5/7 complete)
- Organizations list: Badge "Setup Incomplete" if <100%

**Use Cases:**

- Identify stuck onboardings
- Proactive support outreach
- Conversion funnel analysis

---

## Technical Implementation

### Database Migrations

```sql
-- Migration: add_organization_status_and_notes

-- Add status field
ALTER TABLE organizations
  ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX idx_organizations_status ON organizations(status);

-- Create internal notes table
CREATE TABLE organization_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  super_admin_id UUID NOT NULL REFERENCES super_admins(id),
  note TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organization_notes_org_id ON organization_notes(organization_id);
CREATE INDEX idx_organization_notes_created_at ON organization_notes(created_at DESC);
```

### Services

**File:** `src/server/services/platformAdminService.ts`

```typescript
export const platformAdminService = {
  // List organizations with filters
  async listOrganizations(params: {
    search?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'ALL';
    mollieStatus?: 'CONNECTED' | 'PENDING' | 'NOT_STARTED';
    dateFrom?: Date;
    dateTo?: Date;
    sortBy?: 'name' | 'revenue' | 'createdAt';
    page?: number;
    limit?: number;
  }): Promise<{ organizations: Organization[]; total: number }>,

  // Get single organization with full details
  async getOrganizationDetails(orgId: string): Promise<OrganizationDetails>,

  // Actions
  async suspendOrganization(
    orgId: string,
    reason: string,
    performedBy: string
  ): Promise<void>,

  async unsuspendOrganization(
    orgId: string,
    performedBy: string
  ): Promise<void>,

  async forcePasswordReset(
    orgId: string,
    performedBy: string
  ): Promise<void>,

  async startImpersonation(
    orgId: string,
    superAdminId: string
  ): Promise<string>, // Returns impersonation token

  async endImpersonation(token: string): Promise<void>,

  // Internal notes
  async addNote(
    orgId: string,
    note: string,
    superAdminId: string
  ): Promise<OrganizationNote>,

  async getNotes(orgId: string): Promise<OrganizationNote[]>,
};
```

### Middleware: Check Suspension

**File:** `src/server/middleware/checkOrganizationStatus.ts`

```typescript
export async function checkOrganizationStatus(orgId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { status: true },
  });

  if (org?.status === "SUSPENDED") {
    throw new Error("Organization is suspended");
  }

  return true;
}
```

**Usage:** Call in:

- Order creation (checkout)
- Event publishing
- Scanner authentication

---

## Implementation Checklist

### Phase 1: Database & Core Services (Day 1)

- [ ] Add `status` field to Organization model
- [ ] Create `OrganizationNote` model
- [ ] Run migrations
- [ ] Implement `platformAdminService`
- [ ] Add suspension check middleware
- [ ] Update order/event/scanner services with suspension checks

### Phase 2: Organizations List (Day 2)

- [ ] Create `/platform/organizations` page
- [ ] Build search and filter UI
- [ ] Implement table with pagination
- [ ] Add actions dropdown menu
- [ ] Connect to backend service

### Phase 3: Organization Detail View (Day 2-3)

- [ ] Create `/platform/organizations/[id]` page
- [ ] Build overview card
- [ ] Add Mollie status section
- [ ] Display events and financial statistics
- [ ] Show recent activity
- [ ] Add admin actions panel

### Phase 4: Admin Actions (Day 3)

- [ ] Implement suspend/unsuspend with modal + reason
- [ ] Build force password reset flow
- [ ] Create impersonation system with JWT
- [ ] Add internal notes UI
- [ ] Create audit log entries for all actions

### Phase 5: Testing & Polish (Day 4)

- [ ] Unit tests: Suspension blocks orders/scans
- [ ] Integration tests: Impersonation creates audit logs
- [ ] E2E test: Full organization management flow
- [ ] Test permission checks (non-SuperAdmins blocked)
- [ ] Document admin workflows

---

## Security Considerations

1. **Impersonation Audit Trail:**
   - Every action during impersonation must log `impersonatedBy`
   - Time limit enforcement (60 min max)
   - Re-authentication required before starting

2. **Suspension Edge Cases:**
   - Active orders during suspension: Allow completion
   - Existing tickets: Allow scanning (don't penalize attendees)
   - Webhook processing: Continue (financial reconciliation)

3. **Data Access:**
   - SuperAdmins see all organization data
   - Regular admins cannot access `/platform/*` routes
   - Audit logs cannot be deleted (append-only)

4. **Permission Checks:**
   - Every platform route: `await requireSuperAdmin()`
   - All mutations: Audit log created
   - Cannot delete organizations with order history

---

## Success Criteria

- ✅ SuperAdmin can view list of all organizations
- ✅ Search and filters work correctly
- ✅ Organization detail shows comprehensive info
- ✅ Suspend action blocks orders and scans
- ✅ Impersonation creates audit trail
- ✅ Cannot delete orgs with order history
- ✅ All admin actions logged
- ✅ Email notifications sent for suspensions

---

## Future Enhancements

- Bulk actions (suspend multiple orgs)
- Organization tags/categories
- Custom fee schedules per organization
- Support ticket integration
- Communication history (emails sent)
- Financial reconciliation tools
