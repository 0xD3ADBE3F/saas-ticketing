import { prisma } from "@/server/lib/prisma";
import { orderRepo, OrderItemInput } from "@/server/repos/orderRepo";
import type { Order, TicketType } from "@/generated/prisma";
import { Prisma } from "@/generated/prisma";
import { calculateOrderFees } from "@/server/services/feeService";
import { orderExpirationService } from "@/server/services/orderExpirationService";

// =============================================================================
// Fee Calculation (delegates to feeService)
// =============================================================================

// =============================================================================
// Order Service Types
// =============================================================================

export type OrderServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type CartItem = {
  ticketTypeId: string;
  quantity: number;
};

export type CreateOrderData = {
  eventSlug: string;
  buyerEmail?: string;
  buyerName?: string;
  items: CartItem[];
};

export type OrderSummary = {
  items: {
    ticketTypeId: string;
    ticketTypeName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  ticketTotal: number;
  serviceFee: number;
  // Payment fee (optional, only if event.passPaymentFeesToBuyer = true)
  paymentFee?: number;
  paymentFeeBreakdown?: {
    paymentFeeExclVat: number;
    paymentFeeVat: number;
    paymentFeeInclVat: number;
    paymentMethod: string;
  };
  totalAmount: number;
};

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if ticket type is currently on sale
 */
function isOnSale(ticketType: TicketType): boolean {
  const now = new Date();

  if (ticketType.saleStart && now < ticketType.saleStart) {
    return false;
  }

  if (ticketType.saleEnd && now > ticketType.saleEnd) {
    return false;
  }

  return true;
}

/**
 * Check if ticket type has available capacity
 */
function hasCapacity(ticketType: TicketType, requestedQuantity: number): boolean {
  const available = ticketType.capacity - ticketType.soldCount;
  return available >= requestedQuantity;
}

// =============================================================================
// Order Service Functions
// =============================================================================

/**
 * Calculate order summary without creating the order
 * Used for displaying the checkout preview
 */
export async function calculateOrderSummary(
  eventSlug: string,
  items: CartItem[]
): Promise<OrderServiceResult<OrderSummary>> {
  // Find the event by slug (must be LIVE)
  const event = await prisma.event.findFirst({
    where: {
      slug: eventSlug,
      status: "LIVE",
    },
    include: {
      ticketTypes: true,
    },
  });

  if (!event) {
    return { success: false, error: "Evenement niet gevonden of niet beschikbaar" };
  }

  // Validate and calculate items
  const orderItems: OrderSummary["items"] = [];
  let ticketTotal = 0;

  for (const item of items) {
    if (item.quantity <= 0) continue;

    const ticketType = event.ticketTypes.find((tt) => tt.id === item.ticketTypeId);

    if (!ticketType) {
      return { success: false, error: `Tickettype niet gevonden: ${item.ticketTypeId}` };
    }

    if (!isOnSale(ticketType)) {
      return { success: false, error: `"${ticketType.name}" is niet meer te koop` };
    }

    if (!hasCapacity(ticketType, item.quantity)) {
      const available = ticketType.capacity - ticketType.soldCount;
      return {
        success: false,
        error: `Niet genoeg "${ticketType.name}" tickets beschikbaar (nog ${available} over)`
      };
    }

    const itemTotal = ticketType.price * item.quantity;
    ticketTotal += itemTotal;

    orderItems.push({
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      quantity: item.quantity,
      unitPrice: ticketType.price,
      totalPrice: itemTotal,
    });
  }

  if (orderItems.length === 0) {
    return { success: false, error: "Selecteer minimaal 1 ticket" };
  }

  // Calculate all fees using the centralized fee service
  const feeBreakdown = calculateOrderFees(ticketTotal, event.passPaymentFeesToBuyer);

  // Total = tickets + service fee + payment fee (if enabled)
  const totalAmount = feeBreakdown.totalAmount;

  return {
    success: true,
    data: {
      items: orderItems,
      ticketTotal,
      serviceFee: feeBreakdown.serviceFee.serviceFeeInclVat,
      paymentFee: feeBreakdown.paymentFee?.paymentFeeInclVat,
      paymentFeeBreakdown: feeBreakdown.paymentFee,
      totalAmount,
    },
  };
}

/**
 * Create a pending order
 * This reserves the tickets and creates the order for payment
 */
export async function createOrder(
  data: CreateOrderData
): Promise<OrderServiceResult<Order>> {
  // Validate email (optional - can be updated later)
  if (data.buyerEmail && !isValidEmail(data.buyerEmail)) {
    return { success: false, error: "Ongeldig e-mailadres" };
  }

  // Validate items
  if (!data.items || data.items.length === 0) {
    return { success: false, error: "Selecteer minimaal 1 ticket" };
  }

  // Filter out zero quantity items
  const validItems = data.items.filter((item) => item.quantity > 0);
  if (validItems.length === 0) {
    return { success: false, error: "Selecteer minimaal 1 ticket" };
  }

  // Find the event by slug (must be LIVE)
  const event = await prisma.event.findFirst({
    where: {
      slug: data.eventSlug,
      status: "LIVE",
    },
    include: {
      ticketTypes: true,
      organization: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!event) {
    return { success: false, error: "Evenement niet gevonden of niet beschikbaar" };
  }

  // Use a transaction to ensure atomicity
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Validate and prepare order items
      const orderItems: OrderItemInput[] = [];
      let ticketTotal = 0;

      for (const item of validItems) {
        // Get ticket type with lock to prevent race conditions
        const ticketType = await tx.ticketType.findUnique({
          where: { id: item.ticketTypeId },
        });

        if (!ticketType || ticketType.eventId !== event.id) {
          throw new Error(`Tickettype niet gevonden: ${item.ticketTypeId}`);
        }

        if (!isOnSale(ticketType)) {
          throw new Error(`"${ticketType.name}" is niet meer te koop`);
        }

        const available = ticketType.capacity - ticketType.soldCount;
        if (available < item.quantity) {
          throw new Error(
            `Niet genoeg "${ticketType.name}" tickets beschikbaar (nog ${available} over)`
          );
        }

        // Reserve capacity by incrementing soldCount
        await tx.ticketType.update({
          where: { id: ticketType.id },
          data: {
            soldCount: {
              increment: item.quantity,
            },
          },
        });

        const itemTotal = ticketType.price * item.quantity;
        ticketTotal += itemTotal;

        orderItems.push({
          ticketTypeId: ticketType.id,
          quantity: item.quantity,
          unitPrice: ticketType.price,
          totalPrice: itemTotal,
        });
      }

      // Calculate all fees using the centralized fee service
      const feeBreakdown = calculateOrderFees(ticketTotal, event.passPaymentFeesToBuyer);

      const serviceFee = feeBreakdown.serviceFee.serviceFeeInclVat;
      const serviceFeeExclVat = feeBreakdown.serviceFee.serviceFeeExclVat;
      const serviceFeeVat = feeBreakdown.serviceFee.serviceFeeVat;

      // Payment fee fields (optional) - use Decimal for precise storage
      const paymentMethod = feeBreakdown.paymentFee ? "ideal" : undefined;
      const paymentFee = feeBreakdown.paymentFee?.paymentFeeInclVat; // 38.72 (decimal)
      const paymentFeeExclVat = feeBreakdown.paymentFee?.paymentFeeExclVat; // 32
      const paymentFeeVat = feeBreakdown.paymentFee?.paymentFeeVat; // 6.72 (decimal)

      // Total amount (round to cents for storage)
      const totalAmount = Math.round(feeBreakdown.totalAmount);

      // Calculate order expiration based on organization settings
      const expiresAt = await orderExpirationService.calculateExpirationTime(
        event.organization.id
      );

      // Create the order
      const order = await orderRepo.create(
        event.organization.id,
        {
          eventId: event.id,
          buyerEmail: data.buyerEmail || "pending@placeholder.local",
          buyerName: data.buyerName,
          ticketTotal,
          serviceFee,
          serviceFeeExclVat,
          serviceFeeVat,
          totalAmount,
          expiresAt,
          // Payment fee fields (optional) - convert to Decimal for precision
          paymentMethod: paymentFee ? paymentMethod : undefined,
          paymentFeeBuyerExclVat: paymentFee ? new Prisma.Decimal(paymentFeeExclVat!) : undefined,
          paymentFeeBuyerVatAmount: paymentFee ? new Prisma.Decimal(paymentFeeVat!) : undefined,
          paymentFeeBuyerInclVat: paymentFee ? new Prisma.Decimal(paymentFee) : undefined,
        },
        orderItems
      );

      if (!order) {
        throw new Error("Kon bestelling niet aanmaken");
      }

      return order;
    });

    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return { success: false, error: message };
  }
}

