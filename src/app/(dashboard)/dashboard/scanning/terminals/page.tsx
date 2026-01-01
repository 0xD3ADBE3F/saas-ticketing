import { getUser } from "@/server/lib/supabase";
import { redirect } from "next/navigation";
import { prisma } from "@/server/lib/prisma";
import { TerminalList } from "@/components/dashboard/TerminalList";
import { PageHeader } from "@/components/ui/page-header";

export default async function TerminalsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user's organization
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });

  if (!membership) {
    redirect("/onboarding");
  }

  const isAdmin = membership.role === "ADMIN";

  // Get terminals for this organization
  const terminals = await prisma.scannerTerminal.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      event: {
        select: { id: true, title: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get events for the dropdown
  const events = await prisma.event.findMany({
    where: {
      organizationId: membership.organizationId,
      status: { in: ["LIVE", "DRAFT"] },
    },
    select: { id: true, title: true },
    orderBy: { startsAt: "desc" },
  });

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Scanner Terminals"
        description="Maak inlogcodes voor deur-personeel om tickets te scannen op hun mobiel"
      />

      <TerminalList
        terminals={terminals.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          isActive: t.isActive,
          expiresAt: t.expiresAt?.toISOString() || null,
          createdAt: t.createdAt.toISOString(),
          lastUsedAt: t.lastUsedAt?.toISOString() || null,
          event: t.event ? { id: t.event.id, title: t.event.title } : null,
        }))}
        events={events}
        isAdmin={isAdmin}
        organizationId={membership.organizationId}
      />
    </div>
  );
}
