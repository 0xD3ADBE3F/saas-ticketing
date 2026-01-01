# Platform Analytics & Monitoring

**Status:** 🟨 Partially Complete
**Priority:** Medium
**Estimated Effort:** 20-25 hours (3-4 days)

## Overview

Build comprehensive analytics and monitoring tools for platform administrators to track business metrics, system health, and identify issues proactively.

## Current State

### ✅ Completed (Slice 16 - Basic Dashboard)

- Total organizations count
- Total events count
- Total revenue calculation
- Platform fees collected
- Top 10 organizations by revenue

### ⬜ To Build (Slice 19 - Enhanced Analytics)

- Enhanced business metrics dashboard
- Financial reporting tools
- System health monitoring
- Customer support tools
- Fraud detection

---

## Feature Requirements

### 1. Enhanced Business Metrics Dashboard

**Route:** `/platform/analytics`

#### A) Key Performance Indicators (KPIs)

**Organizations Metrics:**

- Total organizations: 234
  - Active: 198 (84.6%)
  - Suspended: 3 (1.3%)
  - Churned: 33 (14.1%) [no activity in 90 days]
- New orgs this month: +12
- New orgs this week: +3
- MoM growth: +5.4%

**Events Metrics:**

- Total events (all time): 1,456
- Active events (LIVE): 42
- Upcoming events (next 30 days): 78
- Events this month: 156
- Average events per org: 6.2

**Sales Metrics:**

- GMV (Gross Merchandise Value): €234,567
  - This month: €45,678
  - Last month: €38,912 (+17.4%)
- Total tickets sold: 12,345
  - This month: 2,456
  - Average ticket price: €19.00
- Orders completed: 8,234
- Average order value: €28.50

**Revenue Metrics (Platform):**

- Platform fees collected: €8,912
  - This month: €1,567
  - Last month: €1,234 (+27%)
- Service fees collected: €12,345
- Mollie fees (cost): €2,890
- Net platform revenue: €6,022

#### B) Growth Charts

**Time Series Graphs (Chart.js or Recharts):**

- GMV over time (last 12 months)
- New organizations per month (bar chart)
- Active events count (line chart)
- Platform revenue (line chart with trend)

**Filters:**

- Date range: Last 7 days / 30 days / 90 days / 12 months / Custom
- Organization filter: All / By ID
- Event status: All / Live / Ended

---

### 2. Financial Reporting

**Route:** `/platform/financials`

#### A) Revenue Breakdown

**Platform Fees by Organization:**

- Table with columns:
  - Organization Name
  - Total GMV
  - Service Fees Collected
  - Platform Fee (Our Revenue)
  - Mollie Fees (Organisers Cost)
  - Net Revenue
  - Last Payment Date
- Sort by: Revenue (high-low), Organization name
- Export to CSV

**Monthly Financial Summary:**

- Gross revenue by month (table + chart)
- Platform fees by month
- Costs (Mollie fees, infrastructure)
- Net profit
- Export to Excel

#### B) Payout Reconciliation

**Settlements Overview:**

- Link Mollie settlements to events
- Show: Settlement ID, Amount, Status, Date, Related Organizations
- Highlight discrepancies (if any)
- Filter by: Status (pending/completed), Date range

**Outstanding Invoices:**

- List invoices not yet paid
- Total outstanding: €X,XXX
- Group by: Organization, Due date
- Actions: Send reminder, Mark as paid

#### C) MRR Tracking (Future: If Subscription Returns)

- Monthly Recurring Revenue
- Churn rate
- Expansion revenue
- Contraction revenue

---

### 3. System Health Monitoring

**Route:** `/platform/health`

#### A) Failed Payments Dashboard

**Key Metrics:**

- Failed payments (last 24h): 12
- Failed payments (last 7d): 89
- Failed payments (last 30d): 234
- Failure rate: 3.2%

**Failed Payments Table:**
| Order ID | Organization | Amount | Reason | Timestamp | Actions |
|----------|-------------|--------|--------|-----------|---------|
| ORD-123 | Festival ABC | €45.00 | Insufficient funds | 1 Jan 10:23 | [Retry] [Refund] |
| ORD-124 | Theater XYZ | €89.00 | Card expired | 1 Jan 09:15 | [Contact] |

**Filters:**

- Date range
- Failure reason: All / Insufficient funds / Card expired / Technical error
- Organization

**Actions:**

- Manual retry payment
- Contact organization
- Mark as resolved

#### B) Failed Webhooks

**Webhook Monitoring:**

- Failed webhooks (last 24h): 3
- Pending retries: 8
- Max retry attempts reached: 2

