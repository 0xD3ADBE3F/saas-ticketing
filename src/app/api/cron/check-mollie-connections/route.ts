import { NextResponse } from "next/server";
import { checkAllConnections } from "@/server/services/mollieMonitoringService";
import { createLogger } from "@/server/lib/logger";

const cronLogger = createLogger("cron");

/**
 * POST /api/cron/check-mollie-connections
 *
 * Cron job that checks health of all Mollie connections
 * Sends email alerts if connections are invalid, especially for orgs with live events
 *
 * Should run: Every 6 hours
 * Vercel cron: 0 star-slash-6 star star star (replace with actual cron syntax)
 */
export async function POST(request: Request) {
  try {
    // Verify this is a legitimate Vercel cron request
    const cronHeader = request.headers.get("x-vercel-cron");
    if (!cronHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    cronLogger.info("Starting Mollie connection health check");
    const startTime = Date.now();

    const results = await checkAllConnections();

    const duration = Date.now() - startTime;
    const invalid = results.filter((r) => !r.connectionValid);
    const liveEventIssues = invalid.filter((r) => r.hasLiveEvents);

    cronLogger.info(
      {
        durationMs: duration,
        totalChecked: results.length,
        invalidCount: invalid.length,
        liveEventIssuesCount: liveEventIssues.length,
      },
      "Mollie health check complete"
    );

    return NextResponse.json({
      success: true,
      checked: results.length,
      invalid: invalid.length,
      liveEventIssues: liveEventIssues.length,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    cronLogger.error({ error }, "Mollie health check failed");
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
