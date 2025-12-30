import { NextRequest, NextResponse } from "next/server";
import {
  handleSubscriptionPayment,
  handleRecurringPayment,
  handleEventPayment,
} from "@/server/services/mollieSubscriptionService";

// =============================================================================
// Subscription & Platform Billing Webhook Handler
// =============================================================================
//
// This endpoint receives webhooks from Mollie for platform billing payments.
// These payments are processed through Entro's platform Mollie account (NOT
// organization's connected accounts).
//
// Webhook events:
// - First payment (establishes mandate for recurring)
// - Recurring subscription payments
// - Event publication payments (PAY_PER_EVENT)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Mollie sends payment ID in form data
    const formData = await request.formData();
    const paymentId = formData.get("id");

    if (!paymentId || typeof paymentId !== "string") {
      console.error("Platform webhook: Missing payment ID");
      return NextResponse.json(
        { error: "Missing payment ID" },
        { status: 400 }
      );
    }

    console.log(`Processing platform billing webhook for payment: ${paymentId}`);

    // Try handling as event payment first
    const eventResult = await handleEventPayment(paymentId);
    if (eventResult.success) {
      // If it was an event payment, the type check inside will handle it
    }

    // Try handling as first subscription payment
    const firstPaymentResult = await handleSubscriptionPayment(paymentId);

    if (firstPaymentResult.success) {
      // If handled as first payment, we're done
      // handleSubscriptionPayment returns success even if it's not a first payment
      // It creates the recurring subscription if it is a first payment
    }

    // Also try handling as recurring payment
    // This handles subsequent monthly payments
    const recurringResult = await handleRecurringPayment(paymentId);

    if (!recurringResult.success) {
      console.error(
        `Platform webhook: Failed to process payment ${paymentId}:`,
        recurringResult.error
      );
      // Still return 200 to acknowledge receipt (Mollie will retry otherwise)
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Platform billing webhook error:", error);
    // Return 200 to prevent Mollie from retrying indefinitely
    // Log the error for investigation
    return NextResponse.json({ received: true, error: "Internal error logged" });
  }
}

// Mollie only sends POST requests to webhooks
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}