import { prisma } from "./prisma";
import type { SuperAdmin, Prisma } from "@/generated/prisma";

/**
 * Check if a user is a SuperAdmin
 * @param userId - Supabase auth user ID
 * @returns SuperAdmin record or null
 */
export async function getSuperAdmin(
  userId: string
): Promise<SuperAdmin | null> {
  return prisma.superAdmin.findUnique({
    where: { userId },
  });
}

/**
 * Check if a user is a SuperAdmin (boolean)
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const admin = await getSuperAdmin(userId);
  return admin !== null;
}

/**
 * Get SuperAdmin by email
 */
export async function getSuperAdminByEmail(
  email: string
): Promise<SuperAdmin | null> {
  return prisma.superAdmin.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
}

/**
 * Create a new SuperAdmin
 * NOTE: This should only be called by other SuperAdmins or via secure setup
 */
export async function createSuperAdmin(
  userId: string,
  email: string
): Promise<SuperAdmin> {
  return prisma.superAdmin.create({
    data: {
      userId,
      email: email.toLowerCase().trim(),
    },
  });
}

/**
 * Remove SuperAdmin status
 */
export async function removeSuperAdmin(userId: string): Promise<void> {
  await prisma.superAdmin.delete({
    where: { userId },
  });
}

/**
 * Log an admin action for audit trail
 * All platform admin actions MUST be logged
 */
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

/**
 * Get audit logs for an admin
 */
export async function getAdminAuditLogs(
  adminId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: string;
    entityType?: string;
  }
) {
  return prisma.adminAuditLog.findMany({
    where: {
      adminId,
      ...(options?.action && { action: options.action }),
      ...(options?.entityType && { entityType: options.entityType }),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
    include: {
      admin: {
        select: {
          email: true,
        },
      },
    },
  });
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLogs(
  entityType: string,
  entityId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  return prisma.adminAuditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
    include: {
      admin: {
        select: {
          email: true,
        },
      },
    },
  });
}
