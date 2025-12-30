import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations, hasRole } from "@/server/services/organizationService";
import {
  createTerminal,
  listTerminals,
  getEventsForTerminal,
} from "@/server/services/scannerTerminalService";

// =============================================================================
// POST /api/scanner/terminals - Create a new scanner terminal
// =============================================================================
const createTerminalSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(100),
  eventId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  // Authentication
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  // Get organization
  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    return NextResponse.json(
      { error: "Geen organisatie gevonden" },
      { status: 404 }
    );
  }

  const organizationId = organizations[0].id;

  // Authorization - require ADMIN role
  const canManage = await hasRole(organizationId, user.id, "ADMIN");
  if (!canManage) {
    return NextResponse.json(
      { error: "Onvoldoende rechten. ADMIN rol vereist." },
      { status: 403 }
    );
  }

  // Parse request
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ongeldige JSON in request body" },
      { status: 400 }
    );
  }

  const validation = createTerminalSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, eventId, expiresAt } = validation.data;

  // Create terminal
  const result = await createTerminal({
    organizationId,
    name,
    eventId,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    userId: user.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.terminal, { status: 201 });
}

// =============================================================================
// GET /api/scanner/terminals - List all terminals
// =============================================================================
export async function GET(request: NextRequest) {
  // Authentication
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  // Get organization
  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    return NextResponse.json(
      { error: "Geen organisatie gevonden" },
      { status: 404 }
    );
  }

  const organizationId = organizations[0].id;

  // Authorization - require SCANNER role or higher
  const canView = await hasRole(organizationId, user.id, "SCANNER");
  if (!canView) {
    return NextResponse.json(
      { error: "Onvoldoende rechten" },
      { status: 403 }
    );
  }

  // Check for events query param
  const url = new URL(request.url);
  const includeEvents = url.searchParams.get("events") === "true";

  if (includeEvents) {
    // Return events for terminal creation
    const events = await getEventsForTerminal(organizationId, user.id);
    return NextResponse.json({ events });
  }

  // List terminals
  const terminals = await listTerminals(organizationId);

  return NextResponse.json({ terminals });
}
