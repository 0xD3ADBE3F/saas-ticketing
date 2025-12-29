import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";
import { mollieConnectService } from "@/server/services/mollieConnectService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/organizations/[id]/mollie/test
 * Test Mollie connection by calling GET /v2/onboarding/me
 * https://docs.mollie.com/reference/get-onboarding-status
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: organizationId } = await context.params;

    // Verify user is authenticated
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this organization
    const membership = await prisma.membership.findFirst({
      where: {
        organizationId,
        userId: user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if connected
    const isConnected = await mollieConnectService.isConnected(organizationId);
    if (!isConnected) {
      return NextResponse.json(
        { error: "Mollie account niet verbonden" },
        { status: 400 }
      );
    }

    // Get valid access token (refreshes if needed)
    const accessToken = await mollieConnectService.getValidToken(organizationId);

    // Test connection by calling Mollie's onboarding status endpoint
    // https://docs.mollie.com/reference/get-onboarding-status
    const response = await fetch("https://api.mollie.com/v2/onboarding/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mollie test connection failed:", response.status, errorText);

      return NextResponse.json(
        {
          success: false,
          error: `Mollie API fout: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Log raw API response for debugging
    // console.log("Mollie onboarding status API response:", JSON.stringify(data, null, 2));

    return NextResponse.json({
      success: true,
      message: "Verbinding succesvol getest",
      onboarding: {
        name: data.name,
        status: data.status,
        canReceivePayments: data.canReceivePayments,
        canReceiveSettlements: data.canReceiveSettlements,
        signedUpAt: data.signedUpAt,
      },
    });
  } catch (error) {
    console.error("Error testing Mollie connection:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Verbindingstest mislukt",
      },
      { status: 500 }
    );
  }
}
