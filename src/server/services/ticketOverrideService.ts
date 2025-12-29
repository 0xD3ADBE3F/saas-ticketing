import { prisma } from "@/server/lib/prisma";
import { ticketRepo } from "@/server/repos/ticketRepo";

export type TicketOverrideInput = {
  ticketId: string;
  newStatus: "VALID" | "USED";
  reason: string;
  adminUserId: string;
  organizationId: string;
};

/**
 * Manually override ticket status (ADMIN only)
 * Always creates an audit log entry
 */
export async function overrideTicketStatus(
  input: TicketOverrideInput
): Promise<{
  success: boolean;
  ticket: {
    id: string;
    code: string;
    status: string;
    previousStatus: string;
  };
  auditLogId: string;
}> {
  const { ticketId, newStatus, reason, adminUserId, organizationId } = input;

  // Get ticket with full context
  const ticket = await ticketRepo.findByIdForScanning(ticketId);
  if (!ticket) {
    throw new Error("Ticket niet gevonden");
  }

  // Verify ticket belongs to organization
  if (ticket.event.organizationId !== organizationId) {
    throw new Error("Ticket behoort niet tot deze organisatie");
  }

  const previousStatus = ticket.status;

  // Validate status transition
  if (previousStatus === "REFUNDED") {
    throw new Error("Gerestitueerde tickets kunnen niet worden aangepast");
  }

  if (previousStatus === newStatus) {
    throw new Error(`Ticket heeft al status ${newStatus}`);
  }

  // Perform update + create audit log in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update ticket status
    const updatedTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        usedAt: newStatus === "USED" ? new Date() : null,
      },
    });

    // Create scan log for the override action
    await tx.scanLog.create({
      data: {
        ticketId,
        scannedBy: adminUserId,
        result: newStatus === "USED" ? "VALID" : "INVALID", // VALID for marking used, INVALID for reset
        scannedAt: new Date(),
        deviceId: "manual-override",
        offlineSync: false,
      },
    });

    // Create audit log entry
    const action =
      newStatus === "USED" ? "ticket.mark_used" : "ticket.reset";

    const auditLog = await tx.auditLog.create({
      data: {
        organizationId,
        userId: adminUserId,
        action,
        entityType: "ticket",
        entityId: ticketId,
        metadata: {
          ticketCode: ticket.code,
          previousStatus,
          newStatus,
          reason,
          eventId: ticket.event.id,
          eventTitle: ticket.event.title,
        },
      },
    });

    return { updatedTicket, auditLog };
  });

  return {
    success: true,
    ticket: {
      id: result.updatedTicket.id,
      code: result.updatedTicket.code,
      status: result.updatedTicket.status,
      previousStatus,
    },
    auditLogId: result.auditLog.id,
  };
}

/**
 * Get ticket details for override UI
 */
export async function getTicketForOverride(
  ticketId: string,
  organizationId: string
): Promise<{
  id: string;
  code: string;
  status: string;
  eventTitle: string;
  ticketTypeName: string;
  buyerEmail: string;
  usedAt: Date | null;
  scanCount: number;
  lastScanAt: Date | null;
} | null> {
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      event: {
        organizationId,
      },
    },
    include: {
      ticketType: {
        select: {
          name: true,
        },
      },
      event: {
        select: {
          title: true,
        },
      },
      order: {
        select: {
          buyerEmail: true,
        },
      },
      scanLogs: {
        orderBy: {
          scannedAt: "desc",
        },
      },
    },
  });

  if (!ticket) {
    return null;
  }

  return {
    id: ticket.id,
    code: ticket.code,
    status: ticket.status,
    eventTitle: ticket.event.title,
    ticketTypeName: ticket.ticketType.name,
    buyerEmail: ticket.order.buyerEmail,
    usedAt: ticket.usedAt,
    scanCount: ticket.scanLogs.length,
    lastScanAt: ticket.scanLogs[0]?.scannedAt ?? null,
  };
}
