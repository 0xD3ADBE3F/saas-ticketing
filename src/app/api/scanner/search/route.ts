import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations, hasRole } from "@/server/services/organizationService";
import { searchTicketsByEmail } from "@/server/services/scanningStatsService";

export async function GET(req: NextRequest) {
  try {
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
        { error: "Je hebt geen toestemming om tickets te zoeken" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email || email.trim().length < 3) {
      return NextResponse.json(
        { error: "Voer minimaal 3 karakters in om te zoeken" },
        { status: 400 }
      );
    }

    const tickets = await searchTicketsByEmail(email, organizationId);

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Error searching tickets:", error);

    const message =
      error instanceof Error ? error.message : "Fout bij zoeken naar tickets";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
