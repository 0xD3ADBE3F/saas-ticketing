import { NextRequest, NextResponse } from "next/server";
import { cancelOrder } from "@/server/services/orderService";

/**
 * Cancel an order
 * POST /api/orders/:id/cancel
 *
 * User-initiated cancellation of PENDING or FAILED orders.
 * This will:
 * - Update order status to CANCELLED
 * - Release ticket capacity back to ticket types
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const result = await cancelOrder(orderId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Redirect back to checkout page to show cancelled status
    return NextResponse.redirect(
      new URL(`/checkout/${orderId}`, request.url)
    );
  } catch (error) {
    console.error("Error cancelling order:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het annuleren van de bestelling" },
      { status: 500 }
    );
  }
}
