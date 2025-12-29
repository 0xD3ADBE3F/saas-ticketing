import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations, hasRole } from "@/server/services/organizationService";
import { getRecentScans } from "@/server/services/scanningStatsService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Niet geautoriseerd" },
        { status: 401 }
      );
    }

    const organizations = await getUserOrganizations(user.id);
    const organizationId = organizations[0]?.id;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Geen organisatie gevonden" },
        { status: 403 }
      );
    }

    // Verify user has SCANNER or ADMIN role
    const canScan = await hasRole(organizationId, user.id, "SCANNER");
    const isAdmin = await hasRole(organizationId, user.id, "ADMIN");
    if (!canScan && !isAdmin) {
      return NextResponse.json(
        { error: "Je hebt geen toestemming om recente scans te bekijken" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit moet tussen 1 en 100 zijn" },
        { status: 400 }
      );
    }

    const scans = await getRecentScans(eventId, organizationId, limit);

    return NextResponse.json({ scans });
  } catch (error) {
    console.error("Error fetching recent scans:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Fout bij ophalen recente scans";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
