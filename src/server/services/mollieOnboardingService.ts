import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { mollieConnectService } from "./mollieConnectService";
import { mollieLogger } from "../lib/logger";
import { MollieOnboardingStatus } from "../../generated/prisma";

/**
 * Client Link request for creating Mollie accounts
 * https://docs.mollie.com/reference/create-client-link
 */
interface ClientLinkRequest {
  owner: {
    email: string;
    givenName: string;
    familyName: string;
    locale?: string;
  };
  name: string; // Organization/business name
  address?: {
    streetAndNumber?: string;
    postalCode?: string;
    city?: string;
    country: string; // ISO 3166-1 alpha-2
  };
  registrationNumber?: string; // KvK number for NL
  vatNumber?: string;
}

/**
 * Client Link response from Mollie
 */
interface ClientLinkResponse {
  id: string;
  resource: "client-link";
  _links: {
    clientLink: {
      href: string;
      type: string;
    };
    documentation: {
      href: string;
      type: string;
    };
  };
}

/**
 * Onboarding status response from Mollie
 */
interface OnboardingStatusResponse {
  resource: "onboarding";
  name: string;
  signedUpAt: string;
  status: "needs-data" | "in-review" | "completed";
  canReceivePayments: boolean;
  canReceiveSettlements: boolean;
  _links: {
    self: { href: string };
    dashboard: { href: string };
    organization: { href: string };
  };
}

/**
 * Map Mollie status to our enum
 */
function mapMollieStatus(status: string): MollieOnboardingStatus {
  switch (status) {
    case "needs-data":
      return "NEEDS_DATA";
    case "in-review":
      return "IN_REVIEW";
    case "completed":
      return "COMPLETED";
    default:
      return "PENDING";
  }
}

/**
 * Mollie Onboarding service
 * Supports two flows:
 *
 * Flow A - Standard OAuth (simpler, no prefill):
 * 1. Redirect organization to Mollie's authorize URL
 * 2. They create/link their Mollie account
 * 3. Mollie redirects back with authorization code
 * 4. We exchange code for OAuth tokens
 *
 * Flow B - Client Links API (advanced, with prefill):
 * 1. Platform admin authorizes OAuth app (gets token with clients.write)
 * 2. Platform calls Client Links API to create prefilled account
 * 3. Merchant clicks link, completes onboarding
 * 4. Mollie redirects back, we exchange code for tokens
 */
