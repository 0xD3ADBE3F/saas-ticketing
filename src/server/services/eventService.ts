import { eventRepo, CreateEventInput, UpdateEventInput, EventFilters, PublicEvent } from "@/server/repos/eventRepo";
import { mollieOnboardingService } from "@/server/services/mollieOnboardingService";
import { prisma } from "@/server/lib/prisma";
import type { Event, EventStatus } from "@/generated/prisma";

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

/**
 * Create a unique slug for an event
 */
async function createUniqueSlug(
  organizationId: string,
  title: string,
  excludeEventId?: string
): Promise<string> {
  const baseSlug = generateSlug(title);
  let slug = baseSlug;
  let counter = 1;

  while (!(await eventRepo.isSlugAvailable(organizationId, slug, excludeEventId))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Validate event dates
 */
function validateEventDates(startsAt: Date, endsAt: Date): string | null {
  if (endsAt <= startsAt) {
    return "Einddatum moet na de startdatum liggen";
  }
  return null;
}

/**
 * Validate status transition
 */
function validateStatusTransition(
  currentStatus: EventStatus,
  newStatus: EventStatus
): string | null {
  const allowedTransitions: Record<EventStatus, EventStatus[]> = {
    DRAFT: ["LIVE", "CANCELLED"],
    LIVE: ["ENDED", "CANCELLED"],
    ENDED: [], // Cannot change from ENDED
    CANCELLED: ["DRAFT"], // Can reactivate to draft
  };

  if (currentStatus === newStatus) {
    return null; // Same status is always valid
  }

  if (!allowedTransitions[currentStatus].includes(newStatus)) {
    return `Kan status niet wijzigen van ${currentStatus} naar ${newStatus}`;
  }

  return null;
}

/**
 * Check if event slug can be changed
 * Slug cannot be changed if:
 * - Event status is LIVE
 * - Any tickets have been sold for this event
 */
export async function canChangeEventSlug(
  eventId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Get event
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { status: true },
  });

  if (!event) {
    return {
      allowed: false,
      reason: "Evenement niet gevonden",
    };
  }

  // Check if event is LIVE
  if (event.status === "LIVE") {
    return {
      allowed: false,
      reason: "URL kan niet gewijzigd worden als evenement live is",
    };
  }

  // Check if any tickets have been sold for this event
  const soldTicketCount = await prisma.ticket.count({
    where: {
      order: {
        eventId,
        status: "PAID",
      },
    },
  });

  if (soldTicketCount > 0) {
    return {
      allowed: false,
      reason: "URL kan niet gewijzigd worden nadat er tickets zijn verkocht",
    };
  }

  return { allowed: true };
}

export type CreateEventData = {
  title: string;
  slug?: string; // Custom slug (optional, auto-generated from title if not provided)
  description?: string;
  location?: string;
  locationDescription?: string;
  latitude?: number | null;
  longitude?: number | null;
  startsAt: Date;
  endsAt: Date;
  isPaid?: boolean; // Whether event has paid tickets (requires Mollie)
  vatRate?: "STANDARD_21" | "REDUCED_9" | "EXEMPT"; // VAT rate for tickets
  passPaymentFeesToBuyer?: boolean; // Whether to pass payment processing fees to buyer
};

export type UpdateEventData = {
  title?: string;
  slug?: string; // Custom slug (optional, validates if provided)
  description?: string | null;
  location?: string | null;
  locationDescription?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startsAt?: Date;
  endsAt?: Date;
  isPaid?: boolean;
  vatRate?: "STANDARD_21" | "REDUCED_9" | "EXEMPT"; // VAT rate for tickets
  passPaymentFeesToBuyer?: boolean; // Whether to pass payment processing fees to buyer
};

export type EventServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type EventStatusUpdateResult =
  | { success: true; data: Event }
  | { success: false; error: string };

/**
 * Create a new event
 */
export async function createEvent(
  organizationId: string,
  userId: string,
  data: CreateEventData
): Promise<EventServiceResult<Event>> {
  // Validate dates
  const dateError = validateEventDates(data.startsAt, data.endsAt);
  if (dateError) {
    return { success: false, error: dateError };
  }

  // Generate unique slug (use custom if provided, otherwise auto-generate from title)
  const slug = data.slug
    ? data.slug
    : await createUniqueSlug(organizationId, data.title);

  const event = await eventRepo.create(organizationId, userId, {
    ...data,
    slug,
    status: "DRAFT",
  });

  if (!event) {
    return { success: false, error: "Geen toegang tot deze organisatie" };
  }

  return { success: true, data: event };
}

/**
 * Update an event
 */
