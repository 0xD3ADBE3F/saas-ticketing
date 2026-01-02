import { NextRequest, NextResponse } from "next/server";
import { orderExpirationService } from "@/server/services/orderExpirationService";
import { logger } from "@/server/lib/logger";

/**
 * Cron job endpoint to expire old orders
 * Should be called every minute by a cron service (Vercel Cron, etc.)
 *
 * Authorization: Bearer token from env variable
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET environment variable not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn({
        service: "cronJob",
        ip: req.headers.get("x-forwarded-for") || "unknown",
      }, "Unauthorized cron job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info({ service: "cronJob" }, "Starting order expiration cron job");
    const expiredCount = await orderExpirationService.expireOldOrders();

    logger.info({
      service: "cronJob",
      expiredCount,
    }, "Order expiration cron job completed");

    return NextResponse.json({
      success: true,
      expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({
      service: "cronJob",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, "Cron job failed");

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Allow GET requests only
export const dynamic = "force-dynamic";
