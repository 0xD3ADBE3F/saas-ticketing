import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";
import { getConnectionStatus } from "@/server/services/mollieMonitoringService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/organizations/[id]/mollie/health
 * Get current Mollie connection health status
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: organizationId } = await context.params;

    // Verify user is authenticated
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this organization
    const membership = await prisma.membership.findFirst({
      where: {
        organizationId,
        userId: user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const status = await getConnectionStatus(organizationId);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting Mollie connection health:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get connection status",
      },
      { status: 500 }
    );
  }
}
