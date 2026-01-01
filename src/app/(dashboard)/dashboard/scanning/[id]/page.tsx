import { redirect, notFound } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import {
  getUserOrganizations,
  hasRole,
} from "@/server/services/organizationService";
import { eventRepo } from "@/server/repos/eventRepo";
import { ScannerInterface } from "@/components/scanner";
import Link from "next/link";
import { ChevronLeft, AlertCircle } from "lucide-react";

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
        <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 backdrop-blur-xl border-2 border-red-200/50 dark:border-red-800/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-red-100 dark:bg-red-900/40 rounded-xl shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-red-900 dark:text-red-300 mb-2">
                Geen Toegang
              </h1>
              <p className="text-red-800 dark:text-red-400 mb-4 leading-relaxed">
                Je hebt geen toegang tot de scanner functionaliteit. Vraag een
                administrator om je de SCANNER rol te geven.
              </p>
              <Link
                href="/dashboard/scanning"
                className="inline-flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Terug naar scannen
              </Link>
            </div>
          </div>
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
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 backdrop-blur-xl border-2 border-orange-200/50 dark:border-orange-800/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-orange-100 dark:bg-orange-900/40 rounded-xl shrink-0">
              <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-orange-900 dark:text-orange-300 mb-2">
                Evenement Niet Gepubliceerd
              </h1>
              <p className="text-orange-800 dark:text-orange-400 mb-4 leading-relaxed">
                Dit evenement is nog niet gepubliceerd en kan niet gescand
                worden.
              </p>
              <Link
                href="/dashboard/scanning"
                className="inline-flex items-center gap-1.5 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Terug naar scannen
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard/scanning"
          className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Terug naar overzicht
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
