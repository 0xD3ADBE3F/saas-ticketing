import { NextResponse } from "next/server";
import { createPayment } from "@/server/services/paymentService";
import { createMolliePayment } from "@/server/services/molliePaymentService";
import { mollieConnectService } from "@/server/services/mollieConnectService";
import { orderRepo } from "@/server/repos/orderRepo";
import { getAppUrl } from "@/lib/env";

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

/**
 * POST /api/checkout/[orderId]/pay
 * Initiate payment for an order
 * Uses real Mollie if organization is connected, otherwise mock
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    const baseUrl = getAppUrl();

    // Get order to determine organization
    const order = await orderRepo.findByIdPublic(orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Bestelling niet gevonden" },
        { status: 404 }
      );
    }

    // Check if organization has Mollie connected
    const isMollieConnected = await mollieConnectService.isConnected(order.organizationId);

    if (isMollieConnected) {
      // Use real Mollie payment
      const result = await createMolliePayment(orderId, order.organizationId, baseUrl);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        paymentId: result.data.paymentId,
        checkoutUrl: result.data.checkoutUrl,
      });
    }

    // Fallback to mock payment (for development/testing)
    const result = await createPayment(orderId, baseUrl);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      paymentId: result.data.paymentId,
      checkoutUrl: result.data.checkoutUrl,
    });
  } catch (error) {
    console.error("Error initiating payment:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het starten van de betaling" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/checkout/[orderId]/pay?mock=true&paymentId=xxx
 * Mock payment page - simulates iDEAL checkout
 * In production, this won't exist (Mollie handles checkout)
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { orderId } = await params;
  return NextResponse.redirect(new URL(`/checkout/${orderId}`, request.url));
}
