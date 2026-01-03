# Platform Token Health Monitoring - Implementation Summary

**Date:** 2026-01-03
**Issue:** Platform token expired causing client link creation failures
**Solution:** Comprehensive health monitoring and automatic token refresh

---

## What Was Implemented

### 1. Platform Health Service (`molliePlatformHealthService.ts`)

**Location:** `src/server/services/molliePlatformHealthService.ts`

**Features:**

- Health check via lightweight Mollie API call (`/v2/organization/me`)
- Automatic token refresh when expired (401 Unauthorized)
- Health status persistence in `platform_settings` table
- Platform authorization URL generation
- Attention monitoring (needs manual intervention check)

**Key Methods:**

```typescript
checkHealth(): Promise<PlatformHealthStatus>
attemptTokenRefresh(): Promise<boolean>
getHealthStatus(): Promise<PlatformHealthStatus | null>
getPlatformAuthUrl(): string
needsAttention(): Promise<boolean>
```

### 2. Cron Job Endpoint

**Location:** `src/app/api/cron/check-platform-connection/route.ts`

**Schedule:** Every 6 hours (`0 */6 * * *`)

**Responsibilities:**

- Verify platform token validity
- Attempt automatic refresh if expired
- Log urgent warnings if manual re-auth needed
- Store health status in database

**Authentication:** Requires `CRON_SECRET` header

### 3. Integration into Onboarding Service

**Location:** `src/server/services/mollieOnboardingService.ts`

**Changes:**

- Added health check before creating client links
- Removed duplicate token refresh logic
- Clearer error messages with re-authorization URLs
- Simplified error handling

### 4. Platform Dashboard Component

**Location:** `src/components/platform/PlatformHealthStatus.tsx`

**Displays:**

- Connection status (Healthy/Unhealthy)
- Last checked timestamp
- Last successful token refresh
- Token expiry time
- Error messages with actionable steps
- Re-authorization link when needed

**Integrated in:** `/platform` page

### 5. Documentation

**Updated:** `docs/MOLLIE_PLATFORM.md`

**Added Sections:**

- Platform Token Management overview
- Health Monitoring architecture
- Token Refresh Process
- Troubleshooting guide
- Environment variables documentation

### 6. Configuration

**Updated:** `vercel.json`

Added cron job configuration:

```json
{
  "path": "/api/cron/check-platform-connection",
  "schedule": "0 */6 * * *"
}
```

### 7. Tests

**Location:** `tests/platformHealth.test.ts`

**Coverage:**

- Health check with valid token
- Health check with expired token (automatic refresh)
- Failed refresh scenario
- Network error handling
- OAuth URL generation
- Attention monitoring logic

---

## How It Works

### Health Check Flow

```
┌─────────────────┐
│  Cron Job       │
│  (Every 6h)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Check Platform Health              │
│  GET /v2/organization/me            │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │  200?   │
    └────┬────┘
         │
    ┌────▼─────────────┐     ┌─────────────────┐
    │   YES (Healthy)  │     │  NO (401)       │
    └────┬─────────────┘     └────┬────────────┘
         │                         │
         ▼                         ▼
    ┌─────────────┐         ┌──────────────────┐
    │Store Status │         │ Attempt Refresh  │
    └─────────────┘         └────┬─────────────┘
                                 │
                            ┌────▼────┐
                            │Success? │
                            └────┬────┘
                                 │
                    ┌────────────┴──────────┐
                    │                       │
                ┌───▼───┐              ┌───▼────┐
                │  YES  │              │   NO   │
                └───┬───┘              └───┬────┘
                    │                      │
                    ▼                      ▼
            ┌──────────────┐      ┌────────────────┐
            │Store Success │      │  Alert: Manual │
            │   Status     │      │  Re-auth Needed│
            └──────────────┘      └────────────────┘
```

### Integration Flow

```
Organization → Create Client Link
                      │
                      ▼
              Check Platform Health
                      │
                 ┌────┴────┐
                 │Healthy? │
                 └────┬────┘
                      │
              ┌───────┴──────┐
              │               │
          ┌───▼───┐      ┌───▼────┐
          │  YES  │      │   NO   │
          └───┬───┘      └───┬────┘
              │              │
              ▼              ▼
      ┌───────────────┐  ┌──────────────┐
      │Create Client  │  │Throw Error:  │
      │     Link      │  │"Re-authorize"│
      └───────────────┘  └──────────────┘
```

---

## Database Schema

Uses existing `platform_settings` table:

```typescript
{
  key: "MOLLIE_PLATFORM_HEALTH",
  value: {
    isHealthy: boolean,
    lastChecked: Date,
    lastSuccessfulRefresh?: Date,
    error?: string,
    expiresAt?: Date,
    needsRefresh: boolean
  }
}
```

