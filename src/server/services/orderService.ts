import { prisma } from "@/server/lib/prisma";
import { orderRepo, OrderItemInput } from "@/server/repos/orderRepo";
import type { Order, TicketType } from "@/generated/prisma";

// =============================================================================
// Service Fee Configuration
// =============================================================================

/**
 * Service fee configuration
 * This is charged once per order (buyer pays)
 *
 * Current strategy: Fixed fee + percentage of ticket total
 * TODO: Make this configurable per organization
 */
const SERVICE_FEE_CONFIG = {
  // Fixed fee in cents (€0.50)
  fixedFee: 50,
  // Percentage of ticket total (2.5%)
  percentageFee: 0.025,
  // Minimum service fee in cents (€0.50)
  minimumFee: 50,
  // Maximum service fee in cents (€5.00)
  maximumFee: 500,
};

/**
 * Calculate service fee for an order
 * Fee is per order, not per ticket
 */
export function calculateServiceFee(ticketTotal: number): number {
  if (ticketTotal === 0) return 0;

  const calculatedFee =
    SERVICE_FEE_CONFIG.fixedFee +
    Math.round(ticketTotal * SERVICE_FEE_CONFIG.percentageFee);

  // Apply min/max bounds
  return Math.min(
    Math.max(calculatedFee, SERVICE_FEE_CONFIG.minimumFee),
    SERVICE_FEE_CONFIG.maximumFee
  );
}

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
  buyerEmail: string;
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

  const serviceFee = calculateServiceFee(ticketTotal);
  const totalAmount = ticketTotal + serviceFee;

  return {
    success: true,
    data: {
      items: orderItems,
      ticketTotal,
      serviceFee,
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
  // Validate email
  if (!data.buyerEmail || !isValidEmail(data.buyerEmail)) {
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

      const serviceFee = calculateServiceFee(ticketTotal);
      const totalAmount = ticketTotal + serviceFee;

      // Order expires in 30 minutes if not paid
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      // Create the order
      const order = await orderRepo.create(
        event.organization.id,
        {
          eventId: event.id,
          buyerEmail: data.buyerEmail,
          buyerName: data.buyerName,
          ticketTotal,
          serviceFee,
          totalAmount,
          expiresAt,
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
