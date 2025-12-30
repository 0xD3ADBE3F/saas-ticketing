import { NextRequest, NextResponse } from "next/server";
import { verifyTerminalToken } from "@/server/services/scannerTerminalService";
import { getEventScanningStats, getRecentScans } from "@/server/services/scanningStatsService";
import { eventRepo } from "@/server/repos/eventRepo";

// =============================================================================
// GET /api/scanner/mobile/stats - Get scanning stats (terminal auth)
// =============================================================================
// Returns live scanning statistics for the terminal's event(s)
// Uses terminal token instead of user session
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
  // Step 2: Get event ID from query or session
  // =============================================================================
  const url = new URL(request.url);
  const queryEventId = url.searchParams.get("eventId");
  const eventId = queryEventId || session.eventId;

  if (!eventId) {
    return NextResponse.json(
      { error: "Geen evenement geselecteerd" },
      { status: 400 }
    );
  }

  // =============================================================================
  // Step 3: Verify event belongs to organization
  // =============================================================================
  const event = await eventRepo.findByIdInOrg(eventId, session.organizationId);
  if (!event) {
    return NextResponse.json(
      { error: "Evenement niet gevonden" },
      { status: 404 }
    );
  }

  // =============================================================================
  // Step 4: Get stats
  // =============================================================================
  const stats = await getEventScanningStats(eventId, session.organizationId);

  // =============================================================================
  // Step 5: Get recent scans (optional, based on query param)
  // =============================================================================
  const includeRecent = url.searchParams.get("recent") === "true";
  let recentScans = null;
  if (includeRecent) {
    recentScans = await getRecentScans(eventId, session.organizationId, 10);
  }

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
    },
    stats,
    recentScans,
  });
}
