import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { getOrganizationEvents } from "@/server/services/eventService";
import { EventStatus } from "@/generated/prisma";
import { EventList } from "@/components/events/EventList";
import { EventFilters } from "@/components/events/EventFilters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar, Plus } from "lucide-react";

interface EventsPageProps {
  searchParams: Promise<{ status?: string; search?: string }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  const organizationId = organizations[0].id;
  const params = await searchParams;
  const status = params.status as EventStatus | undefined;
  const search = params.search;

  const events = await getOrganizationEvents(organizationId, user.id, {
    ...(status && { status }),
    ...(search && { search }),
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Evenementen</h1>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dashboard/events/new">
            <Plus className="w-4 h-4" />
            Nieuw Evenement
          </Link>
        </Button>
      </div>

      <EventFilters currentStatus={status} currentSearch={search} />

      {events.length === 0 ? (
        status || search ? (
          <EmptyState
            icon={Calendar}
            title="Geen evenementen gevonden"
            description="Geen evenementen gevonden met deze filters."
            action={{
              label: "Filters wissen",
              href: "/dashboard/events",
            }}
          />
        ) : (
          <EmptyState
            icon={Calendar}
            title="Geen evenementen"
            description="Je hebt nog geen evenementen. Maak je eerste evenement om te beginnen met ticketverkoop."
            action={{
              label: "Nieuw Evenement",
              href: "/dashboard/events/new",
            }}
          />
        )
      ) : (
        <EventList events={events} />
      )}
    </div>
  );
}
