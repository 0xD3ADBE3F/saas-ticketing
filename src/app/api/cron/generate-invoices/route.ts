/**
 * Cronjob endpoint for generating platform fee invoices
 * Runs daily to generate invoices for events that ended yesterday
 *
 * Security: Protected by CRON_SECRET environment variable
 * Schedule: Daily at 2:00 AM UTC (configured in vercel.json)
 */

import { NextResponse } from "next/server";
import { platformFeeInvoiceService } from "@/server/services/platformFeeInvoiceService";
import { mollieLogger } from "@/server/lib/logger";
import { env } from "@/server/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // 1. Verify authorization (cron secret)
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${env.CRON_SECRET || process.env.CRON_SECRET}`;

    if (!env.CRON_SECRET && !process.env.CRON_SECRET) {
      mollieLogger.error({
        message: "CRON_SECRET not configured",
      });
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (authHeader !== expectedAuth) {
      mollieLogger.warn({
        message: "Unauthorized cron attempt",
        authHeader: authHeader ? "provided" : "missing",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Generate invoices for events that ended yesterday
    const startTime = Date.now();

    mollieLogger.info({
      message: "Starting invoice generation cronjob",
      timestamp: new Date().toISOString(),
    });

    const invoices = await platformFeeInvoiceService.generateMissingInvoices(1);

    const duration = Date.now() - startTime;

    mollieLogger.info({
      message: "Invoice generation cronjob completed",
      invoicesGenerated: invoices.length,
      durationMs: duration,
    });

    // 3. Return results
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      invoicesGenerated: invoices.length,
      durationMs: duration,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        organizationId: inv.organizationId,
        eventId: inv.eventId,
        amount: inv.amount,
        vatAmount: inv.vatAmount,
        status: inv.status,
      })),
    });
  } catch (error) {
    mollieLogger.error({
      message: "Invoice generation cronjob failed",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

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

// Allow GET for testing (in development only)
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Method not allowed in production" },
      { status: 405 }
    );
  }

  return POST(request);
}
