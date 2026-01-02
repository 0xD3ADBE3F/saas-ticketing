import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { analyticsService } from "@/server/services/analyticsService";

/**
 * GET /api/stats/sales-velocity
 * Get sales velocity over time with aggregation by interval
 */
export async function GET(request: NextRequest) {
  // Authenticate user
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's organization
  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    return NextResponse.json(
      { error: "No organization found" },
      { status: 404 }
    );
  }

  const organizationId = organizations[0].id;

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId") || undefined;
  const interval = (searchParams.get("interval") as
    | "hour"
    | "day"
    | "week"
    | "month") || "day";
  const dateFrom = searchParams.get("dateFrom")
    ? new Date(searchParams.get("dateFrom")!)
    : undefined;
  const dateTo = searchParams.get("dateTo")
    ? new Date(searchParams.get("dateTo")!)
    : undefined;

  try {
    const data = await analyticsService.getSalesVelocity(organizationId, {
      dateFrom,
      dateTo,
      eventId,
      interval,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Sales velocity error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales velocity" },
      { status: 500 }
    );
  }
}
