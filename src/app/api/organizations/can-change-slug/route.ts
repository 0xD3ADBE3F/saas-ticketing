import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { getOrganization, canChangeSlug } from "@/server/services/organizationService";

/**
 * Check if organization slug can be changed
 * GET /api/organizations/can-change-slug?organizationId=...
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId parameter is verplicht" },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const org = await getOrganization(organizationId, user.id);
    if (!org) {
      return NextResponse.json(
        { error: "Organisatie niet gevonden" },
        { status: 404 }
      );
    }

    // Check if slug can be changed
    const result = await canChangeSlug(organizationId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking if org slug can change:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
