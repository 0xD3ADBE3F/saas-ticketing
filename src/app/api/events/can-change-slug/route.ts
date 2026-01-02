import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { canChangeEventSlug } from "@/server/services/eventService";
import { eventRepo } from "@/server/repos/eventRepo";

/**
 * Check if event slug can be changed
 * GET /api/events/can-change-slug?eventId=...
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId parameter is verplicht" },
        { status: 400 }
      );
    }

    // Verify user has access to this event
    const event = await eventRepo.findById(eventId, user.id);
    if (!event) {
      return NextResponse.json(
        { error: "Evenement niet gevonden" },
        { status: 404 }
      );
    }

    // Check if slug can be changed
    const result = await canChangeEventSlug(eventId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking if event slug can change:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
