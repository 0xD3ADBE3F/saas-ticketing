import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";
import { mollieSettlementService } from "@/server/services/mollieSettlementService";

/**
 * GET /api/organizations/[id]/balance
 * Get balance information for an organization
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
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  // Only ADMIN and FINANCE roles can view balance
  if (!["ADMIN", "FINANCE"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    // Get primary balance
    const balance = await mollieSettlementService.getPrimaryBalance(organizationId);

    // Get open settlement (next payout)
    const openSettlement = await mollieSettlementService.getOpenSettlement(organizationId);

    return NextResponse.json({
      balance,
      openSettlement,
    });
  } catch (error) {
    console.error("Failed to get balance:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get balance" },
      { status: 500 }
    );
  }
}
