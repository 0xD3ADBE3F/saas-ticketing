import { describe, it, expect, vi, beforeEach } from "vitest";
import { mollieConnectService, InvalidRefreshTokenError } from "@/server/services/mollieConnectService";
import { prisma } from "@/server/lib/prisma";

// Mock dependencies
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/server/services/encryptionService", () => ({
  encryptionService: {
    encryptToken: vi.fn((token: string) => `encrypted_${token}`),
    decryptToken: vi.fn((token: string) => token.replace("encrypted_", "")),
  },
}));

describe("Mollie Token Refresh Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  it("should throw InvalidRefreshTokenError when refresh token is invalid", async () => {
    const invalidRefreshToken = "invalid_refresh_token";

    // Mock Mollie API response for invalid_grant
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({
        error: "invalid_grant",
        error_description: "refresh_token doesn't exist or is invalid for the client",
      }),
    } as Response);

    await expect(
      mollieConnectService.refreshToken(invalidRefreshToken)
    ).rejects.toThrow(InvalidRefreshTokenError);

    await expect(
      mollieConnectService.refreshToken(invalidRefreshToken)
    ).rejects.toThrow("Refresh token is invalid or revoked");
  });

  it("should disconnect organization when getValidToken encounters invalid refresh token", async () => {
    const organizationId = "test-org-id";
    const expiredDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

    // Mock organization with expired token
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      mollieAccessToken: "encrypted_access_token",
      mollieRefreshToken: "encrypted_invalid_refresh",
      mollieTokenExpiresAt: expiredDate,
    } as never);

    // Mock Mollie API response for invalid_grant
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({
        error: "invalid_grant",
        error_description: "refresh_token doesn't exist or is invalid for the client",
      }),
    } as Response);

    // Mock disconnect
    vi.mocked(prisma.organization.update).mockResolvedValue({} as never);

    await expect(
      mollieConnectService.getValidToken(organizationId)
    ).rejects.toThrow("Mollie connection is no longer valid");

    // Verify disconnect was called
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: organizationId },
      data: {
        mollieAccessToken: null,
        mollieRefreshToken: null,
        mollieTokenExpiresAt: null,
        mollieOnboardingStatus: null,
        mollieOrganizationId: null,
        mollieProfileId: null,
        mollieClientLinkUrl: null,
      },
    });
  });

  it("should successfully refresh token when valid", async () => {
    const organizationId = "test-org-id";
    const expiredDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

    // Mock organization with expired token
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      mollieAccessToken: "encrypted_old_access",
      mollieRefreshToken: "encrypted_valid_refresh",
      mollieTokenExpiresAt: expiredDate,
    } as never);

    // Mock successful token refresh
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new_access_token",
        refresh_token: "new_refresh_token",
        expires_in: 3600,
        token_type: "bearer",
        scope: "payments.read payments.write",
      }),
    } as Response);

    // Mock update
    vi.mocked(prisma.organization.update).mockResolvedValue({} as never);

    const token = await mollieConnectService.getValidToken(organizationId);

    expect(token).toBe("new_access_token");
    expect(prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: organizationId },
        data: expect.objectContaining({
          mollieAccessToken: "encrypted_new_access_token",
          mollieRefreshToken: "encrypted_new_refresh_token",
        }),
      })
    );
  });

  it("should return existing token when not expired", async () => {
    const organizationId = "test-org-id";
    const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Mock organization with valid token
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      mollieAccessToken: "encrypted_valid_access",
      mollieRefreshToken: "encrypted_valid_refresh",
      mollieTokenExpiresAt: futureDate,
    } as never);

    const token = await mollieConnectService.getValidToken(organizationId);

    expect(token).toBe("valid_access");
    // Should not call fetch or update since token is still valid
    expect(global.fetch).not.toHaveBeenCalled();
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });
});
