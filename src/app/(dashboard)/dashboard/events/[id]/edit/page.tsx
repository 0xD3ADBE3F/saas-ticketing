import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/server/lib/supabase";
import { getEvent } from "@/server/services/eventService";
import { getOrganization } from "@/server/services/organizationService";
import { EventForm } from "@/components/events/EventForm";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ChevronLeft, Calendar, Edit } from "lucide-react";

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const result = await getEvent(id, user.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const event = result.data;

  // Get organization for slug
  const org = await getOrganization(event.organizationId, user.id);
  if (!org) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <Link
          href="/dashboard/events"
          className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Evenementen
        </Link>
        <span className="text-gray-400">/</span>
        <Link
          href={`/dashboard/events/${event.id}`}
          className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
        >
          {event.title}
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 dark:text-white font-semibold">
          Bewerken
        </span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-gray-100 dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent mb-2">
          Evenement bewerken
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Wijzig de details van je evenement
        </p>
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <Edit className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Evenement details
            </h2>
          </div>
        </div>
        <div className="p-6">
          <EventForm
            event={event}
            mode="edit"
            organizationId={org.id}
            organizationSlug={org.slug}
          />
        </div>
      </div>

      {event.status !== "DRAFT" && (
        <div className="mt-6 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 backdrop-blur-xl border-2 border-orange-200/50 dark:border-orange-800/50 rounded-2xl p-5 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                Let op
              </p>
              <p className="text-sm text-orange-800 dark:text-orange-300">
                Dit evenement is al{" "}
                {event.status === "LIVE" ? "live" : "afgelopen"}. Wijzigingen
                worden direct zichtbaar voor bezoekers.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
