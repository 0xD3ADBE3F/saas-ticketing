import { NextResponse } from "next/server";
import { handlePaymentWebhook, completeMockPayment } from "@/server/services/paymentService";
import { handleMollieWebhook } from "@/server/services/molliePaymentService";
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
 *
 * Mollie webhook behavior:
 * - Mollie expects a 2xx response within 10 seconds
 * - If not, Mollie will retry with exponential backoff
 * - We always return 200 to acknowledge receipt
 * - We log errors but don't block the response
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);

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
        console.warn(`[Webhook ${requestId}] Invalid payload`);
        return NextResponse.json(
          { error: "Invalid payload" },
          { status: 400 }
        );
      }

      paymentId = parsed.data.id;
    }

    if (!paymentId) {
      console.warn(`[Webhook ${requestId}] Missing payment ID`);
      return NextResponse.json(
        { error: "Missing payment ID" },
        { status: 400 }
      );
    }

    console.log(`[Webhook ${requestId}] Processing payment: ${paymentId}`);

    // For mock payments, use mock handler
    if (paymentId.startsWith("tr_mock_")) {
      const result = await completeMockPayment(paymentId);
      const duration = Date.now() - startTime;

      if (!result.success) {
        console.error(`[Webhook ${requestId}] Mock payment failed (${duration}ms):`, result.error);
        // Still return 200 to acknowledge receipt
        return NextResponse.json({ received: true, error: result.error });
      }

      console.log(`[Webhook ${requestId}] Mock payment success (${duration}ms): order=${result.data.orderId}`);
      return NextResponse.json({
        received: true,
        orderId: result.data.orderId,
        ticketCount: result.data.ticketCount,
      });
    }

    // For real Mollie payments
    const result = await handleMollieWebhook(paymentId);
    const duration = Date.now() - startTime;

    if (!result.success) {
      console.error(`[Webhook ${requestId}] Mollie webhook failed (${duration}ms):`, result.error);
      // Still return 200 to acknowledge receipt (Mollie expects 200)
      return NextResponse.json({ received: true, error: result.error });
    }

    console.log(`[Webhook ${requestId}] Mollie webhook success (${duration}ms): status=${result.data.status}, order=${result.data.orderId}`);
    return NextResponse.json({
      received: true,
      status: result.data.status,
      orderId: result.data.orderId,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Webhook ${requestId}] Unexpected error (${duration}ms):`, error);
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
