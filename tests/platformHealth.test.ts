import { describe, it, expect, vi, beforeEach } from "vitest";
import { molliePlatformHealthService } from "../src/server/services/molliePlatformHealthService";
import { prisma } from "../src/server/lib/prisma";

// Mock environment variables
vi.mock("../src/server/lib/env", () => ({
  env: {
    MOLLIE_PLATFORM_ACCESS_TOKEN: "access_test123",
    MOLLIE_PLATFORM_REFRESH_TOKEN: "refresh_test123",
    MOLLIE_CONNECT_CLIENT_ID: "client_id_test",
    MOLLIE_CONNECT_CLIENT_SECRET: "client_secret_test",
    MOLLIE_REDIRECT_URI: "http://localhost:3000/callback",
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("molliePlatformHealthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkHealth", () => {
    it("should return healthy status when token is valid", async () => {
      // Mock successful Mollie API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "org_12345" }),
      });

      const status = await molliePlatformHealthService.checkHealth();

      expect(status.isHealthy).toBe(true);
      expect(status.needsRefresh).toBe(false);
      expect(status.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.mollie.com/v2/organization/me",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer access_test123",
          },
        })
      );
    });

    it("should attempt refresh when token is expired (401)", async () => {
      // Mock 401 response from Mollie
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      // Mock successful token refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "new_access_token",
          refresh_token: "new_refresh_token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      });

      const status = await molliePlatformHealthService.checkHealth();

      expect(status.isHealthy).toBe(true);
      expect(status.lastSuccessfulRefresh).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.mollie.com/oauth2/tokens",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should return unhealthy when token refresh fails", async () => {
      // Mock 401 response from Mollie
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      // Mock failed token refresh
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: "invalid_grant" }),
      });

      const status = await molliePlatformHealthService.checkHealth();

      expect(status.isHealthy).toBe(false);
      expect(status.needsRefresh).toBe(true);
      expect(status.error).toContain("refresh failed");
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const status = await molliePlatformHealthService.checkHealth();

      expect(status.isHealthy).toBe(false);
      expect(status.error).toContain("Network error");
    });
  });

  describe("attemptTokenRefresh", () => {
    it("should refresh token successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "new_access_token",
          refresh_token: "new_refresh_token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      });

      const result = await molliePlatformHealthService.attemptTokenRefresh();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.mollie.com/oauth2/tokens",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
      );
    });

    it("should return false when refresh fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: "invalid_grant" }),
      });

      const result = await molliePlatformHealthService.attemptTokenRefresh();

      expect(result).toBe(false);
    });
  });

  describe("getPlatformAuthUrl", () => {
    it("should generate correct OAuth URL", () => {
      const url = molliePlatformHealthService.getPlatformAuthUrl();

      expect(url).toContain("https://my.mollie.com/oauth2/authorize");
      expect(url).toContain("client_id=client_id_test");
      expect(url).toContain("response_type=code");
      expect(url).toContain("scope=organizations.write+profiles.write+clients.write");
      expect(url).toContain("state=platform");
    });
  });

  describe("needsAttention", () => {
    it("should return true when no status exists", async () => {
      const needsAttention = await molliePlatformHealthService.needsAttention();
      expect(needsAttention).toBe(true);
    });

    it("should return true when unhealthy and needs refresh", async () => {
      // Store unhealthy status
      await prisma.platformSettings.upsert({
        where: { key: "MOLLIE_PLATFORM_HEALTH" },
        update: {
          value: JSON.stringify({
            isHealthy: false,
            lastChecked: new Date(),
            needsRefresh: true,
          }),
        },
        create: {
          key: "MOLLIE_PLATFORM_HEALTH",
          value: JSON.stringify({
            isHealthy: false,
            lastChecked: new Date(),
            needsRefresh: true,
          }),
        },
      });

      const needsAttention = await molliePlatformHealthService.needsAttention();
      expect(needsAttention).toBe(true);
    });

    it("should return false when healthy and recently checked", async () => {
      // Store healthy status
      await prisma.platformSettings.upsert({
        where: { key: "MOLLIE_PLATFORM_HEALTH" },
        update: {
          value: JSON.stringify({
            isHealthy: true,
            lastChecked: new Date(),
            needsRefresh: false,
          }),
        },
        create: {
          key: "MOLLIE_PLATFORM_HEALTH",
          value: JSON.stringify({
            isHealthy: true,
            lastChecked: new Date(),
            needsRefresh: false,
          }),
        },
      });

      const needsAttention = await molliePlatformHealthService.needsAttention();
      expect(needsAttention).toBe(false);
    });
  });
});
