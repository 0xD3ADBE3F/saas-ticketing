import { eventRepo, CreateEventInput, UpdateEventInput, EventFilters, PublicEvent } from "@/server/repos/eventRepo";
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

export type CreateEventData = {
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
};

export type UpdateEventData = {
  title?: string;
  description?: string | null;
  location?: string | null;
  startsAt?: Date;
  endsAt?: Date;
};

export type EventServiceResult<T> =
  | { success: true; data: T }
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

  // Generate unique slug
  const slug = await createUniqueSlug(organizationId, data.title);

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

  // Generate new slug if title is being updated
  let slug = currentEvent.slug;
  if (data.title && data.title !== currentEvent.title) {
    slug = await createUniqueSlug(currentEvent.organizationId, data.title, eventId);
  }

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
): Promise<EventServiceResult<Event>> {
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
): Promise<EventServiceResult<Event>> {
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
 * Get public event by slug
 */
export async function getPublicEvent(slug: string): Promise<PublicEvent | null> {
  return eventRepo.findPublicBySlug(slug);
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