export async function updateEvent(
  eventId: string,
  userId: string,
  data: UpdateEventData
): Promise<EventServiceResult<Event>> {
  // Get current event first
  const currentEvent = await eventRepo.findById(eventId, userId);
  if (!currentEvent) {
    return { success: false, error: "Evenement niet gevonden" };
  }

  // Validate dates if being updated
  const startsAt = data.startsAt ?? currentEvent.startsAt;
  const endsAt = data.endsAt ?? currentEvent.endsAt;
  const dateError = validateEventDates(startsAt, endsAt);
  if (dateError) {
    return { success: false, error: dateError };
  }

  // Handle slug changes
  let slug = currentEvent.slug;

  // If custom slug is provided and different from current
  if (data.slug && data.slug !== currentEvent.slug) {
    // Check if slug can be changed
    const changeCheck = await canChangeEventSlug(eventId);
    if (!changeCheck.allowed) {
      return {
        success: false,
        error: changeCheck.reason || "Slug kan niet gewijzigd worden",
      };
    }

    // Check availability
    const isAvailable = await eventRepo.isSlugAvailable(
      currentEvent.organizationId,
      data.slug,
      eventId
    );
    if (!isAvailable) {
      return { success: false, error: "Deze slug is al in gebruik" };
    }

    slug = data.slug;
  }
  // If title is updated but no custom slug provided, don't auto-regenerate
  // (preserves manually set slugs)

  const event = await eventRepo.update(eventId, userId, {
    ...data,
    slug,
  });

  if (!event) {
    return { success: false, error: "Fout bij het bijwerken van evenement" };
  }

  return { success: true, data: event };
}

/**
 * Update event status
 */
export async function updateEventStatus(
  eventId: string,
  userId: string,
  newStatus: EventStatus
): Promise<EventStatusUpdateResult> {
  // Get current event first
  const currentEvent = await eventRepo.findById(eventId, userId);
  if (!currentEvent) {
    return { success: false, error: "Evenement niet gevonden" };
  }

  // Validate status transition
  const transitionError = validateStatusTransition(currentEvent.status, newStatus);
  if (transitionError) {
    return { success: false, error: transitionError };
  }

  // Check Mollie onboarding when going LIVE (only for paid events)
  if (newStatus === "LIVE" && currentEvent.isPaid) {
    const canPublish = await mollieOnboardingService.canPublishEvents(
      currentEvent.organizationId
    );
    if (!canPublish) {
      return {
        success: false,
        error: "Mollie onboarding moet eerst worden voltooid voordat je betaalde evenementen kunt publiceren",
      };
    }
  }

  const event = await eventRepo.updateStatus(eventId, userId, newStatus);
  if (!event) {
    return { success: false, error: "Fout bij het bijwerken van status" };
  }

  return { success: true, data: event };
}

/**
 * Delete an event
 */
export async function deleteEvent(
  eventId: string,
  userId: string
): Promise<EventServiceResult<Event>> {
  // Get current event first
  const currentEvent = await eventRepo.findById(eventId, userId);
  if (!currentEvent) {
    return { success: false, error: "Evenement niet gevonden" };
  }

  // Only allow deleting DRAFT or CANCELLED events
  if (currentEvent.status !== "DRAFT" && currentEvent.status !== "CANCELLED") {
    return {
      success: false,
      error: "Alleen concept of geannuleerde evenementen kunnen worden verwijderd",
    };
  }

  const event = await eventRepo.delete(eventId, userId);
  if (!event) {
    return { success: false, error: "Fout bij het verwijderen van evenement" };
  }

  return { success: true, data: event };
}

/**
 * Get event by ID
 */
export async function getEvent(
  eventId: string,
  userId: string
): Promise<EventServiceResult<Event & { organization: { slug: string } }>> {
  const event = await eventRepo.findById(eventId, userId);
  if (!event) {
    return { success: false, error: "Evenement niet gevonden" };
  }
  return { success: true, data: event };
}

/**
 * Get events for organization
 */
export async function getOrganizationEvents(
  organizationId: string,
  userId: string,
  filters?: EventFilters
): Promise<Event[]> {
  return eventRepo.findByOrganization(organizationId, userId, filters);
}

/**
 * Get events for user (across all organizations)
 */
export async function getUserEvents(
  userId: string,
  filters?: EventFilters
): Promise<Event[]> {
  return eventRepo.findByUser(userId, filters);
}

/**
 * Get public event by slug - DEPRECATED
 * Use getPublicEventByBothSlugs instead
 */
export async function getPublicEvent(slug: string): Promise<PublicEvent | null> {
  return eventRepo.findPublicBySlug(slug);
}

/**
 * Get public event by organization slug and event slug
 */
export async function getPublicEventByBothSlugs(
  orgSlug: string,
  eventSlug: string
): Promise<PublicEvent | null> {
  return eventRepo.findPublicByBothSlugs(orgSlug, eventSlug);
}

/**
 * Get event statistics
 */
export async function getEventStats(
  eventId: string,
  userId: string
): Promise<{
  ticketTypeCount: number;
  totalCapacity: number;
  totalSold: number;
} | null> {
  return eventRepo.getStats(eventId, userId);
}

/**
 * Check if slug is available
 */
export async function isSlugAvailable(
  organizationId: string,
  slug: string,
  excludeEventId?: string
): Promise<boolean> {
  return eventRepo.isSlugAvailable(organizationId, slug, excludeEventId);
}
