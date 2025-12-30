import { prisma } from "@/server/lib/prisma";
import { orderRepo } from "@/server/repos/orderRepo";
import { ticketRepo } from "@/server/repos/ticketRepo";
import { sendOrderTickets } from "@/server/services/emailService";
import { planLimitsService } from "@/server/services/planLimitsService";
import { nanoid } from "nanoid";
import crypto from "crypto";

// =============================================================================
// Mock Payment Service
// =============================================================================
// This is a simplified payment service for development/testing.
// In production, this will be replaced with Mollie Connect integration.
// =============================================================================

export type PaymentResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type MockPayment = {
  id: string;
  orderId: string;
  amount: number;
  status: "open" | "pending" | "paid" | "failed" | "expired" | "canceled";
  checkoutUrl: string;
  createdAt: Date;
};

// In-memory storage for mock payments (in production, this would be Mollie)
const mockPayments = new Map<string, MockPayment>();

/**
 * Generate a unique ticket code (short, human-readable)
 * Format: XXXX-XXXX (8 chars total, uppercase alphanumeric)
 */
function generateTicketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (0,O,1,I)
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generate a secure secret token for QR code validation
 * This token is used to validate scans and should never be exposed publicly
 */
function generateSecretToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a mock payment for an order
 * In production, this would call Mollie's Create Payment API
 */
export async function createPayment(
  orderId: string,
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

  // Check if order is expired
  if (order.expiresAt && new Date(order.expiresAt) < new Date()) {
    return { success: false, error: "Bestelling is verlopen" };
  }

  // Check if payment already exists
  if (order.paymentId) {
    const existingPayment = mockPayments.get(order.paymentId);
    if (existingPayment && existingPayment.status === "open") {
      return {
        success: true,
        data: {
          paymentId: existingPayment.id,
          checkoutUrl: existingPayment.checkoutUrl,
        },
      };
    }
  }

  // Create mock payment ID
  const paymentId = `tr_mock_${nanoid(10)}`;

  // Create mock checkout URL
  // In production, this would be Mollie's hosted checkout URL
  const checkoutUrl = `${baseUrl}/api/checkout/${orderId}/pay?mock=true&paymentId=${paymentId}&returnUrl=${encodeURIComponent(`${baseUrl}/checkout/${orderId}?from=payment`)}`;

  // Store mock payment
  const mockPayment: MockPayment = {
    id: paymentId,
    orderId,
    amount: order.totalAmount,
    status: "open",
    checkoutUrl,
    createdAt: new Date(),
  };
  mockPayments.set(paymentId, mockPayment);

  // Update order with payment ID
  // If order was FAILED, reset to PENDING for retry
  if (order.status === "FAILED") {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentId,
        status: "PENDING",
        updatedAt: new Date(),
      },
    });
  } else {
    await orderRepo.setPaymentId(orderId, paymentId);
  }

  return {
    success: true,
    data: {
      paymentId,
      checkoutUrl,
    },
  };
}

/**
 * Complete a mock payment (simulate successful iDEAL payment)
 * In production, this would be called by Mollie webhook
 */
export async function completeMockPayment(
  paymentId: string
): Promise<PaymentResult<{ orderId: string; ticketCount: number }>> {
  const mockPayment = mockPayments.get(paymentId);

  if (!mockPayment) {
    return { success: false, error: "Betaling niet gevonden" };
  }

  // Idempotent: if already paid, return success
  if (mockPayment.status === "paid") {
    const order = await orderRepo.findByPaymentId(paymentId);
    if (order && order.status === "PAID") {
      const ticketCount = await prisma.ticket.count({
        where: { orderId: order.id },
      });
      return {
        success: true,
        data: { orderId: order.id, ticketCount },
      };
    }
  }

  // Update mock payment status
  mockPayment.status = "paid";
  mockPayments.set(paymentId, mockPayment);

  // Process the payment (update order + issue tickets)
  return processPaymentSuccess(paymentId);
}

/**
 * Process a successful payment
 * - Updates order status to PAID
 * - Issues tickets for each order item
 * This function is idempotent (safe to call multiple times)
 */
