import { prisma } from "@/server/lib/prisma";
import type { WalletPlatform } from "@/generated/prisma";

export const walletPassRepo = {
  /**
   * Create a new wallet pass record
   */
  async create(data: {
    ticketId: string;
    platform: WalletPlatform;
    serialNumber: string;
    passUrl?: string;
    googlePassId?: string;
  }) {
    return await prisma.walletPass.create({
      data: {
        ...data,
        lastUpdatedAt: new Date(),
      },
    });
  },

  /**
   * Find wallet pass by ticket ID
   */
  async findByTicketId(ticketId: string) {
    return await prisma.walletPass.findUnique({
      where: { ticketId },
    });
  },

  /**
   * Find wallet pass by serial number (for Apple Wallet updates)
   */
  async findBySerialNumber(serialNumber: string) {
    return await prisma.walletPass.findUnique({
      where: { serialNumber },
      include: {
        ticket: {
          include: {
            event: true,
            ticketType: true,
            order: true,
          },
        },
      },
    });
  },

  /**
   * Update pass last updated timestamp
   */
  async touch(id: string) {
    return await prisma.walletPass.update({
      where: { id },
      data: { lastUpdatedAt: new Date() },
    });
  },

  /**
   * Delete wallet pass (when ticket is refunded)
   */
  async delete(ticketId: string) {
    return await prisma.walletPass.delete({
      where: { ticketId },
    });
  },

  /**
   * Find all passes for an event (for bulk updates)
   */
  async findByEventId(eventId: string) {
    return await prisma.walletPass.findMany({
      where: {
        ticket: {
          eventId,
        },
      },
      include: {
        ticket: true,
      },
    });
  },

  /**
   * Check if pass exists for ticket
   */
  async exists(ticketId: string): Promise<boolean> {
    const count = await prisma.walletPass.count({
      where: { ticketId },
    });
    return count > 0;
  },
};
