import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";
import { mollieOnboardingService } from "@/server/services/mollieOnboardingService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/organizations/[id]/mollie/disconnect
 * Disconnect Mollie account from organization
 */
export async function POST(request: Request, context: RouteContext) {
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

    // Verify user has access to this organization (must be ADMIN)
    const membership = await prisma.membership.findFirst({
      where: {
        organizationId,
        userId: user.id,
        role: "ADMIN",
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Only admins can disconnect Mollie" },
        { status: 403 }
      );
    }

    // Check if organization has any pending/unpaid orders
    const pendingOrders = await prisma.order.count({
      where: {
        organizationId,
        status: "PENDING",
      },
    });

    if (pendingOrders > 0) {
      return NextResponse.json(
        {
          error: `Er zijn nog ${pendingOrders} openstaande bestellingen. Wacht tot deze zijn afgerond of geannuleerd.`,
        },
        { status: 400 }
      );
    }

    // Disconnect Mollie account
    await mollieOnboardingService.disconnect(organizationId);

    return NextResponse.json({
      success: true,
      message: "Mollie account disconnected",
    });
  } catch (error) {
    console.error("Error disconnecting Mollie:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Mollie account" },
      { status: 500 }
    );
  }
}