/**
 * Get order details for checkout page
 */
export async function getOrderForCheckout(
  orderId: string
): Promise<OrderServiceResult<{
  order: Order;
  event: {
    id: string;
    title: string;
    slug: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
  };
  items: {
    ticketTypeName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}>> {
  const order = await orderRepo.findByIdPublic(orderId);

  if (!order) {
    return { success: false, error: "Bestelling niet gevonden" };
  }

  // Check if order has expired
  if (order.status === "PENDING" && order.expiresAt && order.expiresAt < new Date()) {
    return { success: false, error: "Bestelling is verlopen" };
  }

  return {
    success: true,
    data: {
      order,
      event: order.event,
      items: order.orderItems.map((item) => ({
        ticketTypeName: item.ticketType.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    },
  };
}

/**
 * Cancel an expired pending order and release reserved capacity
 */
export async function cancelExpiredOrder(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });

    if (!order || order.status !== "PENDING") {
      return;
    }

    // Release reserved capacity
    for (const item of order.orderItems) {
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: {
          soldCount: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Mark order as cancelled
    await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });
  });
}

/**
 * Cancel an order manually (user-initiated)
 * Can be called for PENDING or FAILED orders
 */
export async function cancelOrder(orderId: string): Promise<OrderServiceResult<void>> {
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: true,
        },
      });

      if (!order) {
        throw new Error("Bestelling niet gevonden");
      }

      // Only allow cancellation of PENDING or FAILED orders
      if (order.status !== "PENDING" && order.status !== "FAILED") {
        throw new Error("Deze bestelling kan niet geannuleerd worden");
      }

      // Release reserved capacity
      for (const item of order.orderItems) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            soldCount: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Mark order as cancelled
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Er is een fout opgetreden bij het annuleren"
    };
  }
}

