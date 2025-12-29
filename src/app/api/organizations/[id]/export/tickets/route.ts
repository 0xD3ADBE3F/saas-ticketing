import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";
import { payoutService } from "@/server/services/payoutService";

/**
 * GET /api/organizations/[id]/export/tickets
 * Export tickets as CSV
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
    const tickets = await payoutService.getTicketsForExport(organizationId, {
      eventId,
      from: from ? new Date(from) : undefined,
      until: until ? new Date(until) : undefined,
    });

    // Generate CSV
    const csvLines: string[] = [
      "Ticket Code,Event Title,Event Date,Ticket Type,Order Number,Buyer Email,Buyer Name,Status,Used At,Created At",
    ];

    for (const ticket of tickets) {
      csvLines.push(
        [
          ticket.ticketCode,
          `"${ticket.eventTitle}"`,
          ticket.eventDate.toISOString(),
          `"${ticket.ticketType}"`,
          ticket.orderNumber,
          ticket.buyerEmail,
          `"${ticket.buyerName}"`,
          ticket.status,
          ticket.usedAt?.toISOString() || "",
          ticket.createdAt.toISOString(),
        ].join(",")
      );
    }

    const csv = csvLines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tickets-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export tickets:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to export tickets",
      },
      { status: 500 }
    );
  }
}
