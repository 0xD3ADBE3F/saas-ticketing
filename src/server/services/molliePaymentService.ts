import { prisma } from "@/server/lib/prisma";
import { orderRepo } from "@/server/repos/orderRepo";
import { generateAndSendTickets } from "@/server/services/paymentService";
import { mollieConnectService } from "@/server/services/mollieConnectService";
import { env } from "@/server/lib/env";
import { paymentLogger } from "@/server/lib/logger";

// =============================================================================
// Mollie Payment Service (Multi-tenant with Application Fees)
// =============================================================================

export type PaymentResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// =============================================================================
// Fee Configuration
// =============================================================================

/**
 * Mollie transaction fee (per payment)
 * This is deducted by Mollie from the organizer's account
 */
export const MOLLIE_FEE = 32; // €0.32 in cents

/**
 * Service Fee Structure (charged to buyer per order):
 * - Fixed: €0.50
 * - Variable: 2% of ticket total
 * - Label: "Servicekosten (incl. betalingskosten)"
 * - This fee goes to the platform (via Mollie application fee)
 *
 * Platform receives: Service Fee - Mollie Fee
 * - The service fee is charged to the buyer
 * - Mollie's transaction fee (€0.35) is paid by the organizer
 * - Platform gets the difference via application fee
 *
 * Note: Service fee calculation is centralized in orderService.calculateServiceFee()
 */

/**
 * Calculate platform application fee
 * This is what the platform receives via Mollie's application fee feature
 * Formula: Service Fee - Mollie Fee
 *
 * @param serviceFeeInCents - The service fee charged to the buyer (from Order.serviceFee)
 * @returns Platform application fee in cents (never negative)
 */
export function calculateApplicationFee(serviceFeeInCents: number): number {
  // Platform receives service fee minus Mollie's transaction fee
  // Ensure we never send a negative application fee
  return Math.max(0, serviceFeeInCents - MOLLIE_FEE);
}

/**
 * Format amount in cents to Mollie's decimal string format
 */
function formatAmount(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}



/**
 * Create a payment via Mollie using organization's access token
 * Includes application fee that goes directly to platform
 */
export async function createMolliePayment(
  orderId: string,
  organizationId: string,
  baseUrl: string
): Promise<PaymentResult<{ paymentId: string; checkoutUrl: string }>> {
  // Get the order
  const order = await orderRepo.findByIdPublic(orderId);

  if (!order) {
    return { success: false, error: "Bestelling niet gevonden" };
  }

  // Allow payment for PENDING and FAILED orders (for retry)
  if (order.status !== "PENDING" && order.status !== "FAILED") {
    return { success: false, error: "Bestelling kan niet meer betaald worden" };
  }

  // Check expiry
  if (order.expiresAt && new Date(order.expiresAt) < new Date()) {
    return { success: false, error: "Bestelling is verlopen" };
  }

  // Get organization to fetch Mollie profile ID
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { mollieProfileId: true },
  });

  if (!org?.mollieProfileId) {
    paymentLogger.error({ organizationId }, "Organization missing Mollie profile ID");
    return { success: false, error: "Mollie profiel niet geconfigureerd" };
  }

  const isTestMode = env.MOLLIE_TEST_MODE === "true";

  // Check for existing open payment
  if (order.paymentId) {
    try {
      const client = await mollieConnectService.getOrgClient(organizationId);
      const existingPayment = await client.payments.get(order.paymentId, {
        testmode: isTestMode,
      });

      if (existingPayment.status === "open" && existingPayment._links.checkout?.href) {
        return {
          success: true,
          data: {
            paymentId: existingPayment.id,
            checkoutUrl: existingPayment._links.checkout.href,
          },
        };
      }
    } catch {
      // Payment not found or invalid, create new one
    }
  }

  try {
    // Get Mollie client for this organization
    const client = await mollieConnectService.getOrgClient(organizationId);

    // Calculate application fee
    // The buyer pays serviceFee (€0.50 + 2%), which is included in order.totalAmount
    // Platform receives: serviceFee - Mollie's transaction fee (€0.35)
    // This is transferred immediately to platform's Mollie account
    const applicationFeeCents = calculateApplicationFee(order.serviceFee);

    // Create payment with application fee
    // profileId is required when using OAuth tokens (Mollie Connect)
    // testmode is required when using OAuth tokens in test mode
    paymentLogger.info({
      orderId,
      organizationId,
      totalAmount: formatAmount(order.totalAmount),
      serviceFee: formatAmount(order.serviceFee),
      applicationFee: formatAmount(applicationFeeCents),
      mollieFee: formatAmount(MOLLIE_FEE),
      profileId: org.mollieProfileId,
    }, "Creating Mollie payment");

    const payment = await client.payments.create({
      profileId: org.mollieProfileId,
      amount: {
        value: formatAmount(order.totalAmount),
        currency: "EUR",
      },
      description: `Order ${order.orderNumber}`,
      redirectUrl: `${baseUrl}/checkout/${orderId}?from=payment`,
      webhookUrl: `${baseUrl}/api/webhooks/payments`,
      metadata: {
        orderId,
        organizationId: order.organizationId,
        serviceFee: order.serviceFee,
        applicationFee: applicationFeeCents,
        mollieFee: MOLLIE_FEE,
      },
      // Application fee goes directly to platform's Mollie account
      // This is the service fee minus Mollie's transaction fee
      applicationFee: {
        amount: {
          value: formatAmount(applicationFeeCents),
          currency: "EUR",
        },
        description: "Servicekosten",
      },
      // Enable test mode for development/testing
      ...(isTestMode && { testmode: true }),
    });

    if (!payment._links.checkout?.href) {
      return { success: false, error: "Geen checkout URL ontvangen" };
    }

    // Update order with Mollie payment ID
    // If order was FAILED, reset to PENDING for retry
    if (order.status === "FAILED") {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentId: payment.id,
          status: "PENDING",
          updatedAt: new Date(),
        },
      });
    } else {
      await orderRepo.setPaymentId(orderId, payment.id);
    }

    return {
      success: true,
      data: {
        paymentId: payment.id,
        checkoutUrl: payment._links.checkout.href,
      },
    };
  } catch (err) {
    paymentLogger.error({ err, orderId, organizationId }, "Mollie payment creation failed");
    return { success: false, error: "Betaling aanmaken mislukt" };
  }
}

