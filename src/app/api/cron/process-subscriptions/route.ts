import { NextResponse } from "next/server";
import { subscriptionService } from "@/server/services/subscriptionService";

/**
 * Cron job endpoint to process expired subscriptions
 *
 * This should be called daily (or more frequently) by a cron service like:
 * - Vercel Cron (vercel.json)
 * - GitHub Actions
 * - External cron service (cron-job.org, etc.)
 *
 * Endpoint: GET /api/cron/process-subscriptions
 *
 * Security: Add Authorization header check in production
 */
export async function GET(request: Request) {
  try {
    // Verify authorization token (recommended for production)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Process all expired subscriptions
    const result = await subscriptionService.processExpiredSubscriptions();

    console.log(
      `[Cron] Processed ${result.processed} subscriptions with ${result.errors.length} errors`
    );

    if (result.errors.length > 0) {
      console.error("[Cron] Errors:", result.errors);
    }

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Failed to process subscriptions:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
