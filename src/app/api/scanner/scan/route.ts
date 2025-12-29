import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations, hasRole } from "@/server/services/organizationService";
import { scanTicket } from "@/server/services/scanService";
import { idempotencyRepo } from "@/server/repos/idempotencyRepo";

// =============================================================================
// POST /api/scanner/scan - Scan a ticket
// =============================================================================
// Validates QR code, checks ticket status, logs scan attempt
// Requires SCANNER role or higher
// Supports idempotency for duplicate request handling
// =============================================================================

const scanRequestSchema = z.object({
  qrData: z.string().min(1, "QR data is required"),
  deviceId: z.string().optional(),
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
  // Step 4: Idempotency check
  // =============================================================================
  const endpoint = "/api/scanner/scan";
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) {
    // Check if this request was already processed
    const existing = await idempotencyRepo.findByKey(
      idempotencyKey,
      organizationId,
      endpoint
    );

    if (existing) {
      // Return cached response
      return NextResponse.json(existing.response, {
        status: existing.statusCode,
        headers: {
          "X-Idempotency-Replay": "true",
        },
      });
    }
  }

  // =============================================================================
  // Step 5: Parse request body
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

  const parsed = scanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // =============================================================================
  // Step 6: Perform scan
  // =============================================================================
  const result = await scanTicket({
    qrData: parsed.data.qrData,
    scannedBy: user.id,
    deviceId: parsed.data.deviceId,
    organizationId,
  });

  // =============================================================================
  // Step 7: Determine response status code
  // =============================================================================
  let statusCode: number;
  if (result.success) {
    statusCode = 200; // Successful scan
  } else if (result.result === "ALREADY_USED") {
    statusCode = 409; // Conflict - ticket already used
  } else if (result.result === "REFUNDED") {
    statusCode = 410; // Gone - ticket refunded
  } else {
    statusCode = 400; // Bad request - invalid QR or other error
  }

  // =============================================================================
  // Step 8: Build response
  // =============================================================================
  const responseBody = {
    success: result.success,
    result: result.result,
    message: result.message,
    ticket: result.ticket,
    firstScannedAt: result.firstScannedAt,
  };

  // =============================================================================
  // Step 9: Store idempotency key (if provided)
  // =============================================================================
  if (idempotencyKey) {
    try {
      await idempotencyRepo.store(
        idempotencyKey,
        organizationId,
        endpoint,
        statusCode,
        responseBody
      );
    } catch (error) {
      console.error("Failed to store idempotency key:", error);
      // Don't fail the request if idempotency storage fails
    }
  }

  return NextResponse.json(responseBody, { status: statusCode });
}
