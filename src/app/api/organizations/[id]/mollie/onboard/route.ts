import { NextRequest, NextResponse } from "next/server";
import { mollieOnboardingService } from "@/server/services/mollieOnboardingService";
import { mollieConnectService } from "@/server/services/mollieConnectService";
import { prisma } from "@/server/lib/prisma";
import { env } from "@/server/lib/env";
import { platformTokenService } from "@/server/services/platformTokenService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Start Mollie onboarding for organization
 *
 * Two modes:
 * 1. If platform access token is stored in database: Creates a client link with prefilled data from organization
 * 2. Otherwise: Returns standard OAuth authorization URL (simpler, no prefill)
 *
 * POST /api/organizations/[id]/mollie/onboard
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: organizationId } = await params;

  // Verify organization exists and get its data
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      mollieOnboardingStatus: true,
      mollieAccessToken: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Check if already connected
  if (org.mollieAccessToken) {
    const isConnected = await mollieConnectService.isConnected(organizationId);
    if (isConnected) {
      return NextResponse.json(
        { error: "Organization already connected to Mollie" },
        { status: 400 }
      );
    }
  }

  // Check if we have platform token for Client Links API
  const hasPlatformToken = !!(await platformTokenService.getAccessToken());

  // If we have platform token and all required data, use Client Links API
  if (hasPlatformToken && org.email && org.firstName && org.lastName) {
    try {
      // Create client link at Mollie (prefilled with organization data)
      await mollieOnboardingService.createClientLink(organizationId);

      // Get the onboarding URL with OAuth parameters
      const onboardingUrl = await mollieOnboardingService.getOnboardingUrl(organizationId);

      return NextResponse.json({
        success: true,
        mode: "client-link",
        onboardingUrl,
        message: "Redirect user to onboardingUrl to complete Mollie setup with prefilled data",
      });
    } catch (err) {
      console.error("Failed to create client link:", err);
      // Fall through to standard OAuth
    }
  }

  // Standard OAuth flow (no prefill, but simpler)
  try {
    const authorizationUrl = mollieOnboardingService.getAuthorizationUrl(organizationId);

    // Update status to pending
    await prisma.organization.update({
      where: { id: organizationId },
      data: { mollieOnboardingStatus: "PENDING" },
    });

    return NextResponse.json({
      success: true,
      mode: "oauth",
      onboardingUrl: authorizationUrl,
      message: "Redirect user to onboardingUrl to connect their Mollie account",
    });
  } catch (err) {
    console.error("Failed to generate authorization URL:", err);
    return NextResponse.json(
      { error: "Failed to start Mollie onboarding" },
      { status: 500 }
    );
  }
}
