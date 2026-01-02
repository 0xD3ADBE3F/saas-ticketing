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

  const organization = organizations[0];
  const organizationId = organization.id;
  const params = await searchParams;
  const status = params.status as EventStatus | undefined;
  const search = params.search;

  const events = await getOrganizationEvents(organizationId, user.id, {
    ...(status && { status }),
    ...(search && { search }),
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
            Evenementen
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {events.length} {events.length === 1 ? "evenement" : "evenementen"}
            {status &&
              ` · ${status === "DRAFT" ? "Concept" : status === "LIVE" ? "Live" : status === "ENDED" ? "Afgelopen" : "Geannuleerd"}`}
          </p>
        </div>
        <Button
          asChild
          className="w-full sm:w-auto h-11 gap-2 shadow-lg shadow-blue-500/30 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          <Link href="/dashboard/events/new">
            <Plus className="w-5 h-5" />
            Nieuw Evenement
          </Link>
        </Button>
      </div>

      <EventFilters currentStatus={status} currentSearch={search} />

      {events.length === 0 ? (
        <div className="mt-8">
          {status || search ? (
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
          )}
        </div>
      ) : (
        <EventList events={events} organizationSlug={organization.slug} />
      )}
    </div>
  );
}
