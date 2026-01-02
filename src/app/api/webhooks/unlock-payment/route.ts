import { NextResponse } from "next/server";
import { freeEventLimitService } from "@/server/services/freeEventLimitService";
import { webhookLogger } from "@/server/lib/logger";

async function verifyMolliePayment(paymentId: string) {
  const platformMollieKey = process.env.MOLLIE_API_KEY;

  if (!platformMollieKey) {
    throw new Error("Platform Mollie API key not configured");
  }

  const response = await fetch(
    `https://api.mollie.com/v2/payments/${paymentId}`,
    {
      headers: {
        Authorization: `Bearer ${platformMollieKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to verify payment with Mollie");
  }

  return response.json();
}

export async function POST(request: Request) {
  try {
    webhookLogger.info("Unlock payment webhook received");

    // Mollie sends form-encoded data, not JSON
    const formData = await request.formData();
    const paymentId = formData.get("id") as string;

    if (!paymentId) {
      webhookLogger.error("No payment ID provided");
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    webhookLogger.info({ paymentId }, "Verifying payment");
    // Verify payment with Mollie
    const paymentData = await verifyMolliePayment(paymentId);

    webhookLogger.info({ status: paymentData.status, metadata: paymentData.metadata }, "Payment verified");

    // Check if payment is paid and has unlock metadata
    if (
      paymentData.status === "paid" &&
      paymentData.metadata?.type === "EVENT_UNLOCK"
    ) {
      webhookLogger.info({ eventId: paymentData.metadata.eventId }, "Processing unlock payment");
      await freeEventLimitService.processUnlockPayment(
        paymentId,
        paymentData.metadata.eventId,
        paymentData.metadata.organizationId
      );
      webhookLogger.info({ eventId: paymentData.metadata.eventId }, "Event unlocked successfully");
    } else {
      webhookLogger.warn({
        status: paymentData.status,
        hasMetadata: !!paymentData.metadata,
        type: paymentData.metadata?.type,
      }, "Payment not processed");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    webhookLogger.error({ err: error }, "Unlock payment webhook error");
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
