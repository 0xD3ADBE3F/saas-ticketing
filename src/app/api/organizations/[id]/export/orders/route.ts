import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";
import { payoutService } from "@/server/services/payoutService";

/**
 * GET /api/organizations/[id]/export/orders
 * Export orders as CSV
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
    const orders = await payoutService.getOrdersForExport(organizationId, {
      eventId,
      from: from ? new Date(from) : undefined,
      until: until ? new Date(until) : undefined,
    });

    // Generate CSV
    const csvLines: string[] = [
      "Order Number,Event Title,Event Date,Buyer Email,Buyer Name,Ticket Type,Quantity,Unit Price (€),Total Price (€),Service Fee (€),Total Amount (€),Payment Method,Paid At",
    ];

    for (const order of orders) {
      for (const item of order.items) {
        csvLines.push(
          [
            order.orderNumber,
            `"${order.eventTitle}"`,
            order.eventDate.toISOString(),
            order.buyerEmail,
            `"${order.buyerName}"`,
            `"${item.ticketType}"`,
            item.quantity,
            (item.unitPrice / 100).toFixed(2),
            (item.totalPrice / 100).toFixed(2),
            (order.serviceFee / 100).toFixed(2),
            (order.totalAmount / 100).toFixed(2),
            order.paymentMethod,
            order.paidAt?.toISOString() || "",
          ].join(",")
        );
      }
    }

    const csv = csvLines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export orders:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to export orders",
      },
      { status: 500 }
    );
  }
}