async function processPaymentSuccess(
  paymentId: string
): Promise<PaymentResult<{ orderId: string; ticketCount: number }>> {
  // Find order by payment ID
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
    return { success: false, error: "Bestelling niet gevonden voor betaling" };
  }

  // Idempotent check: if already paid, don't process again
  if (order.status === "PAID") {
    const ticketCount = await prisma.ticket.count({
      where: { orderId: order.id },
    });
    return {
      success: true,
      data: { orderId: order.id, ticketCount },
    };
  }

  // Use a transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update order status to PAID
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentMethod: "ideal_mock", // In production: from Mollie response
      },
    });

    // 2. Issue tickets for each order item
    const ticketsToCreate: {
      ticketTypeId: string;
      eventId: string;
      orderId: string;
      code: string;
      secretToken: string;
    }[] = [];

    for (const item of order.orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        // Generate unique code (retry on collision)
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

    // 3. Create all tickets
    await tx.ticket.createMany({
      data: ticketsToCreate,
    });

    // 4. Update sold counts for each ticket type
    for (const item of order.orderItems) {
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: {
          soldCount: {
            increment: item.quantity,
          },
        },
      });
    }

    return ticketsToCreate.length;
  });

  // 5. Record ticket sale in usage tracking (for monthly plans)
  const totalTicketsSold = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const event = await prisma.event.findUnique({
    where: { id: order.eventId },
    select: { organizationId: true },
  });

  if (event) {
    await planLimitsService.recordTicketSale(
      event.organizationId,
      order.eventId,
      totalTicketsSold
    );
  }

  // Send ticket email (after successful transaction)
  try {
    const tickets = await ticketRepo.findByOrder(order.id);
    if (tickets.length > 0) {
      const firstTicket = tickets[0];
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
    // Log but don't fail the payment - tickets are already created
    console.error("Failed to send ticket email:", emailError);
  }

  return {
    success: true,
    data: {
      orderId: order.id,
      ticketCount: result,
    },
  };
}

/**
 * Handle payment webhook (mock or real)
 * This is idempotent - safe to call multiple times
 */
export async function handlePaymentWebhook(
  paymentId: string
): Promise<PaymentResult<{ status: string }>> {
  // In mock mode, check our in-memory storage
  const mockPayment = mockPayments.get(paymentId);

  if (mockPayment) {
    if (mockPayment.status === "paid") {
      const result = await processPaymentSuccess(paymentId);
      if (result.success) {
        return { success: true, data: { status: "paid" } };
      }
      return result;
    }

    // Handle other statuses
    if (mockPayment.status === "failed" || mockPayment.status === "canceled") {
      await orderRepo.updateStatus(mockPayment.orderId, "FAILED");
      return { success: true, data: { status: mockPayment.status } };
    }

    if (mockPayment.status === "expired") {
      await orderRepo.updateStatus(mockPayment.orderId, "CANCELLED");
      return { success: true, data: { status: "expired" } };
    }

    return { success: true, data: { status: mockPayment.status } };
  }

  // In production: would fetch payment status from Mollie API
  return { success: false, error: "Betaling niet gevonden" };
}

/**
 * Get mock payment by ID (for testing/debugging)
 */
export function getMockPayment(paymentId: string): MockPayment | undefined {
  return mockPayments.get(paymentId);
}

/**
 * Cancel a mock payment (for testing expired orders)
 */
export async function cancelMockPayment(
  paymentId: string
): Promise<PaymentResult<void>> {
  const mockPayment = mockPayments.get(paymentId);

  if (!mockPayment) {
    return { success: false, error: "Betaling niet gevonden" };
  }

  if (mockPayment.status === "paid") {
    return { success: false, error: "Betaalde bestellingen kunnen niet geannuleerd worden" };
  }

  mockPayment.status = "canceled";
  mockPayments.set(paymentId, mockPayment);

  await orderRepo.updateStatus(mockPayment.orderId, "CANCELLED");

  return { success: true, data: undefined };
}
