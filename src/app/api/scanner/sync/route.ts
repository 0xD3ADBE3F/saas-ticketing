import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations, hasRole } from "@/server/services/organizationService";
import { prepareTicketDataset } from "@/server/services/syncService";

// =============================================================================
// POST /api/scanner/sync - Download ticket dataset for offline scanning
// =============================================================================
// Returns all tickets for an event with validation data
// Requires SCANNER role or higher
// =============================================================================

const syncRequestSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  deviceId: z.string().min(1, "Device ID is required"),
});

export async function POST(request: NextRequest) {
  // =============================================================================
  // Step 1: Authentication
  // =============================================================================
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Niet ingelogd" },
      { status: 401 }
    );
  }

  // =============================================================================
  // Step 2: Get organization
  // =============================================================================
  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    return NextResponse.json(
      { error: "Geen organisatie gevonden" },
      { status: 404 }
    );
  }

  const organizationId = organizations[0].id;

  // =============================================================================
  // Step 3: Authorization - require SCANNER role or higher
  // =============================================================================
  const canScan = await hasRole(organizationId, user.id, "SCANNER");
  if (!canScan) {
    return NextResponse.json(
      { error: "Onvoldoende rechten. SCANNER rol vereist." },
      { status: 403 }
    );
  }

  // =============================================================================
  // Step 4: Parse request body
  // =============================================================================
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ongeldige JSON" },
      { status: 400 }
    );
  }

  const parsed = syncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // =============================================================================
  // Step 5: Prepare ticket dataset
  // =============================================================================
  try {
    const dataset = await prepareTicketDataset(
      parsed.data.eventId,
      organizationId,
      parsed.data.deviceId,
      user.id
    );

    return NextResponse.json({
      success: true,
      data: dataset,
    });
  } catch (error) {
    console.error("Error preparing ticket dataset:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Event niet gevonden of geen toegang" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Fout bij voorbereiden van ticket dataset" },
      { status: 500 }
    );
  }
}
