import { redirect, notFound } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import {
  getUserOrganizations,
  hasRole,
} from "@/server/services/organizationService";
import { eventRepo } from "@/server/repos/eventRepo";
import { ScannerInterface } from "@/components/scanner";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventScannerPage({ params }: Props) {
  const { id: eventId } = await params;

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
  const isAdmin = await hasRole(currentOrg.id, user.id, "ADMIN");

  if (!canScan) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h1 className="text-xl font-bold text-red-900 dark:text-red-300 mb-2">
            Geen Toegang
          </h1>
          <p className="text-red-800 dark:text-red-400 mb-4">
            Je hebt geen toegang tot de scanner functionaliteit. Vraag een
            administrator om je de SCANNER rol te geven.
          </p>
          <Link
            href="/dashboard/scanning"
            className="text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            ← Terug naar scannen
          </Link>
        </div>
      </div>
    );
  }

  // Get the event (scoped to organization)
  const event = await eventRepo.findByIdInOrg(eventId, currentOrg.id);

  if (!event) {
    notFound();
  }

  if (event.status !== "LIVE") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
          <h1 className="text-xl font-bold text-orange-900 dark:text-orange-300 mb-2">
            Evenement Niet Gepubliceerd
          </h1>
          <p className="text-orange-800 dark:text-orange-400 mb-4">
            Dit evenement is nog niet gepubliceerd en kan niet gescand worden.
          </p>
          <Link
            href="/dashboard/scanning"
            className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
          >
            ← Terug naar scannen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back Link */}
      <div className="mb-4">
        <Link
          href="/dashboard/scanning"
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors inline-flex items-center gap-1"
        >
          ← Terug naar overzicht
        </Link>
      </div>

      {/* Scanner Interface */}
      <ScannerInterface
        eventId={event.id}
        eventName={event.title}
        isAdmin={isAdmin}
      />
    </div>
  );
}
