import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id },
      include: {
        organization: {
          select: {
            email: true,
            streetAndNumber: true,
            postalCode: true,
            city: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const org = membership.organization;

    // Check if all required billing fields are present
    const complete = Boolean(
      org.email &&
      org.streetAndNumber &&
      org.postalCode &&
      org.city
    );

    return NextResponse.json({
      complete,
      missing: {
        email: !org.email,
        streetAndNumber: !org.streetAndNumber,
        postalCode: !org.postalCode,
        city: !org.city,
      },
    });
  } catch (error: any) {
    console.error("Billing status check error:", error);
    return NextResponse.json(
      { error: "Failed to check billing status" },
      { status: 500 }
    );
  }
}
