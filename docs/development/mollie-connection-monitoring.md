# Mollie Connection Monitoring & Alerting

## Overview

Organizations with live events **critically depend** on their Mollie connection to receive payments. If the connection breaks, customers cannot buy tickets, resulting in immediate revenue loss. This system proactively monitors connection health and alerts organizations before they lose sales.

## The Problem

Mollie OAuth tokens can become invalid due to:

- Token revocation by the organization
- Changes to OAuth app credentials
- Tokens expiring beyond the refresh window
- Account-level changes in Mollie

Without monitoring, organizations only discover connection issues when:

1. A customer tries to buy a ticket and fails
2. They manually test the connection
3. Sales suddenly stop

**Impact**: For organizations with live events, this means immediate lost revenue.

## The Solution

### 1. Automatic Disconnection with Notification

When a token refresh fails (detected in `mollieConnectService`):

- ✅ Automatically disconnects the organization (clears invalid tokens)
- ✅ **Sends email notification immediately**
- ✅ Provides actionable next steps

```typescript
// In mollieConnectService.ts
if (error instanceof InvalidRefreshTokenError) {
  // Disconnect AND notify admins
  await this.disconnect(organizationId, true); // notifyAdmins = true
  throw new Error("Mollie connection is no longer valid...");
}
```

### 2. Proactive Health Monitoring (Cron Job)

**Frequency**: Every 6 hours
**Route**: `/api/cron/check-mollie-connections`
**Authentication**: Requires `CRON_SECRET` header

Checks all organizations with Mollie connected and:

- Verifies connection is still valid
- Identifies organizations with **live events** (highest priority)
- Sends email notifications for invalid connections
- Logs all findings for monitoring

### 3. Email Notifications

**Urgency Levels**:

- 🚨 **URGENT**: Organization has live events (customers cannot buy tickets NOW)
- ⚠️ **Warning**: Organization connected but no live events yet

**Email Recipients**:

- `billingEmail` (preferred)
- Falls back to `email` if billingEmail not set

**Email Content**:

- Clear explanation of what happened
- Impact assessment (especially if live events exist)
- One-click link to reconnect
- Visual urgency indicators (red/orange styling)

Example urgent email for org with live events:

```
Subject: 🚨 URGENT: Mollie verbinding verbroken - [Organization Name]

⚠️ Je organisatie heeft actieve evenementen waarbij klanten
   nu geen tickets kunnen kopen!

[Prominent CTA: "🔗 Verbind Mollie Opnieuw"]
```

### 4. Dashboard Health Indicator

**Component**: `<MollieConnectionHealth />`
**Location**: Should be added to dashboard layout

Visual status based on organization state:

#### Connected with Live Events (High Priority)

```
✓ Mollie verbonden - betalingen actief
Je hebt actieve evenementen waarbij klanten tickets kunnen kopen
[Test Verbinding]
```

- Green background
- Prominent placement
- Quick test button

#### Connected without Live Events

```
✓ Mollie verbonden [Test]
```

- Subtle text indicator
- Less prominent (no revenue risk)

#### Not Connected

```
⚠️ Mollie niet verbonden. Je kunt geen betalingen ontvangen.
[Verbinden]
```

- Red alert
- Clear call-to-action

### 5. Real-time Connection Testing

**Route**: `/api/organizations/[id]/mollie/test`

Users can manually test connection health. If test fails:

- Returns `needsReconnect: true` flag
- Dashboard shows reconnect button
- Consistent UX with automatic monitoring

## Architecture

### Service: `mollieMonitoringService.ts`

**Key Functions**:

```typescript
// Send email notification about connection failure
notifyConnectionFailure(organizationId: string): Promise<void>

// Check all connected organizations (for cron)
checkAllConnections(): Promise<ConnectionHealthCheck[]>

// Get status for dashboard display
getConnectionStatus(organizationId: string): Promise<{
  isConnected: boolean;
  hasLiveEvents: boolean;
  lastChecked: Date;
}>
```

**Design Decisions**:

- Uses organization/billing email (reliable, no Supabase auth needed)
- Checks for live events to prioritize urgency
- Lazy Resend initialization for testability

### Cron Job: `check-mollie-connections/route.ts`

**Schedule**: `0 */6 * * *` (every 6 hours)

Why 6 hours?

- ✅ Frequent enough to catch issues quickly
- ✅ Not too frequent (avoid rate limits/spam)
- ✅ Organizations get ~4 notifications/day max if issue persists
- ✅ Aligns with business hours (2am, 8am, 2pm, 8pm)

Returns metrics:

```json
{
  "success": true,
  "checked": 45,
  "invalid": 2,
  "liveEventIssues": 1,
  "durationMs": 1234,
  "timestamp": "2026-01-03T12:00:00Z"
}
```

### Component: `MollieConnectionHealth.tsx`

**Features**:

- Auto-refreshes every 5 minutes
- Manual test connection button
- Shows live events status
- Responsive error messages
- Handles reconnect flow

**Usage**:

```tsx
import { MollieConnectionHealth } from "@/components/dashboard/MollieConnectionHealth";

// In dashboard layout or settings page
<MollieConnectionHealth organizationId={org.id} />;
```

## API Endpoints

