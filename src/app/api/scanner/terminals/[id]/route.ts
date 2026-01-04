import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations, hasRole } from "@/server/services/organizationService";
import {
  deactivateTerminal,
  activateTerminal,
  deleteTerminal,
} from "@/server/services/scannerTerminalService";
import { scannerTerminalRepo } from "@/server/repos/scannerTerminalRepo";

interface Props {
  params: Promise<{ id: string }>;
}

// =============================================================================
// GET /api/scanner/terminals/[id] - Get terminal details
// =============================================================================
export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;

  // Authentication
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  // Get organization
  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    return NextResponse.json(
      { error: "Geen organisatie gevonden" },
      { status: 404 }
    );
  }

  const organizationId = organizations[0].id;

  // Authorization
  const canView = await hasRole(organizationId, user.id, "SCANNER");
  if (!canView) {
    return NextResponse.json(
      { error: "Onvoldoende rechten" },
      { status: 403 }
    );
  }

  // Get terminal
  const terminal = await scannerTerminalRepo.findById(id, organizationId);
  if (!terminal) {
    return NextResponse.json(
      { error: "Terminal niet gevonden" },
      { status: 404 }
    );
  }

  return NextResponse.json({ terminal });
}

// =============================================================================
// PATCH /api/scanner/terminals/[id] - Activate/deactivate terminal
// =============================================================================
export async function PATCH(request: NextRequest, { params }: Props) {
  const { id } = await params;

  // Authentication
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  // Get organization
  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    return NextResponse.json(
      { error: "Geen organisatie gevonden" },
      { status: 404 }
    );
  }

  const organizationId = organizations[0].id;

  // Authorization - require ADMIN role
  const canManage = await hasRole(organizationId, user.id, "ADMIN");
  if (!canManage) {
    return NextResponse.json(
      { error: "Onvoldoende rechten. ADMIN rol vereist." },
      { status: 403 }
    );
  }

  // Parse request
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ongeldige JSON in request body" },
      { status: 400 }
    );
  }

  const { action } = body;

  if (action === "activate") {
    const success = await activateTerminal(id, organizationId);
    if (!success) {
      return NextResponse.json(
        { error: "Terminal niet gevonden" },
        { status: 404 }
      );
    }
    revalidatePath("/dashboard/scanning/terminals");
    return NextResponse.json({ success: true, message: "Terminal geactiveerd" });
  }

  if (action === "deactivate") {
    const success = await deactivateTerminal(id, organizationId);
    if (!success) {
      return NextResponse.json(
        { error: "Terminal niet gevonden" },
        { status: 404 }
      );
    }
    revalidatePath("/dashboard/scanning/terminals");
    return NextResponse.json({ success: true, message: "Terminal gedeactiveerd" });
  }

  return NextResponse.json(
    { error: "Ongeldige actie. Gebruik 'activate' of 'deactivate'." },
    { status: 400 }
  );
}

// =============================================================================
// DELETE /api/scanner/terminals/[id] - Delete terminal
// =============================================================================
export async function DELETE(request: NextRequest, { params }: Props) {
  const { id } = await params;

  // Authentication
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  // Get organization
  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    return NextResponse.json(
      { error: "Geen organisatie gevonden" },
      { status: 404 }
    );
  }

  const organizationId = organizations[0].id;

  // Authorization - require ADMIN role
  const canManage = await hasRole(organizationId, user.id, "ADMIN");
  if (!canManage) {
    return NextResponse.json(
      { error: "Onvoldoende rechten. ADMIN rol vereist." },
      { status: 403 }
    );
  }

  // Delete terminal
  const success = await deleteTerminal(id, organizationId);
  if (!success) {
    return NextResponse.json(
      { error: "Terminal niet gevonden" },
      { status: 404 }
    );
  }

  revalidatePath("/dashboard/scanning/terminals");
  return NextResponse.json({ success: true, message: "Terminal verwijderd" });
}
