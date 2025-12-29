import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/supabase";
import { getOrganization } from "@/server/services/organizationService";
import { organizationRepo } from "@/server/repos/organizationRepo";
import { z } from "zod";

const updateOrgSchema = z.object({
  name: z.string().min(2, "Naam moet minimaal 2 tekens zijn").optional(),
  email: z.string().email("Ongeldig e-mailadres").optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const organization = await getOrganization(id, user.id);

    if (!organization) {
      return NextResponse.json(
        { error: "Organisatie niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ organization });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();

    const parsed = updateOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const organization = await organizationRepo.update(id, user.id, parsed.data);

    if (!organization) {
      return NextResponse.json(
        { error: "Organisatie niet gevonden of geen toegang" },
        { status: 404 }
      );
    }

    return NextResponse.json({ organization });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
