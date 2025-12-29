import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { orderRepo } from "@/server/repos/orderRepo";
import { ticketRepo } from "@/server/repos/ticketRepo";

/**
 * GET /api/organizations/[id]/orders/[orderId]
 * Get order details with tickets
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;

  try {
    const order = await orderRepo.findById(orderId, user.id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get tickets for this order (order is already scoped via orderRepo)
    const tickets = await ticketRepo.findByOrder(orderId);

    return NextResponse.json({
      order,
      tickets,
    });
  } catch (err) {
    console.error("Failed to fetch order:", err);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
