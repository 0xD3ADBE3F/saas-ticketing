import { NextResponse } from "next/server";
import { mollieOnboardingService } from "@/server/services/mollieOnboardingService";
import { mollieLogger } from "@/server/lib/logger";

/**
 * Initiate platform OAuth connection
 * GET /api/platform/mollie/connect
 *
 * Redirects to Mollie OAuth to authorize the platform
 */
export async function GET() {
  try {
    mollieLogger.info("Initiating platform OAuth connection");

    const authUrl = mollieOnboardingService.getPlatformAuthUrl();

    return NextResponse.redirect(authUrl);
  } catch (err) {
    mollieLogger.error({ err }, "Failed to initiate platform OAuth");

    return NextResponse.json(
      { error: "Failed to initiate platform OAuth connection" },
      { status: 500 }
    );
  }
}
