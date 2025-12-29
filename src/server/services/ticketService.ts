import crypto from "crypto";
import { ticketRepo, TicketWithDetails } from "@/server/repos/ticketRepo";
import { orderRepo } from "@/server/repos/orderRepo";

// =============================================================================
// Ticket Service
// =============================================================================
// Handles ticket retrieval, QR code generation, and token verification
// =============================================================================

export type TicketServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// =============================================================================
// QR Code & Token Security
// =============================================================================

/**
 * Secret key for signing QR tokens
 * In production, use TICKET_SIGNING_SECRET env var
 */
function getSigningSecret(): string {
  const secret = process.env.TICKET_SIGNING_SECRET;
  if (!secret) {
    // In development, use a default (but log a warning)
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ TICKET_SIGNING_SECRET not set, using default for development");
      return "dev-signing-secret-change-in-production";
    }
    throw new Error("TICKET_SIGNING_SECRET environment variable is required");
  }
  return secret;
}

/**
 * Generate QR code data for a ticket
 * Format: BASE_URL/scan/{ticketId}:{signature}
 *
 * The signature is created from the ticket's secretToken to ensure
 * the QR code cannot be forged without knowing the secret.
 */
export function generateQRData(ticket: { id: string; secretToken: string }, baseUrl: string): string {
  const signature = createSignature(ticket.secretToken);
  // The QR contains the ticket ID and a truncated signature
  // The full verification happens server-side using the secretToken
  return `${baseUrl}/scan/${ticket.id}:${signature.slice(0, 16)}`;
}

/**
 * Create HMAC signature for a token
 */
function createSignature(token: string): string {
  const secret = getSigningSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(token)
    .digest("hex");
}

/**
 * Verify a QR code signature
 */
export function verifyQRSignature(ticketId: string, providedSignature: string, secretToken: string): boolean {
  const expectedSignature = createSignature(secretToken);
  // Compare the truncated signature
  return expectedSignature.slice(0, 16) === providedSignature;
}

/**
 * Parse QR code data
 * Returns ticket ID and signature if valid format
 */
export function parseQRData(qrData: string): { ticketId: string; signature: string } | null {
  // Extract path from URL if full URL provided
  let path = qrData;
  try {
    const url = new URL(qrData);
    path = url.pathname;
  } catch {
    // Not a URL, might be just the path
  }

  // Match pattern: /scan/{ticketId}:{signature}
  const match = path.match(/\/scan\/([^:]+):([a-f0-9]+)/i);
  if (!match) return null;

  return {
    ticketId: match[1],
    signature: match[2],
  };
}

// =============================================================================
// Ticket Service Functions
// =============================================================================

/**
 * Get all tickets for an order
 */
export async function getTicketsForOrder(
  orderId: string
): Promise<TicketServiceResult<TicketWithDetails[]>> {
  const tickets = await ticketRepo.findByOrder(orderId);

  if (tickets.length === 0) {
    // Check if order exists but has no tickets
    const order = await orderRepo.findByIdPublic(orderId);
    if (!order) {
      return { success: false, error: "Bestelling niet gevonden" };
    }
    if (order.status !== "PAID") {
      return { success: false, error: "Bestelling is nog niet betaald" };
    }
  }

  return { success: true, data: tickets };
}

/**
 * Get a single ticket by code (human-readable)
 */
export async function getTicketByCode(
  code: string
): Promise<TicketServiceResult<TicketWithDetails>> {
  const ticket = await ticketRepo.findByCode(code.toUpperCase());

  if (!ticket) {
    return { success: false, error: "Ticket niet gevonden" };
  }

  return { success: true, data: ticket };
}

/**
 * Get ticket details with QR data for display
 */
export async function getTicketWithQR(
  ticketId: string,
  baseUrl: string
): Promise<TicketServiceResult<{
  ticket: TicketWithDetails;
  qrData: string;
}>> {
  const ticket = await ticketRepo.findById(ticketId);

  if (!ticket) {
    return { success: false, error: "Ticket niet gevonden" };
  }

  const qrData = generateQRData(ticket, baseUrl);

  return {
    success: true,
    data: {
      ticket,
      qrData,
    },
  };
}

/**
 * Get all tickets for an order with QR data
 */
export async function getTicketsWithQR(
  orderId: string,
  baseUrl: string
): Promise<TicketServiceResult<{
  tickets: (TicketWithDetails & { qrData: string })[];
  order: {
    orderNumber: string;
    buyerEmail: string;
    buyerName: string | null;
  };
  event: {
    title: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
  };
}>> {
  const tickets = await ticketRepo.findByOrder(orderId);

  if (tickets.length === 0) {
    const order = await orderRepo.findByIdPublic(orderId);
    if (!order) {
      return { success: false, error: "Bestelling niet gevonden" };
    }
    if (order.status !== "PAID") {
      return { success: false, error: "Bestelling is nog niet betaald" };
    }
    return { success: false, error: "Geen tickets gevonden voor deze bestelling" };
  }

  const ticketsWithQR = tickets.map((ticket) => ({
    ...ticket,
    qrData: generateQRData(ticket, baseUrl),
  }));

  // All tickets in an order belong to the same event
  const firstTicket = tickets[0];

  return {
    success: true,
    data: {
      tickets: ticketsWithQR,
      order: {
        orderNumber: firstTicket.order.orderNumber,
        buyerEmail: firstTicket.order.buyerEmail,
        buyerName: firstTicket.order.buyerName,
      },
      event: {
        title: firstTicket.event.title,
        startsAt: firstTicket.event.startsAt,
        endsAt: firstTicket.event.endsAt,
        location: firstTicket.event.location,
      },
    },
  };
}

/**
 * Verify a ticket for scanning
 * Returns ticket details if valid, or error if invalid
 */
export async function verifyTicketForScanning(
  qrData: string
): Promise<TicketServiceResult<{
  ticketId: string;
  code: string;
  status: string;
  ticketTypeName: string;
  eventTitle: string;
  isValid: boolean;
  reason?: string;
}>> {
  // Parse QR data
  const parsed = parseQRData(qrData);
  if (!parsed) {
    return { success: false, error: "Ongeldige QR code formaat" };
  }

  // Find ticket
  const ticket = await ticketRepo.findById(parsed.ticketId);
  if (!ticket) {
    return { success: false, error: "Ticket niet gevonden" };
  }

  // Verify signature
  if (!verifyQRSignature(parsed.ticketId, parsed.signature, ticket.secretToken)) {
    return { success: false, error: "Ongeldige QR code handtekening" };
  }

  // Check ticket status
  const isValid = ticket.status === "VALID";
  let reason: string | undefined;

  if (ticket.status === "USED") {
    reason = "Ticket is al gebruikt";
  } else if (ticket.status === "REFUNDED") {
    reason = "Ticket is terugbetaald";
  }

  return {
    success: true,
    data: {
      ticketId: ticket.id,
      code: ticket.code,
      status: ticket.status,
      ticketTypeName: ticket.ticketType.name,
      eventTitle: ticket.event.title,
      isValid,
      reason,
    },
  };
}

/**
 * Get ticket statistics for an event
 */
export async function getEventTicketStats(
  eventId: string
): Promise<TicketServiceResult<{
  total: number;
  valid: number;
  used: number;
  refunded: number;
  usedPercentage: number;
}>> {
  const stats = await ticketRepo.getEventStats(eventId);

  return {
    success: true,
    data: {
      ...stats,
      usedPercentage: stats.total > 0
        ? Math.round((stats.used / stats.total) * 100)
        : 0,
    },
  };
}