### GET `/api/organizations/[id]/mollie/health`

Returns current connection status for dashboard display.

**Response**:

```json
{
  "isConnected": true,
  "hasLiveEvents": true,
  "lastChecked": "2026-01-03T12:00:00Z"
}
```

### POST `/api/organizations/[id]/mollie/test`

Tests connection by calling Mollie API.

**Response on failure**:

```json
{
  "success": false,
  "error": "Mollie connection is no longer valid...",
  "needsReconnect": true
}
```

### GET `/api/cron/check-mollie-connections`

Cron job for proactive monitoring (requires CRON_SECRET).

## Configuration

### Environment Variables

```bash
# Required for email notifications
RESEND_API_KEY=re_xxxxx

# Required for cron authentication
CRON_SECRET=your-secret-key

# Base URL for email links
NEXT_PUBLIC_APP_URL=https://getentro.app
```

### Vercel Cron Setup

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-mollie-connections",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## Testing

### Unit Tests

```bash
npm test mollieMonitoring.test.ts
```

**Coverage**:

- ✅ Email notifications sent with correct urgency
- ✅ Live events detection
- ✅ Fallback when no contact emails
- ✅ Connection status retrieval
- ✅ Error handling

### Manual Testing

1. **Simulate invalid token**:

   ```sql
   -- In database, set invalid refresh token
   UPDATE organizations
   SET "mollieRefreshToken" = 'invalid_token'
   WHERE id = 'test-org-id';
   ```

2. **Trigger check**:

   ```bash
   curl -X GET http://localhost:3000/api/cron/check-mollie-connections \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

3. **Verify email sent** (check Resend dashboard or logs)

4. **Test dashboard component**:
   - Visit `/dashboard`
   - Should show alert with reconnect button
   - Click "Test Verbinding" - should show error

## Deployment Checklist

- [ ] Set `RESEND_API_KEY` in Vercel environment variables
- [ ] Set `CRON_SECRET` in Vercel environment variables
- [ ] Verify cron job is configured in `vercel.json`
- [ ] Test email delivery in production (Resend domain must be verified)
- [ ] Add `<MollieConnectionHealth />` to dashboard layout
- [ ] Monitor cron job logs after deployment

## Monitoring & Alerts

### Metrics to Track

- **Connection check success rate**: Should be >99%
- **Invalid connections detected**: Spikes indicate issues
- **Email delivery rate**: Monitor via Resend
- **Live event impact**: Track how many orgs with live events affected

### Logs to Monitor

```bash
# Successful check
[Mollie Monitor] Health check complete in 1234ms - 45 total, 0 invalid, 0 with live events

# Invalid connection detected
[Mollie Monitor] ⚠️ Invalid connection for Organization X (live events: true)

# Notification sent
[Mollie Monitor] Sent connection failure email to Organization X (1 recipients)
```

## User Flow

### Scenario: Token Expires

1. **Customer tries to buy ticket** → Payment fails
2. **System detects invalid token** during checkout
3. **Automatic actions**:
   - Organization disconnected immediately
   - Email sent to billing/organization email
   - Dashboard shows alert
4. **Organization receives email**:
   - Clear urgency indicator if live events exist
   - One-click link to reconnect
5. **Organization clicks "Verbind Mollie Opnieuw"**:
   - Redirected to OAuth flow
   - Connects in ~30 seconds
   - System works again

### Scenario: Proactive Detection (Before Customer Impact)

1. **Cron job runs** (every 6 hours)
2. **Detects invalid token** before any customer tries to buy
3. **Email sent immediately**
4. **Organization reconnects** before losing sales
5. **No customer impact** ✅

## Future Enhancements

### High Priority

- [ ] Dashboard notification banner (in addition to email)
- [ ] Slack/webhook integration for real-time alerts
- [ ] Track disconnection reasons (analytics)

### Medium Priority

- [ ] Retry logic for transient Mollie API errors
- [ ] Connection health history/logs in dashboard
- [ ] Proactive token refresh (before expiry)

### Low Priority

- [ ] Multiple notification emails per org
- [ ] Email preferences (opt-out for orgs without live events)
- [ ] SMS alerts for critical orgs

## Troubleshooting

### Emails Not Sending

1. Check `RESEND_API_KEY` is set
2. Verify domain in Resend is verified
3. Check organization has `email` or `billingEmail` set
4. Review Resend dashboard for delivery status

### Cron Not Running

1. Verify `vercel.json` has correct cron config
2. Check `CRON_SECRET` is set
3. View cron logs in Vercel dashboard
4. Manually trigger: `curl -X GET [url] -H "Authorization: Bearer $CRON_SECRET"`

### Dashboard Not Showing Status

1. Ensure `<MollieConnectionHealth />` component is added to layout
2. Check browser console for API errors
3. Verify `/api/organizations/[id]/mollie/health` returns 200
4. Check user has membership for organization

## Related Documentation

- [Mollie Token Refresh Fix](./mollie-token-refresh-fix.md) - Error handling implementation
- [MOLLIE_PLATFORM.md](../MOLLIE_PLATFORM.md) - Overall Mollie integration architecture
- [Email Service](../../src/server/services/emailService.ts) - Resend email configuration
