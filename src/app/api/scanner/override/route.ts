import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations, hasRole } from "@/server/services/organizationService";
import {
  overrideTicketStatus,
  getTicketForOverride,
} from "@/server/services/ticketOverrideService";

const overrideSchema = z.object({
  ticketId: z.string().min(1, "Ticket ID of code is verplicht"),
  newStatus: z.enum(["VALID", "USED"], {
    message: "Status moet VALID of USED zijn",
  }),
  reason: z
    .string()
    .min(10, "Reden moet minimaal 10 karakters bevatten")
    .max(500, "Reden mag maximaal 500 karakters bevatten"),
});

/**
 * POST /api/scanner/override
 * Manual ticket status override (ADMIN only)
 * Always creates audit log entry
 */
export async function POST(req: NextRequest) {
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

    // Verify user has ADMIN role (only admins can override)
    const isAdmin = await hasRole(organizationId, user.id, "ADMIN");
    if (!isAdmin) {
      return NextResponse.json(
        {
          error:
            "Je hebt geen toestemming om ticket statussen aan te passen. Alleen admins kunnen deze actie uitvoeren.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = overrideSchema.parse(body);

    const result = await overrideTicketStatus({
      ...validatedData,
      adminUserId: user.id,
      organizationId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error overriding ticket status:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Fout bij aanpassen ticket status";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/scanner/override?ticketId=xxx
 * Get ticket details for override UI
 */
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

    // Verify user has ADMIN role
    const isAdmin = await hasRole(organizationId, user.id, "ADMIN");
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Je hebt geen toestemming om ticket details te bekijken" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId query parameter is verplicht" },
        { status: 400 }
      );
    }

    const ticket = await getTicketForOverride(ticketId, organizationId);

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Error fetching ticket for override:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Fout bij ophalen ticket details";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
