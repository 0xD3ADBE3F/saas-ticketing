import createMollieClient, { MollieClient } from "@mollie/api-client";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { encryptionService } from "./encryptionService";

/**
 * OAuth token response from Mollie
 */
interface MollieTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: "bearer";
  scope: string;
}

/**
 * Stored token data (decrypted)
 */
interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * OAuth scopes required for platform functionality
 */
const MOLLIE_SCOPES = [
  "payments.read",
  "payments.write",
  "profiles.read",
  "organizations.read",
  "onboarding.read",
  "settlements.read",
  "balances.read",
].join(" ");

/**
 * Token refresh buffer - refresh 5 minutes before expiry
 */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Mollie Connect service for OAuth token management
 */
export const mollieConnectService = {
  /**
   * Generate OAuth authorization URL for organization to connect
   * Uses Client Links flow - we create account on their behalf
   */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.MOLLIE_CONNECT_CLIENT_ID,
      redirect_uri: env.MOLLIE_REDIRECT_URI ?? `${env.NEXT_PUBLIC_APP_URL}/api/auth/mollie/callback`,
      response_type: "code",
      scope: MOLLIE_SCOPES,
      state, // Used to verify callback and identify organization
      approval_prompt: "auto",
    });

    return `https://my.mollie.com/oauth2/authorize?${params.toString()}`;
  },

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCode(code: string): Promise<MollieTokenResponse> {
    const response = await fetch("https://api.mollie.com/oauth2/tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: env.MOLLIE_CONNECT_CLIENT_ID,
        client_secret: env.MOLLIE_CONNECT_CLIENT_SECRET,
        redirect_uri: env.MOLLIE_REDIRECT_URI ?? `${env.NEXT_PUBLIC_APP_URL}/api/auth/mollie/callback`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Mollie token exchange failed:", error);
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Refresh an expired access token
   */
  async refreshToken(refreshToken: string): Promise<MollieTokenResponse> {
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
      console.error("Mollie token refresh failed:", error);
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Store encrypted tokens in database for organization
   */
  async storeTokens(
    organizationId: string,
    tokens: MollieTokenResponse
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        mollieAccessToken: encryptionService.encryptToken(tokens.access_token),
        mollieRefreshToken: encryptionService.encryptToken(tokens.refresh_token),
        mollieTokenExpiresAt: expiresAt,
        mollieOnboardingStatus: "COMPLETED", // Connected via OAuth = onboarding complete
      },
    });
  },

  /**
   * Get decrypted tokens for organization
   */
  async getTokens(organizationId: string): Promise<TokenData | null> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        mollieAccessToken: true,
        mollieRefreshToken: true,
        mollieTokenExpiresAt: true,
      },
    });

    if (!org?.mollieAccessToken || !org?.mollieRefreshToken) {
      return null;
    }

    return {
      accessToken: encryptionService.decryptToken(org.mollieAccessToken),
      refreshToken: encryptionService.decryptToken(org.mollieRefreshToken),
      expiresAt: org.mollieTokenExpiresAt!,
    };
  },

  /**
   * Check if token needs refresh
   */
  isTokenExpired(expiresAt: Date): boolean {
    return Date.now() >= expiresAt.getTime() - TOKEN_REFRESH_BUFFER_MS;
  },

  /**
   * Get a valid access token, auto-refreshing if needed
   * This is the main method to use before making Mollie API calls
   */
  async getValidToken(organizationId: string): Promise<string> {
    const tokens = await this.getTokens(organizationId);

    if (!tokens) {
      throw new Error("Organization not connected to Mollie");
    }

    // Token still valid
    if (!this.isTokenExpired(tokens.expiresAt)) {
      return tokens.accessToken;
    }

    // Token expired, refresh it
    console.log(`Refreshing Mollie token for organization ${organizationId}`);
    const newTokens = await this.refreshToken(tokens.refreshToken);
    await this.storeTokens(organizationId, newTokens);

    return newTokens.access_token;
  },

  /**
   * Get a Mollie client authenticated for a specific organization
   */
  async getOrgClient(organizationId: string): Promise<MollieClient> {
    const accessToken = await this.getValidToken(organizationId);
    return createMollieClient({ accessToken });
  },

  /**
   * Check if organization has completed Mollie connection
   */
  async isConnected(organizationId: string): Promise<boolean> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        mollieAccessToken: true,
        mollieOnboardingStatus: true,
      },
    });

    return !!org?.mollieAccessToken && org?.mollieOnboardingStatus === "COMPLETED";
  },

  /**
   * Disconnect organization from Mollie (revoke tokens)
   */
  async disconnect(organizationId: string): Promise<void> {
    // TODO: Optionally revoke token at Mollie
    await prisma.organization.update({
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
  },
};
