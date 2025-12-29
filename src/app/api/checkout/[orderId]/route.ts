import { NextRequest, NextResponse } from "next/server";
import { getOrderForCheckout } from "@/server/services/orderService";

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

// =============================================================================
// GET /api/checkout/[orderId] - Get order details for checkout/confirmation
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { orderId } = await params;

    // Validate orderId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json(
        { error: "Ongeldige bestelling ID" },
        { status: 400 }
      );
    }

    const result = await getOrderForCheckout(orderId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    const { order, event, items } = result.data;

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      buyerEmail: order.buyerEmail,
      buyerName: order.buyerName,
      ticketTotal: order.ticketTotal,
      serviceFee: order.serviceFee,
      totalAmount: order.totalAmount,
      expiresAt: order.expiresAt,
      createdAt: order.createdAt,
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location,
      },
      items,
    });
  } catch (error) {
    console.error("Get order error:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het ophalen van je bestelling" },
      { status: 500 }
    );
  }
}
