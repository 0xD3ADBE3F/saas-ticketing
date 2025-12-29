import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";
import { mollieSettlementService } from "@/server/services/mollieSettlementService";

/**
 * GET /api/organizations/[id]/settlements
 * Get settlements for an organization
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

  // Only ADMIN and FINANCE roles can view settlements
  if (!["ADMIN", "FINANCE"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  // Get query params
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from") || undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!)
    : 25;

  try {
    const result = await mollieSettlementService.listSettlements(organizationId, {
      from,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to get settlements:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get settlements" },
      { status: 500 }
    );
  }
}
