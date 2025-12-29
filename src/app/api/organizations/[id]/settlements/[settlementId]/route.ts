import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";
import { mollieSettlementService } from "@/server/services/mollieSettlementService";

/**
 * GET /api/organizations/[id]/settlements/[settlementId]
 * Get details of a specific settlement
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; settlementId: string }> }
) {
  const { id: organizationId, settlementId } = await params;

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
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  // Only ADMIN and FINANCE roles can view settlements
  if (!["ADMIN", "FINANCE"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    const settlement = await mollieSettlementService.getSettlement(
      organizationId,
      settlementId
    );

    if (!settlement) {
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ settlement });
  } catch (error) {
    console.error("Failed to get settlement:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get settlement" },
      { status: 500 }
    );
  }
}
