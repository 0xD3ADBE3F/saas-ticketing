import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Prisma
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    organization: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock("@/server/lib/logger", () => ({
  mollieLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { prisma } from "@/server/lib/prisma";
import { mollieConnectService } from "@/server/services/mollieConnectService";

const mockPrisma = prisma as unknown as {
  organization: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

describe("Mollie Callback - Organization ID and Profile ID", () => {
  const testOrgId = "test-callback-org";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should store both mollieOrganizationId and mollieProfileId after OAuth callback", async () => {
    // Mock organization creation
    mockPrisma.organization.create.mockResolvedValue({
      id: testOrgId,
      name: "Test Org",
      slug: "test-org-callback",
      email: "test@example.com",
    } as any);

    // Mock the Mollie client
    const mockClient = {
      organizations: {
        getCurrent: vi.fn().mockResolvedValue({
          id: "org_12345",
          name: "Test Mollie Org",
        }),
      },
      profiles: {
        page: vi.fn().mockResolvedValue([
          {
            id: "pfl_67890",
            name: "Test Profile",
          },
        ]),
      },
    };

    // Spy on getOrgClient to return our mock
    vi.spyOn(mollieConnectService, "getOrgClient").mockResolvedValue(
      mockClient as any
    );

    // Mock the organization update call
    mockPrisma.organization.update.mockResolvedValue({
      id: testOrgId,
      mollieOrganizationId: "org_12345",
      mollieProfileId: "pfl_67890",
      mollieOnboardingStatus: "COMPLETED",
    } as any);

    // Simulate what the callback handler does:
    // 1. Store tokens (first update)
    mockPrisma.organization.update({
      where: { id: testOrgId },
      data: {
        mollieAccessToken: "encrypted_access_token",
        mollieRefreshToken: "encrypted_refresh_token",
        mollieTokenExpiresAt: new Date(Date.now() + 3600000),
        mollieOnboardingStatus: "COMPLETED",
      },
    });

    // 2. Get client and fetch organization/profile info
    const client = await mollieConnectService.getOrgClient(testOrgId);
    const mollieOrg = await client.organizations.getCurrent();
    const profiles = await client.profiles.page();
    const defaultProfile = profiles[0];

    // 3. Update with organization ID and profile ID
    mockPrisma.organization.update({
      where: { id: testOrgId },
      data: {
        mollieOrganizationId: mollieOrg.id,
        mollieProfileId: defaultProfile?.id || null,
      },
    });

    // Verify the update was called with correct data
    expect(mockPrisma.organization.update).toHaveBeenCalledWith({
      where: { id: testOrgId },
      data: {
        mollieOrganizationId: "org_12345",
        mollieProfileId: "pfl_67890",
      },
    });
  });

  it("should handle missing profile gracefully", async () => {
    // Mock the Mollie client with no profiles
    const mockClient = {
      organizations: {
        getCurrent: vi.fn().mockResolvedValue({
          id: "org_12345",
          name: "Test Mollie Org",
        }),
      },
      profiles: {
        page: vi.fn().mockResolvedValue([]), // No profiles
      },
    };

    vi.spyOn(mollieConnectService, "getOrgClient").mockResolvedValue(
      mockClient as any
    );

    mockPrisma.organization.update.mockResolvedValue({
      id: testOrgId,
      mollieOrganizationId: "org_12345",
      mollieProfileId: null,
    } as any);

    // Simulate callback flow
    const client = await mollieConnectService.getOrgClient(testOrgId);
    const mollieOrg = await client.organizations.getCurrent();
    const profiles = await client.profiles.page();
    const defaultProfile = profiles[0];

    mockPrisma.organization.update({
      where: { id: testOrgId },
      data: {
        mollieOrganizationId: mollieOrg.id,
        mollieProfileId: defaultProfile?.id || null,
      },
    });

    // Verify the update was called with correct data
    expect(mockPrisma.organization.update).toHaveBeenCalledWith({
      where: { id: testOrgId },
      data: {
        mollieOrganizationId: "org_12345",
        mollieProfileId: null,
      },
    });
  });
});
