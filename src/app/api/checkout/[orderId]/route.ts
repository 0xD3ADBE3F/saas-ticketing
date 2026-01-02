import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrderForCheckout, completeFreeOrder } from "@/server/services/orderService";
import { orderRepo } from "@/server/repos/orderRepo";

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
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        buyerEmail: order.buyerEmail,
        buyerName: order.buyerName,
        ticketTotal: order.ticketTotal,
        serviceFee: order.serviceFee,
        totalAmount: order.totalAmount,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
      },
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location,
      },
      items,
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Get order error:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het ophalen van je bestelling" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/checkout/[orderId] - Update buyer details
// =============================================================================

const updateBuyerSchema = z.object({
  buyerEmail: z.string().email("Ongeldig e-mailadres"),
  buyerName: z.string().max(100).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { orderId } = await params;
    const body = await request.json();

    // Validate request body
    const validation = updateBuyerSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => issue.message).join(", ");
      return NextResponse.json(
        { error: errors },
        { status: 400 }
      );
    }

    const { buyerEmail, buyerName } = validation.data;

    // Update order with buyer details
    const order = await orderRepo.updateBuyerDetails(orderId, {
      buyerEmail,
      buyerName,
    });

    if (!order) {
      return NextResponse.json(
        { error: "Bestelling niet gevonden" },
        { status: 404 }
      );
    }

    // If this is a free order (totalAmount = 0), complete it immediately
    if (order.totalAmount === 0 && order.status === "PENDING") {
      const completeResult = await completeFreeOrder(orderId);

      if (!completeResult.success) {
        console.error("Failed to complete free order:", completeResult.error);
        // Log error but don't fail the request - buyer details are saved
        // The order can still be completed later
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
    });
  } catch (error) {
    console.error("Update buyer details error:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het bijwerken van je gegevens" },
      { status: 500 }
    );
  }
}
