import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/server/lib/supabase";
import { getEvent } from "@/server/services/eventService";
import { TicketTypeForm } from "@/components/ticket-types/TicketTypeForm";
import { Card, CardContent } from "@/components/ui/card";

interface NewTicketTypePageProps {
  params: Promise<{ id: string }>;
}

export default async function NewTicketTypePage({
  params,
}: NewTicketTypePageProps) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const { id: eventId } = await params;
  const result = await getEvent(eventId, user.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const event = result.data;

  return (
    <div className="max-w-2xl mx-auto">
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
        <span className="text-gray-900 dark:text-white">Nieuw tickettype</span>
      </nav>

      <h1 className="text-2xl font-bold mb-6">Nieuw tickettype</h1>

      <Card>
        <CardContent className="pt-6">
          <TicketTypeForm
            eventId={eventId}
            eventIsPaid={event.isPaid}
            mode="create"
          />
        </CardContent>
      </Card>
    </div>
  );
}
