import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";

/**
 * GET /api/subscription/status
 * Returns current subscription status for the authenticated organization
 * Used for polling after payment to check if webhook has processed
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const org = membership.organization;

    // Get subscription details
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: org.id },
    });

    return NextResponse.json({
      currentPlan: org.currentPlan,
      status: subscription?.status || null,
      mollieSubscriptionId: subscription?.mollieSubscriptionId || null,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
