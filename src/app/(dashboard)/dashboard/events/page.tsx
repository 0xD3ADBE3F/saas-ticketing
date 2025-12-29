import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { getOrganizationEvents } from "@/server/services/eventService";
import { EventStatus } from "@/generated/prisma";
import { EventList } from "@/components/events/EventList";
import { EventFilters } from "@/components/events/EventFilters";

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
        <Link
          href="/dashboard/events/new"
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium"
        >
          + Nieuw Evenement
        </Link>
      </div>

      <EventFilters currentStatus={status} currentSearch={search} />

      {events.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            {status || search ? (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Geen evenementen gevonden met deze filters.
                </p>
                <Link
                  href="/dashboard/events"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Filters wissen
                </Link>
              </>
            ) : (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Je hebt nog geen evenementen. Maak je eerste evenement om te
                  beginnen met ticketverkoop.
                </p>
                <Link
                  href="/dashboard/events/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  + Nieuw Evenement
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <EventList events={events} />
      )}
    </div>
  );
}
