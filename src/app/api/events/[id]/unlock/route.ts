import { NextResponse } from "next/server";
import { freeEventLimitService } from "@/server/services/freeEventLimitService";
import { prisma } from "@/server/lib/prisma";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { z } from "zod";

const unlockSchema = z.object({
  redirectUrl: z.string().url(),
});

async function getAuthenticatedOrganization(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });

  return membership?.organization || null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: "Idempotency-Key header required" },
      { status: 400 }
    );
  }

  const org = await getAuthenticatedOrganization(request);
  if (!org) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  // Check idempotency
  const existing = await prisma.idempotencyKey.findUnique({
    where: {
      key_organizationId: {
        key: idempotencyKey,
        organizationId: org.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json(existing.response as any, {
      status: existing.statusCode,
    });
  }

  try {
    const body = await request.json();
    const { redirectUrl } = unlockSchema.parse(body);

    const payment = await freeEventLimitService.createUnlockPayment(
      eventId,
      org.id,
      redirectUrl
    );

    // Store idempotency key
    await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        organizationId: org.id,
        endpoint: `/api/events/${eventId}/unlock`,
        response: payment,
        statusCode: 200,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    return NextResponse.json(payment);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create unlock payment" },
      { status: 500 }
    );
  }
}
