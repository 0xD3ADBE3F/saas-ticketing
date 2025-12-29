import { NextRequest, NextResponse } from "next/server";
import { mollieOnboardingService } from "@/server/services/mollieOnboardingService";
import { mollieConnectService } from "@/server/services/mollieConnectService";
import { prisma } from "@/server/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get Mollie connection status for organization
 *
 * GET /api/organizations/[id]/mollie
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: organizationId } = await params;

  // Get organization with Mollie fields
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      mollieOnboardingStatus: true,
      mollieProfileId: true,
      mollieClientLinkUrl: true,
      mollieTokenExpiresAt: true,
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const isConnected = await mollieConnectService.isConnected(organizationId);

  // If connected, poll for latest status
  let canReceivePayments = false;
  if (isConnected) {
    try {
      const statusResult = await mollieOnboardingService.pollStatus(organizationId);
      canReceivePayments = statusResult.canReceivePayments;
    } catch {
      // Ignore polling errors
    }
  }

  // Get onboarding URL if pending
  let onboardingUrl: string | null = null;
  if (org.mollieOnboardingStatus === "PENDING" && org.mollieClientLinkUrl) {
    onboardingUrl = await mollieOnboardingService.getOnboardingUrl(organizationId);
  }

  return NextResponse.json({
    organizationId: org.id,
    status: org.mollieOnboardingStatus ?? "NOT_STARTED",
    isConnected,
    canReceivePayments,
    profileId: org.mollieProfileId,
    onboardingUrl,
    tokenExpiresAt: org.mollieTokenExpiresAt,
  });
}