**Table:**
| Webhook ID | Event Type | Organization | Attempt | Last Error | Next Retry | Actions |
|------------|-----------|-------------|---------|------------|------------|---------|
| WHK-001 | payment.paid | Festival ABC | 3/5 | Network timeout | In 15 min | [Retry Now] [View Payload] |

**Webhook Details View:**

- Payload (JSON)
- Response history
- Error logs
- Manual retry button

#### C) Scanning Errors

**Metrics:**

- Total scans (last 24h): 1,234
- Failed scans: 45 (3.6%)
- Conflict resolutions: 12

**Error Types:**

- Invalid QR code: 20
- Ticket already used: 15
- Network errors: 10

**Recent Scan Errors Table:**

- Event name
- Ticket ID
- Error type
- Scanner device
- Timestamp
- Actions: View details

#### D) API Performance

**Metrics:**

- Average response time: 245ms
- P95 response time: 890ms
- P99 response time: 1,450ms
- Error rate: 0.3%

**Slow Endpoints (>1s):**

- `/api/payouts` - 1,234ms avg
- `/api/dashboard/stats` - 987ms avg

**Action:** Identify optimization opportunities

#### E) Database Performance

**Connection Pool:**

- Active connections: 8/20
- Idle connections: 12/20
- Queue length: 0

**Slow Queries (>500ms):**

- Query type
- Average duration
- Frequency
- Last occurrence

---

### 4. Customer Support Tools

**Route:** `/platform/support`

#### A) Global Order Search

**Search Bar:**

- Search by:
  - Order ID (ORD-XXX)
  - Buyer email
  - Organization name
  - Ticket QR code
  - Transaction ID

**Results Display:**

- Order details
- Organization (with link to org detail)
- Event details
- Payment status
- Tickets issued
- Actions: View full details, Resend tickets, Refund

#### B) Ticket Lookup

**QR Code Scanner:**

- Paste QR code data or ticket ID
- Returns:
  - Ticket status (valid/used/refunded)
  - Order information
  - Event details
  - Scan history
- Actions: Manual override, Reactivate

#### C) Refund Override

**Use Case:** Customer support needs to issue refund outside normal flow

**Flow:**

1. Search for order
2. Click "Issue Refund"
3. Modal:
   - Reason (required): Dropdown + text field
   - Amount: Full / Partial
   - Refund service fee: Yes / No
4. Confirm
5. Process via Mollie API
6. Create audit log
7. Send confirmation email

**Audit Log Entry:**

```typescript
{
  action: "REFUND_ISSUED_BY_ADMIN",
  orderId: "ORD-123",
  amount: 4500, // cents
  reason: "Organizer request - event cancelled",
  performedBy: superAdminId,
  timestamp: new Date()
}
```

#### D) Communication History (Future)

- All emails sent to organization
- SMS sent (if applicable)
- Support tickets
- Timeline view

---

### 5. Fraud Detection Dashboard

**Route:** `/platform/fraud`

#### A) Suspicious Activity Alerts

**Alert Types:**

- Multiple failed payment attempts (>3 in 1 hour)
- Suspicious scanning patterns (same ticket, different devices)
- High refund rate (>20% of orders)
- Rapid account creation from same IP
- Unusual order patterns (bulk purchases)

**Alerts Table:**
| Alert Type | Organization | Details | Risk Level | Timestamp | Status | Actions |
|------------|-------------|---------|------------|-----------|--------|---------|
| Multiple failed payments | Festival ABC | 8 attempts in 30 min | High | 1 Jan 10:00 | Open | [Investigate] [Dismiss] |
| High refund rate | Theater XYZ | 12/20 orders refunded | Medium | 31 Dec 15:00 | Open | [Contact] [Flag] |

**Risk Levels:**

- Low: Yellow
- Medium: Orange
- High: Red

#### B) Investigation Tools

**Organization Fraud Profile:**

- Total orders
- Refund rate
- Failed payment rate
- Chargebacks
- Reports/complaints
- Account age
- Payment methods used

**Actions:**

- Flag for review
- Suspend account (with reason)
- Add internal note
- Contact organization

#### C) Pattern Detection (Automated)

**Rules Engine:**

```typescript
// Example rules
{
  name: "Multiple failed payments",
  condition: "failedPayments > 5 in 1 hour",
  action: "CREATE_ALERT",
  riskLevel: "HIGH"
}
```

**Configurable Thresholds:**

- Failed payment limit
- Refund rate threshold
- Scan conflict threshold

---

## Technical Implementation

### Database Queries

**Performance Optimizations:**

- Use database views for complex aggregations
- Cache frequently accessed metrics (Redis)
- Background jobs for expensive calculations
- Indexes on timestamp fields for date filtering

