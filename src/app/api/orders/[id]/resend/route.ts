import { NextResponse } from "next/server";
import { ticketRepo } from "@/server/repos/ticketRepo";
import { sendOrderTickets } from "@/server/services/emailService";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/orders/[id]/resend
 * Resend tickets to the buyer's email
 * Requires authentication and organization membership
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: orderId } = await params;

    // Get authenticated user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Niet ingelogd" },
        { status: 401 }
      );
    }

    // Get order with organization check
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        organization: {
          memberships: {
            some: { userId: user.id },
          },
        },
      },
      include: {
        event: {
          select: {
            title: true,
            startsAt: true,
            endsAt: true,
            location: true,
            organization: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Bestelling niet gevonden" },
        { status: 404 }
      );
    }

    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: "Kan alleen tickets versturen voor betaalde bestellingen" },
        { status: 400 }
      );
    }

    // Get tickets for the order
    const tickets = await ticketRepo.findByOrder(orderId);

    if (tickets.length === 0) {
      return NextResponse.json(
        { error: "Geen tickets gevonden voor deze bestelling" },
        { status: 404 }
      );
    }

    // Send email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const result = await sendOrderTickets(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        buyerEmail: order.buyerEmail,
        buyerName: order.buyerName,
      },
      {
        title: order.event.title,
        startsAt: order.event.startsAt,
        endsAt: order.event.endsAt,
        location: order.event.location,
        organization: {
          name: order.event.organization.name,
          logoUrl: order.event.organization.logoUrl,
        },
      },
      tickets,
      baseUrl
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Tickets verstuurd naar ${order.buyerEmail}`,
      ticketCount: tickets.length,
    });
  } catch (error) {
    console.error("Error resending tickets:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het versturen van de tickets" },
      { status: 500 }
    );
  }
}
