import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations, hasRole } from "@/server/services/organizationService";
import { processBatchScanLogs } from "@/server/services/syncService";
import type { ScanResult } from "@/generated/prisma";

// =============================================================================
// POST /api/scanner/scanlogs/batch - Upload batch of offline scan logs
// =============================================================================
// Processes scan logs from offline devices with conflict resolution
// Requires SCANNER role or higher
// =============================================================================

const batchScanLogSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  logs: z.array(
    z.object({
      ticketId: z.string().uuid("Invalid ticket ID"),
      scannedAt: z.string().datetime("Invalid scan timestamp"),
      result: z.enum(["VALID", "ALREADY_USED", "INVALID", "REFUNDED"]),
    })
  ).min(1, "At least one scan log is required").max(1000, "Maximum 1000 logs per batch"),
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

  const parsed = batchScanLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // =============================================================================
  // Step 5: Process batch upload
  // =============================================================================
  try {
    const result = await processBatchScanLogs(
      parsed.data.logs.map((log) => ({
        ticketId: log.ticketId,
        scannedAt: log.scannedAt,
        result: log.result as ScanResult,
        deviceId: parsed.data.deviceId,
      })),
      organizationId,
      user.id,
      parsed.data.deviceId
    );

    // Determine response status based on results
    let statusCode = 200;
    if (result.failed === result.processed) {
      // All failed
      statusCode = 400;
    } else if (result.failed > 0 || result.conflicts > 0) {
      // Partial success
      statusCode = 207; // Multi-Status
    }

    return NextResponse.json({
      success: result.failed < result.processed,
      data: result,
      message: `Verwerkt ${result.processed} scans: ${result.successful} succesvol, ${result.conflicts} conflicten, ${result.failed} gefaald`,
    }, { status: statusCode });
  } catch (error) {
    console.error("Error processing batch scan logs:", error);

    return NextResponse.json(
      { error: "Fout bij verwerken van scan logs" },
      { status: 500 }
    );
  }
}
