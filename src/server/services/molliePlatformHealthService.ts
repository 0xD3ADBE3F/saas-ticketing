import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { mollieLogger } from "../lib/logger";
import { platformTokenService } from "./platformTokenService";

/**
 * Platform token health status
 */
export interface PlatformHealthStatus {
  isHealthy: boolean;
  lastChecked: Date;
  lastSuccessfulRefresh?: Date;
  error?: string;
  expiresAt?: Date;
  needsRefresh: boolean;
  organization?: {
    id: string;
    name: string;
    email?: string;
  };
}

/**
 * Token refresh response from Mollie OAuth
 */
interface TokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Mollie Platform Health Service
 *
 * Monitors and maintains the health of the platform connection to Mollie.
 * This includes:
 * - Checking token validity
 * - Automatic token refresh
 * - Storing health status for monitoring
 * - Alerting on persistent failures
 */
class MolliePlatformHealthService {
  private readonly HEALTH_CHECK_KEY = "MOLLIE_PLATFORM_HEALTH";

  /**
   * Check the health of the platform connection
   * Makes a lightweight API call to verify the token is valid
   */
  async checkHealth(): Promise<PlatformHealthStatus> {
    mollieLogger.info("Checking platform connection health");

    const platformToken = await platformTokenService.getAccessToken();

    if (!platformToken) {
      const status: PlatformHealthStatus = {
        isHealthy: false,
        lastChecked: new Date(),
        error: "Platform access token not configured in database",
        needsRefresh: false,
      };

      await this.storeHealthStatus(status);
      return status;
    }

    try {
      // Make a lightweight API call to verify token validity
      // Use the organizations/me endpoint as it requires minimal permissions
      const response = await fetch("https://api.mollie.com/v2/organizations/me", {
        headers: {
          "Authorization": `Bearer ${platformToken}`,
        },
      });

      if (response.status === 401) {
        mollieLogger.warn("Platform token invalid or expired (401)");

        // Attempt automatic refresh
        const refreshed = await this.attemptTokenRefresh();

        if (refreshed) {
          const expiresAt = await this.getTokenExpiry();
          const status: PlatformHealthStatus = {
            isHealthy: true,
            lastChecked: new Date(),
            lastSuccessfulRefresh: new Date(),
            expiresAt: expiresAt || undefined,
            needsRefresh: false,
          };

          await this.storeHealthStatus(status);
          return status;
        }

        const status: PlatformHealthStatus = {
          isHealthy: false,
          lastChecked: new Date(),
          error: "Platform token expired and refresh failed",
          needsRefresh: true,
        };

        await this.storeHealthStatus(status);
        return status;
      }

      if (!response.ok) {
        throw new Error(`Mollie API error: ${response.status}`);
      }

      // Extract organization details from response
      const orgData = await response.json();
      mollieLogger.info({ orgId: orgData.id, orgName: orgData.name }, "Platform connection healthy");

      // Get token expiry and preserve last successful refresh
      const expiresAt = await this.getTokenExpiry();
      const previousStatus = await this.getHealthStatus();

      const status: PlatformHealthStatus = {
        isHealthy: true,
        lastChecked: new Date(),
        lastSuccessfulRefresh: previousStatus?.lastSuccessfulRefresh,
        expiresAt: expiresAt || undefined,
        needsRefresh: false,
        organization: {
          id: orgData.id,
          name: orgData.name,
          email: orgData.email,
        },
      };

      await this.storeHealthStatus(status);
      return status;
    } catch (error) {
      mollieLogger.error({ error }, "Platform health check failed");

      const status: PlatformHealthStatus = {
        isHealthy: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
        needsRefresh: false,
      };

      await this.storeHealthStatus(status);
      return status;
    }
  }

