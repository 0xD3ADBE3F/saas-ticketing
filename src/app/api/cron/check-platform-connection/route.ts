import { NextResponse } from "next/server";
import { molliePlatformHealthService } from "@/server/services/molliePlatformHealthService";
import { mollieLogger } from "@/server/lib/logger";
import { env } from "@/server/lib/env";

/**
 * POST /api/cron/check-platform-connection
 *
 * Cron job that checks the health of the Mollie platform connection
 * Verifies token validity and attempts automatic refresh if needed
 *
 * Should run: Every 6 hours
 * Vercel cron: "0 star/6 star star star" (replace star with *)
 *
 * Requires: x-vercel-cron header (automatically added by Vercel)
 */
export async function POST(request: Request) {
  try {
    // Verify this is a Vercel cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', {
        status: 401,
      });
    }

    mollieLogger.info("Starting platform connection health check");

    // Check platform health (automatically attempts refresh if needed)
    const healthStatus = await molliePlatformHealthService.checkHealth();

    if (!healthStatus.isHealthy) {
      mollieLogger.error(
        {
          error: healthStatus.error,
          needsRefresh: healthStatus.needsRefresh,
        },
        "Platform connection unhealthy"
      );

      if (healthStatus.needsRefresh) {
        mollieLogger.error(
          "⚠️  URGENT: Platform token expired and automatic refresh failed"
        );
        mollieLogger.error(
          "Super admin must reconnect via /platform dashboard"
        );

        // TODO: Send email alert to super admins
      }

      return NextResponse.json(
        {
          success: false,
          status: healthStatus,
          message: "Platform connection unhealthy",
        },
        { status: 503 }
      );
    }

    mollieLogger.info("Platform connection health check completed successfully");

    return NextResponse.json({
      success: true,
      status: healthStatus,
      message: "Platform connection healthy",
    });
  } catch (error) {
    mollieLogger.error({ error }, "Platform health check cron failed");

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
