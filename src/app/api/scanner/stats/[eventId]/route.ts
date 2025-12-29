import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations, hasRole } from "@/server/services/organizationService";
import { getEventScanningStats } from "@/server/services/scanningStatsService";

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
        { error: "Je hebt geen toestemming om scan statistieken te bekijken" },
        { status: 403 }
      );
    }

    const stats = await getEventScanningStats(eventId, organizationId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching scanning stats:", error);

    const message =
      error instanceof Error ? error.message : "Fout bij ophalen statistieken";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
