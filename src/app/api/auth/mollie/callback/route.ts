import { NextRequest, NextResponse } from "next/server";
import { mollieConnectService } from "@/server/services/mollieConnectService";
import { mollieOnboardingService } from "@/server/services/mollieOnboardingService";
import { prisma } from "@/server/lib/prisma";
import { mollieLogger } from "@/server/lib/logger";
import { env } from "@/server/lib/env";
import { platformTokenService } from "@/server/services/platformTokenService";

/**
 * Mollie OAuth callback handler
 * Handles both:
 * 1. Platform authorization (state="platform") - one-time setup for platform admin
 * 2. Organization authorization (state={organizationId}) - per-org connection
 *
 * GET /api/auth/mollie/callback?code=xxx&state=xxx
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    mollieLogger.error({ error, errorDescription }, "Mollie OAuth error");
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?error=${encodeURIComponent(errorDescription || error)}`,
        env.NEXT_PUBLIC_APP_URL
      )
    );
  }

  // Validate required parameters
  if (!code || !state) {
    mollieLogger.error("Missing code or state in Mollie callback");
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=invalid_callback", env.NEXT_PUBLIC_APP_URL)
    );
  }

  // Check if this is platform authorization
  if (state === "platform") {
    return handlePlatformCallback(req, code);
  }

  // Otherwise, handle organization authorization
  return handleOrganizationCallback(req, code, state);
}

/**
 * Handle platform admin authorization
 * One-time setup to get clients.write permission
 */
async function handlePlatformCallback(req: NextRequest, code: string) {
  try {
    const tokens = await mollieOnboardingService.exchangePlatformCode(code);

    // Store tokens in database
    await platformTokenService.setTokens(tokens.accessToken, tokens.refreshToken);

    mollieLogger.info("Platform tokens successfully stored in database");

    // Redirect to platform dashboard with success message
    return NextResponse.redirect(
      new URL("/platform?mollie_connected=success", env.NEXT_PUBLIC_APP_URL)
    );
  } catch (err) {
    mollieLogger.error({ err }, "Failed to exchange platform code");

    // Redirect to platform dashboard with error
    return NextResponse.redirect(
      new URL(
        `/platform?error=${encodeURIComponent("Failed to connect Mollie platform")}`,
        env.NEXT_PUBLIC_APP_URL
      )
    );
  }
}

/**
 * Handle organization authorization
 * After merchant completes onboarding/connection
 */
async function handleOrganizationCallback(req: NextRequest, code: string, state: string) {
  // Decode state to get organization ID
  let organizationId: string;
  try {
    const stateData = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8")
    );
    organizationId = stateData.organizationId;

    if (!organizationId) {
      throw new Error("Missing organizationId in state");
    }
  } catch (err) {
    mollieLogger.error({ err }, "Invalid state parameter");
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=invalid_state", env.NEXT_PUBLIC_APP_URL)
    );
  }

  // Verify organization exists
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) {
    mollieLogger.error({ organizationId }, "Organization not found");
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=org_not_found", env.NEXT_PUBLIC_APP_URL)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await mollieConnectService.exchangeCode(code);

    // Store encrypted tokens
    await mollieConnectService.storeTokens(organizationId, tokens);

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
      mollieLogger.warn({ profileErr }, "Failed to fetch Mollie organization/profile");
    }

    mollieLogger.info({ organizationId }, "Mollie connected successfully");

    // Redirect to settings page with success
    return NextResponse.redirect(
      new URL("/dashboard/settings?success=connected", env.NEXT_PUBLIC_APP_URL)
    );
  } catch (err) {
    mollieLogger.error({ err, organizationId }, "Token exchange failed");
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=token_exchange_failed", env.NEXT_PUBLIC_APP_URL)
    );
  }
}