/**
 * Handle Mollie webhook callback
 * Fetches payment status and processes accordingly
 */
export async function handleMollieWebhook(
  paymentId: string
): Promise<PaymentResult<{ status: string; orderId?: string }>> {
  // Find order by payment ID to get organization
  const order = await orderRepo.findByPaymentId(paymentId);

  if (!order) {
    // Payment might be for a different system or invalid
    paymentLogger.warn({ paymentId }, "Order not found for payment");
    return { success: false, error: "Order niet gevonden" };
  }

  try {
    // Get Mollie client for the organization
    const client = await mollieConnectService.getOrgClient(order.organizationId);
    const isTestMode = env.MOLLIE_TEST_MODE === "true";

    // Fetch payment status from Mollie (testmode required for OAuth in test mode)
    const payment = await client.payments.get(paymentId, {
      testmode: isTestMode,
    });

    // Idempotent: check if already processed
    if (order.status === "PAID" && payment.status === "paid") {
      return { success: true, data: { status: "paid", orderId: order.id } };
    }

    // Handle different payment statuses
    switch (payment.status) {
      case "paid":
        const result = await processPaymentSuccess(paymentId, payment.method as string);
        if (result.success) {
          return { success: true, data: { status: "paid", orderId: order.id } };
        }
        return result;

      case "failed":
        await orderRepo.updateStatus(order.id, "FAILED");
        return { success: true, data: { status: "failed", orderId: order.id } };

      case "canceled":
        await orderRepo.updateStatus(order.id, "CANCELLED");
        return { success: true, data: { status: "canceled", orderId: order.id } };

      case "expired":
        await orderRepo.updateStatus(order.id, "CANCELLED");
        return { success: true, data: { status: "expired", orderId: order.id } };

      default:
        // open, pending - no action needed
        return { success: true, data: { status: payment.status, orderId: order.id } };
    }
  } catch (err) {
    paymentLogger.error({ err, paymentId, orderId: order.id }, "Mollie webhook processing failed");
    return { success: false, error: "Webhook verwerking mislukt" };
  }
}

/**
 * Process successful payment - mark as paid and generate tickets
 * Uses shared ticket generation logic from paymentService
 * Idempotent: safe to call multiple times
 */
async function processPaymentSuccess(
  paymentId: string,
  paymentMethod: string
): Promise<PaymentResult<{ orderId: string; ticketCount: number }>> {
  const order = await prisma.order.findUnique({
    where: { paymentId },
  });

  if (!order) {
    return { success: false, error: "Bestelling niet gevonden" };
  }

  // Idempotent check
  if (order.status === "PAID") {
    const ticketCount = await prisma.ticket.count({
      where: { orderId: order.id },
    });
    return { success: true, data: { orderId: order.id, ticketCount } };
  }

  // 1. Update order status to PAID
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paymentMethod,
    },
  });

  // 2. Generate tickets and send email using shared logic
  const ticketResult = await generateAndSendTickets(order.id);

  if (!ticketResult.success) {
    return ticketResult;
  }

  return {
    success: true,
    data: {
      orderId: order.id,
      ticketCount: ticketResult.data.ticketCount,
    },
  };
}

/**
 * Get payment status from Mollie
 */
export async function getPaymentStatus(
  paymentId: string,
  organizationId: string
): Promise<PaymentResult<{ status: string; paidAt?: Date }>> {
  try {
    const client = await mollieConnectService.getOrgClient(organizationId);
    const payment = await client.payments.get(paymentId);

    return {
      success: true,
      data: {
        status: payment.status,
        paidAt: payment.paidAt ? new Date(payment.paidAt) : undefined,
      },
    };
  } catch (err) {
    console.error("Failed to get payment status:", err);
    return { success: false, error: "Kon betalingsstatus niet ophalen" };
  }
}
