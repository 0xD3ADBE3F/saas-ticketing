import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { analyticsService } from "@/server/services/analyticsService";

/**
 * GET /api/stats/repeat-customers
 * Get repeat customer intelligence and lifetime value metrics
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
  const dateFrom = searchParams.get("dateFrom")
    ? new Date(searchParams.get("dateFrom")!)
    : undefined;
  const dateTo = searchParams.get("dateTo")
    ? new Date(searchParams.get("dateTo")!)
    : undefined;

  try {
    const data = await analyticsService.getRepeatCustomerMetrics(
      organizationId,
      { dateFrom, dateTo }
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Repeat customers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch repeat customer metrics" },
      { status: 500 }
    );
  }
}
