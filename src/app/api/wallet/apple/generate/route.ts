import { NextRequest, NextResponse } from "next/server";
import { generateApplePass } from "@/server/services/walletService";
import { prisma } from "@/server/lib/prisma";
import { walletPassRepo } from "@/server/repos/walletPassRepo";

/**
 * Apple Wallet Pass Generation API
 *
 * GET /api/wallet/apple/generate?ticketId=xxx
 * POST /api/wallet/apple/generate (body: { ticketId: string })
 *
 * Returns a .pkpass file that Safari/iOS can open directly.
 *
 * Critical headers for Safari compatibility:
 * - Content-Type: application/vnd.apple.pkpass
 * - Content-Disposition: attachment; filename="ticket.pkpass"
 * - Content-Length: <exact byte size>
 *
 * Safari will show "Cannot download this file" if:
 * - The pkpass is malformed (missing icon, bad signature, etc.)
 * - Headers are incorrect
 * - The response is chunked without Content-Length
 */

const LOG_PREFIX = "[WalletAPI]";

function log(level: "info" | "warn" | "error", message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} ${LOG_PREFIX} [${level.toUpperCase()}] ${message}`;
  if (data) {
    console[level](logMessage, data);
  } else {
    console[level](logMessage);
  }
}

async function generatePass(ticketId: string): Promise<NextResponse> {
  log("info", "Apple Wallet pass requested", { ticketId });

  if (!ticketId) {
    log("warn", "Missing ticketId parameter");
    return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
  }

  // Check if certificate is configured
  const cert = await prisma.walletCertificate.findFirst({
    where: {
      platform: "APPLE",
      expiresAt: { gt: new Date() },
    },
  });

  log("info", "Certificate status", {
    exists: !!cert,
    hasPassTypeId: !!cert?.passTypeId,
    hasTeamId: !!cert?.teamId,
    hasCertPem: !!cert?.certificatePem,
    hasKeyPem: !!cert?.privateKeyPem,
    expiresAt: cert?.expiresAt,
  });

  if (!cert) {
    return NextResponse.json(
      {
        error: "Apple Wallet is niet geconfigureerd",
        details:
          "Er is geen geldig certificaat gevonden. Neem contact op met de beheerder.",
      },
      { status: 503 }
    );
  }

  // Check if pass already exists and is cached
  const existingPass = await walletPassRepo.findByTicketId(ticketId);
  if (existingPass?.passUrl) {
    log("info", "Found existing pass, attempting to serve from cache", {
      passUrl: existingPass.passUrl,
    });

    try {
      const response = await fetch(existingPass.passUrl);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        log("info", "Serving cached pass", { size: buffer.byteLength });

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.apple.pkpass",
            "Content-Disposition": `attachment; filename="ticket-${ticketId}.pkpass"`,
            "Content-Length": String(buffer.byteLength),
            "Cache-Control": "private, max-age=3600",
            // Prevent Safari from caching stale responses
            Pragma: "no-cache",
          },
        });
      } else {
        log("warn", "Cached pass URL returned error, regenerating", {
          status: response.status,
        });
      }
    } catch (error) {
      log("warn", "Failed to fetch cached pass, regenerating", { error });
    }
  }

  // Fetch ticket with related data
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: {
        include: {
          organization: true,
        },
      },
      ticketType: true,
      order: true,
    },
  });

  if (!ticket) {
    log("warn", "Ticket not found", { ticketId });
    return NextResponse.json({ error: "Ticket niet gevonden" }, { status: 404 });
  }

  // Validate ticket status
  if (ticket.order.status !== "PAID") {
    log("warn", "Ticket order not paid", {
      ticketId,
      orderStatus: ticket.order.status,
    });
    return NextResponse.json(
      { error: "Ticket is niet geldig (betaling niet voltooid)" },
      { status: 400 }
    );
  }

  if (ticket.status === "REFUNDED") {
    log("warn", "Ticket is refunded", { ticketId });
    return NextResponse.json(
      { error: "Ticket is gerefundeerd en kan niet worden toegevoegd" },
      { status: 400 }
    );
  }

  // Generate pass
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://entro.nl";
  log("info", "Generating new Apple Wallet pass", {
    ticketId,
    eventTitle: ticket.event.title,
    baseUrl,
  });

  const result = await generateApplePass(
    {
      ticketId: ticket.id,
      ticketCode: ticket.code,
      secretToken: ticket.secretToken,
      eventTitle: ticket.event.title,
      eventDate: ticket.event.startsAt,
      eventLocation: ticket.event.location,
      ticketTypeName: ticket.ticketType.name,
      buyerName: ticket.order.buyerName,
      organizationName: ticket.event.organization.name,
      organizationLogo: ticket.event.organization.logoUrl || undefined,
    },
    baseUrl
  );

  if (!result.success) {
    log("error", "Failed to generate pass", {
      error: result.error,
      details: result.details,
    });
    return NextResponse.json(
      {
        error: result.error,
        details: result.details,
      },
      { status: 500 }
    );
  }

  const passBuffer = result.data;
  log("info", "Pass generated successfully", { size: passBuffer.byteLength });

  // Convert Buffer to Uint8Array for NextResponse compatibility
  const passData = new Uint8Array(passBuffer);

  // Return the pass with correct headers for Safari/iOS
  // These headers are CRITICAL for Safari to handle the file correctly
  return new NextResponse(passData, {
    status: 200,
    headers: {
      // MIME type for Apple Wallet passes
      "Content-Type": "application/vnd.apple.pkpass",

      // Use "attachment" to trigger download dialog
      // Safari on iOS will automatically open Wallet for this MIME type
      "Content-Disposition": `attachment; filename="ticket-${ticket.code}.pkpass"`,

      // Content-Length is REQUIRED for Safari to download correctly
      // Without it, Safari may show "Cannot download this file"
      "Content-Length": String(passBuffer.byteLength),

      // Cache control - allow caching but verify freshness
      "Cache-Control": "private, max-age=3600",

      // CORS headers (if needed for cross-origin requests)
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
    },
  });
}

/**
 * GET handler - for direct links and iOS Safari
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const ticketId = request.nextUrl.searchParams.get("ticketId");
    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }
    return await generatePass(ticketId);
  } catch (error) {
    log("error", "Unexpected error in GET handler", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het genereren van de wallet pass" },
      { status: 500 }
    );
  }
}

/**
 * POST handler - for programmatic requests
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const ticketId = body.ticketId;
    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }
    return await generatePass(ticketId);
  } catch (error) {
    log("error", "Unexpected error in POST handler", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het genereren van de wallet pass" },
      { status: 500 }
    );
  }
}
