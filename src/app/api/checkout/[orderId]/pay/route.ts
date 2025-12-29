import { NextResponse } from "next/server";
import { createPayment, completeMockPayment } from "@/server/services/paymentService";
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
  const { searchParams } = new URL(request.url);
  const isMock = searchParams.get("mock") === "true";
  const paymentId = searchParams.get("paymentId");
  const returnUrl = searchParams.get("returnUrl") || `/checkout/${orderId}`;

  if (!isMock || !paymentId) {
    return NextResponse.redirect(new URL(`/checkout/${orderId}`, request.url));
  }

  // Return a simple HTML page that simulates iDEAL payment
  const baseUrl = getAppUrl();
  const html = `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mock iDEAL Betaling</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 40px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 16px;
        }
        h1 {
          font-size: 24px;
          color: #1a1a1a;
          margin-bottom: 8px;
        }
        p {
          color: #666;
          margin-bottom: 24px;
        }
        .info {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .info-row:last-child { border: none; }
        .info-label { color: #888; }
        .info-value { font-weight: 600; color: #1a1a1a; }
        .buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        button {
          padding: 16px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-pay {
          background: #0ABF53;
          color: white;
        }
        .btn-pay:hover { background: #099A45; }
        .btn-cancel {
          background: #f5f5f5;
          color: #666;
        }
        .btn-cancel:hover { background: #eee; }
        .notice {
          margin-top: 24px;
          padding: 12px;
          background: #fff3cd;
          border-radius: 8px;
          font-size: 13px;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">🏦</div>
        <h1>Mock iDEAL Betaling</h1>
        <p>Dit is een test omgeving. Geen echte betaling wordt uitgevoerd.</p>

        <div class="info">
          <div class="info-row">
            <span class="info-label">Bestelling</span>
            <span class="info-value">${orderId.slice(0, 8)}...</span>
          </div>
          <div class="info-row">
            <span class="info-label">Betaal ID</span>
            <span class="info-value">${paymentId.slice(0, 15)}...</span>
          </div>
        </div>

        <div class="buttons">
          <form action="${baseUrl}/api/checkout/${orderId}/pay/complete" method="POST">
            <input type="hidden" name="paymentId" value="${paymentId}" />
            <button type="submit" class="btn-pay" style="width: 100%;">
              ✓ Betaling voltooien
            </button>
          </form>
          <a href="${returnUrl}">
            <button type="button" class="btn-cancel" style="width: 100%;">
              ✕ Annuleren
            </button>
          </a>
        </div>

        <div class="notice">
          ⚠️ Dit is een mock betalingspagina voor ontwikkeling.<br/>
          In productie wordt je doorgestuurd naar Mollie/iDEAL.
        </div>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
