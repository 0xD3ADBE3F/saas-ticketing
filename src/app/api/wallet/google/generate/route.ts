import { NextRequest, NextResponse } from "next/server";
import { generateGooglePass } from "@/server/services/walletService";
import { prisma } from "@/server/lib/prisma";

/**
 * POST /api/wallet/google/generate
 *
 * Generate a Google Wallet pass link for a ticket
 *
 * Body: { ticketId: string }
 * Returns: { url: string } - URL to add pass to Google Wallet
 *
 * Note: This is a foundational implementation. Full functionality requires:
 * - Google Cloud Project
 * - Google Wallet API enabled
 * - Service account credentials
 */
export async function POST(request: NextRequest) {
  try {
    const { ticketId } = await request.json();

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Ticket niet gevonden" },
        { status: 404 }
      );
    }

    // Check if ticket belongs to a paid order
    if (ticket.order.status !== "PAID") {
      return NextResponse.json(
        { error: "Ticket is niet geldig voor wallet (betaling niet voltooid)" },
        { status: 400 }
      );
    }

    // Check if ticket is valid (not refunded or used)
    if (ticket.status === "REFUNDED") {
      return NextResponse.json(
        { error: "Ticket is gerefundeerd en kan niet aan wallet worden toegevoegd" },
        { status: 400 }
      );
    }

    // Generate pass
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const result = await generateGooglePass(
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
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Return Google Wallet link
    return NextResponse.json({ url: result.data });
  } catch (error) {
    console.error("Google Wallet generation error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het genereren van de wallet pass" },
      { status: 500 }
    );
  }
}
