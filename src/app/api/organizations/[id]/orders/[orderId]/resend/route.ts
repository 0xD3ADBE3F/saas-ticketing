import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { orderRepo } from "@/server/repos/orderRepo";
import { sendOrderTickets } from "@/server/services/emailService";
import { prisma } from "@/server/lib/prisma";

/**
 * POST /api/organizations/[id]/orders/[orderId]/resend
 * Manually resend order tickets
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, id: organizationId } = await params;

  try {
    // Verify order exists and user has access
    const order = await orderRepo.findById(orderId, user.id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only allow resending for PAID orders
    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: "Can only resend tickets for paid orders" },
        { status: 400 }
      );
    }

    // Get tickets for this order
    const tickets = await prisma.ticket.findMany({
      where: { orderId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            endsAt: true,
            location: true,
            organizationId: true,
            organization: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
          },
        },
        ticketType: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            buyerEmail: true,
            buyerName: true,
          },
        },
      },
    });

    if (tickets.length === 0) {
      return NextResponse.json(
        { error: "No tickets found for this order" },
        { status: 404 }
      );
    }

    const event = tickets[0].event;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Send email with tickets
    await sendOrderTickets(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        buyerEmail: order.buyerEmail,
        buyerName: order.buyerName,
      },
      {
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location,
        organization: {
          name: event.organization.name,
          logoUrl: event.organization.logoUrl,
        },
      },
      tickets,
      baseUrl
    );

    return NextResponse.json({
      success: true,
      message: "Tickets resent successfully",
    });
  } catch (err) {
    console.error("Failed to resend tickets:", err);
    return NextResponse.json(
      { error: "Failed to resend tickets" },
      { status: 500 }
    );
  }
}
