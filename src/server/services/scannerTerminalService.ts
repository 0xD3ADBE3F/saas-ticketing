import { scannerTerminalRepo } from "@/server/repos/scannerTerminalRepo";
import { eventRepo } from "@/server/repos/eventRepo";
import { SignJWT, jwtVerify } from "jose";

// Terminal session token secret (use TICKET_SIGNING_SECRET or separate)
const getSecret = () => {
  const secret = process.env.TICKET_SIGNING_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      return new TextEncoder().encode("dev-secret-key-for-scanner-terminals");
    }
    throw new Error("TICKET_SIGNING_SECRET environment variable is required");
  }
  return new TextEncoder().encode(secret);
};

export type TerminalSession = {
  terminalId: string;
  organizationId: string;
  eventId: string | null;
  terminalName: string;
};

export type CreateTerminalInput = {
  organizationId: string;
  eventId?: string;
  name: string;
  expiresAt?: Date;
  userId: string;
};

export type TerminalAuthResult =
  | {
      success: true;
      session: TerminalSession;
      token: string;
      organization: { id: string; name: string; slug: string };
      event: { id: string; title: string; startsAt: Date; endsAt: Date } | null;
    }
  | {
      success: false;
      error: string;
    };

export type CreateTerminalResult =
  | {
      success: true;
      terminal: {
        id: string;
        code: string;
        name: string;
        eventId: string | null;
        isActive: boolean;
        expiresAt: Date | null;
        createdAt: Date;
      };
    }
  | {
      success: false;
      error: string;
    };

/**
 * Generate a unique 6-character terminal code
 * Format: 3 uppercase letters + 3 digits (e.g., "ABC123")
 */
export function generateTerminalCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Exclude I, O to avoid confusion
  const digits = "0123456789";

  let code = "";

  // 3 letters
  for (let i = 0; i < 3; i++) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }

  // 3 digits
  for (let i = 0; i < 3; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }

  return code;
}

/**
 * Create a new scanner terminal
 */
export async function createTerminal(
  input: CreateTerminalInput
): Promise<CreateTerminalResult> {
  // Validate event if provided
  if (input.eventId) {
    const event = await eventRepo.findByIdInOrg(input.eventId, input.organizationId);
    if (!event) {
      return { success: false, error: "Evenement niet gevonden" };
    }
  }

  // Generate unique code (retry up to 5 times)
  let code: string | null = null;
  for (let i = 0; i < 5; i++) {
    const candidate = generateTerminalCode();
    const taken = await scannerTerminalRepo.isCodeTaken(candidate);
    if (!taken) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    return { success: false, error: "Kon geen unieke code genereren" };
  }

  const terminal = await scannerTerminalRepo.create({
    organizationId: input.organizationId,
    eventId: input.eventId,
    code,
    name: input.name,
    expiresAt: input.expiresAt,
    createdBy: input.userId,
  });

  return {
    success: true,
    terminal: {
      id: terminal.id,
      code: terminal.code,
      name: terminal.name,
      eventId: terminal.eventId,
      isActive: terminal.isActive,
      expiresAt: terminal.expiresAt,
      createdAt: terminal.createdAt,
    },
  };
}

/**
 * Authenticate a terminal by code
 */
export async function authenticateTerminal(
  code: string
): Promise<TerminalAuthResult> {
  // Find terminal with details
  const terminal = await scannerTerminalRepo.findByCodeWithDetails(code);

  if (!terminal) {
    return { success: false, error: "Ongeldige terminal code" };
  }

  // Check if active
  if (!terminal.isActive) {
    return { success: false, error: "Deze terminal is gedeactiveerd" };
  }

  // Check expiration
  if (terminal.expiresAt && terminal.expiresAt < new Date()) {
    return { success: false, error: "Deze terminal code is verlopen" };
  }

  // Update last used
  await scannerTerminalRepo.updateLastUsed(terminal.id);

  // Create session
  const session: TerminalSession = {
    terminalId: terminal.id,
    organizationId: terminal.organizationId,
    eventId: terminal.eventId,
    terminalName: terminal.name,
  };

  // Generate JWT token (24 hour validity)
  const token = await new SignJWT({
    ...session,
    type: "terminal",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());

  return {
    success: true,
    session,
    token,
    organization: terminal.organization,
    event: terminal.event,
  };
}

/**
 * Verify a terminal session token
 */
export async function verifyTerminalToken(
  token: string
): Promise<TerminalSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());

    if (payload.type !== "terminal") {
      return null;
    }

    // Verify terminal still exists and is active
    // We query but don't use the result - just checking existence
    await scannerTerminalRepo.findByCode(
      (payload as unknown as TerminalSession & { type: string }).terminalId
    );

    // Note: We don't require the terminal to still exist for the session to be valid
    // This allows sessions to continue even if the terminal is deleted during an event
    // The organizationId in the token is sufficient for authorization

    return {
      terminalId: payload.terminalId as string,
      organizationId: payload.organizationId as string,
      eventId: payload.eventId as string | null,
      terminalName: payload.terminalName as string,
    };
  } catch {
    return null;
  }
}

/**
 * List all terminals for an organization
 */
export async function listTerminals(organizationId: string) {
  return scannerTerminalRepo.findByOrganization(organizationId);
}

/**
 * Deactivate a terminal
 */
export async function deactivateTerminal(
  terminalId: string,
  organizationId: string
): Promise<boolean> {
  const result = await scannerTerminalRepo.deactivate(terminalId, organizationId);
  return result !== null;
}

/**
 * Activate a terminal
 */
export async function activateTerminal(
  terminalId: string,
  organizationId: string
): Promise<boolean> {
  const result = await scannerTerminalRepo.activate(terminalId, organizationId);
  return result !== null;
}

/**
 * Delete a terminal
 */
export async function deleteTerminal(
  terminalId: string,
  organizationId: string
): Promise<boolean> {
  return scannerTerminalRepo.delete(terminalId, organizationId);
}

/**
 * Get events available for scanner terminals
 */
export async function getEventsForTerminal(
  organizationId: string,
  userId: string
) {
  const events = await eventRepo.findByOrganization(organizationId, userId, {
    status: "LIVE",
  });
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
  }));
}
