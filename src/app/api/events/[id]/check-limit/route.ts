import { NextResponse } from "next/server";
import { freeEventLimitService } from "@/server/services/freeEventLimitService";
import { prisma } from "@/server/lib/prisma";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { z } from "zod";

const checkLimitSchema = z.object({
  newCapacity: z.number().int().min(0).default(0),
});

async function getAuthenticatedOrganization(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's organization membership
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });

  return membership?.organization || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getAuthenticatedOrganization(request);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  try {
    // Get current unlock status
    const result = await freeEventLimitService.checkFreeEventLimit(
      eventId,
      org.id,
      0 // Check with 0 to just get status
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check limit" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getAuthenticatedOrganization(request);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  try {
    const body = await request.json();
    const { newCapacity } = checkLimitSchema.parse(body);

    const result = await freeEventLimitService.checkFreeEventLimit(
      eventId,
      org.id,
      newCapacity
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to check limit" },
      { status: 500 }
    );
  }
}
