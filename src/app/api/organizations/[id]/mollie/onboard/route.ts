import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mollieOnboardingService } from "@/server/services/mollieOnboardingService";
import { mollieConnectService } from "@/server/services/mollieConnectService";
import { prisma } from "@/server/lib/prisma";
import { env } from "@/server/lib/env";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const onboardRequestSchema = z.object({
  ownerEmail: z.string().email().optional(),
  ownerGivenName: z.string().min(1).optional(),
  ownerFamilyName: z.string().min(1).optional(),
});

/**
 * Start Mollie onboarding for organization
 *
 * Two modes:
 * 1. If MOLLIE_PLATFORM_ACCESS_TOKEN is set: Creates a client link with prefilled data
 * 2. Otherwise: Returns standard OAuth authorization URL (simpler, no prefill)
 *
 * POST /api/organizations/[id]/mollie/onboard
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: organizationId } = await params;

  // Verify organization exists
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      mollieOnboardingStatus: true,
      mollieAccessToken: true,
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

  // Parse request body (optional for standard OAuth flow)
  const body = await req.json().catch(() => ({}));
  const validation = onboardRequestSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { ownerEmail, ownerGivenName, ownerFamilyName } = validation.data;

  // Check if we have platform token for Client Links API
  const hasPlatformToken = !!env.MOLLIE_PLATFORM_ACCESS_TOKEN;

  // If we have platform token and all owner data, use Client Links API
  if (hasPlatformToken && ownerEmail && ownerGivenName && ownerFamilyName) {
    try {
      // Create client link at Mollie (prefilled)
      const clientLinkUrl = await mollieOnboardingService.createClientLink(
        organizationId,
        {
          email: ownerEmail,
          givenName: ownerGivenName,
          familyName: ownerFamilyName,
        }
      );

      // Get the onboarding URL with OAuth parameters
      const onboardingUrl = await mollieOnboardingService.getOnboardingUrl(organizationId);

      return NextResponse.json({
        success: true,
        mode: "client-link",
        clientLinkUrl,
        onboardingUrl,
        message: "Redirect user to onboardingUrl to complete Mollie setup",
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
