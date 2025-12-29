import { NextResponse } from "next/server";
import { mollieOnboardingService } from "@/server/services/mollieOnboardingService";

/**
 * Redirect to Mollie OAuth for platform authorization
 *
 * Platform admin needs to visit this URL ONCE to grant the OAuth app
 * permission to create client links (clients.write scope).
 *
 * GET /api/auth/mollie/platform-auth
 */
export async function GET() {
  const authUrl = mollieOnboardingService.getPlatformAuthUrl();
  return NextResponse.redirect(authUrl);
}