/**
 * Process expired orders (run periodically)
 */
export async function processExpiredOrders(): Promise<number> {
  const expiredOrders = await orderRepo.findExpiredPending();

  for (const order of expiredOrders) {
    await cancelExpiredOrder(order.id);
  }

  return expiredOrders.length;
}

/**
 * Refund an order (admin action)
 * This marks the order as refunded and logs the action
 */
export async function refundOrder(
  orderId: string,
  userId: string,
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<OrderServiceResult<void>> {
  try {
    const { auditService } = await import("./auditService");

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          tickets: true,
          orderItems: true,
        },
      });

      if (!order) {
        throw new Error("Bestelling niet gevonden");
      }

      // Only allow refunding PAID orders
      if (order.status !== "PAID") {
        throw new Error("Alleen betaalde bestellingen kunnen worden terugbetaald");
      }

      // Mark all tickets as refunded
      await tx.ticket.updateMany({
        where: { orderId },
        data: { status: "REFUNDED" },
      });

      // Release capacity back to ticket types
      for (const item of order.orderItems) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            soldCount: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Mark order as refunded
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "REFUNDED",
          refundedAt: new Date(),
        },
      });

      return order;
    });

    // Log the refund action
    await auditService.log({
      organizationId: result.organizationId,
      userId,
      action: auditService.actions.ORDER_REFUNDED,
      entityType: "order",
      entityId: orderId,
      metadata: {
        reason,
        orderNumber: result.orderNumber,
        totalAmount: result.totalAmount,
        buyerEmail: result.buyerEmail,
      },
      ipAddress,
      userAgent,
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Er is een fout opgetreden bij het terugbetalen",
    };
  }
}

// =============================================================================
// Complete Order (for free orders)
// =============================================================================

/**
 * Complete a free order by marking it as PAID and calling the payment service
 * to generate tickets and send email.
 *
 * This function is specifically for FREE orders (totalAmount = 0).
 * For PAID orders, use the webhook flow which calls processPaymentSuccess.
 *
 * This function is idempotent (safe to call multiple times).
 */
export async function completeFreeOrder(
  orderId: string
): Promise<OrderServiceResult<{ ticketCount: number }>> {
  // Find order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return { success: false, error: "Bestelling niet gevonden" };
  }

  // Validate: must be a free order
  if (order.totalAmount !== 0) {
    return {
      success: false,
      error: "Deze functie is alleen voor gratis bestellingen",
    };
  }

  // Idempotent check: if already paid, return existing ticket count
  if (order.status === "PAID") {
    const ticketCount = await prisma.ticket.count({
      where: { orderId: order.id },
    });
    return {
      success: true,
      data: { ticketCount },
    };
  }

  // Validate: order must be PENDING
  if (order.status !== "PENDING") {
    return {
      success: false,
      error: `Bestelling heeft status ${order.status} en kan niet worden voltooid`,
    };
  }

  // Mark order as PAID with "free" payment method
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paymentMethod: "free",
      paymentId: null,
    },
  });

  // Import and call the ticket generation from payment service
  // This ensures we use the same logic for both free and paid orders
  const { generateAndSendTickets } = await import("./paymentService");

  const result = await generateAndSendTickets(orderId);

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: { ticketCount: result.data.ticketCount },
  };
}
