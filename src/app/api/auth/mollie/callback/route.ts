import { NextRequest, NextResponse } from "next/server";
import { mollieConnectService } from "@/server/services/mollieConnectService";
import { mollieOnboardingService } from "@/server/services/mollieOnboardingService";
import { prisma } from "@/server/lib/prisma";

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
    console.error("Mollie OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?error=${encodeURIComponent(errorDescription || error)}`,
        req.url
      )
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("Missing code or state in Mollie callback");
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=invalid_callback", req.url)
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

    // Return HTML page with the token to copy
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Platform Authorization Successful</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
            h1 { color: #10b981; }
            pre { background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 14px; }
            .warning { color: #f59e0b; margin-top: 20px; }
            ol { line-height: 2; }
          </style>
        </head>
        <body>
          <h1>✅ Platform Authorization Successful</h1>
          <p>Add this to your <code>.env</code> file:</p>
          <pre>MOLLIE_PLATFORM_ACCESS_TOKEN=${tokens.accessToken}

# Save refresh token for future use (optional)
MOLLIE_PLATFORM_REFRESH_TOKEN=${tokens.refreshToken}</pre>
          <p class="warning">⚠️ Keep these tokens secure!</p>
          <ol>
            <li>Copy the access token above to your <code>.env</code> file</li>
            <li>Restart your development server</li>
            <li>Organizations can now use Client Links for onboarding!</li>
          </ol>
          <p><a href="/dashboard/settings">← Back to Settings</a></p>
        </body>
      </html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("Failed to exchange platform code:", err);
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head><title>Authorization Failed</title></head>
        <body style="font-family: system-ui; padding: 40px;">
          <h1>❌ Platform Authorization Failed</h1>
          <p>${err instanceof Error ? err.message : "Unknown error"}</p>
          <p><a href="/dashboard/settings">← Back to Settings</a></p>
        </body>
      </html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
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
    console.error("Invalid state parameter:", err);
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=invalid_state", req.url)
    );
  }

  // Verify organization exists
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) {
    console.error("Organization not found:", organizationId);
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=org_not_found", req.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await mollieConnectService.exchangeCode(code);

    // Store encrypted tokens
    await mollieConnectService.storeTokens(organizationId, tokens);

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
      console.warn("Failed to fetch Mollie profile:", profileErr);
    }

    console.log(`Mollie connected successfully for organization ${organizationId}`);

    // Redirect to settings page with success
    return NextResponse.redirect(
      new URL("/dashboard/settings?success=connected", req.url)
    );
  } catch (err) {
    console.error("Token exchange failed:", err);
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=token_exchange_failed", req.url)
    );
  }
}
