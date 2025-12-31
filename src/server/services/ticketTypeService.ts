import { ticketTypeRepo, CreateTicketTypeInput, UpdateTicketTypeInput } from "@/server/repos/ticketTypeRepo";
import { eurosToCents, centsToEuros, formatPrice } from "@/lib/currency";
import type { TicketType } from "@/generated/prisma";

// Re-export for convenience
export { centsToEuros, formatPrice };

export type TicketTypeServiceResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type CreateTicketTypeData = {
  name: string;
  description?: string;
  price: number; // In euros (will convert to cents)
  capacity: number;
  saleStart?: Date;
  saleEnd?: Date;
};

export type UpdateTicketTypeData = {
  name?: string;
  description?: string;
  price?: number; // In euros (will convert to cents)
  capacity?: number;
  saleStart?: Date | null;
  saleEnd?: Date | null;
};

/**
 * Validate ticket type data
 */
function validateTicketTypeData(
  data: CreateTicketTypeData | UpdateTicketTypeData,
  currentSoldCount?: number
): string | null {
  // Validate name
  if ("name" in data && data.name !== undefined) {
    if (data.name.trim().length < 1) {
      return "Naam is verplicht";
    }
    if (data.name.length > 100) {
      return "Naam mag maximaal 100 tekens zijn";
    }
  }

  // Validate price
  if ("price" in data && data.price !== undefined) {
    if (data.price < 0) {
      return "Prijs mag niet negatief zijn";
    }
    if (data.price > 10000) {
      return "Prijs mag maximaal €10.000 zijn";
    }
  }

  // Validate capacity
  if ("capacity" in data && data.capacity !== undefined) {
    if (data.capacity < 1) {
      return "Capaciteit moet minimaal 1 zijn";
    }
    if (data.capacity > 100000) {
      return "Capaciteit mag maximaal 100.000 zijn";
    }
    // Can't reduce capacity below sold count
    if (currentSoldCount !== undefined && data.capacity < currentSoldCount) {
      return `Capaciteit kan niet lager zijn dan het aantal verkochte tickets (${currentSoldCount})`;
    }
  }

  // Validate sale window
  if (data.saleStart && data.saleEnd && data.saleStart > data.saleEnd) {
    return "Einddatum verkoop moet na startdatum zijn";
  }

  return null;
}

/**
 * Create a new ticket type for an event
 */
export async function createTicketType(
  eventId: string,
  userId: string,
  data: CreateTicketTypeData
): Promise<TicketTypeServiceResult<TicketType>> {
  // First, get the event to check if it's a paid event
  const event = await ticketTypeRepo.getEventForTicketType(eventId, userId);
  if (!event) {
    return { success: false, error: "Geen toegang tot dit evenement" };
  }

  // For paid events, price must be > 0
  // For free events, price can be 0
  if (event.isPaid && data.price === 0) {
    return { success: false, error: "Betaalde evenementen moeten een prijs hebben" };
  }

  // Validate input
  const validationError = validateTicketTypeData(data);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // Convert price from euros to cents
  const input: CreateTicketTypeInput = {
    name: data.name.trim(),
    description: data.description?.trim(),
    price: eurosToCents(data.price),
    capacity: data.capacity,
    saleStart: data.saleStart,
    saleEnd: data.saleEnd,
  };

  const ticketType = await ticketTypeRepo.create(eventId, userId, input);

  if (!ticketType) {
    return { success: false, error: "Geen toegang tot dit evenement" };
  }

  return { success: true, data: ticketType };
}

/**
 * Update a ticket type
 */
export async function updateTicketType(
  ticketTypeId: string,
  userId: string,
  data: UpdateTicketTypeData
): Promise<TicketTypeServiceResult<TicketType>> {
  // Get current ticket type to check sold count
  const current = await ticketTypeRepo.findById(ticketTypeId, userId);
  if (!current) {
    return { success: false, error: "Tickettype niet gevonden" };
  }

  // Validate input
  const validationError = validateTicketTypeData(data, current.soldCount);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // Build update input
  const input: UpdateTicketTypeInput = {
    name: data.name?.trim(),
    description: data.description?.trim(),
    price: data.price !== undefined ? eurosToCents(data.price) : undefined,
    capacity: data.capacity,
    saleStart: data.saleStart,
    saleEnd: data.saleEnd,
  };

  const ticketType = await ticketTypeRepo.update(ticketTypeId, userId, input);

  if (!ticketType) {
    return { success: false, error: "Fout bij het bijwerken van tickettype" };
  }

  return { success: true, data: ticketType };
}

/**
 * Delete a ticket type
 */
