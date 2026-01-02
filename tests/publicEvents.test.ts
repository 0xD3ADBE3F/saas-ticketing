import { describe, it, expect, beforeAll } from "vitest";
import { eventRepo } from "@/server/repos/eventRepo";
import { prisma } from "@/server/lib/prisma";
import type { Organization, Event } from "@/generated/prisma";

describe("eventRepo.findPublicEvents", () => {
  let testOrg1: Organization;
  let testOrg2: Organization;
  let publicEvent: Event;
  let privateEvent: Event;
  let pastEvent: Event;
  let draftEvent: Event;

  beforeAll(async () => {
    // Clean up test data
    await prisma.event.deleteMany({
      where: { title: { startsWith: "[TEST PUBLIC EVENTS]" } },
    });
    await prisma.organization.deleteMany({
      where: { slug: { startsWith: "test-public-events-" } },
    });

    // Create test organizations
    testOrg1 = await prisma.organization.create({
      data: {
        name: "[TEST PUBLIC EVENTS] Org 1",
        slug: "test-public-events-org1",
        showOnPublicEventsPage: true, // Wants to be listed
      },
    });

    testOrg2 = await prisma.organization.create({
      data: {
        name: "[TEST PUBLIC EVENTS] Org 2",
        slug: "test-public-events-org2",
        showOnPublicEventsPage: false, // Does not want to be listed
      },
    });

    // Create test events
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 1 week from now

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7); // 1 week ago

    // Public event - should appear
    publicEvent = await prisma.event.create({
      data: {
        title: "[TEST PUBLIC EVENTS] Public Event",
        slug: "test-public-event",
        organizationId: testOrg1.id,
        status: "LIVE",
        startsAt: futureDate,
        endsAt: new Date(futureDate.getTime() + 3600000),
        isPaid: true,
      },
    });

    // Private event (org opted out) - should NOT appear
    privateEvent = await prisma.event.create({
      data: {
        title: "[TEST PUBLIC EVENTS] Private Event",
        slug: "test-private-event",
        organizationId: testOrg2.id,
        status: "LIVE",
        startsAt: futureDate,
        endsAt: new Date(futureDate.getTime() + 3600000),
        isPaid: true,
      },
    });

    // Past event - should NOT appear
    pastEvent = await prisma.event.create({
      data: {
        title: "[TEST PUBLIC EVENTS] Past Event",
        slug: "test-past-event",
        organizationId: testOrg1.id,
        status: "LIVE",
        startsAt: pastDate,
        endsAt: new Date(pastDate.getTime() + 3600000),
        isPaid: true,
      },
    });

    // Draft event - should NOT appear
    draftEvent = await prisma.event.create({
      data: {
        title: "[TEST PUBLIC EVENTS] Draft Event",
        slug: "test-draft-event",
        organizationId: testOrg1.id,
        status: "DRAFT",
        startsAt: futureDate,
        endsAt: new Date(futureDate.getTime() + 3600000),
        isPaid: true,
      },
    });
  });

  it("should only return LIVE, future events from orgs with showOnPublicEventsPage=true", async () => {
    const events = await eventRepo.findPublicEvents();

    // Filter to only test events
    const testEvents = events.filter((e) =>
      e.title.startsWith("[TEST PUBLIC EVENTS]")
    );

    // Should only include the public event
    expect(testEvents).toHaveLength(1);
    expect(testEvents[0].id).toBe(publicEvent.id);
    expect(testEvents[0].title).toBe("[TEST PUBLIC EVENTS] Public Event");
    expect(testEvents[0].organization.showOnPublicEventsPage).toBe(true);
  });

  it("should include organization details", async () => {
    const events = await eventRepo.findPublicEvents();
    const testEvent = events.find((e) => e.id === publicEvent.id);

    expect(testEvent).toBeDefined();
    expect(testEvent?.organization).toBeDefined();
    expect(testEvent?.organization.name).toBe("[TEST PUBLIC EVENTS] Org 1");
    expect(testEvent?.organization.slug).toBe("test-public-events-org1");
  });

  it("should include ticket types", async () => {
    // Add a ticket type to the public event
    const ticketType = await prisma.ticketType.create({
      data: {
        eventId: publicEvent.id,
        name: "Regular",
        price: 1000,
        capacity: 100,
        soldCount: 10,
      },
    });

    const events = await eventRepo.findPublicEvents();
    const testEvent = events.find((e) => e.id === publicEvent.id);

    expect(testEvent?.ticketTypes).toBeDefined();
    expect(testEvent?.ticketTypes.length).toBeGreaterThan(0);
    expect(testEvent?.ticketTypes[0].name).toBe("Regular");
    expect(testEvent?.ticketTypes[0].price).toBe(1000);

    // Clean up
    await prisma.ticketType.delete({ where: { id: ticketType.id } });
  });

  it("should return events ordered by start date (upcoming first)", async () => {
    const nearFuture = new Date();
    nearFuture.setDate(nearFuture.getDate() + 3);

    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 14);

    // Create two more events with different dates
    const nearEvent = await prisma.event.create({
      data: {
        title: "[TEST PUBLIC EVENTS] Near Event",
        slug: "test-near-event",
        organizationId: testOrg1.id,
        status: "LIVE",
        startsAt: nearFuture,
        endsAt: new Date(nearFuture.getTime() + 3600000),
        isPaid: true,
      },
    });

    const farEvent = await prisma.event.create({
      data: {
        title: "[TEST PUBLIC EVENTS] Far Event",
        slug: "test-far-event",
        organizationId: testOrg1.id,
        status: "LIVE",
        startsAt: farFuture,
        endsAt: new Date(farFuture.getTime() + 3600000),
        isPaid: true,
      },
    });

    const events = await eventRepo.findPublicEvents();
    const testEvents = events
      .filter((e) => e.title.startsWith("[TEST PUBLIC EVENTS]"))
      .filter((e) => e.status === "LIVE");

    // Should be ordered by start date ascending
    expect(testEvents.length).toBeGreaterThanOrEqual(3);

    const nearIndex = testEvents.findIndex((e) => e.id === nearEvent.id);
    const farIndex = testEvents.findIndex((e) => e.id === farEvent.id);

    expect(nearIndex).toBeLessThan(farIndex);

    // Clean up
    await prisma.event.delete({ where: { id: nearEvent.id } });
    await prisma.event.delete({ where: { id: farEvent.id } });
  });
});
