import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/server/lib/supabase";
import { getEvent } from "@/server/services/eventService";
import { EventForm } from "@/components/events/EventForm";

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

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link
          href="/dashboard/events"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Evenementen
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/events/${event.id}`}
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          {event.title}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">Bewerken</span>
      </nav>

      <h1 className="text-2xl font-bold mb-6">Evenement bewerken</h1>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <EventForm event={event} mode="edit" />
      </div>

      {event.status !== "DRAFT" && (
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
            ⚠️ Let op
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Dit evenement is al {event.status === "LIVE" ? "live" : "afgelopen"}
            . Wijzigingen worden direct zichtbaar voor bezoekers.
          </p>
        </div>
      )}
    </div>
  );
}
