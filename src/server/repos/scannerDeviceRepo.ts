import { prisma } from "@/server/lib/prisma";
import type { ScannerDevice } from "@/generated/prisma";

export type CreateScannerDeviceInput = {
  organizationId: string;
  deviceId: string;
  name?: string;
};

export type UpdateScannerDeviceInput = {
  name?: string;
  lastSyncAt?: Date;
};

export const scannerDeviceRepo = {
  /**
   * Find a scanner device by organization and device ID
   */
  findByDeviceId: async (
    organizationId: string,
    deviceId: string
  ): Promise<ScannerDevice | null> => {
    return prisma.scannerDevice.findUnique({
      where: {
        organizationId_deviceId: {
          organizationId,
          deviceId,
        },
      },
    });
  },

  /**
   * Find all scanner devices for an organization
   */
  findByOrganization: async (organizationId: string): Promise<ScannerDevice[]> => {
    return prisma.scannerDevice.findMany({
      where: { organizationId },
      orderBy: { lastSyncAt: "desc" },
    });
  },

  /**
   * Create or update a scanner device
   * Updates lastSyncAt on every call (upsert pattern)
   */
  upsert: async (
    input: CreateScannerDeviceInput
  ): Promise<ScannerDevice> => {
    return prisma.scannerDevice.upsert({
      where: {
        organizationId_deviceId: {
          organizationId: input.organizationId,
          deviceId: input.deviceId,
        },
      },
      update: {
        lastSyncAt: new Date(),
        ...(input.name && { name: input.name }),
      },
      create: {
        organizationId: input.organizationId,
        deviceId: input.deviceId,
        name: input.name,
        lastSyncAt: new Date(),
      },
    });
  },

  /**
   * Update scanner device
   */
  update: async (
    organizationId: string,
    deviceId: string,
    data: UpdateScannerDeviceInput
  ): Promise<ScannerDevice> => {
    return prisma.scannerDevice.update({
      where: {
        organizationId_deviceId: {
          organizationId,
          deviceId,
        },
      },
      data,
    });
  },

  /**
   * Delete a scanner device
   */
  delete: async (
    organizationId: string,
    deviceId: string
  ): Promise<void> => {
    await prisma.scannerDevice.delete({
      where: {
        organizationId_deviceId: {
          organizationId,
          deviceId,
        },
      },
    });
  },

  /**
   * Get count of devices for an organization
   */
  countByOrganization: async (organizationId: string): Promise<number> => {
    return prisma.scannerDevice.count({
      where: { organizationId },
    });
  },
};
