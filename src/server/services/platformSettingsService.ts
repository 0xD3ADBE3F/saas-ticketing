import { prisma } from "@/server/lib/prisma";

export const platformSettingsService = {
  /**
   * Get a platform setting by key
   * @param key - Setting key (e.g., "FREE_EVENT_TICKET_LIMIT")
   * @returns Parsed setting value or null if not found
   */
  async get<T = any>(key: string): Promise<T | null> {
    const setting = await prisma.platformSettings.findUnique({
      where: { key },
    });

    if (!setting) return null;

    try {
      // Try to parse as JSON first
      return JSON.parse(setting.value) as T;
    } catch {
      // If not JSON, try to parse as number if it looks like one
      const num = Number(setting.value);
      if (!isNaN(num)) {
        return num as T;
      }
      // Otherwise return as string
      return setting.value as T;
    }
  },

  /**
   * Get free event ticket limit (defaults to 100 if not configured)
   */
  async getFreeEventTicketLimit(): Promise<number> {
    const limit = await this.get<number>("FREE_EVENT_TICKET_LIMIT");
    return limit ?? 100;
  },

  /**
   * Get unlock fee amount in cents (defaults to €25.00)
   */
  async getUnlockFeeAmount(): Promise<number> {
    const fee = await this.get<number>("FREE_EVENT_UNLOCK_FEE");
    return fee ?? 2500; // €25.00
  },

  /**
   * Set a platform setting (admin only)
   */
  async set(
    key: string,
    value: any,
    description?: string
  ): Promise<void> {
    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);

    await prisma.platformSettings.upsert({
      where: { key },
      create: {
        key,
        value: stringValue,
        description,
      },
      update: {
        value: stringValue,
        description,
        updatedAt: new Date(),
      },
    });
  },

  /**
   * List all platform settings (admin only)
   */
  async listAll() {
    return prisma.platformSettings.findMany({
      orderBy: { key: "asc" },
    });
  },
};
