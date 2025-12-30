import { prisma } from "@/server/lib/prisma";
import type { ScannerTerminal } from "@/generated/prisma";

export type CreateTerminalInput = {
  organizationId: string;
  eventId?: string;
  code: string;
  name: string;
  expiresAt?: Date;
  createdBy: string;
};

export const scannerTerminalRepo = {
  /**
   * Create a new scanner terminal
   */
  create: async (data: CreateTerminalInput): Promise<ScannerTerminal> => {
    return prisma.scannerTerminal.create({
      data: {
        organizationId: data.organizationId,
        eventId: data.eventId || null,
        code: data.code.toUpperCase(),
        name: data.name,
        expiresAt: data.expiresAt || null,
        createdBy: data.createdBy,
        isActive: true,
      },
    });
  },

  /**
   * Find terminal by code (for authentication)
   */
  findByCode: async (code: string): Promise<ScannerTerminal | null> => {
    return prisma.scannerTerminal.findUnique({
      where: { code: code.toUpperCase() },
    });
  },

  /**
   * Find terminal by code with organization and event info
   */
  findByCodeWithDetails: async (
    code: string
  ): Promise<
    | (ScannerTerminal & {
        organization: { id: string; name: string; slug: string };
        event: { id: string; title: string; startsAt: Date; endsAt: Date } | null;
      })
    | null
  > => {
    return prisma.scannerTerminal.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        event: {
          select: { id: true, title: true, startsAt: true, endsAt: true },
        },
      },
    });
  },

  /**
   * Find all terminals for an organization
   */
  findByOrganization: async (
    organizationId: string
  ): Promise<
    (ScannerTerminal & {
      event: { id: string; title: string } | null;
    })[]
  > => {
    return prisma.scannerTerminal.findMany({
      where: { organizationId },
      include: {
        event: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Find terminal by ID within organization
   */
  findById: async (
    id: string,
    organizationId: string
  ): Promise<ScannerTerminal | null> => {
    return prisma.scannerTerminal.findFirst({
      where: { id, organizationId },
    });
  },

  /**
   * Update last used timestamp
   */
  updateLastUsed: async (id: string): Promise<void> => {
    await prisma.scannerTerminal.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  },

  /**
   * Deactivate a terminal
   */
  deactivate: async (
    id: string,
    organizationId: string
  ): Promise<ScannerTerminal | null> => {
    const terminal = await prisma.scannerTerminal.findFirst({
      where: { id, organizationId },
    });

    if (!terminal) return null;

    return prisma.scannerTerminal.update({
      where: { id },
      data: { isActive: false },
    });
  },

  /**
   * Reactivate a terminal
   */
  activate: async (
    id: string,
    organizationId: string
  ): Promise<ScannerTerminal | null> => {
    const terminal = await prisma.scannerTerminal.findFirst({
      where: { id, organizationId },
    });

    if (!terminal) return null;

    return prisma.scannerTerminal.update({
      where: { id },
      data: { isActive: true },
    });
  },

  /**
   * Delete a terminal
   */
  delete: async (
    id: string,
    organizationId: string
  ): Promise<boolean> => {
    const terminal = await prisma.scannerTerminal.findFirst({
      where: { id, organizationId },
    });

    if (!terminal) return false;

    await prisma.scannerTerminal.delete({
      where: { id },
    });

    return true;
  },

  /**
   * Check if a code is already taken
   */
  isCodeTaken: async (code: string): Promise<boolean> => {
    const terminal = await prisma.scannerTerminal.findUnique({
      where: { code: code.toUpperCase() },
    });
    return terminal !== null;
  },
};
