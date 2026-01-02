import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { eventRepo } from "@/server/repos/eventRepo";
import { getOrganization } from "@/server/services/organizationService";
import { validateSlug } from "@/server/lib/slugValidation";

/**
 * Check if event slug is available within organization
 * GET /api/events/check-slug?slug=...&organizationId=...&eventId=...
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const organizationId = searchParams.get("organizationId");
    const eventId = searchParams.get("eventId"); // Optional, for checking when updating

    if (!slug || !organizationId) {
      return NextResponse.json(
        { error: "slug en organizationId parameters zijn verplicht" },
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

    // Validate slug format and reserved words
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return NextResponse.json(
        { available: false, error: validation.error },
        { status: 200 }
      );
    }

    // Check availability within organization
    const isAvailable = await eventRepo.isSlugAvailable(
      organizationId,
      slug,
      eventId || undefined
    );

    return NextResponse.json({
      available: isAvailable,
      error: isAvailable ? undefined : "Deze slug is al in gebruik binnen je organisatie",
    });
  } catch (error) {
    console.error("Error checking event slug:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
