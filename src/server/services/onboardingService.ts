import { prisma } from "@/server/lib/prisma";

export type OnboardingProgress = {
  accountCreated: boolean;
  eventCreated: boolean;
  mollieConnected: boolean;
  ticketsCreated: boolean;
  eventPublished: boolean;
};

/**
 * Calculate onboarding progress for an organization
 * Used to display onboarding checklist
 */
export async function getOnboardingProgress(
  organizationId: string
): Promise<OnboardingProgress> {
  // Check if organization has at least one event
  const eventCount = await prisma.event.count({
    where: { organizationId },
  });

  // Check if organization has Mollie connected and completed
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      mollieOnboardingStatus: true,
      mollieProfileId: true,
    },
  });

  // Check if any event has ticket types
  const eventWithTickets = await prisma.event.findFirst({
    where: {
      organizationId,
      ticketTypes: {
        some: {},
      },
    },
  });

  // Check if any event is published (LIVE status)
  const publishedEvent = await prisma.event.findFirst({
    where: {
      organizationId,
      status: "LIVE",
    },
  });

  return {
    accountCreated: true, // If we're here, account exists
    eventCreated: eventCount > 0,
    mollieConnected: org?.mollieOnboardingStatus === "COMPLETED",
    ticketsCreated: !!eventWithTickets,
    eventPublished: !!publishedEvent,
  };
}

/**
 * Check if organization needs to see onboarding checklist
 * Returns true if onboarding is not complete
 */
export async function shouldShowOnboardingChecklist(
  organizationId: string
): Promise<boolean> {
  const progress = await getOnboardingProgress(organizationId);

  // Show checklist if any step is incomplete
  return !Object.values(progress).every(Boolean);
}

/**
 * Check if event needs Mollie activation
 * Returns true if event is paid and Mollie is not connected
 */
export async function eventNeedsMollieActivation(
  eventId: string,
  organizationId: string
): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id: eventId, organizationId },
    select: { isPaid: true },
  });

  if (!event || !event.isPaid) {
    return false; // Free event or not found
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { mollieOnboardingStatus: true },
  });

  return org?.mollieOnboardingStatus !== "COMPLETED";
}
