import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";
import { payoutService } from "@/server/services/payoutService";

/**
 * GET /api/organizations/[id]/payouts/summary
 * Get payout summary for organization with per-event breakdown
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params;

  // Verify authentication
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify organization membership
  const membership = await prisma.membership.findFirst({
    where: {
      organizationId,
      userId: user.id,
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this organization" },
      { status: 403 }
    );
  }

  // Only ADMIN and FINANCE roles can view payouts
  if (!["ADMIN", "FINANCE"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  // Get query params
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const until = searchParams.get("until");

  try {
    const summary = await payoutService.getOrganizationPayoutSummary(
      organizationId,
      {
        from: from ? new Date(from) : undefined,
        until: until ? new Date(until) : undefined,
      }
    );

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Failed to get payout summary:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get payout summary",
      },
      { status: 500 }
    );
  }
}
