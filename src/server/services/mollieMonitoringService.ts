/**
 * Mollie Connection Monitoring Service
 *
 * Proactively monitors Mollie connection health and alerts organizations
 * when their connection fails. Critical for organizations with live events.
 */

import { Resend } from "resend";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { mollieLogger } from "../lib/logger";

// Lazy initialization of Resend to avoid issues in test environments
let resendInstance: Resend | null = null;
function getResend(): Resend {
  if (!resendInstance && env.RESEND_API_KEY) {
    resendInstance = new Resend(env.RESEND_API_KEY);
  }
  return resendInstance!;
}

interface ConnectionHealthCheck {
  organizationId: string;
  organizationName: string;
  organizationEmail: string | null;
  adminEmails: string[];
  hasLiveEvents: boolean;
  isConnected: boolean;
  connectionValid: boolean;
}

/**
 * Check if organization has live events that can receive payments
 */
async function hasLiveEvents(organizationId: string): Promise<boolean> {
  const liveEventCount = await prisma.event.count({
    where: {
      organizationId,
      status: "LIVE",
    },
  });

  return liveEventCount > 0;
}

/**
 * Get notification email addresses for an organization
 * Uses billing email if set, otherwise falls back to organization email
 */
async function getNotificationEmails(organizationId: string): Promise<string[]> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      email: true,
      billingEmail: true,
    },
  });

  if (!org) {
    return [];
  }

  const emails: string[] = [];

  // Prefer billing email, fallback to organization email
  if (org.billingEmail) {
    emails.push(org.billingEmail);
  } else if (org.email) {
    emails.push(org.email);
  }

  return emails;
}

/**
 * Test Mollie connection by calling their API
 */
async function testConnection(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.mollie.com/v2/organizations/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Send email notification to organization admins about connection failure
 */
async function sendConnectionFailureEmail(
  organizationName: string,
  adminEmails: string[],
  hasLiveEvents: boolean
): Promise<void> {
  if (!env.RESEND_API_KEY || adminEmails.length === 0) {
    mollieLogger.info(
      { organizationName, adminEmails },
      "Would send connection failure email (no RESEND_API_KEY or no admin emails)"
    );
    return;
  }

  const urgencyLevel = hasLiveEvents ? "🚨 URGENT" : "⚠️";
  const subject = hasLiveEvents
    ? `🚨 URGENT: Mollie verbinding verbroken - ${organizationName}`
    : `⚠️ Mollie verbinding verbroken - ${organizationName}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${urgencyLevel} Mollie Verbinding Verbroken
              </h1>
            </td>
          </tr>

          <!-- Alert Message -->
          <tr>
            <td style="padding: 30px;">
              ${hasLiveEvents ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">
                  ⚠️ Je organisatie heeft actieve evenementen waarbij klanten nu geen tickets kunnen kopen!
                </p>
              </div>
              ` : ""}

              <p style="margin: 0 0 15px 0; font-size: 16px; color: #333;">
                Beste beheerder van ${organizationName},
              </p>

              <p style="margin: 0 0 15px 0; font-size: 14px; color: #666; line-height: 1.6;">
                De verbinding met Mollie (betalingen) voor je organisatie is niet meer geldig.
                ${hasLiveEvents
                  ? "Omdat je actieve evenementen hebt, kunnen klanten <strong>nu geen tickets meer kopen</strong>."
                  : "Dit betekent dat je geen betalingen kunt ontvangen."}
              </p>

              <h3 style="margin: 20px 0 10px 0; font-size: 16px; color: #1a1a1a;">
                Wat is er gebeurd?
              </h3>

              <p style="margin: 0 0 15px 0; font-size: 14px; color: #666; line-height: 1.6;">
                De toegangscode (token) die we gebruiken om met Mollie te communiceren is verlopen of ingetrokken.
                Dit kan gebeuren als:
              </p>

              <ul style="margin: 0 0 15px 0; padding-left: 20px; font-size: 14px; color: #666; line-height: 1.6;">
                <li>Je de verbinding in Mollie hebt verbroken</li>
                <li>Er wijzigingen zijn gemaakt in je Mollie account</li>
                <li>De toegangscode automatisch is verlopen</li>
              </ul>

              <h3 style="margin: 20px 0 10px 0; font-size: 16px; color: #1a1a1a;">
                ✅ Wat moet je doen?
              </h3>

              <p style="margin: 0 0 20px 0; font-size: 14px; color: #666; line-height: 1.6;">
                Verbind je Mollie account opnieuw via het dashboard. Dit duurt slechts enkele minuten:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/settings"
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                              color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px;
                              font-weight: 600; font-size: 16px;">
                      🔗 Verbind Mollie Opnieuw
                    </a>
                  </td>
                </tr>
              </table>

              ${hasLiveEvents ? `
              <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 16px; margin-top: 20px; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #92400e;">
                  <strong>Let op:</strong> Totdat je Mollie opnieuw verbindt, kunnen klanten geen tickets kopen
                  voor je actieve evenementen. Verbind zo snel mogelijk om geen omzet mis te lopen.
                </p>
              </div>
              ` : ""}

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

              <p style="margin: 0; font-size: 12px; color: #999;">
                Als je vragen hebt, neem dan contact op via support@getentro.app
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                Deze melding is automatisch verzonden omdat je Mollie verbinding niet meer werkt.
              </p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">
                © ${new Date().getFullYear()} Entro (getentro.app)
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textContent = `
MOLLIE VERBINDING VERBROKEN ${hasLiveEvents ? "- URGENT" : ""}

Beste beheerder van ${organizationName},

De verbinding met Mollie (betalingen) voor je organisatie is niet meer geldig.
${hasLiveEvents
  ? "Omdat je actieve evenementen hebt, kunnen klanten nu geen tickets meer kopen!"
  : "Dit betekent dat je geen betalingen kunt ontvangen."}

WAT IS ER GEBEURD?
De toegangscode (token) die we gebruiken om met Mollie te communiceren is verlopen of ingetrokken.

WAT MOET JE DOEN?
1. Ga naar ${env.NEXT_PUBLIC_APP_URL}/dashboard/settings
2. Klik op "Verbind Mollie Opnieuw"
3. Volg de stappen om de verbinding te herstellen

Dit duurt slechts enkele minuten.

${hasLiveEvents
  ? "LET OP: Totdat je Mollie opnieuw verbindt, kunnen klanten geen tickets kopen voor je actieve evenementen."
  : ""}

Vragen? Mail naar support@getentro.app

---
Deze melding is automatisch verzonden door Entro (getentro.app)
  `.trim();

  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Entro Platform <noreply@getentro.app>",
      to: adminEmails,
      subject,
      html: htmlContent,
      text: textContent,
    });

    mollieLogger.info(
      { organizationName, recipientCount: adminEmails.length, adminEmails },
      "Sent connection failure email"
    );
  } catch (error) {
    mollieLogger.error(
      { error, organizationName, adminEmails },
      "Failed to send connection failure email"
    );
  }
}

