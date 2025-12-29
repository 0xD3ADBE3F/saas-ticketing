import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";
import { payoutService } from "@/server/services/payoutService";

/**
 * GET /api/organizations/[id]/export/scans
 * Export scan logs as CSV
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params;

  // Verify authentication
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify organization membership
  const membership = await prisma.membership.findFirst({
    where: {
      organizationId,
      userId: user.id,
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this organization" },
      { status: 403 }
    );
  }

  // Only ADMIN and FINANCE roles can export data
  if (!["ADMIN", "FINANCE"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  // Get query params
  const searchParams = request.nextUrl.searchParams;
  const eventId = searchParams.get("eventId") || undefined;
  const from = searchParams.get("from");
  const until = searchParams.get("until");

  try {
    const scanLogs = await payoutService.getScanLogsForExport(organizationId, {
      eventId,
      from: from ? new Date(from) : undefined,
      until: until ? new Date(until) : undefined,
    });

    // Generate CSV
    const csvLines: string[] = [
      "Scan Date,Event Title,Ticket Code,Ticket Type,Order Number,Buyer Email,Result,Scanned By,Device ID,Offline Sync,Synced At",
    ];

    for (const log of scanLogs) {
      csvLines.push(
        [
          log.scanDate.toISOString(),
          `"${log.eventTitle}"`,
          log.ticketCode,
          `"${log.ticketType}"`,
          log.orderNumber,
          log.buyerEmail,
          log.result,
          log.scannedBy,
          log.deviceId,
          log.offlineSync,
          log.syncedAt?.toISOString() || "",
        ].join(",")
      );
    }

    const csv = csvLines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="scans-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export scan logs:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to export scan logs",
      },
      { status: 500 }
    );
  }
}
