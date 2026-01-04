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
    qrImageUrl: string;
  }>;
  baseUrl: string;
};

/**
 * Generate HTML email for ticket confirmation
 */
export function generateTicketConfirmationHTML(data: TicketEmailData): string {
  const ticketRows = data.tickets
    .map((ticket, index) => {
      const appleWalletUrl = `${data.baseUrl}/api/wallet/apple/generate?ticketId=${encodeURIComponent(ticket.id)}`;
      const isLast = index === data.tickets.length - 1;

      return `
        <tr>
          <td style="padding: 24px; ${!isLast ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="180" style="vertical-align: top; padding-right: 20px;">
                  <div style="background: white; padding: 12px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: inline-block;">
                    <img src="${ticket.qrImageUrl}" alt="QR Code" width="150" height="150" style="display: block; border-radius: 4px;" />
                  </div>
                </td>
                <td style="vertical-align: top;">
                  <div style="background: linear-gradient(135deg, #f6f8fb 0%, #f0f4f8 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #667eea;">
                    <p style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px;">
                      ${ticket.ticketTypeName}
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;">
                      Ticketcode: <span style="font-family: 'Courier New', monospace; font-weight: 700; color: #0f172a; background: white; padding: 4px 8px; border-radius: 6px; display: inline-block; margin-top: 4px;">${ticket.code}</span>
                    </p>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                      📱 Toon deze QR-code bij de ingang
                    </p>
                    <a href="${appleWalletUrl}" style="display: inline-block; text-decoration: none;">
                      <img src="${data.baseUrl}/apple-wallet-badge.svg" alt="Add to Apple Wallet" style="height: 40px; width: 156px; display: block;" />
                    </a>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Je tickets voor ${data.event.title}</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: transparent; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">

          <!-- Logo Header -->
          <tr>
            <td style="padding: 32px 40px; background: white; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: left; vertical-align: middle;">
                    ${data.organization.logoUrl ? `
                      <img src="${data.organization.logoUrl}" alt="${data.organization.name}" style="height: 40px; width: auto; max-width: 180px; display: block;" />
                    ` : `
                      <span style="font-size: 20px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px;">${data.organization.name}</span>
                    `}
                  </td>
                  <td style="text-align: right; vertical-align: middle;">
                    <span style="font-size: 16px; font-weight: 600; color: #667eea;">Entro</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 48px 40px; text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 50%; width: 80px; height: 80px; line-height: 80px; margin-bottom: 16px;">
                <span style="font-size: 40px;">🎫</span>
              </div>
              <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -1px;">
                Tickets ontvangen!
              </h1>
              <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 400;">
                Je bent helemaal klaar voor ${data.event.title}
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 40px 40px 24px 40px;">
              <p style="margin: 0 0 8px 0; font-size: 18px; color: #1a1a1a; font-weight: 600;">
                Hoi${data.buyerName ? ` ${data.buyerName}` : ""}! 👋
              </p>
              <p style="margin: 0; font-size: 16px; color: #64748b; line-height: 1.6;">
                Bedankt voor je bestelling. Hieronder vind je ${data.tickets.length === 1 ? 'je ticket' : `al je ${data.tickets.length} tickets`}. Bewaar deze e-mail goed!
              </p>
            </td>
          </tr>

          <!-- Event Info Card -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f6f8fb 0%, #f0f4f8 100%); border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 16px; border-bottom: 2px solid #cbd5e1;">
                          <h2 style="margin: 0; font-size: 22px; color: #1a1a1a; font-weight: 700; letter-spacing: -0.5px;">
                            ${data.event.title}
                          </h2>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 16px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="display: inline-block; background: white; padding: 8px 12px; border-radius: 8px; font-size: 14px; color: #475569;">
                                  <span style="font-weight: 600;">📅</span> ${formatDateNL(data.event.startsAt)}
                                </span>
                              </td>
                            </tr>
                            ${data.event.location ? `
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="display: inline-block; background: white; padding: 8px 12px; border-radius: 8px; font-size: 14px; color: #475569;">
                                  <span style="font-weight: 600;">📍</span> ${data.event.location}
                                </span>
                              </td>
                            </tr>
                            ` : ""}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tickets Section -->
          <tr>
            <td style="padding: 0 40px 16px 40px;">
              <h3 style="margin: 0 0 20px 0; font-size: 20px; color: #1a1a1a; font-weight: 700; letter-spacing: -0.5px;">
                ${data.tickets.length === 1 ? 'Jouw ticket' : `Jouw tickets (${data.tickets.length})`}
              </h3>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                ${ticketRows}
              </table>
            </td>
          </tr>

          <!-- View Online CTA -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 32px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 18px; color: #ffffff; font-weight: 700;">
                      💻 Bekijk online
                    </p>
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: rgba(255,255,255,0.9); line-height: 1.5;">
                      Open deze pagina op je telefoon voor direct toegang tot je QR-codes
                    </p>
                    <a href="${data.baseUrl}/checkout/${data.orderId}" style="display: inline-block; padding: 14px 32px; background-color: #ffffff; color: #667eea; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                      Open tickets →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order Info -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 8px; padding: 16px 20px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 13px; color: #64748b;">
                      <span style="font-weight: 600; color: #475569;">Bestelnummer:</span> <span style="font-family: 'Courier New', monospace; color: #1a1a1a;">${data.orderNumber}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%); padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                💡 <strong>Tip:</strong> Voeg je tickets toe aan Apple Wallet voor snelle toegang!
              </p>
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b; line-height: 1.6;">
                Heb je vragen? Neem contact op met <strong>${data.organization.name}</strong>
              </p>
              <div style="border-top: 1px solid #cbd5e1; margin: 20px 0; padding-top: 20px;">
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8;">
                  Mogelijk gemaakt door <strong style="color: #667eea;">Entro</strong>
                </p>
                <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                  © ${new Date().getFullYear()} getentro.app
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
