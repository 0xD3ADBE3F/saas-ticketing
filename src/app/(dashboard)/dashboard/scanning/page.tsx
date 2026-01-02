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
import {
  Calendar,
  MapPin,
  ScanLine,
  AlertCircle,
  ChevronRight,
  Smartphone,
} from "lucide-react";

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
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-gray-100 dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent mb-2">
          Scannen
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          <span className="text-blue-600 dark:text-blue-400 font-semibold">
            {publishedEvents.length}
          </span>{" "}
          {publishedEvents.length === 1 ? "evenement" : "evenementen"}{" "}
          beschikbaar voor scanning
        </p>
      </div>

      {/* Mobile Scanner CTA Banner */}
      <div className="mb-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 backdrop-blur-xl border-2 border-green-200/50 dark:border-green-800/50 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-2xl shrink-0">
            <Smartphone className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-xl text-green-900 dark:text-green-300 mb-2">
              Mobiele Scanner App
            </h2>
            <p className="text-sm text-green-800 dark:text-green-400 leading-relaxed">
              Gebruik je mobiel om tickets te scannen bij de ingang. Perfect
              voor deurpersoneel - geen login nodig, alleen een terminal code.
            </p>
          </div>
          <Link
            href="/scanner"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all text-sm font-bold shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-0.5 active:scale-95 touch-manipulation whitespace-nowrap"
          >
            <Smartphone className="w-4 h-4" />
            Open Scanner App
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {publishedEvents.map((event) => (
          <Link
            key={event.id}
            href={`/dashboard/scanning/${event.id}`}
            className="group"
          >
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl p-6 hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 active:scale-[0.98] touch-manipulation">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pr-2 flex-1">
                  {event.title}
                </h2>
                <div className="p-2.5 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl shrink-0">
                  <ScanLine className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              <div className="space-y-2.5 mb-4">
                <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                  <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span>
                    {new Date(event.startsAt).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                    <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200/50 dark:border-gray-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    Open Scanner
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Live
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Mobile Scanner Card */}
      <div className="mt-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-xl border-2 border-purple-200/50 dark:border-purple-800/50 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-xl">
                <ScanLine className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-bold text-lg text-purple-900 dark:text-purple-300">
                Mobiele Scanner
              </h3>
            </div>
            <p className="text-sm text-purple-800 dark:text-purple-400 mb-4 leading-relaxed">
              Maak terminal codes aan voor je deur-personeel. Zij kunnen op hun
              mobiel tickets scannen zonder in te loggen.
            </p>
            <Link
              href="/dashboard/scanning/terminals"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all text-sm font-semibold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5 active:scale-95 touch-manipulation"
            >
              Terminal Codes Beheren
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 backdrop-blur-xl border-2 border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-2">
              Scanner Functies
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1.5">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Real-time scanning met live statistieken
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Zoeken op e-mailadres
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Recente scans inzien
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Handmatige overrides (alleen admin)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