  /**
   * Attempt to refresh the platform access token using the refresh token
   * Returns true if successful, false otherwise
   */
  async attemptTokenRefresh(): Promise<boolean> {
    const refreshToken = await platformTokenService.getRefreshToken();

    if (!refreshToken) {
      mollieLogger.error("No refresh token available in database");
      return false;
    }

    mollieLogger.info("Attempting to refresh platform access token");

    try {
      const response = await fetch("https://api.mollie.com/oauth2/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: env.MOLLIE_CONNECT_CLIENT_ID,
          client_secret: env.MOLLIE_CONNECT_CLIENT_SECRET,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        mollieLogger.error(
          { status: response.status, error },
          "Platform token refresh failed"
        );
        return false;
      }

      const tokenData: TokenRefreshResponse = await response.json();

      // Store new tokens in database
      await platformTokenService.setAccessToken(tokenData.access_token);
      if (tokenData.refresh_token) {
        await platformTokenService.setRefreshToken(tokenData.refresh_token);
      }

      // Store expiry information
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      await prisma.platformSettings.upsert({
        where: { key: "MOLLIE_PLATFORM_TOKEN_EXPIRES_AT" },
        update: { value: expiresAt.toISOString(), updatedAt: new Date() },
        create: {
          key: "MOLLIE_PLATFORM_TOKEN_EXPIRES_AT",
          value: expiresAt.toISOString(),
          description: "Platform token expiration timestamp",
        },
      });

      mollieLogger.info({ expiresAt }, "Platform token refreshed and stored");

      return true;
    } catch (error) {
      mollieLogger.error({ error }, "Exception during platform token refresh");
      return false;
    }
  }

  /**
   * Get the stored token expiry from database
   */
  private async getTokenExpiry(): Promise<Date | null> {
    try {
      const setting = await prisma.platformSettings.findUnique({
        where: { key: "MOLLIE_PLATFORM_TOKEN_EXPIRES_AT" },
      });

      if (!setting) {
        return null;
      }

      return new Date(setting.value);
    } catch (error) {
      mollieLogger.error({ error }, "Failed to retrieve token expiry");
      return null;
    }
  }

  /**
   * Get the stored health status from database
   */
  async getHealthStatus(): Promise<PlatformHealthStatus | null> {
    try {
      const setting = await prisma.platformSettings.findUnique({
        where: { key: this.HEALTH_CHECK_KEY },
      });

      if (!setting) {
        return null;
      }

      return JSON.parse(setting.value) as PlatformHealthStatus;
    } catch (error) {
      mollieLogger.error({ error }, "Failed to retrieve platform health status");
      return null;
    }
  }

  /**
   * Store health status in database for monitoring
   */
  private async storeHealthStatus(status: PlatformHealthStatus): Promise<void> {
    try {
      await prisma.platformSettings.upsert({
        where: { key: this.HEALTH_CHECK_KEY },
        update: {
          value: JSON.stringify(status),
          updatedAt: new Date(),
        },
        create: {
          key: this.HEALTH_CHECK_KEY,
          value: JSON.stringify(status),
          description: "Mollie platform connection health status",
        },
      });

      mollieLogger.info("Platform health status stored");
    } catch (error) {
      mollieLogger.error({ error }, "Failed to store platform health status");
    }
  }

  /**
   * Get the platform authorization URL for manual re-authorization
   */
  getPlatformAuthUrl(): string {
    const redirectUri =
      env.MOLLIE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/mollie/callback`;
    const clientId = env.MOLLIE_CONNECT_CLIENT_ID;

    // Platform needs these scopes for creating client links
    const scopes = [
      "organizations.write",
      "profiles.write",
      "clients.write",
    ].join("+");

    return (
      `https://my.mollie.com/oauth2/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${scopes}&` +
      `state=platform`
    );
  }

  /**
   * Check if platform needs immediate attention
   * Returns true if token is invalid and refresh is needed
   */
  async needsAttention(): Promise<boolean> {
    const status = await this.getHealthStatus();

    if (!status) {
      // No status yet, need to check
      return true;
    }

    // If unhealthy and needs refresh, requires attention
    if (!status.isHealthy && status.needsRefresh) {
      return true;
    }

    // If last check was more than 6 hours ago, needs attention
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    if (status.lastChecked < sixHoursAgo) {
      return true;
    }

    return false;
  }
}

export const molliePlatformHealthService = new MolliePlatformHealthService();
