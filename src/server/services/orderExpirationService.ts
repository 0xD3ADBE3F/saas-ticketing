import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";

export const orderExpirationService = {
  /**
   * Find and expire all orders that have passed their expiresAt time
   * Releases tickets back to available inventory
   * @returns Number of orders expired
   */
  async expireOldOrders(): Promise<number> {
    const now = new Date();

    // Find all PENDING orders that have expired
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: now, // Less than current time
        },
      },
      include: {
        tickets: true,
        orderItems: {
          include: {
            ticketType: true,
          },
        },
      },
    });

    if (expiredOrders.length === 0) {
      logger.info("No expired orders found", { service: "orderExpiration" });
      return 0;
    }

    logger.info(`Found ${expiredOrders.length} expired orders`, {
      service: "orderExpiration",
    });

    let successCount = 0;

    for (const order of expiredOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Decrement soldCount for each ticket type
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

          // 2. Mark order as EXPIRED
          await tx.order.update({
            where: { id: order.id },
            data: { status: "EXPIRED" },
          });

          // 3. Delete tickets (if any were created)
          await tx.ticket.deleteMany({
            where: { orderId: order.id },
          });

          logger.info(
            `Expired order ${order.orderNumber}, released ${order.orderItems.reduce((sum, item) => sum + item.quantity, 0)} tickets from soldCount, and deleted ${order.tickets.length} ticket records`,
            {
              service: "orderExpiration",
              orderId: order.id,
              orderNumber: order.orderNumber,
              itemsReleased: order.orderItems.reduce(
                (sum, item) => sum + item.quantity,
                0
              ),
              ticketsDeleted: order.tickets.length,
            }
          );
        });

        successCount++;
      } catch (error) {
        logger.error(`Failed to expire order ${order.id}`, {
          service: "orderExpiration",
          orderId: order.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    logger.info(
      `Successfully expired ${successCount}/${expiredOrders.length} orders`,
      {
        service: "orderExpiration",
        successCount,
        totalCount: expiredOrders.length,
      }
    );

    return successCount;
  },

  /**
   * Calculate expiration time for a new order based on organization settings
   * @param organizationId - Organization ID
   * @returns Date when order should expire
   */
  async calculateExpirationTime(organizationId: string): Promise<Date> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { paymentTimeoutMinutes: true },
    });

    const timeoutMinutes = org?.paymentTimeoutMinutes ?? 10; // Default 10 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + timeoutMinutes);

    return expiresAt;
  },
};