**Example View:**

```sql
CREATE MATERIALIZED VIEW platform_metrics_daily AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT organization_id) as active_orgs,
  COUNT(DISTINCT CASE WHEN status = 'PAID' THEN id END) as paid_orders,
  SUM(CASE WHEN status = 'PAID' THEN total ELSE 0 END) as gmv,
  SUM(CASE WHEN status = 'PAID' THEN service_fee ELSE 0 END) as service_fees
FROM orders
GROUP BY DATE(created_at);

-- Refresh daily via cronjob
REFRESH MATERIALIZED VIEW platform_metrics_daily;
```

### Services

**File:** `src/server/services/analyticsService.ts`

```typescript
export const analyticsService = {
  // KPIs
  async getKPIs(dateRange: DateRange): Promise<KPIDashboard>,

  // Growth metrics
  async getGrowthMetrics(
    metric: 'gmv' | 'organizations' | 'events' | 'revenue',
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<TimeSeriesData[]>,

  // Financial reports
  async getRevenueByOrganization(
    dateFrom: Date,
    dateTo: Date
  ): Promise<OrganizationRevenue[]>,

  async getMonthlySummary(
    year: number,
    month: number
  ): Promise<MonthlySummary>,

  // System health
  async getFailedPayments(
    period: '24h' | '7d' | '30d'
  ): Promise<FailedPayment[]>,

  async getFailedWebhooks(): Promise<FailedWebhook[]>,

  async getScanErrors(
    dateFrom: Date,
    dateTo: Date
  ): Promise<ScanError[]>,

  async getAPIPerformance(): Promise<APIMetrics>,

  // Fraud detection
  async getActiveAlerts(): Promise<FraudAlert[]>,

  async createAlert(
    type: AlertType,
    organizationId: string,
    details: Record<string, any>
  ): Promise<FraudAlert>,
};
```

### Background Jobs

**Cronjobs (Daily at 3 AM):**

```typescript
// Calculate and cache metrics
await analyticsService.calculateDailyMetrics();

// Detect fraud patterns
await fraudDetectionService.runPatternDetection();

// Refresh materialized views
await prisma.$executeRaw`REFRESH MATERIALIZED VIEW platform_metrics_daily`;
```

### Caching Strategy

**Redis Keys:**

```
analytics:kpis:30d         TTL: 1 hour
analytics:gmv:monthly      TTL: 6 hours
analytics:failed_payments  TTL: 5 minutes
```

---

## Implementation Checklist

### Phase 1: Enhanced Metrics Dashboard (Day 1-2)

- [ ] Create materialized view for daily metrics
- [ ] Implement `analyticsService.getKPIs()`
- [ ] Build KPI cards component
- [ ] Add growth charts (Chart.js)
- [ ] Implement date range filters
- [ ] Add caching layer

### Phase 2: Financial Reporting (Day 2-3)

- [ ] Build revenue by organization query
- [ ] Create monthly summary aggregation
- [ ] Design financial reports UI
- [ ] Add CSV/Excel export
- [ ] Implement payout reconciliation view

### Phase 3: System Health Monitoring (Day 3-4)

- [ ] Create failed payments dashboard
- [ ] Build failed webhooks monitoring
- [ ] Add scan errors tracking
- [ ] Implement API performance metrics
- [ ] Add database health indicators

### Phase 4: Support Tools (Day 4-5)

- [ ] Build global order search
- [ ] Create ticket lookup tool
- [ ] Implement refund override flow
- [ ] Add audit logging for admin actions

### Phase 5: Fraud Detection (Day 5-6)

- [ ] Design alert rules engine
- [ ] Implement pattern detection
- [ ] Build fraud alerts dashboard
- [ ] Create investigation tools
- [ ] Add email notifications for alerts

### Phase 6: Testing & Optimization (Day 6-7)

- [ ] Load test dashboard with large datasets
- [ ] Optimize slow queries
- [ ] Add indexes
- [ ] Test caching effectiveness
- [ ] Document admin workflows

---

## Success Criteria

- ✅ Dashboard loads in <2 seconds with cached data
- ✅ All financial reports reconcile with Mollie settlements
- ✅ Support tools accessible without cross-tenant data leaks
- ✅ Fraud alerts trigger within 5 minutes of detection
- ✅ Failed webhooks retry automatically
- ✅ API performance metrics update in real-time
- ✅ CSV exports work for all report types

---

## Future Enhancements

- Real-time dashboard updates (WebSockets)
- Custom alert rules (user-configurable)
- Predictive analytics (ML-based)
- Mobile app for key metrics
- Slack/email digest reports
- Anomaly detection
- Churn prediction
