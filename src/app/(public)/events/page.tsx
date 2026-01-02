import { eventRepo } from "@/server/repos/eventRepo";
import { PublicEventCard } from "@/components/public";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aankomende Evenementen - Entro",
  description:
    "Ontdek en boek tickets voor verschillende evenementen via Entro. Veilig betalen en direct je tickets ontvangen.",
};

export default async function EventsListPage() {
  const events = await eventRepo.findPublicEvents();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="public-container py-12">
        {/* Page Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Aankomende Evenementen
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Ontdek en boek tickets voor verschillende evenementen via Entro
          </p>
          {events.length > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              {events.length}{" "}
              {events.length === 1 ? "evenement" : "evenementen"} gevonden
            </p>
          )}
        </div>

        {/* Events List */}
        {events.length > 0 ? (
          <div className="space-y-8">
            {events.map((event) => (
              <PublicEventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg
                  className="w-10 h-10 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Momenteel geen evenementen
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Er zijn momenteel geen aankomende evenementen beschikbaar. Kom
                binnenkort terug voor nieuwe evenementen!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
