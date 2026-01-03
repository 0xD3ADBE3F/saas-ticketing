# Mollie Token Refresh Error Handling

## Problem

When a Mollie OAuth refresh token becomes invalid (revoked, expired, or credentials changed), the system threw an unhandled error:

```
Mollie token refresh failed: {"error":"invalid_grant","error_description":"refresh_token doesn't exist or is invalid for the client"}
Error testing Mollie connection: Error: Token refresh failed: 400
```

This left organizations in a broken state - connected but unable to process payments.

## Root Cause

The refresh token can become invalid for several reasons:

1. Token has been revoked by Mollie
2. OAuth app credentials changed
3. Token was generated in test mode but using live credentials (or vice versa)
4. Token expired beyond refresh window

The original implementation threw a generic error without:

- Detecting the specific `invalid_grant` error
- Cleaning up the invalid connection
- Providing actionable feedback to reconnect

## Solution

### 1. Custom Error Class

Created `InvalidRefreshTokenError` to distinguish token invalidity from other API errors:

```typescript
export class InvalidRefreshTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRefreshTokenError";
  }
}
```

### 2. Enhanced Error Detection

Modified `refreshToken()` to parse the error response and throw the specific error:

```typescript
if (!response.ok) {
  const errorText = await response.text();
  console.error("Mollie token refresh failed:", errorText);

  // Parse error to detect invalid_grant
  try {
    const errorData = JSON.parse(errorText);
    if (errorData.error === "invalid_grant") {
      throw new InvalidRefreshTokenError(
        "Refresh token is invalid or revoked. Organization must reconnect to Mollie."
      );
    }
  } catch (e) {
    if (e instanceof InvalidRefreshTokenError) throw e;
  }

  throw new Error(`Token refresh failed: ${response.status}`);
}
```

### 3. Automatic Cleanup

Modified `getValidToken()` to automatically disconnect when refresh fails:

```typescript
try {
  const newTokens = await this.refreshToken(tokens.refreshToken);
  await this.storeTokens(organizationId, newTokens);
  return newTokens.access_token;
} catch (error) {
  // If refresh token is invalid, disconnect organization
  if (error instanceof InvalidRefreshTokenError) {
    console.error(
      `Invalid refresh token for organization ${organizationId}, disconnecting...`
    );
    await this.disconnect(organizationId);
    throw new Error(
      "Mollie connection is no longer valid. Please reconnect your Mollie account."
    );
  }
  throw error;
}
```

This ensures:

- Invalid tokens are cleared from the database
- Organization status reflects the disconnected state
- Clear error message guides user to reconnect

### 4. API Response Enhancement

Updated the test route to signal when reconnection is needed:

```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : "Verbindingstest mislukt";
  const needsReconnect = errorMessage.includes("reconnect your Mollie account");

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      needsReconnect, // Frontend can detect and show reconnect button
    },
    { status: needsReconnect ? 401 : 500 }
  );
}
```

## Testing

Added comprehensive test coverage in `tests/mollieTokenRefresh.test.ts`:

- ✅ Detect invalid_grant error
- ✅ Automatically disconnect organization
- ✅ Successfully refresh valid tokens
- ✅ Return existing token when not expired

All tests pass.

## Impact

This fix applies to all code paths that use `mollieConnectService.getValidToken()`:

- `/api/organizations/[id]/mollie/test` - Connection testing
- `mollieOnboardingService` - Onboarding status checks
- `mollieSettlementService` - Settlement and payout operations
- Any future Mollie API integrations

## User Experience

**Before:**

1. Token expires/revoked
2. 500 error on any Mollie operation
3. Organization stuck in "connected" state
4. Manual database cleanup required

**After:**

1. Token expires/revoked
2. System detects invalid_grant
3. Auto-disconnects organization
4. Clear message: "Please reconnect your Mollie account"
5. User clicks reconnect, OAuth flow restarts
6. System works again

## Security

- No sensitive data leaked in error messages
- Token cleanup ensures no stale credentials remain
- Audit trail preserved (disconnect logs still fire)

## Deployment Notes

No migration required - this is a pure code change in error handling logic.

## Related Files

- `src/server/services/mollieConnectService.ts` - Core implementation
- `src/app/api/organizations/[id]/mollie/test/route.ts` - API response
- `tests/mollieTokenRefresh.test.ts` - Test coverage

## Future Improvements

Consider adding:

1. **Proactive token refresh** - Background job to refresh tokens before they expire
2. **Email notification** - Alert org admin when auto-disconnected
3. **Retry logic** - Exponential backoff for transient errors (non-invalid_grant)
4. **Dashboard indicator** - Show connection health status prominently
