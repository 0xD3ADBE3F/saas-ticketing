import { getUser } from "@/server/lib/supabase";
import { redirect } from "next/navigation";
import { prisma } from "@/server/lib/prisma";
import { TerminalList } from "@/components/dashboard/TerminalList";

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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-pink-900 dark:from-gray-100 dark:via-purple-100 dark:to-pink-100 bg-clip-text text-transparent mb-2">
          Terminals
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Maak terminal codes voor scan-personeel om tickets te scannen op hun
          mobiel
        </p>
      </div>

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
