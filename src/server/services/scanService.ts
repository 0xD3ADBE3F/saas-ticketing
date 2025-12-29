import { ticketRepo } from "@/server/repos/ticketRepo";
import { scanRepo } from "@/server/repos/scanRepo";
import { verifyQRSignature, parseQRData } from "@/server/services/ticketService";
import { prisma } from "@/server/lib/prisma";
import type { ScanResult, TicketStatus } from "@/generated/prisma";

// =============================================================================
// Scan Service
// =============================================================================
// Handles ticket scanning with first-scan-wins rule and comprehensive logging
// =============================================================================

export type ScanTicketInput = {
  qrData: string; // QR code data (can be URL or path)
  scannedBy: string; // User ID performing the scan
  deviceId?: string | null; // Optional device identifier
  organizationId: string; // Multi-tenant scoping
};

export type ScanTicketResult = {
  success: boolean;
  result: ScanResult;
  message: string;
  ticket?: {
    id: string;
    code: string;
    eventTitle: string;
    ticketTypeName: string;
    status: TicketStatus;
    usedAt?: Date | null;
  };
  firstScannedAt?: Date; // When ticket was first scanned (for ALREADY_USED)
};

/**
 * Scan a ticket using QR code data
 *
 * Business rules:
 * 1. Parse and validate QR code signature
 * 2. Find ticket and verify it belongs to the organization
 * 3. Check current ticket status
 * 4. First scan wins - if already used, show when it was first scanned
 * 5. Log every scan attempt (success or failure)
 * 6. Update ticket status if scan is valid
 *
 * @param input - Scan input with QR data and scanner info
 * @returns Scan result with status and details
 */
export async function scanTicket(input: ScanTicketInput): Promise<ScanTicketResult> {
  const { qrData, scannedBy, deviceId, organizationId } = input;
  const scannedAt = new Date();

  // =============================================================================
  // Step 1: Parse QR code data
  // =============================================================================
  const parsed = parseQRData(qrData);
  if (!parsed) {
    return {
      success: false,
      result: "INVALID",
      message: "Invalid QR code format",
    };
  }

  const { ticketId, signature } = parsed;

  // =============================================================================
  // Step 2: Find ticket and verify ownership
  // =============================================================================
  const ticket = await ticketRepo.findByIdForScanning(ticketId);

  // Ticket not found
  if (!ticket) {
    // Still log the attempt even though ticket doesn't exist
    // This helps detect fraudulent QR codes
    await scanRepo.create({
      ticketId, // Log the attempted ticket ID
      scannedBy,
      deviceId,
      result: "INVALID",
      scannedAt,
      offlineSync: false,
    });

    return {
      success: false,
      result: "INVALID",
      message: "Ticket not found",
    };
  }

  // Verify organization ownership (multi-tenant security)
  if (ticket.event.organizationId !== organizationId) {
    await scanRepo.create({
      ticketId: ticket.id,
      scannedBy,
      deviceId,
      result: "INVALID",
      scannedAt,
      offlineSync: false,
    });

    return {
      success: false,
      result: "INVALID",
      message: "Ticket does not belong to this organization",
    };
  }

  // =============================================================================
  // Step 3: Verify QR signature
  // =============================================================================
  const isValidSignature = verifyQRSignature(ticket.id, signature, ticket.secretToken);
  if (!isValidSignature) {
    await scanRepo.create({
      ticketId: ticket.id,
      scannedBy,
      deviceId,
      result: "INVALID",
      scannedAt,
      offlineSync: false,
    });

    return {
      success: false,
      result: "INVALID",
      message: "Invalid QR code signature",
      ticket: {
        id: ticket.id,
        code: ticket.code,
        eventTitle: ticket.event.title,
        ticketTypeName: ticket.ticketType.name,
        status: ticket.status,
        usedAt: ticket.usedAt,
      },
    };
  }

  // =============================================================================
  // Step 4: Check ticket status
  // =============================================================================

  // Case: Ticket was refunded
  if (ticket.status === "REFUNDED") {
    await scanRepo.create({
      ticketId: ticket.id,
      scannedBy,
      deviceId,
      result: "REFUNDED",
      scannedAt,
      offlineSync: false,
    });

    return {
      success: false,
      result: "REFUNDED",
      message: "This ticket has been refunded and cannot be used",
      ticket: {
        id: ticket.id,
        code: ticket.code,
        eventTitle: ticket.event.title,
        ticketTypeName: ticket.ticketType.name,
        status: ticket.status,
        usedAt: ticket.usedAt,
      },
    };
  }

  // Case: Ticket already used (first scan wins)
  if (ticket.status === "USED") {
    // Find when it was first successfully scanned
    const firstScan = await scanRepo.findFirstValidScan(ticket.id);

    await scanRepo.create({
      ticketId: ticket.id,
      scannedBy,
      deviceId,
      result: "ALREADY_USED",
      scannedAt,
      offlineSync: false,
    });

    return {
      success: false,
      result: "ALREADY_USED",
      message: "This ticket has already been used",
      ticket: {
        id: ticket.id,
        code: ticket.code,
        eventTitle: ticket.event.title,
        ticketTypeName: ticket.ticketType.name,
        status: ticket.status,
        usedAt: ticket.usedAt,
      },
      firstScannedAt: firstScan?.scannedAt || ticket.usedAt || undefined,
    };
  }

  // =============================================================================
  // Step 5: Valid scan - mark ticket as used
  // =============================================================================

  // Use a transaction to ensure atomicity:
  // - Create scan log
  // - Update ticket status
  // Both must succeed or both fail
  try {
    await prisma.$transaction(async (tx) => {
      // Log the successful scan
      await tx.scanLog.create({
        data: {
          ticketId: ticket.id,
          scannedBy,
          deviceId,
          result: "VALID",
          scannedAt,
          offlineSync: false,
        },
      });

      // Mark ticket as used
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "USED",
          usedAt: scannedAt,
        },
      });
    });

    return {
      success: true,
      result: "VALID",
      message: "Ticket validated successfully",
      ticket: {
        id: ticket.id,
        code: ticket.code,
        eventTitle: ticket.event.title,
        ticketTypeName: ticket.ticketType.name,
        status: "USED",
        usedAt: scannedAt,
      },
    };
  } catch (error) {
    console.error("Error during ticket scan transaction:", error);

    // If transaction fails, still try to log the attempt
    try {
      await scanRepo.create({
        ticketId: ticket.id,
        scannedBy,
        deviceId,
        result: "INVALID",
        scannedAt,
        offlineSync: false,
      });
    } catch (logError) {
      console.error("Failed to log scan attempt:", logError);
    }

    return {
      success: false,
      result: "INVALID",
      message: "An error occurred while processing the scan",
      ticket: {
        id: ticket.id,
        code: ticket.code,
        eventTitle: ticket.event.title,
        ticketTypeName: ticket.ticketType.name,
        status: ticket.status,
        usedAt: ticket.usedAt,
      },
    };
  }
}

/**
 * Get scan statistics for an event
 */
export async function getEventScanStats(eventId: string) {
  const counts = await scanRepo.countByResult(eventId);

  return {
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    valid: counts.VALID,
    alreadyUsed: counts.ALREADY_USED,
    invalid: counts.INVALID,
    refunded: counts.REFUNDED,
  };
}

/**
 * Get scan history for a ticket
 */
export async function getTicketScanHistory(ticketId: string) {
  return scanRepo.findByTicket(ticketId);
}
