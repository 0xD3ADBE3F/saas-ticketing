import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/server/lib/supabase";
import { getEvent } from "@/server/services/eventService";
import { EventForm } from "@/components/events/EventForm";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

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

      <Card>
        <CardContent className="pt-6">
          <EventForm event={event} mode="edit" />
        </CardContent>
      </Card>

      {event.status !== "DRAFT" && (
        <Alert variant="warning" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong className="block mb-1">Let op</strong>
            Dit evenement is al {event.status === "LIVE" ? "live" : "afgelopen"}
            . Wijzigingen worden direct zichtbaar voor bezoekers.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
