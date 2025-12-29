import { NextResponse } from "next/server";
import { handlePaymentWebhook, completeMockPayment } from "@/server/services/paymentService";
import { handleMollieWebhook } from "@/server/services/molliePaymentService";
import { webhookLogger } from "@/server/lib/logger";
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
        webhookLogger.warn({ requestId }, "Invalid payload");
        return NextResponse.json(
          { error: "Invalid payload" },
          { status: 400 }
        );
      }

      paymentId = parsed.data.id;
    }

    if (!paymentId) {
      webhookLogger.warn({ requestId }, "Missing payment ID");
      return NextResponse.json(
        { error: "Missing payment ID" },
        { status: 400 }
      );
    }

    webhookLogger.info({ requestId, paymentId }, "Processing payment webhook");

    // For mock payments, use mock handler
    if (paymentId.startsWith("tr_mock_")) {
      const result = await completeMockPayment(paymentId);
      const duration = Date.now() - startTime;

      if (!result.success) {
        webhookLogger.error({ requestId, duration, error: result.error }, "Mock payment webhook failed");
        // Still return 200 to acknowledge receipt
        return NextResponse.json({ received: true, error: result.error });
      }

      webhookLogger.info({ requestId, duration, orderId: result.data.orderId }, "Mock payment webhook success");
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
      webhookLogger.error({ requestId, duration, error: result.error }, "Mollie webhook failed");
      // Still return 200 to acknowledge receipt (Mollie expects 200)
      return NextResponse.json({ received: true, error: result.error });
    }

    webhookLogger.info(
      { requestId, duration, status: result.data.status, orderId: result.data.orderId },
      "Mollie webhook success"
    );
    return NextResponse.json({
      received: true,
      status: result.data.status,
      orderId: result.data.orderId,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    webhookLogger.error({ requestId, duration, error }, "Unexpected webhook error");
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