export const mollieOnboardingService = {
  /**
   * Get the OAuth authorization URL for an organization
   * This is the standard OAuth flow - organization connects their Mollie account
   */
  getAuthorizationUrl(organizationId: string): string {
    const state = Buffer.from(JSON.stringify({ organizationId })).toString("base64url");

    const params = new URLSearchParams({
      client_id: env.MOLLIE_CONNECT_CLIENT_ID,
      redirect_uri: env.MOLLIE_REDIRECT_URI ?? `${env.NEXT_PUBLIC_APP_URL}/api/auth/mollie/callback`,
      response_type: "code",
      scope: "payments.read payments.write profiles.read organizations.read onboarding.read onboarding.write settlements.read balances.read",
      state,
      approval_prompt: "force", // Force consent screen to ensure new scopes are granted
    });

    return `https://my.mollie.com/oauth2/authorize?${params.toString()}`;
  },

  /**
   * Get the platform authorization URL
   * Platform admin needs to visit this once to grant clients.write permission
   * Only needed if you want to use Client Links API for prefilled onboarding
   */
  getPlatformAuthUrl(): string {
    const redirectUri = env.MOLLIE_REDIRECT_URI ?? `${env.NEXT_PUBLIC_APP_URL}/api/auth/mollie/callback`;

    const params = new URLSearchParams({
      client_id: env.MOLLIE_CONNECT_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "organizations.read clients.write",
      state: "platform", // Special state to identify platform auth
    });
    return `https://my.mollie.com/oauth2/authorize?${params.toString()}`;
  },

  /**
   * Exchange platform authorization code for access token
   * Call this from the platform callback route
   */
  async exchangePlatformCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const redirectUri = env.MOLLIE_REDIRECT_URI ?? `${env.NEXT_PUBLIC_APP_URL}/api/auth/mollie/callback`;

    const response = await fetch("https://api.mollie.com/oauth2/tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: env.MOLLIE_CONNECT_CLIENT_ID,
        client_secret: env.MOLLIE_CONNECT_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      mollieLogger.error({ error, status: response.status }, "Failed to exchange platform code");
      throw new Error(`Failed to exchange platform code: ${response.status}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  },

  /**
   * Create a client link for organization onboarding
   * Requires MOLLIE_PLATFORM_ACCESS_TOKEN with clients.write scope
   * https://docs.mollie.com/reference/create-client-link
   */
  async createClientLink(
    organizationId: string,
    ownerData: {
      email: string;
      givenName: string;
      familyName: string;
    }
  ): Promise<string> {
    // Get organization data
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    // Build client link request
    const request: ClientLinkRequest = {
      owner: {
        email: ownerData.email,
        givenName: ownerData.givenName,
        familyName: ownerData.familyName,
        locale: "nl_NL", // Dutch locale for NL market
      },
      name: org.name,
      address: {
        country: "NL", // Netherlands only
      },
    };

    // Get platform access token (must have clients.write scope)
    const platformToken = env.MOLLIE_PLATFORM_ACCESS_TOKEN;
    if (!platformToken) {
      throw new Error(
        "MOLLIE_PLATFORM_ACCESS_TOKEN not configured. " +
        "Platform admin must authorize the OAuth app first. " +
        `Visit: ${this.getPlatformAuthUrl()}`
      );
    }

    // Create client link using platform OAuth token
    const response = await fetch("https://api.mollie.com/v2/client-links", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${platformToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      mollieLogger.error({ error, status: response.status }, "Failed to create client link");
      throw new Error(`Failed to create client link: ${response.status}`);
    }

    const data: ClientLinkResponse = await response.json();
    const clientLinkUrl = data._links.clientLink.href;

    // Store client link URL and set status to pending
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        mollieClientLinkUrl: clientLinkUrl,
        mollieOnboardingStatus: "PENDING",
      },
    });

    return clientLinkUrl;
  },

  /**
   * Get the authorization URL for an organization
   * The user clicks this to complete onboarding in Mollie's web app
   */
  async getOnboardingUrl(organizationId: string): Promise<string | null> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { mollieClientLinkUrl: true },
    });

    if (!org?.mollieClientLinkUrl) {
      return null;
    }

    // Client link URL includes OAuth consent
    // After completing onboarding, Mollie redirects to our callback
    const state = Buffer.from(
      JSON.stringify({ organizationId })
    ).toString("base64url");

    const redirectUri = env.MOLLIE_REDIRECT_URI ?? `${env.NEXT_PUBLIC_APP_URL}/api/auth/mollie/callback`;

    // Add required OAuth parameters to the client link
    // See: https://docs.mollie.com/reference/create-client-link#redirecting-the-customer
    const url = new URL(org.mollieClientLinkUrl);
    url.searchParams.set("client_id", env.MOLLIE_CONNECT_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    // Required: scope parameter with permissions needed
    url.searchParams.set("scope", "payments.read payments.write profiles.read organizations.read onboarding.read onboarding.write settlements.read balances.read");

    return url.toString();
  },

  /**
   * Get current onboarding status from Mollie
   * Requires organization to be connected (have access token)
   */
  async getOnboardingStatus(
    organizationId: string
  ): Promise<OnboardingStatusResponse | null> {
    try {
      const accessToken = await mollieConnectService.getValidToken(organizationId);

      const response = await fetch("https://api.mollie.com/v2/onboarding/me", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        mollieLogger.error({ status: response.status }, "Failed to get onboarding status");
        return null;
      }

      return response.json();
    } catch {
      // Organization not connected yet
      return null;
    }
  },

  /**
   * Poll and update onboarding status
   * Returns current status and whether it changed
   */
  async pollStatus(organizationId: string): Promise<{
    status: MollieOnboardingStatus;
    canReceivePayments: boolean;
    changed: boolean;
  }> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { mollieOnboardingStatus: true },
    });

    const previousStatus = org?.mollieOnboardingStatus;
    const onboarding = await this.getOnboardingStatus(organizationId);

    if (!onboarding) {
      return {
        status: previousStatus ?? "PENDING",
        canReceivePayments: false,
        changed: false,
      };
    }

    const newStatus = mapMollieStatus(onboarding.status);
    const changed = previousStatus !== newStatus;

    if (changed) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { mollieOnboardingStatus: newStatus },
      });
    }

    return {
      status: newStatus,
      canReceivePayments: onboarding.canReceivePayments,
      changed,
    };
  },

  /**
   * Check if organization can publish events
   * Requires completed Mollie onboarding
   */
  async canPublishEvents(organizationId: string): Promise<boolean> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { mollieOnboardingStatus: true },
    });

    return org?.mollieOnboardingStatus === "COMPLETED";
  },

  /**
   * Get organization's Mollie dashboard URL
   */
  async getDashboardUrl(organizationId: string): Promise<string | null> {
    const onboarding = await this.getOnboardingStatus(organizationId);
    return onboarding?._links.dashboard.href ?? null;
  },

  /**
   * Disconnect Mollie account from organization
   * Clears all Mollie-related data from the organization
   * Note: This does NOT delete the merchant's Mollie account, just the connection
   */
  async disconnect(organizationId: string): Promise<void> {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        mollieOrganizationId: null,
        mollieAccessToken: null,
        mollieRefreshToken: null,
        mollieTokenExpiresAt: null,
        mollieOnboardingStatus: null,
        mollieProfileId: null,
        mollieClientLinkUrl: null,
      },
    });
  },
};
