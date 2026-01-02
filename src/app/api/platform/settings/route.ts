import { NextResponse } from "next/server";
import { platformSettingsService } from "@/server/services/platformSettingsService";
import { prisma } from "@/server/lib/prisma";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { z } from "zod";

const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
  description: z.string().optional(),
});

async function getSuperAdminUser(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check if user is a super admin
  const superAdmin = await prisma.superAdmin.findUnique({
    where: { userId: user.id },
  });

  return superAdmin ? user : null;
}

export async function GET(request: Request) {
  // Verify super admin
  const user = await getSuperAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const settings = await platformSettingsService.listAll();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const user = await getSuperAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { key, value, description } = updateSettingSchema.parse(body);

    await platformSettingsService.set(key, value, description);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    throw error;
  }
}
