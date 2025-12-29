import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { orderRepo } from "@/server/repos/orderRepo";
import { OrderStatus } from "@/generated/prisma";

/**
 * GET /api/organizations/[id]/orders
 * List orders with filters
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: organizationId } = await params;
  const searchParams = req.nextUrl.searchParams;

  // Parse filters from query params
  const status = searchParams.get("status") as OrderStatus | undefined;
  const eventId = searchParams.get("eventId") || undefined;
  const search = searchParams.get("search") || undefined;
  const dateFrom = searchParams.get("dateFrom")
    ? new Date(searchParams.get("dateFrom")!)
    : undefined;
  const dateTo = searchParams.get("dateTo")
    ? new Date(searchParams.get("dateTo")!)
    : undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : 50;
  const offset = searchParams.get("offset")
    ? parseInt(searchParams.get("offset")!, 10)
    : 0;

  try {
    const result = await orderRepo.findWithFilters(organizationId, user.id, {
      status,
      eventId,
      search,
      dateFrom,
      dateTo,
      limit,
      offset,
    });

    return NextResponse.json({
      orders: result.orders,
      total: result.total,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Failed to fetch orders:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
