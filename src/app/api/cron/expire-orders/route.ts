import { NextRequest, NextResponse } from "next/server";
import { orderExpirationService } from "@/server/services/orderExpirationService";
import { logger } from "@/server/lib/logger";

/**
 * Cron job endpoint to expire old orders
 * Should be called every minute by a cron service (Vercel Cron, etc.)
 *
 * Authorization: Bearer token from env variable
 */
async function handleExpireOrders(req: NextRequest) {
  try {
    // Verify request is from Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', {
        status: 401,
      });
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

// Support both GET (for manual testing) and POST (for Vercel cron)
export async function GET(req: NextRequest) {
  return handleExpireOrders(req);
}

export async function POST(req: NextRequest) {
  return handleExpireOrders(req);
}

// Allow GET requests only
export const dynamic = "force-dynamic";
