import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyTerminalToken } from "@/server/services/scannerTerminalService";
import { scanTicket } from "@/server/services/scanService";

// =============================================================================
// POST /api/scanner/mobile/scan - Scan a ticket (terminal auth)
// =============================================================================
// Simplified scan endpoint for standalone mobile scanner
// Uses terminal token instead of user session
// =============================================================================

const scanRequestSchema = z.object({
  qrData: z.string().min(1, "QR data is required"),
});

export async function POST(request: NextRequest) {
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
  // Step 2: Parse and validate request
  // =============================================================================
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ongeldige JSON in request body" },
      { status: 400 }
    );
  }

  const validation = scanRequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  const { qrData } = validation.data;

  // =============================================================================
  // Step 3: Scan the ticket
  // =============================================================================
  const result = await scanTicket({
    qrData,
    organizationId: session.organizationId,
    scannedBy: `terminal:${session.terminalId}`,
    deviceId: session.terminalId,
  });

  // =============================================================================
  // Step 4: Check if ticket belongs to correct event (if terminal is event-specific)
  // =============================================================================
  if (session.eventId && result.success && result.ticket) {
    // Get ticket's event ID from the result
    if (result.ticket.eventId && result.ticket.eventId !== session.eventId) {
      return NextResponse.json({
        success: false,
        result: "INVALID",
        message: "Dit ticket is voor een ander evenement",
      });
    }
  }

  // Return result
  return NextResponse.json(result);
}