---

## Environment Variables

Required:

```env
MOLLIE_PLATFORM_ACCESS_TOKEN=access_Wsd...
MOLLIE_PLATFORM_REFRESH_TOKEN=refresh_...
MOLLIE_CONNECT_CLIENT_ID=app_...
MOLLIE_CONNECT_CLIENT_SECRET=...
CRON_SECRET=... (for cron job authentication)
```

---

## Monitoring & Alerts

### Dashboard Display

- **Location:** `/platform` page
- **Shows:** Status badge, last checked time, refresh history
- **Alerts:** Red banner when manual re-authorization needed

### Logs

All health checks are logged with structured logging:

```typescript
mollieLogger.info("Platform connection healthy");
mollieLogger.warn("Platform token expired, attempting refresh");
mollieLogger.error("Manual re-authorization required");
```

### Future Enhancements

- Email alerts to super admins
- Automatic environment variable updates via Vercel API
- Token expiry warnings (30 days before)
- Slack/Discord notifications

---

## Manual Re-authorization Process

When automatic refresh fails:

1. **View Status:**
   - Visit `/platform` dashboard
   - Check "Platform Connection" card
   - Note the error message

2. **Re-authorize:**
   - Click the OAuth link in the alert
   - Or visit: `https://my.mollie.com/oauth2/authorize?...`
   - Complete authorization flow

3. **Update Environment:**

   ```bash
   # Update .env or Vercel environment variables
   MOLLIE_PLATFORM_ACCESS_TOKEN=new_access_token
   MOLLIE_PLATFORM_REFRESH_TOKEN=new_refresh_token
   ```

4. **Redeploy:**

   ```bash
   git push origin main  # Triggers auto-deploy
   # or manually: vercel --prod
   ```

5. **Verify:**
   - Wait for deployment
   - Check `/platform` dashboard
   - Status should be "Healthy"

---

## Testing

### Manual Test

```bash
# Trigger health check manually
curl -X POST https://your-domain.com/api/cron/check-platform-connection \
  -H "Authorization: Bearer $CRON_SECRET"

# Check response
{
  "success": true,
  "status": {
    "isHealthy": true,
    "lastChecked": "2026-01-03T12:00:00Z",
    "needsRefresh": false
  }
}
```

### Unit Tests

```bash
npm run test platformHealth.test.ts
```

### Integration Test

1. Visit `/platform` dashboard
2. Verify health status card displays
3. Check that status updates after cron runs

---

## Rollback Plan

If issues arise:

1. **Disable Health Check in Onboarding:**

   ```typescript
   // In mollieOnboardingService.ts
   // Comment out health check
   // const healthStatus = await molliePlatformHealthService.checkHealth();
   ```

2. **Disable Cron Job:**
   - Remove from `vercel.json`
   - Redeploy

3. **Revert Changes:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

---

## Files Changed

### New Files

- `src/server/services/molliePlatformHealthService.ts` (277 lines)
- `src/app/api/cron/check-platform-connection/route.ts` (73 lines)
- `src/components/platform/PlatformHealthStatus.tsx` (107 lines)
- `tests/platformHealth.test.ts` (200 lines)

### Modified Files

- `src/server/services/mollieOnboardingService.ts` (integrated health check)
- `src/app/(platform)/platform/page.tsx` (added health status display)
- `docs/MOLLIE_PLATFORM.md` (added token management section)
- `vercel.json` (added cron job configuration)

### Lines of Code

- **Total Added:** ~657 lines
- **Total Modified:** ~50 lines

---

## Next Steps

1. **Monitor in Production:**
   - Watch cron job logs
   - Check `/platform` dashboard regularly
   - Verify automatic refresh works

2. **Set Up Alerts:**
   - Configure email notifications
   - Add Slack webhook integration
   - Set up uptime monitoring

3. **Token Rotation:**
   - Document token rotation procedure
   - Create admin guide for updating tokens
   - Consider automated rotation via Vercel API

4. **Enhanced Monitoring:**
   - Track refresh frequency
   - Monitor token expiry patterns
   - Alert on repeated failures

---

## Success Criteria

✅ Platform token health is monitored every 6 hours
✅ Automatic refresh when token expires
✅ Clear error messages with actionable steps
✅ Dashboard displays real-time status
✅ Documentation updated with procedures
✅ Tests cover key scenarios
✅ No disruption to existing functionality
✅ Build passes successfully

---

## Support

For issues or questions:

1. Check `/platform` dashboard for current status
2. Review logs in Vercel dashboard
3. Consult `docs/MOLLIE_PLATFORM.md`
4. Test with manual curl command
5. Contact platform admin team
