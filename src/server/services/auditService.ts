import { prisma } from "@/server/lib/prisma";

export interface AuditLogEntry {
  organizationId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit Service
 * Logs all critical actions for compliance and audit trails
 */
export const auditService = {
  /**
   * Log an action
   */
  async log(entry: AuditLogEntry): Promise<void> {
    await prisma.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : null,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  },

  /**
   * Get audit logs for an organization
   */
  async getOrganizationLogs(
    organizationId: string,
    options?: {
      action?: string;
      entityType?: string;
      entityId?: string;
      userId?: string;
      from?: Date;
      until?: Date;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: {
      organizationId: string;
      action?: string;
      entityType?: string;
      entityId?: string;
      userId?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      organizationId,
    };

    if (options?.action) {
      where.action = options.action;
    }

    if (options?.entityType) {
      where.entityType = options.entityType;
    }

    if (options?.entityId) {
      where.entityId = options.entityId;
    }

    if (options?.userId) {
      where.userId = options.userId;
    }

    if (options?.from || options?.until) {
      where.createdAt = {};
      if (options.from) {
        where.createdAt.gte = options.from;
      }
      if (options.until) {
        where.createdAt.lte = options.until;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });

    const total = await prisma.auditLog.count({ where });

    return {
      logs,
      total,
    };
  },

  /**
   * Get audit logs for a specific entity
   */
  async getEntityLogs(
    organizationId: string,
    entityType: string,
    entityId: string
  ) {
    return prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  /**
   * Common action types
   */
  actions: {
    // Order actions
    ORDER_CREATED: "order.created",
    ORDER_PAID: "order.paid",
    ORDER_REFUNDED: "order.refunded",
    ORDER_CANCELLED: "order.cancelled",

    // Ticket actions
    TICKET_CREATED: "ticket.created",
    TICKET_RESENT: "ticket.resent",
    TICKET_USED: "ticket.used",
    TICKET_REFUNDED: "ticket.refunded",
    TICKET_OVERRIDE: "ticket.override", // Manual status change

    // Event actions
    EVENT_CREATED: "event.created",
    EVENT_UPDATED: "event.updated",
    EVENT_STATUS_CHANGED: "event.status_changed",
    EVENT_DELETED: "event.deleted",

    // Scanning actions
    SCAN_OVERRIDE: "scan.override", // Manual scan validation
    SCAN_CONFLICT_RESOLVED: "scan.conflict_resolved",
  },
};
