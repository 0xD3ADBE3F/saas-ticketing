import { NextRequest, NextResponse } from "next/server";
import { mollieOnboardingService } from "@/server/services/mollieOnboardingService";
import { prisma } from "@/server/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Poll Mollie onboarding status for organization
 * Updates local status from Mollie API
 *
 * GET /api/organizations/[id]/mollie/status
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
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

  // Must have access token to poll status
  if (!org.mollieAccessToken) {
    return NextResponse.json({
      status: org.mollieOnboardingStatus ?? "NOT_STARTED",
      canReceivePayments: false,
      canPublishEvents: false,
      changed: false,
      message: "Organization not connected to Mollie",
    });
  }

  try {
    // Poll Mollie for latest status
    const result = await mollieOnboardingService.pollStatus(organizationId);

    // Check if can publish events
    const canPublishEvents = await mollieOnboardingService.canPublishEvents(organizationId);

    // Get dashboard URL if connected
    let dashboardUrl: string | null = null;
    if (result.status === "COMPLETED") {
      dashboardUrl = await mollieOnboardingService.getDashboardUrl(organizationId);
    }

    return NextResponse.json({
      status: result.status,
      canReceivePayments: result.canReceivePayments,
      canPublishEvents,
      changed: result.changed,
      dashboardUrl,
    });
  } catch (err) {
    console.error("Failed to poll Mollie status:", err);
    return NextResponse.json(
      { error: "Failed to check onboarding status" },
      { status: 500 }
    );
  }
}
