import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { EventForm } from "@/components/events/EventForm";
import { OnboardingEventForm } from "@/components/onboarding/OnboardingEventForm";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Lightbulb, ChevronLeft, Calendar } from "lucide-react";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: { onboarding?: string };
}) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  const isOnboarding = searchParams.onboarding === "true";

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      {!isOnboarding && (
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link
            href="/dashboard/events"
            className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Evenementen
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 dark:text-white font-semibold">
            Nieuw evenement
          </span>
        </nav>
      )}

      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-gray-100 dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent mb-2">
          {isOnboarding ? "Maak je eerste evenement" : "Nieuw evenement"}
        </h1>
        {!isOnboarding && (
          <p className="text-gray-600 dark:text-gray-400">
            Vul de basisgegevens in voor je evenement
          </p>
        )}
      </div>

      {isOnboarding && (
        <div className="mb-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 backdrop-blur-xl border-2 border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-5 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl shrink-0">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Bijna klaar!
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Vul de basisgegevens in voor je eerste evenement. Je kunt later
                altijd meer details toevoegen.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Evenement details
            </h2>
          </div>
        </div>
        <div className="p-6">
          {isOnboarding ? <OnboardingEventForm /> : <EventForm mode="create" />}
        </div>
      </div>

      {/* Help Text */}
      {!isOnboarding && (
        <div className="mt-6 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 backdrop-blur-xl border-2 border-yellow-200/50 dark:border-yellow-800/50 rounded-2xl p-5 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-xl shrink-0">
              <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                Tip
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Je evenement wordt aangemaakt als concept. Je kunt later
                tickettypes toevoegen en het evenement live zetten wanneer je
                klaar bent voor verkoop.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
