import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import {
  getUserOrganizations,
  hasRole,
} from "@/server/services/organizationService";
import Link from "next/link";
import { eventRepo } from "@/server/repos/eventRepo";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, ScanLine, AlertCircle } from "lucide-react";

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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <h1 className="text-xl font-bold mb-2">Geen Toegang</h1>
          <p>
            Je hebt geen toegang tot de scanner functionaliteit. Vraag een
            administrator om je de SCANNER rol te geven.
          </p>
        </Alert>
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
        <EmptyState
          icon={ScanLine}
          title="Geen Evenementen"
          description="Er zijn nog geen gepubliceerde evenementen om te scannen."
          action={{
            label: "Ga naar Evenementen",
            href: "/dashboard/events",
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Scannen</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {publishedEvents.map((event) => (
          <Link key={event.id} href={`/dashboard/scanning/${event.id}`}>
            <Card className="hover:border-blue-500 transition-colors group">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-lg font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {event.title}
                  </h2>
                  <ScanLine className="w-6 h-6 text-gray-400" />
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
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
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                    Open Scanner →
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Mobile Scanner Card */}
      <div className="mt-8 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">
              📱 Mobiele Scanner
            </h3>
            <p className="text-sm text-purple-800 dark:text-purple-400 mb-4">
              Maak terminal codes aan voor je deur-personeel. Zij kunnen op hun
              mobiel tickets scannen zonder in te loggen.
            </p>
            <Link
              href="/dashboard/scanning/terminals"
              className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Terminal Codes Beheren →
            </Link>
          </div>
          <div className="text-4xl">🎫</div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
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
