import { NextRequest, NextResponse } from "next/server";
import { createMollieClient, MollieClient } from "@mollie/api-client";
import { env } from "@/server/lib/env";

/**
 * Test Payment API Route
 * Creates a simple payment using the Mollie API for testing purposes
 *
 * ⚠️ This endpoint is for development/testing only
 * In production, payments should go through the proper order flow
 */

// Lazy initialization to avoid build-time errors
let _mollieClient: MollieClient | null = null;

function getMollieClient(): MollieClient {
  if (!_mollieClient) {
    _mollieClient = createMollieClient({
      apiKey: env.MOLLIE_API_KEY,
    });
  }
  return _mollieClient;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, redirectUrl } = body;

    // Validate input
    if (!amount || !description || !redirectUrl) {
      return NextResponse.json(
        { error: "Missing required fields: amount, description, redirectUrl" },
        { status: 400 }
      );
    }

    // Validate amount format (must be string like "10.00")
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 1) {
      return NextResponse.json(
        { error: "Amount must be at least €1.00" },
        { status: 400 }
      );
    }

    // Format amount to 2 decimal places
    const formattedAmount = amountNum.toFixed(2);

    // Create payment with Mollie
    const mollieClient = getMollieClient();
    const payment = await mollieClient.payments.create({
      amount: {
        currency: "EUR",
        value: formattedAmount,
      },
      description: description.substring(0, 255), // Max 255 chars
      redirectUrl: redirectUrl,
      // Optionally set webhook URL for payment status updates
      // webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payments`,
      metadata: {
        type: "test_payment",
        createdAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      checkoutUrl: payment.getCheckoutUrl(),
      amount: payment.amount,
      description: payment.description,
      createdAt: payment.createdAt,
    });
  } catch (error) {
    console.error("Error creating test payment:", error);

    // Handle Mollie API errors
    if (error instanceof Error) {
      // Check if it's a Mollie error with status code
      const mollieError = error as Error & { statusCode?: number };
      if (mollieError.statusCode === 401) {
        return NextResponse.json(
          { error: "Invalid Mollie API key. Check your MOLLIE_API_KEY environment variable." },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment" },
      { status: 500 }
    );
  }
}

/**
 * GET handler to retrieve payment status
 * Usage: GET /api/test-payment?id=tr_xxxxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("id");

    if (!paymentId) {
      return NextResponse.json(
        { error: "Missing payment ID" },
        { status: 400 }
      );
    }

    const mollieClient = getMollieClient();
    const payment = await mollieClient.payments.get(paymentId);

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      description: payment.description,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
      method: payment.method,
      metadata: payment.metadata,
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch payment" },
      { status: 500 }
    );
  }
}