export async function deleteTicketType(
  ticketTypeId: string,
  userId: string
): Promise<TicketTypeServiceResult<TicketType>> {
  // Get current ticket type to check sold count
  const current = await ticketTypeRepo.findById(ticketTypeId, userId);
  if (!current) {
    return { success: false, error: "Tickettype niet gevonden" };
  }

  // Can't delete if tickets have been sold
  if (current.soldCount > 0) {
    return {
      success: false,
      error: `Dit tickettype heeft ${current.soldCount} verkochte tickets en kan niet worden verwijderd`,
    };
  }

  const ticketType = await ticketTypeRepo.delete(ticketTypeId, userId);

  if (!ticketType) {
    return { success: false, error: "Fout bij het verwijderen van tickettype" };
  }

  return { success: true, data: ticketType };
}

/**
 * Get ticket type by ID
 */
export async function getTicketType(
  ticketTypeId: string,
  userId: string
): Promise<TicketTypeServiceResult<TicketType>> {
  const ticketType = await ticketTypeRepo.findById(ticketTypeId, userId);
  if (!ticketType) {
    return { success: false, error: "Tickettype niet gevonden" };
  }
  return { success: true, data: ticketType };
}

/**
 * Get ticket type with event info
 */
export async function getTicketTypeWithEvent(
  ticketTypeId: string,
  userId: string
): Promise<TicketTypeServiceResult<TicketType & { event: { id: string; title: string; status: string; organizationId: string; isPaid: boolean } }>> {
  const ticketType = await ticketTypeRepo.findByIdWithEvent(ticketTypeId, userId);
  if (!ticketType) {
    return { success: false, error: "Tickettype niet gevonden" };
  }
  return { success: true, data: ticketType };
}

/**
 * Get all ticket types for an event
 */
export async function getEventTicketTypes(
  eventId: string,
  userId: string
): Promise<TicketType[]> {
  return ticketTypeRepo.findByEvent(eventId, userId);
}

/**
 * Get public ticket types for an event (only if event is LIVE)
 */
export async function getPublicEventTicketTypes(
  eventId: string
): Promise<TicketType[]> {
  return ticketTypeRepo.findPublicByEvent(eventId);
}

/**
 * Check if a ticket type can be purchased
 */
export async function canPurchase(
  ticketTypeId: string,
  quantity: number
): Promise<TicketTypeServiceResult<{ available: number }>> {
  const availability = await ticketTypeRepo.getAvailability(ticketTypeId);

  if (!availability) {
    return { success: false, error: "Tickettype niet gevonden" };
  }

  if (!availability.isOnSale) {
    return { success: false, error: "Dit ticket is momenteel niet te koop" };
  }

  if (availability.available < quantity) {
    if (availability.available === 0) {
      return { success: false, error: "Dit ticket is uitverkocht" };
    }
    return {
      success: false,
      error: `Er zijn nog maar ${availability.available} tickets beschikbaar`,
    };
  }

  return { success: true, data: { available: availability.available } };
}

/**
 * Reserve tickets (increment sold count)
 * This should be called when creating an order
 */
export async function reserveTickets(
  ticketTypeId: string,
  quantity: number
): Promise<TicketTypeServiceResult<TicketType>> {
  const ticketType = await ticketTypeRepo.incrementSoldCount(ticketTypeId, quantity);

  if (!ticketType) {
    return { success: false, error: "Tickets niet beschikbaar of capaciteit overschreden" };
  }

  return { success: true, data: ticketType };
}

/**
 * Release tickets (decrement sold count)
 * This should be called when canceling an order or refunding
 */
export async function releaseTickets(
  ticketTypeId: string,
  quantity: number
): Promise<TicketTypeServiceResult<TicketType>> {
  const ticketType = await ticketTypeRepo.decrementSoldCount(ticketTypeId, quantity);

  if (!ticketType) {
    return { success: false, error: "Tickettype niet gevonden" };
  }

  return { success: true, data: ticketType };
}

/**
 * Reorder ticket types
 */
export async function reorderTicketTypes(
  eventId: string,
  userId: string,
  orderedIds: string[]
): Promise<TicketTypeServiceResult<void>> {
  const success = await ticketTypeRepo.reorder(eventId, userId, orderedIds);

  if (!success) {
    return { success: false, error: "Geen toegang tot dit evenement" };
  }

  return { success: true };
}

/**
 * Get ticket type statistics for an event
 */
export async function getEventTicketStats(
  eventId: string,
  userId: string
): Promise<{
  totalCapacity: number;
  totalSold: number;
  totalRevenue: number;
  ticketTypes: number;
}> {
  const ticketTypes = await ticketTypeRepo.findByEvent(eventId, userId);

  return {
    totalCapacity: ticketTypes.reduce((sum, tt) => sum + tt.capacity, 0),
    totalSold: ticketTypes.reduce((sum, tt) => sum + tt.soldCount, 0),
    totalRevenue: ticketTypes.reduce((sum, tt) => sum + tt.price * tt.soldCount, 0),
    ticketTypes: ticketTypes.length,
  };
}
