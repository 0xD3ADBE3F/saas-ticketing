import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { analyticsService } from "@/server/services/analyticsService";

/**
 * GET /api/stats/scanning-analytics
 * Get enhanced scanning analytics for an event (check-in patterns, no-show rate)
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

  // Parse query parameters - eventId is required for scanning analytics
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId parameter is required" },
      { status: 400 }
    );
  }

  try {
    const data = await analyticsService.getScanningAnalytics(
      organizationId,
      eventId
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Scanning analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scanning analytics" },
      { status: 500 }
    );
  }
}
