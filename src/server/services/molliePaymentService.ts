import { prisma } from "@/server/lib/prisma";
import { orderRepo } from "@/server/repos/orderRepo";
import { ticketRepo } from "@/server/repos/ticketRepo";
import { sendOrderTickets } from "@/server/services/emailService";
import { mollieConnectService } from "@/server/services/mollieConnectService";
import { env } from "@/server/lib/env";
import { paymentLogger } from "@/server/lib/logger";
import { PaymentMethod } from "@mollie/api-client";
import crypto from "crypto";

// =============================================================================
// Mollie Payment Service (Multi-tenant with Application Fees)
// =============================================================================

export type PaymentResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Platform fee configuration
 * 2% per ticket sold (non-refundable)
 */
const PLATFORM_FEE_PERCENT = 0.02;

/**
 * Calculate platform fee in cents
 */
export function calculatePlatformFee(ticketTotalCents: number): number {
  return Math.round(ticketTotalCents * PLATFORM_FEE_PERCENT);
}

/**
 * Format amount in cents to Mollie's decimal string format
 */
function formatAmount(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

/**
 * Generate a unique ticket code (short, human-readable)
 */
function generateTicketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generate a secure secret token for QR validation
 */
function generateSecretToken(): string {
  return crypto.randomBytes(32).toString("hex");
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

    // Calculate platform fee (2% of ticket total, not service fee)
    const platformFeeCents = calculatePlatformFee(order.ticketTotal);

    // Create payment with application fee
    // profileId is required when using OAuth tokens (Mollie Connect)
    // testmode is required when using OAuth tokens in test mode
    paymentLogger.info({
      orderId,
      organizationId,
      totalAmount: formatAmount(order.totalAmount),
      platformFee: formatAmount(platformFeeCents),
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
      method: PaymentMethod.ideal, // iDEAL only for NL market
      metadata: {
        orderId: order.id,
        organizationId,
        orderNumber: order.orderNumber,
        platformFee: platformFeeCents,
      },
      // Application fee goes directly to platform's Mollie account
      applicationFee: {
        amount: {
          value: formatAmount(platformFeeCents),
          currency: "EUR",
        },
        description: "Platform fee",
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
 * Process successful payment - create tickets
 * Idempotent: safe to call multiple times
 */
async function processPaymentSuccess(
  paymentId: string,
  paymentMethod: string
): Promise<PaymentResult<{ orderId: string; ticketCount: number }>> {
  const order = await prisma.order.findUnique({
    where: { paymentId },
    include: {
      orderItems: {
        include: {
          ticketType: true,
        },
      },
    },
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

  // Transaction for atomicity
  const ticketCount = await prisma.$transaction(async (tx) => {
    // 1. Update order status
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentMethod,
      },
    });

    // 2. Create tickets
    const ticketsToCreate: {
      ticketTypeId: string;
      eventId: string;
      orderId: string;
      code: string;
      secretToken: string;
    }[] = [];

    for (const item of order.orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        let code = generateTicketCode();
        let attempts = 0;
        while (attempts < 5) {
          const existing = await tx.ticket.findUnique({
            where: { code },
          });
          if (!existing) break;
          code = generateTicketCode();
          attempts++;
        }

        ticketsToCreate.push({
          ticketTypeId: item.ticketTypeId,
          eventId: order.eventId,
          orderId: order.id,
          code,
          secretToken: generateSecretToken(),
        });
      }
    }

    await tx.ticket.createMany({ data: ticketsToCreate });

    // 3. Update sold counts
    for (const item of order.orderItems) {
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: { soldCount: { increment: item.quantity } },
      });
    }

    return ticketsToCreate.length;
  });

  // Send ticket email (non-blocking)
  try {
    const tickets = await ticketRepo.findByOrder(order.id);
    if (tickets.length > 0) {
      const firstTicket = tickets[0];
      const baseUrl = env.NEXT_PUBLIC_APP_URL;

      await sendOrderTickets(
        {
          orderNumber: firstTicket.order.orderNumber,
          buyerEmail: firstTicket.order.buyerEmail,
          buyerName: firstTicket.order.buyerName,
        },
        {
          title: firstTicket.event.title,
          startsAt: firstTicket.event.startsAt,
          endsAt: firstTicket.event.endsAt,
          location: firstTicket.event.location,
        },
        tickets,
        baseUrl
      );
    }
  } catch (emailError) {
    console.error("Failed to send ticket email:", emailError);
  }

  return { success: true, data: { orderId: order.id, ticketCount } };
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
