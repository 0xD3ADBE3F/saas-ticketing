/**
 * Service for managing Mollie platform tokens stored in the database
 * Replaces env variable approach for dynamic token management
 */
import { prisma } from "@/server/lib/prisma";
import { mollieLogger } from "@/server/lib/logger";

const PLATFORM_ACCESS_TOKEN_KEY = "MOLLIE_PLATFORM_ACCESS_TOKEN";
const PLATFORM_REFRESH_TOKEN_KEY = "MOLLIE_PLATFORM_REFRESH_TOKEN";

export const platformTokenService = {
  /**
   * Get the platform access token from database
   */
  async getAccessToken(): Promise<string | null> {
    const setting = await prisma.platformSettings.findUnique({
      where: { key: PLATFORM_ACCESS_TOKEN_KEY },
    });

    return setting?.value ?? null;
  },

  /**
   * Get the platform refresh token from database
   */
  async getRefreshToken(): Promise<string | null> {
    const setting = await prisma.platformSettings.findUnique({
      where: { key: PLATFORM_REFRESH_TOKEN_KEY },
    });

    return setting?.value ?? null;
  },

  /**
   * Get both access and refresh tokens
   */
  async getTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
  }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.getAccessToken(),
      this.getRefreshToken(),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  },

  /**
   * Store the platform access token in database
   */
  async setAccessToken(token: string): Promise<void> {
    await prisma.platformSettings.upsert({
      where: { key: PLATFORM_ACCESS_TOKEN_KEY },
      create: {
        key: PLATFORM_ACCESS_TOKEN_KEY,
        value: token,
        description: "Mollie platform access token for Mollie Connect",
      },
      update: {
        value: token,
        updatedAt: new Date(),
      },
    });

    mollieLogger.info("Platform access token updated in database");
  },

  /**
   * Store the platform refresh token in database
   */
  async setRefreshToken(token: string): Promise<void> {
    await prisma.platformSettings.upsert({
      where: { key: PLATFORM_REFRESH_TOKEN_KEY },
      create: {
        key: PLATFORM_REFRESH_TOKEN_KEY,
        value: token,
        description: "Mollie platform refresh token for token renewal",
      },
      update: {
        value: token,
        updatedAt: new Date(),
      },
    });

    mollieLogger.info("Platform refresh token updated in database");
  },

  /**
   * Store both access and refresh tokens
   */
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      this.setAccessToken(accessToken),
      this.setRefreshToken(refreshToken),
    ]);

    mollieLogger.info("Platform tokens updated in database");
  },
};
