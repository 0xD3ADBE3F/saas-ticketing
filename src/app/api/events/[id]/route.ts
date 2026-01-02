import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/server/lib/supabase";
import {
  getEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
} from "@/server/services/eventService";

const updateEventSchema = z.object({
  title: z.string().min(1, "Titel is verplicht").max(100, "Titel mag maximaal 100 karakters zijn").optional(),
  description: z.string().max(2000, "Beschrijving mag maximaal 2000 karakters zijn").nullable().optional(),
  location: z.string().max(200, "Locatie mag maximaal 200 karakters zijn").nullable().optional(),
  locationDescription: z.string().max(200, "Locatie omschrijving mag maximaal 200 karakters zijn").nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  startsAt: z.string().datetime("Ongeldige startdatum").optional(),
  endsAt: z.string().datetime("Ongeldige einddatum").optional(),
  status: z.enum(["DRAFT", "LIVE", "ENDED", "CANCELLED"]).optional(),
  isPaid: z.boolean().optional(),
  vatRate: z.enum(["STANDARD_21", "REDUCED_9", "EXEMPT"]).optional(),
  passPaymentFeesToBuyer: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/[id] - Get a single event
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;

  const result = await getEvent(id, user.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ event: result.data });
}

/**
 * PATCH /api/events/[id] - Update an event
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // Handle status update separately
  if (parsed.data.status) {
    const statusResult = await updateEventStatus(
      id,
      user.id,
      parsed.data.status
    );

    if (!statusResult.success) {
      return NextResponse.json({ error: statusResult.error }, { status: 400 });
    }

    // If only status was updated, return the result
    const { status, ...otherFields } = parsed.data;
    if (Object.keys(otherFields).length === 0) {
      return NextResponse.json({ event: statusResult.data });
    }
  }

  // Update other fields
  const { status, ...updateData } = parsed.data;
  const updatePayload: {
    title?: string;
    description?: string | null;
    location?: string | null;
    locationDescription?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    startsAt?: Date;
    endsAt?: Date;
    isPaid?: boolean;
    vatRate?: "STANDARD_21" | "REDUCED_9" | "EXEMPT";
    passPaymentFeesToBuyer?: boolean;
  } = {};

  if (updateData.title !== undefined) updatePayload.title = updateData.title;
  if (updateData.description !== undefined) updatePayload.description = updateData.description;
  if (updateData.location !== undefined) updatePayload.location = updateData.location;
  if (updateData.locationDescription !== undefined) updatePayload.locationDescription = updateData.locationDescription;
  if (updateData.latitude !== undefined) updatePayload.latitude = updateData.latitude;
  if (updateData.longitude !== undefined) updatePayload.longitude = updateData.longitude;
  if (updateData.startsAt !== undefined) updatePayload.startsAt = new Date(updateData.startsAt);
  if (updateData.endsAt !== undefined) updatePayload.endsAt = new Date(updateData.endsAt);
  if (updateData.isPaid !== undefined) updatePayload.isPaid = updateData.isPaid;
  if (updateData.vatRate !== undefined) updatePayload.vatRate = updateData.vatRate;
  if (updateData.passPaymentFeesToBuyer !== undefined) updatePayload.passPaymentFeesToBuyer = updateData.passPaymentFeesToBuyer;

  if (Object.keys(updatePayload).length > 0) {
    const result = await updateEvent(id, user.id, updatePayload);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ event: result.data });
  }

  // If nothing to update, just get and return the event
  const result = await getEvent(id, user.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ event: result.data });
}

/**
 * DELETE /api/events/[id] - Delete an event
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;

  const result = await deleteEvent(id, user.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
