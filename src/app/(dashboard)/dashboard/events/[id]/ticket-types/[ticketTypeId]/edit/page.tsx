import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/server/lib/supabase";
import { getTicketTypeWithEvent } from "@/server/services/ticketTypeService";
import { TicketTypeForm } from "@/components/ticket-types/TicketTypeForm";

interface EditTicketTypePageProps {
  params: Promise<{ id: string; ticketTypeId: string }>;
}

export default async function EditTicketTypePage({
  params,
}: EditTicketTypePageProps) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const { id: eventId, ticketTypeId } = await params;
  const result = await getTicketTypeWithEvent(ticketTypeId, user.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const ticketType = result.data;

  // Verify the ticket type belongs to this event
  if (ticketType.eventId !== eventId) {
    notFound();
  }

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
          href={`/dashboard/events/${eventId}`}
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          {ticketType.event.title}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">{ticketType.name}</span>
      </nav>

      <h1 className="text-2xl font-bold mb-6">Tickettype bewerken</h1>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <TicketTypeForm
          ticketType={ticketType}
          eventId={eventId}
          eventIsPaid={ticketType.event.isPaid}
          mode="edit"
        />
      </div>
    </div>
  );
}
