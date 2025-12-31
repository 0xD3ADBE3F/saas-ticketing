import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/supabase";
import {
  createOrganization,
  getUserOrganizations,
} from "@/server/services/organizationService";
import { z } from "zod";

const createOrgSchema = z.object({
  name: z.string().min(2, "Naam moet minimaal 2 tekens zijn"),
  slug: z
    .string()
    .min(3, "Slug moet minimaal 3 tekens zijn")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug mag alleen kleine letters, cijfers en streepjes bevatten"
    ),
  email: z.string().email("Ongeldig e-mailadres").optional(),
  // Contact person (for Mollie)
  firstName: z.string().min(1, "Voornaam is verplicht").optional(),
  lastName: z.string().min(1, "Achternaam is verplicht").optional(),
  // Address (for Mollie)
  streetAndNumber: z.string().min(1, "Adres is verplicht").optional(),
  postalCode: z.string().min(1, "Postcode is verplicht").optional(),
  city: z.string().min(1, "Plaats is verplicht").optional(),
  country: z.string().length(2, "Landcode moet 2 letters zijn").optional(),
  // Optional business details
  registrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const organizations = await getUserOrganizations(user.id);
    return NextResponse.json({ organizations });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const parsed = createOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, slug, email, ...additionalData } = parsed.data;

    const result = await createOrganization(
      user.id,
      name,
      slug,
      email,
      additionalData
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ organization: result.organization });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