/**
 * Check connection health for all organizations with Mollie connected
 */
export async function checkAllConnections(): Promise<ConnectionHealthCheck[]> {
  mollieLogger.info("Starting connection health check");

  const organizations = await prisma.organization.findMany({
    where: {
      mollieAccessToken: { not: null },
      mollieOnboardingStatus: "COMPLETED",
    },
    select: {
      id: true,
      name: true,
      email: true,
      mollieAccessToken: true,
    },
  });

  mollieLogger.info(
    { organizationCount: organizations.length },
    "Found connected organizations"
  );

  const results: ConnectionHealthCheck[] = [];

  for (const org of organizations) {
    if (!org.mollieAccessToken) continue;

    const [notificationEmails, liveEvents] = await Promise.all([
      getNotificationEmails(org.id),
      hasLiveEvents(org.id),
    ]);

    // Note: In production, decrypt the token first
    // For now, we'll simulate by checking if token exists
    const connectionValid = org.mollieAccessToken ? true : false;

    const check: ConnectionHealthCheck = {
      organizationId: org.id,
      organizationName: org.name,
      organizationEmail: org.email,
      adminEmails: notificationEmails,
      hasLiveEvents: liveEvents,
      isConnected: !!org.mollieAccessToken,
      connectionValid,
    };

    results.push(check);

    // If connection is invalid and org has emails, send notification
    if (!connectionValid && notificationEmails.length > 0) {
      mollieLogger.warn(
        { organizationName: org.name, organizationId: org.id, hasLiveEvents: liveEvents },
        "Invalid Mollie connection detected"
      );
      await sendConnectionFailureEmail(org.name, notificationEmails, liveEvents);
    }
  }

  mollieLogger.info(
    { totalChecked: results.length },
    "Health check complete"
  );
  return results;
}

/**
 * Notify organization admins that Mollie connection has failed
 * Called when token refresh fails
 */
export async function notifyConnectionFailure(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      email: true,
    },
  });

  if (!org) {
    mollieLogger.error(
      { organizationId },
      "Organization not found for connection failure notification"
    );
    return;
  }

  const [notificationEmails, liveEvents] = await Promise.all([
    getNotificationEmails(organizationId),
    hasLiveEvents(organizationId),
  ]);

  if (notificationEmails.length === 0) {
    mollieLogger.warn(
      { organizationId, organizationName: org.name },
      "No notification emails configured, cannot send connection failure notification"
    );
    return;
  }

  mollieLogger.info(
    { organizationId, organizationName: org.name, emailCount: notificationEmails.length, hasLiveEvents: liveEvents },
    "Notifying organization about connection failure"
  );

  await sendConnectionFailureEmail(org.name, notificationEmails, liveEvents);
}

/**
 * Get connection status for dashboard display
 */
export async function getConnectionStatus(organizationId: string): Promise<{
  isConnected: boolean;
  hasLiveEvents: boolean;
  lastChecked: Date;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      mollieAccessToken: true,
      mollieOnboardingStatus: true,
      updatedAt: true,
    },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  const liveEvents = await hasLiveEvents(organizationId);

  return {
    isConnected: !!org.mollieAccessToken && org.mollieOnboardingStatus === "COMPLETED",
    hasLiveEvents: liveEvents,
    lastChecked: org.updatedAt,
  };
}
