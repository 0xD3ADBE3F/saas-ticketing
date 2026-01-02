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
      logger.error("CRON_SECRET environment variable not set", {
        service: "cronJob",
      });
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        service: "cronJob",
        ip: req.headers.get("x-forwarded-for") || "unknown",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting order expiration cron job", { service: "cronJob" });
    const expiredCount = await orderExpirationService.expireOldOrders();

    logger.info("Order expiration cron job completed", {
      service: "cronJob",
      expiredCount,
    });

    return NextResponse.json({
      success: true,
      expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Cron job failed", {
      service: "cronJob",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

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
