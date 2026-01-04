import { formatDateNL } from "../utils";

export type TicketEmailData = {
  to: string;
  buyerName: string | null;
  orderNumber: string;
  orderId: string;
  event: {
    title: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
  };
  organization: {
    name: string;
    logoUrl: string | null;
  };
  tickets: Array<{
    id: string;
    code: string;
    secretToken: string;
    ticketTypeName: string;
  }>;
  baseUrl: string;
};

/**
 * Generate plain text email for ticket confirmation
 */
export function generateTicketConfirmationText(data: TicketEmailData): string {
  const ticketList = data.tickets
    .map((ticket) => {
      const appleWalletUrl = `${data.baseUrl}/api/wallet/apple/generate?ticketId=${encodeURIComponent(ticket.id)}`;
      return `- ${ticket.ticketTypeName} (Code: ${ticket.code})\n  Voeg toe aan Apple Wallet: ${appleWalletUrl}`;
    })
    .join("\n");

  return `
Je tickets voor ${data.event.title}

Hoi${data.buyerName ? ` ${data.buyerName}` : ""},

Bedankt voor je bestelling! Hieronder vind je je ticket${data.tickets.length > 1 ? "s" : ""}:

EVENEMENT
${data.event.title}
📅 ${formatDateNL(data.event.startsAt)}
${data.event.location ? `📍 ${data.event.location}` : ""}

TICKETS (${data.tickets.length})
${ticketList}

Bestelnummer: ${data.orderNumber}

BEKIJK JE TICKETS ONLINE
${data.baseUrl}/checkout/${data.orderId}

Bewaar deze e-mail goed. Je hebt de ticketcodes nodig om binnen te komen.
Je kunt je tickets ook toevoegen aan Apple Wallet via de links hierboven.

© ${new Date().getFullYear()} Entro (getentro.app)
  `.trim();
}
