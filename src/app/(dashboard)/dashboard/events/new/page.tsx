import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { EventForm } from "@/components/events/EventForm";
import { OnboardingEventForm } from "@/components/onboarding/OnboardingEventForm";

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
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link
            href="/dashboard/events"
            className="hover:text-gray-700 dark:hover:text-gray-300"
          >
            Evenementen
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">Nieuw evenement</span>
        </nav>
      )}

      <h1 className="text-2xl font-bold mb-6">
        {isOnboarding ? "Maak je eerste evenement" : "Nieuw evenement"}
      </h1>

      {isOnboarding && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-blue-700 dark:text-blue-300">
            <strong>Bijna klaar!</strong> Vul de basisgegevens in voor je eerste
            evenement. Je kunt later altijd meer details toevoegen.
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        {isOnboarding ? <OnboardingEventForm /> : <EventForm mode="create" />}
      </div>

      {/* Help Text */}
      {!isOnboarding && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            💡 Tip
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Je evenement wordt aangemaakt als concept. Je kunt later tickettypes
            toevoegen en het evenement live zetten wanneer je klaar bent voor
            verkoop.
          </p>
        </div>
      )}
    </div>
  );
}
