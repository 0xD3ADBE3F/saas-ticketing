import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createOrder,
  calculateOrderSummary,
  type CartItem
} from "@/server/services/orderService";

// =============================================================================
// Request Validation Schemas
// =============================================================================

const cartItemSchema = z.object({
  ticketTypeId: z.string().uuid(),
  quantity: z.number().int().min(0).max(10),
});

const createOrderSchema = z.object({
  eventSlug: z.string().min(1),
  buyerEmail: z.string().email("Ongeldig e-mailadres"),
  buyerName: z.string().max(100).optional(),
  items: z.array(cartItemSchema).min(1, "Selecteer minimaal 1 ticket"),
});

const calculateSummarySchema = z.object({
  eventSlug: z.string().min(1),
  items: z.array(cartItemSchema).min(1, "Selecteer minimaal 1 ticket"),
});

// =============================================================================
// POST /api/checkout - Create a pending order
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => issue.message).join(", ");
      return NextResponse.json(
        { error: errors },
        { status: 400 }
      );
    }

    const { eventSlug, buyerEmail, buyerName, items } = validation.data;

    // Create the order
    const result = await createOrder({
      eventSlug,
      buyerEmail,
      buyerName,
      items: items as CartItem[],
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Return order details for payment flow
    return NextResponse.json({
      orderId: result.data.id,
      orderNumber: result.data.orderNumber,
      totalAmount: result.data.totalAmount,
      expiresAt: result.data.expiresAt,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het aanmaken van je bestelling" },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/checkout?eventSlug=xxx&items=... - Calculate order summary
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventSlug = searchParams.get("eventSlug");
    const itemsParam = searchParams.get("items");

    if (!eventSlug || !itemsParam) {
      return NextResponse.json(
        { error: "eventSlug en items zijn verplicht" },
        { status: 400 }
      );
    }

    // Parse items from JSON string
    let items: CartItem[];
    try {
      items = JSON.parse(itemsParam);
    } catch {
      return NextResponse.json(
        { error: "Ongeldig items formaat" },
        { status: 400 }
      );
    }

    // Validate
    const validation = calculateSummarySchema.safeParse({ eventSlug, items });
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => issue.message).join(", ");
      return NextResponse.json(
        { error: errors },
        { status: 400 }
      );
    }

    // Calculate summary
    const result = await calculateOrderSummary(
      validation.data.eventSlug,
      validation.data.items as CartItem[]
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Calculate summary error:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het berekenen van je bestelling" },
      { status: 500 }
    );
  }
}
