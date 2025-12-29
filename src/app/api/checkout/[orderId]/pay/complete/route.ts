import { NextResponse } from "next/server";
import { completeMockPayment } from "@/server/services/paymentService";
import { getAppUrl } from "@/lib/env";

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

/**
 * POST /api/checkout/[orderId]/pay/complete
 * Complete a mock payment (simulate successful iDEAL callback)
 * In production, this would be handled by Mollie webhook
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    const formData = await request.formData();
    const paymentId = formData.get("paymentId") as string;

    if (!paymentId) {
      return NextResponse.redirect(
        new URL(`/checkout/${orderId}?error=missing_payment`, request.url)
      );
    }

    const result = await completeMockPayment(paymentId);

    if (!result.success) {
      return NextResponse.redirect(
        new URL(`/checkout/${orderId}?error=payment_failed`, request.url)
      );
    }

    // Redirect to checkout page with from=payment for polling
    const baseUrl = getAppUrl();
    return NextResponse.redirect(
      new URL(`/checkout/${orderId}?from=payment`, baseUrl)
    );
  } catch (error) {
    console.error("Error completing payment:", error);
    const { orderId } = await params;
    return NextResponse.redirect(
      new URL(`/checkout/${orderId}?error=server_error`, request.url)
    );
  }
}
