import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { EventForm } from "@/components/events/EventForm";
import { OnboardingEventForm } from "@/components/onboarding/OnboardingEventForm";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Lightbulb } from "lucide-react";

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
        <Alert variant="info" className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Bijna klaar!</strong> Vul de basisgegevens in voor je eerste
            evenement. Je kunt later altijd meer details toevoegen.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          {isOnboarding ? <OnboardingEventForm /> : <EventForm mode="create" />}
        </CardContent>
      </Card>

      {/* Help Text */}
      {!isOnboarding && (
        <Alert variant="info" className="mt-6">
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            <strong className="block mb-1">Tip</strong>
            Je evenement wordt aangemaakt als concept. Je kunt later tickettypes
            toevoegen en het evenement live zetten wanneer je klaar bent voor
            verkoop.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
