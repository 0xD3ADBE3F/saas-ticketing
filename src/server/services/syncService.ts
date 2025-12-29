import { prisma } from "@/server/lib/prisma";
import { ticketRepo } from "@/server/repos/ticketRepo";
import { scanRepo } from "@/server/repos/scanRepo";
import { scannerDeviceRepo } from "@/server/repos/scannerDeviceRepo";
import { eventRepo } from "@/server/repos/eventRepo";
import type { ScanResult } from "@/generated/prisma";

// =============================================================================
// Sync Service
// =============================================================================
// Handles offline sync: ticket dataset download and batch scan log upload
// =============================================================================

// =============================================================================
// Types
// =============================================================================

export type TicketDataset = {
  event: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
  };
  tickets: Array<{
    id: string;
    code: string;
    secretToken: string;
    status: string;
    ticketType: {
      id: string;
      name: string;
    };
  }>;
  syncedAt: Date;
  deviceId: string;
};

export type BatchScanLogInput = {
  ticketId: string;
  scannedAt: string; // ISO date string
  result: ScanResult;
  deviceId: string;
};

export type BatchScanLogResult = {
  processed: number;
  successful: number;
  failed: number;
  conflicts: number;
  errors: Array<{
    ticketId: string;
    error: string;
  }>;
};

// =============================================================================
// Ticket Dataset Preparation
// =============================================================================

/**
 * Prepare ticket dataset for offline scanning
 * Returns all tickets for an event with validation data
 *
 * @param eventId - Event to sync
 * @param organizationId - Organization ID (multi-tenant scoping)
 * @param deviceId - Device requesting the sync
 * @param userId - User performing the sync
 * @returns Ticket dataset with event and ticket info
 */
