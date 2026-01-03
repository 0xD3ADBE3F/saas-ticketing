# Platform OAuth Setup UI - Implementation

## Overview

Added OAuth connection setup interface to the `/platform` super admin UI, allowing platform administrators to authorize Mollie Connect directly from the dashboard.

## Changes Made

### 1. API Endpoint

**File:** `src/app/api/platform/mollie/connect/route.ts`

- New GET endpoint to initiate platform OAuth flow
- Redirects to Mollie OAuth authorization URL with platform-level scopes
- Simple redirect-based flow for easy setup

### 2. UI Component

**File:** `src/components/platform/PlatformMollieConnection.tsx`

- Client component showing connection status
- **Not Connected State:** Amber warning card with "Connect Platform" button
- **Connected State:** Green success card with "Reconnect" option
- **Success Message:** Temporary green banner after successful connection
- **Error Message:** Temporary red banner if connection fails
- Auto-clears URL parameters after showing messages

### 3. Platform Page Updates

**File:** `src/app/(platform)/platform/page.tsx`

- Added `platformTokenService` import
- Checks if platform is connected (`platformTokens.accessToken`)
- Renders `PlatformMollieConnection` component above health status
- Passes connection status to component

### 4. Callback Updates

**File:** `src/app/api/auth/mollie/callback/route.ts`

- Updated `handlePlatformCallback()` to redirect to `/platform?mollie_connected=success`
- Removes HTML response in favor of redirect
- Error handling redirects to `/platform?error=...`
- Cleaner UX with proper success/error states

## User Flow

1. **Navigate to `/platform`** as super admin
2. **See warning card** if platform is not connected
3. **Click "Connect Platform"** button
4. **Redirect to Mollie OAuth** for authorization
5. **Grant platform permissions** (organizations.write, profiles.write, clients.write)
6. **Redirect back to `/platform`** with success message
7. **Tokens automatically stored** in database (platform_settings table)
8. **Success banner appears** for 5 seconds, then auto-clears
9. **Connection status shows "Connected"** with green indicator

## Features

- ✅ One-click OAuth connection setup
- ✅ Visual connection status indicators
- ✅ Success/error message handling
- ✅ Auto-clearing URL parameters
- ✅ Reconnect option for token refresh
- ✅ No manual token copy/paste needed
- ✅ Database-backed token storage
- ✅ Integrates with existing health monitoring

## Benefits

### For Platform Admins

- Simple one-click setup from admin UI
- No need to manually configure environment variables
- Visual confirmation of connection status
- Easy reconnection if needed

### For Organizations

- Enables client link creation for faster onboarding
- Prefilled organization data in Mollie forms
- Better onboarding experience

### Technical

- Tokens automatically refresh via existing health monitoring
- Zero-downtime token updates (database-backed)
- Consistent with organization OAuth flow
- Proper error handling and user feedback

## Security

- OAuth flow uses state parameter for CSRF protection
- Tokens stored encrypted in database
- Only accessible to super admin users
- Standard OAuth 2.0 authorization code flow
- Automatic token refresh via cron job

## Testing

1. Navigate to `/platform` as super admin
2. Verify "Platform Connection Required" warning appears
3. Click "Connect Platform" button
4. Complete Mollie OAuth flow
5. Verify redirect back to platform with success message
6. Verify connection status shows "Connected"
7. Verify platform health check succeeds
8. Verify organizations can use client links for onboarding

## Related Files

- Platform token service: `src/server/services/platformTokenService.ts`
- Health monitoring: `src/server/services/molliePlatformHealthService.ts`
- Onboarding service: `src/server/services/mollieOnboardingService.ts`
- Migration guide: `docs/development/platform-token-migration.md`

## Next Steps

After connecting the platform:

1. Tokens will automatically refresh every 6 hours via cron
2. Organizations can use "Create Client Link" feature
3. Monitor connection health in platform dashboard
4. View connection logs in Mollie dashboard

## Rollback

If needed, can disconnect platform by:

1. Deleting platform_settings records: `MOLLIE_PLATFORM_ACCESS_TOKEN`, `MOLLIE_PLATFORM_REFRESH_TOKEN`
2. Organizations will fall back to standard OAuth flow
3. No impact on existing organization connections
