import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateTerminal } from "@/server/services/scannerTerminalService";

// =============================================================================
// POST /api/scanner/auth/terminal - Authenticate with terminal code
// =============================================================================
// Simple authentication using 6-character terminal code
// Returns JWT token for subsequent scanner API calls
// No user account required - designed for door staff
// =============================================================================

const authSchema = z.object({
  code: z
    .string()
    .length(6, "Code moet 6 tekens zijn")
    .regex(/^[A-Z0-9]+$/i, "Code mag alleen letters en cijfers bevatten"),
});

export async function POST(request: NextRequest) {
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

  const validation = authSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  const { code } = validation.data;

  // Authenticate
  const result = await authenticateTerminal(code.toUpperCase());

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 401 }
    );
  }

  // Return session info and token
  return NextResponse.json({
    success: true,
    token: result.token,
    terminal: {
      id: result.session.terminalId,
      name: result.session.terminalName,
    },
    organization: result.organization,
    event: result.event,
  });
}