export async function prepareTicketDataset(
  eventId: string,
  organizationId: string,
  deviceId: string,
  userId: string
): Promise<TicketDataset> {
  // Verify event belongs to organization
  const event = await eventRepo.findById(eventId, userId);
  if (!event || event.organizationId !== organizationId) {
    throw new Error("Event not found or access denied");
  }

  // Get all tickets for the event (only paid orders)
  const tickets = await prisma.ticket.findMany({
    where: {
      eventId,
      order: {
        status: "PAID",
      },
    },
    select: {
      id: true,
      code: true,
      secretToken: true,
      status: true,
      ticketType: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Register/update device sync
  await scannerDeviceRepo.upsert({
    organizationId,
    deviceId,
  });

  return {
    event: {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.location,
    },
    tickets: tickets.map((t) => ({
      id: t.id,
      code: t.code,
      secretToken: t.secretToken,
      status: t.status,
      ticketType: {
        id: t.ticketType.id,
        name: t.ticketType.name,
      },
    })),
    syncedAt: new Date(),
    deviceId,
  };
}

// =============================================================================
// Batch Scan Log Upload
// =============================================================================

/**
 * Process batch upload of scan logs from offline device
 * Implements conflict resolution: first scan wins (by scannedAt timestamp)
 *
 * Business rules:
 * 1. Each scan log is processed individually
 * 2. If ticket already scanned, check timestamp (first scan wins)
 * 3. Create scan log with offlineSync=true and syncedAt=now
 * 4. Update ticket status if this was the first scan
 * 5. Track conflicts and errors for reporting
 *
 * @param logs - Array of scan logs to upload
 * @param organizationId - Organization ID (multi-tenant scoping)
 * @param scannedBy - User who performed the scans
 * @param deviceId - Device that performed the scans
 * @returns Summary of processing results
 */
export async function processBatchScanLogs(
  logs: BatchScanLogInput[],
  organizationId: string,
  scannedBy: string,
  deviceId: string
): Promise<BatchScanLogResult> {
  const result: BatchScanLogResult = {
    processed: 0,
    successful: 0,
    failed: 0,
    conflicts: 0,
    errors: [],
  };

  const syncedAt = new Date();

  // Update device sync timestamp
  await scannerDeviceRepo.upsert({
    organizationId,
    deviceId,
  });

  // Process each scan log
  for (const log of logs) {
    result.processed++;

    try {
      // Parse scannedAt timestamp
      const scannedAt = new Date(log.scannedAt);
      if (isNaN(scannedAt.getTime())) {
        result.failed++;
        result.errors.push({
          ticketId: log.ticketId,
          error: "Invalid scannedAt timestamp",
        });
        continue;
      }

      // Find ticket and verify organization ownership
      const ticket = await ticketRepo.findByIdForScanning(log.ticketId);

      if (!ticket) {
        result.failed++;
        result.errors.push({
          ticketId: log.ticketId,
          error: "Ticket not found",
        });

        // Still log the attempt
        await scanRepo.create({
          ticketId: log.ticketId,
          scannedBy,
          deviceId,
          result: "INVALID",
          scannedAt,
          offlineSync: true,
          syncedAt,
        });

        continue;
      }

      // Verify organization ownership
      if (ticket.event.organizationId !== organizationId) {
        result.failed++;
        result.errors.push({
          ticketId: log.ticketId,
          error: "Ticket does not belong to this organization",
        });

        await scanRepo.create({
          ticketId: log.ticketId,
          scannedBy,
          deviceId,
          result: "INVALID",
          scannedAt,
          offlineSync: true,
          syncedAt,
        });

        continue;
      }

      // Check if ticket was already scanned
      if (ticket.status === "USED") {
        // Find the first valid scan to check conflict
        const firstScan = await scanRepo.findFirstValidScan(ticket.id);

        if (firstScan && firstScan.scannedAt < scannedAt) {
          // This scan happened AFTER the first scan - it's a conflict
          result.conflicts++;

          await scanRepo.create({
            ticketId: log.ticketId,
            scannedBy,
            deviceId,
            result: "ALREADY_USED",
            scannedAt,
            offlineSync: true,
            syncedAt,
          });

          continue;
        } else if (firstScan && firstScan.scannedAt > scannedAt) {
          // This scan happened BEFORE the current "first" scan
          // This device scanned first offline! Need to update ticket
          result.conflicts++;

          // Log as successful scan (but note it was a conflict resolution)
          await prisma.$transaction(async (tx) => {
            await tx.scanLog.create({
              data: {
                ticketId: log.ticketId,
                scannedBy,
                deviceId,
                result: "VALID",
                scannedAt,
                offlineSync: true,
                syncedAt,
              },
            });

            // Update ticket to reflect this earlier scan
            await tx.ticket.update({
              where: { id: log.ticketId },
              data: {
                status: "USED",
                usedAt: scannedAt,
              },
            });
          });

          result.successful++;
          continue;
        }
      }

      // Handle refunded tickets
      if (ticket.status === "REFUNDED") {
        result.failed++;

        await scanRepo.create({
          ticketId: log.ticketId,
          scannedBy,
          deviceId,
          result: "REFUNDED",
          scannedAt,
          offlineSync: true,
          syncedAt,
        });

        continue;
      }

      // Process valid scan
      if (log.result === "VALID" && ticket.status === "VALID") {
        await prisma.$transaction(async (tx) => {
          await tx.scanLog.create({
            data: {
              ticketId: log.ticketId,
              scannedBy,
              deviceId,
              result: "VALID",
              scannedAt,
              offlineSync: true,
              syncedAt,
            },
          });

          await tx.ticket.update({
            where: { id: log.ticketId },
            data: {
              status: "USED",
              usedAt: scannedAt,
            },
          });
        });

        result.successful++;
      } else {
        // Log other results (INVALID, etc.)
        await scanRepo.create({
          ticketId: log.ticketId,
          scannedBy,
          deviceId,
          result: log.result,
          scannedAt,
          offlineSync: true,
          syncedAt,
        });

        result.successful++;
      }
    } catch (error) {
      result.failed++;
      result.errors.push({
        ticketId: log.ticketId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return result;
}
