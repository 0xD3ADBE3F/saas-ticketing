import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import {
  createEvent,
  getOrganizationEvents,
} from "@/server/services/eventService";

const createEventSchema = z.object({
  title: z.string().min(1, "Titel is verplicht").max(100, "Titel mag maximaal 100 karakters zijn"),
  description: z.string().max(2000, "Beschrijving mag maximaal 2000 karakters zijn").optional(),
  location: z.string().max(200, "Locatie mag maximaal 200 karakters zijn").optional(),
  startsAt: z.string().datetime("Ongeldige startdatum"),
  endsAt: z.string().datetime("Ongeldige einddatum"),
  isPaid: z.boolean().optional(), // Whether event has paid tickets (requires Mollie)
  vatRate: z.enum(["STANDARD_21", "REDUCED_9", "EXEMPT"]).optional(), // VAT rate for paid events
  passPaymentFeesToBuyer: z.boolean().optional(), // Pass payment fees to buyer toggle
});

/**
 * GET /api/events - List events for the user's organization
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  // Get the first organization for now
  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    return NextResponse.json({ error: "Geen organisatie gevonden" }, { status: 404 });
  }

  const organizationId = organizations[0].id;

  // Parse query params for filters
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "DRAFT" | "LIVE" | "ENDED" | "CANCELLED" | null;
  const search = searchParams.get("search") || undefined;

  const events = await getOrganizationEvents(organizationId, user.id, {
    ...(status && { status }),
    ...(search && { search }),
  });

  return NextResponse.json({ events });
}

/**
 * POST /api/events - Create a new event
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  // Get the first organization for now
  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    return NextResponse.json({ error: "Geen organisatie gevonden" }, { status: 404 });
  }

  const organizationId = organizations[0].id;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const result = await createEvent(organizationId, user.id, {
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    isPaid: parsed.data.isPaid ?? true, // Default to paid event
    vatRate: parsed.data.vatRate || "STANDARD_21", // Default to 21% VAT
    passPaymentFeesToBuyer: parsed.data.passPaymentFeesToBuyer ?? false, // Default to OFF
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ event: result.data }, { status: 201 });
}
