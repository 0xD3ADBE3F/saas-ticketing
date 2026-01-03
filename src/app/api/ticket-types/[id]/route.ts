import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/server/lib/supabase";
import {
  getTicketType,
  updateTicketType,
  deleteTicketType,
} from "@/server/services/ticketTypeService";

const updateTicketTypeSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(100, "Naam mag maximaal 100 karakters zijn").optional(),
  description: z.string().min(1, "Beschrijving is verplicht").max(500, "Beschrijving mag maximaal 500 karakters zijn").optional(),
  price: z.number().min(0, "Prijs mag niet negatief zijn").max(10000, "Prijs mag maximaal €10.000 zijn").optional(),
  capacity: z.number().int().min(1, "Capaciteit moet minimaal 1 zijn").max(100000, "Capaciteit mag maximaal 100.000 zijn").optional(),
  saleStart: z.string().datetime("Ongeldige startdatum verkoop").nullable().optional(),
  saleEnd: z.string().datetime("Ongeldige einddatum verkoop").nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/ticket-types/[id] - Get a single ticket type
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;

  const result = await getTicketType(id, user.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ticketType: result.data });
}

/**
 * PATCH /api/ticket-types/[id] - Update a ticket type
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

  const parsed = updateTicketTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const result = await updateTicketType(id, user.id, {
    name: parsed.data.name,
    description: parsed.data.description ?? undefined,
    price: parsed.data.price,
    capacity: parsed.data.capacity,
    saleStart: parsed.data.saleStart ? new Date(parsed.data.saleStart) : parsed.data.saleStart === null ? null : undefined,
    saleEnd: parsed.data.saleEnd ? new Date(parsed.data.saleEnd) : parsed.data.saleEnd === null ? null : undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ticketType: result.data });
}

/**
 * DELETE /api/ticket-types/[id] - Delete a ticket type
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;

  const result = await deleteTicketType(id, user.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ticketType: result.data });
}
