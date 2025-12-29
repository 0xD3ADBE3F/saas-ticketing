import { prisma } from "@/server/lib/prisma";
import type { ScanLog, ScanResult } from "@/generated/prisma";

export type CreateScanLogInput = {
  ticketId: string;
  scannedBy: string;
  deviceId?: string | null;
  result: ScanResult;
  scannedAt: Date;
  offlineSync?: boolean;
  syncedAt?: Date | null;
};

export const scanRepo = {
  /**
   * Create a new scan log entry
   * Every scan attempt (success or failure) must be logged
   */
  create: async (input: CreateScanLogInput): Promise<ScanLog> => {
    return prisma.scanLog.create({
      data: {
        ticketId: input.ticketId,
        scannedBy: input.scannedBy,
        deviceId: input.deviceId,
        result: input.result,
        scannedAt: input.scannedAt,
        offlineSync: input.offlineSync ?? false,
        syncedAt: input.syncedAt,
      },
    });
  },

  /**
   * Find all scan logs for a specific ticket
   */
  findByTicket: async (ticketId: string): Promise<ScanLog[]> => {
    return prisma.scanLog.findMany({
      where: { ticketId },
      orderBy: { scannedAt: "desc" },
    });
  },

  /**
   * Find the first successful scan for a ticket
   * This is used to determine the "first scan wins" timestamp
   */
  findFirstValidScan: async (ticketId: string): Promise<ScanLog | null> => {
    return prisma.scanLog.findFirst({
      where: {
        ticketId,
        result: "VALID",
      },
      orderBy: { scannedAt: "asc" },
    });
  },

  /**
   * Find all scan logs for an event (for dashboard analytics)
   */
  findByEvent: async (eventId: string): Promise<ScanLog[]> => {
    return prisma.scanLog.findMany({
      where: {
        ticket: {
          eventId,
        },
      },
      include: {
        ticket: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
      },
      orderBy: { scannedAt: "desc" },
    });
  },

  /**
   * Find scan logs by scanner user (for audit)
   */
  findByScanner: async (scannedBy: string): Promise<ScanLog[]> => {
    return prisma.scanLog.findMany({
      where: { scannedBy },
      include: {
        ticket: {
          select: {
            id: true,
            code: true,
            status: true,
            event: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { scannedAt: "desc" },
    });
  },

  /**
   * Count scans by result for statistics
   */
  countByResult: async (eventId: string): Promise<Record<ScanResult, number>> => {
    const counts = await prisma.scanLog.groupBy({
      by: ["result"],
      where: {
        ticket: {
          eventId,
        },
      },
      _count: true,
    });

    // Initialize all result types with 0
    const result: Record<ScanResult, number> = {
      VALID: 0,
      ALREADY_USED: 0,
      INVALID: 0,
      REFUNDED: 0,
    };

    // Fill in actual counts
    counts.forEach((count) => {
      result[count.result] = count._count;
    });

    return result;
  },
};
