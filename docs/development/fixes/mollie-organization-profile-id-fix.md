# Fix: Mollie Organization ID and Profile ID Not Set After Connection

## Issue

After connecting Mollie from `/dashboard/settings`, the `mollieOrganizationId` and `mollieProfileId` fields were null in the database.

## Root Cause

The Mollie OAuth callback handler at `/api/auth/mollie/callback` was only fetching the organization's profiles but **not the organization ID** from Mollie.

The original code:

```typescript
// Get organization info from Mollie to store profile ID
const client = await mollieConnectService.getOrgClient(organizationId);

try {
  // Get the organization's profiles
  const profiles = await client.profiles.page();
  const defaultProfile = profiles[0];

  if (defaultProfile) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        mollieProfileId: defaultProfile.id,
      },
    });
  }
} catch (profileErr) {
  // Non-fatal: profile fetch can fail, tokens are still stored
  mollieLogger.warn({ profileErr }, "Failed to fetch Mollie profile");
}
```

This code:

1. ✅ Fetched profiles correctly
2. ✅ Stored `mollieProfileId`
3. ❌ Did NOT fetch or store `mollieOrganizationId`

## Solution

Updated the callback handler to also fetch the Mollie organization ID using the `/v2/organizations/me` endpoint:

```typescript
// Get organization info from Mollie to store profile ID and organization ID
const client = await mollieConnectService.getOrgClient(organizationId);

try {
  // Get the Mollie organization ID
  const mollieOrg = await client.organizations.getCurrent();

  // Get the organization's profiles
  const profiles = await client.profiles.page();
  const defaultProfile = profiles[0];

  // Update with both organization ID and profile ID
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      mollieOrganizationId: mollieOrg.id,
      mollieProfileId: defaultProfile?.id || null,
    },
  });
} catch (profileErr) {
  // Non-fatal: profile fetch can fail, tokens are still stored
  mollieLogger.warn(
    { profileErr },
    "Failed to fetch Mollie organization/profile"
  );
}
```

## Changes Made

1. **File**: [src/app/api/auth/mollie/callback/route.ts](../../../src/app/api/auth/mollie/callback/route.ts#L145-L170)
   - Added call to `client.organizations.getCurrent()` to fetch Mollie organization ID
   - Updated the database update to include `mollieOrganizationId`
   - Changed conditional profile update to use optional chaining (`defaultProfile?.id || null`)
   - Updated error log message to reflect both organization and profile fetch

2. **File**: [tests/mollieCallback.test.ts](../../../tests/mollieCallback.test.ts)
   - Added comprehensive tests to verify both fields are set correctly
   - Added test case for missing profile scenario

## Testing

```bash
npm run test -- mollieCallback.test.ts
```

✅ All tests pass:

- Should store both `mollieOrganizationId` and `mollieProfileId` after OAuth callback
- Should handle missing profile gracefully (sets `mollieOrganizationId` but leaves `mollieProfileId` as null)

## Impact

### Before

- ❌ `mollieOrganizationId`: `null`
- ✅ `mollieProfileId`: Set (if profile exists)
- ⚠️ Any features relying on `mollieOrganizationId` would fail

### After

- ✅ `mollieOrganizationId`: Set correctly
- ✅ `mollieProfileId`: Set correctly (or null if no profile exists)
- ✅ All Mollie Connect features work as expected

## Migration for Existing Connections

Organizations that already connected Mollie before this fix will have:

- ✅ `mollieAccessToken` and `mollieRefreshToken` (still valid)
- ❌ `mollieOrganizationId` = `null`

**Recommended Action**: Existing organizations should **reconnect** their Mollie account from `/dashboard/settings` to populate the missing `mollieOrganizationId`.

Alternatively, a migration script could be created to fetch and update the organization IDs for all connected organizations.

## Related Files

- [src/server/services/mollieConnectService.ts](../../../src/server/services/mollieConnectService.ts)
- [prisma/schema.prisma](../../../prisma/schema.prisma) (Organization model)

## References

- [Mollie API: Get Current Organization](https://docs.mollie.com/reference/get-current-organization)
- [Mollie API: List Profiles](https://docs.mollie.com/reference/list-profiles)

---

**Date**: 2026-01-03
**Status**: ✅ Fixed
