import { NextResponse } from "next/server";
import { handlePaymentWebhook, completeMockPayment } from "@/server/services/paymentService";
import { z } from "zod";

const webhookSchema = z.object({
  id: z.string(), // Mollie payment ID
});

/**
 * POST /api/webhooks/payments
 * Handle payment status webhooks (mock or Mollie)
 *
 * In production, Mollie sends a POST with just the payment ID:
 * { "id": "tr_xxx" }
 *
 * This endpoint is idempotent - safe to call multiple times.
 */
export async function POST(request: Request) {
  try {
    // Check if this is a form submission or JSON
    const contentType = request.headers.get("content-type") || "";

    let paymentId: string;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Mollie sends form-encoded data
      const formData = await request.formData();
      paymentId = formData.get("id") as string;
    } else {
      // JSON payload (for testing)
      const body = await request.json();
      const parsed = webhookSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid payload" },
          { status: 400 }
        );
      }

      paymentId = parsed.data.id;
    }

    if (!paymentId) {
      return NextResponse.json(
        { error: "Missing payment ID" },
        { status: 400 }
      );
    }

    // For mock payments, complete them
    if (paymentId.startsWith("tr_mock_")) {
      const result = await completeMockPayment(paymentId);

      if (!result.success) {
        console.error("Mock payment webhook failed:", result.error);
        // Still return 200 to acknowledge receipt
        return NextResponse.json({ received: true, error: result.error });
      }

      return NextResponse.json({
        received: true,
        orderId: result.data.orderId,
        ticketCount: result.data.ticketCount,
      });
    }

    // For real Mollie payments (future implementation)
    const result = await handlePaymentWebhook(paymentId);

    if (!result.success) {
      console.error("Payment webhook failed:", result.error);
      // Still return 200 to acknowledge receipt (Mollie expects 200)
      return NextResponse.json({ received: true, error: result.error });
    }

    return NextResponse.json({
      received: true,
      status: result.data.status,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    // Return 200 anyway to prevent retries on non-recoverable errors
    return NextResponse.json({ received: true, error: "Internal error" });
  }
}

/**
 * GET /api/webhooks/payments
 * Health check for webhook endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Payment webhook endpoint is active",
  });
}
