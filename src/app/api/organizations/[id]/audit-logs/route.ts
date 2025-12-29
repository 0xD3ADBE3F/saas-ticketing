import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";
import { auditService } from "@/server/services/auditService";

/**
 * GET /api/organizations/[id]/audit-logs
 * Get audit logs for organization
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

  // Only ADMIN role can view audit logs
  if (membership.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  // Get query params
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action") || undefined;
  const entityType = searchParams.get("entityType") || undefined;
  const entityId = searchParams.get("entityId") || undefined;
  const userId = searchParams.get("userId") || undefined;
  const from = searchParams.get("from");
  const until = searchParams.get("until");
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!)
    : 100;
  const offset = searchParams.get("offset")
    ? parseInt(searchParams.get("offset")!)
    : 0;

  try {
    const result = await auditService.getOrganizationLogs(organizationId, {
      action,
      entityType,
      entityId,
      userId,
      from: from ? new Date(from) : undefined,
      until: until ? new Date(until) : undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to get audit logs:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get audit logs",
      },
      { status: 500 }
    );
  }
}
