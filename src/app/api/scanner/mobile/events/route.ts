import { NextRequest, NextResponse } from "next/server";
import { verifyTerminalToken } from "@/server/services/scannerTerminalService";
import { eventRepo } from "@/server/repos/eventRepo";

// =============================================================================
// GET /api/scanner/mobile/events - List events for terminal (terminal auth)
// =============================================================================
// Returns list of LIVE events the terminal can scan
// For terminals without a specific eventId, shows all org events
// =============================================================================

export async function GET(request: NextRequest) {
  // =============================================================================
  // Step 1: Terminal Authentication (via Bearer token)
  // =============================================================================
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Terminal token vereist" },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  const session = await verifyTerminalToken(token);

  if (!session) {
    return NextResponse.json(
      { error: "Ongeldige of verlopen terminal sessie" },
      { status: 401 }
    );
  }

  // =============================================================================
  // Step 2: Get events
  // =============================================================================
  // If terminal has specific event, only return that one
  if (session.eventId) {
    const event = await eventRepo.findByIdInOrg(session.eventId, session.organizationId);
    if (event && event.status === "LIVE") {
      return NextResponse.json({
        events: [
          {
            id: event.id,
            title: event.title,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            location: event.location,
          },
        ],
        restrictedToEvent: true,
      });
    }
    return NextResponse.json({
      events: [],
      restrictedToEvent: true,
      message: "Toegewezen evenement is niet actief",
    });
  }

  // Otherwise, return all LIVE events for the organization
  // Use a simple prisma query since we don't have a user ID for authorization
  const { prisma } = await import("@/server/lib/prisma");
  const events = await prisma.event.findMany({
    where: {
      organizationId: session.organizationId,
      status: "LIVE",
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      location: true,
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({
    events,
    restrictedToEvent: false,
  });
}
