import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { organizationRepo } from "@/server/repos/organizationRepo";
import { validateSlug } from "@/server/lib/slugValidation";

/**
 * Check if organization slug is available
 * GET /api/organizations/check-slug?slug=...
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is verplicht" },
        { status: 400 }
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

    // Check availability
    const isAvailable = await organizationRepo.isSlugAvailable(slug);

    return NextResponse.json({
      available: isAvailable,
      error: isAvailable ? undefined : "Deze slug is al in gebruik",
    });
  } catch (error) {
    console.error("Error checking org slug:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
