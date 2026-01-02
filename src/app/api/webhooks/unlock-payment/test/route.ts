import { NextResponse } from "next/server";
import { webhookLogger } from "@/server/lib/logger";

/**
 * Manual webhook test endpoint
 *
 * Use this to manually trigger the unlock payment webhook for testing
 *
 * Usage:
 * POST /api/webhooks/unlock-payment/test
 * Body: { "paymentId": "tr_xxxxx" }
 *
 * This endpoint fetches the real payment from Mollie and processes it
 * just like the real webhook would.
 */
export async function POST(request: Request) {
  try {
    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId is required" },
        { status: 400 }
      );
    }

    webhookLogger.info({ paymentId }, "Manual webhook test triggered");

    // Call the real webhook endpoint
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/unlock-payment`;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: paymentId }),
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      webhookResponse: result,
      webhookStatus: response.status,
    });
  } catch (error: any) {
    webhookLogger.error({ err: error }, "Manual webhook test error");
    return NextResponse.json(
      { error: error.message || "Test failed" },
      { status: 500 }
    );
  }
}
