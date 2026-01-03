import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/server/lib/supabase";
import {
  createTicketType,
  getEventTicketTypes,
} from "@/server/services/ticketTypeService";

const createTicketTypeSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(100, "Naam mag maximaal 100 karakters zijn"),
  description: z.string().min(1, "Beschrijving is verplicht").max(500, "Beschrijving mag maximaal 500 karakters zijn"),
  price: z.number().min(0, "Prijs mag niet negatief zijn").max(10000, "Prijs mag maximaal €10.000 zijn"),
  capacity: z.number().int().min(1, "Capaciteit moet minimaal 1 zijn").max(100000, "Capaciteit mag maximaal 100.000 zijn"),
  saleStart: z.string().datetime("Ongeldige startdatum verkoop").optional(),
  saleEnd: z.string().datetime("Ongeldige einddatum verkoop").optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/[id]/ticket-types - List ticket types for an event
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const ticketTypes = await getEventTicketTypes(eventId, user.id);

  return NextResponse.json({ ticketTypes });
}

/**
 * POST /api/events/[id]/ticket-types - Create a new ticket type
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id: eventId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const parsed = createTicketTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const result = await createTicketType(eventId, user.id, {
    name: parsed.data.name,
    description: parsed.data.description,
    price: parsed.data.price,
    capacity: parsed.data.capacity,
    saleStart: parsed.data.saleStart ? new Date(parsed.data.saleStart) : undefined,
    saleEnd: parsed.data.saleEnd ? new Date(parsed.data.saleEnd) : undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ticketType: result.data }, { status: 201 });
}
