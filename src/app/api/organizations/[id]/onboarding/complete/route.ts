import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { prisma } from "@/server/lib/prisma";

/**
 * POST /api/organizations/[id]/onboarding/complete
 * Mark the first login/onboarding flow as completed for an organization
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: organizationId } = await params;

    // Verify user has access to this organization
    const organizations = await getUserOrganizations(user.id);
    const org = organizations.find(o => o.id === organizationId);

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Mark first login as completed
    await prisma.organization.update({
      where: { id: organizationId },
      data: { firstLoginCompleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Onboarding Complete]", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
