import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import {
  getUserOrganizations,
  hasRole,
} from "@/server/services/organizationService";
import Link from "next/link";
import { eventRepo } from "@/server/repos/eventRepo";

export default async function ScanningPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const organizations = await getUserOrganizations(user.id);

  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  const currentOrg = organizations[0];

  // Check if user has SCANNER or ADMIN role
  const canScan =
    (await hasRole(currentOrg.id, user.id, "SCANNER")) ||
    (await hasRole(currentOrg.id, user.id, "ADMIN"));

  if (!canScan) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h1 className="text-xl font-bold text-red-900 dark:text-red-300 mb-2">
            Geen Toegang
          </h1>
          <p className="text-red-800 dark:text-red-400">
            Je hebt geen toegang tot de scanner functionaliteit. Vraag een
            administrator om je de SCANNER rol te geven.
          </p>
        </div>
      </div>
    );
  }

  // Get all published events for this organization
  const events = await eventRepo.findByOrganization(currentOrg.id, user.id);
  const publishedEvents = events.filter((e) => e.status === "LIVE");

  if (publishedEvents.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Scannen</h1>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="text-center">
            <div className="text-4xl mb-3">📱</div>
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Geen Evenementen
            </h2>
            <p className="text-blue-800 dark:text-blue-400 mb-4">
              Er zijn nog geen gepubliceerde evenementen om te scannen.
            </p>
            <Link
              href="/dashboard/events"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ga naar Evenementen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Scannen</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {publishedEvents.map((event) => (
          <Link
            key={event.id}
            href={`/dashboard/scanning/${event.id}`}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {event.title}
              </h2>
              <span className="text-2xl">📱</span>
            </div>

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>
                  {new Date(event.startsAt).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                Open Scanner →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          📖 Scanner Functies
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Real-time scanning met live statistieken</li>
          <li>• Zoeken op e-mailadres</li>
          <li>• Recente scans inzien</li>
          <li>• Handmatige overrides (alleen admin)</li>
        </ul>
      </div>
    </div>
  );
}
