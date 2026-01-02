import { prisma } from "@/server/lib/prisma";
import { platformSettingsService } from "./platformSettingsService";
import { SYSTEM_MAX_TICKETS_PER_EVENT } from "@/lib/system-constants";
import { mollieLogger } from "@/server/lib/logger";
import { invoiceRepo } from "@/server/repos/invoiceRepo";
import {
  createMollieSalesInvoice,
  formatAmount,
  calculateVATFromInclusive,
} from "@/server/services/mollieInvoiceService";

export const freeEventLimitService = {
  /**
   * Check if an event is "free" (all ticket types have price = 0)
   */
  async isEventFree(eventId: string, orgId: string): Promise<boolean> {
    const ticketTypes = await prisma.ticketType.findMany({
      where: {
        eventId,
        event: { organizationId: orgId },
      },
      select: { price: true },
    });

    // No ticket types = not determined yet (allow creation)
    if (ticketTypes.length === 0) return false;

    // All ticket types must have price = 0
    return ticketTypes.every((tt) => tt.price === 0);
  },

  /**
   * Get total capacity for an event
   */
  async getTotalCapacity(eventId: string, orgId: string): Promise<number> {
    const result = await prisma.ticketType.aggregate({
      where: {
        eventId,
        event: { organizationId: orgId },
      },
      _sum: { capacity: true },
    });

    return result._sum.capacity ?? 0;
  },

  /**
   * Check if event can add/update tickets without exceeding limits
   * Enforces both: 1) Free event limit (configurable), 2) System hard limit (2500)
   * @returns { allowed: boolean, limit: number, current: number, unlockFee: number, systemLimit?: number }
   */
  async checkFreeEventLimit(
    eventId: string,
    orgId: string,
    newCapacity: number
  ) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId: orgId },
      select: { unlimitedTicketsEnabled: true },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    const currentCapacity = await this.getTotalCapacity(eventId, orgId);
    const totalCapacity = currentCapacity + newCapacity;

    // Get platform settings
    const freeEventLimit =
      await platformSettingsService.getFreeEventTicketLimit();
    const unlockFee = await platformSettingsService.getUnlockFeeAmount();

    // ALWAYS enforce system hard limit (2500 tickets)
    if (totalCapacity > SYSTEM_MAX_TICKETS_PER_EVENT) {
      return {
        allowed: false,
        limit: SYSTEM_MAX_TICKETS_PER_EVENT,
        freeEventLimit,
        current: currentCapacity,
        unlockFee,
        systemLimit: SYSTEM_MAX_TICKETS_PER_EVENT,
        isUnlocked: event.unlimitedTicketsEnabled,
      };
    }

    // If unlimited is enabled, only system limit applies
    if (event.unlimitedTicketsEnabled) {
      return {
        allowed: true,
        limit: SYSTEM_MAX_TICKETS_PER_EVENT,
        freeEventLimit,
        current: currentCapacity,
        unlockFee,
        isUnlocked: true,
      };
    }

    // Check if event is free
    const isFree = await this.isEventFree(eventId, orgId);
    if (!isFree) {
      // Not a free event, only system limit applies
      return {
        allowed: true,
        limit: SYSTEM_MAX_TICKETS_PER_EVENT,
        freeEventLimit,
        current: currentCapacity,
        unlockFee,
        isUnlocked: false,
      };
    }

    // For free events without unlock, enforce configurable limit
    const allowed = totalCapacity <= freeEventLimit;

    return {
      allowed,
      limit: freeEventLimit,
      freeEventLimit,
      current: currentCapacity,
      unlockFee,
      isUnlocked: false,
    };
  },

  /**
   * Create Mollie payment for unlock fee
   * Uses PLATFORM's Mollie account (not organization's)
   */
  async createUnlockPayment(
    eventId: string,
    orgId: string,
    redirectUrl: string
  ): Promise<{ paymentUrl: string; paymentId: string }> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, email: true },
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    const unlockFee = await platformSettingsService.getUnlockFeeAmount();
    // unlockFee is exclusive of VAT - add 21% VAT for Mollie payment
    const unlockFeeInclVAT = Math.round(unlockFee * 1.21);
    const amountInEuros = (unlockFeeInclVAT / 100).toFixed(2);

    // Use PLATFORM's Mollie API key (not organization's)
    const platformMollieKey = process.env.MOLLIE_API_KEY;

    if (!platformMollieKey) {
      throw new Error("Platform Mollie API key not configured");
    }

    // Create payment via platform's Mollie account
    const payment = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${platformMollieKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: {
          currency: "EUR",
          value: amountInEuros,
        },
        description: `Unlock unlimited tickets - ${org.name}`,
        redirectUrl,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/unlock-payment`,
        metadata: {
          eventId,
          organizationId: orgId,
          type: "EVENT_UNLOCK",
        },
      }),
    });

    const paymentData = await payment.json();

    if (!payment.ok) {
      throw new Error(
        `Mollie payment creation failed: ${paymentData.detail || paymentData.title}`
      );
    }

    return {
      paymentUrl: paymentData._links.checkout.href,
      paymentId: paymentData.id,
    };
  },

  /**
   * Process successful unlock payment (called from webhook)
   */
  async processUnlockPayment(
    paymentId: string,
    eventId: string,
    orgId: string
  ) {
    const unlockFee = await platformSettingsService.getUnlockFeeAmount();

    // Update event
    await prisma.event.update({
      where: {
        id: eventId,
        organizationId: orgId,
      },
      data: {
        unlimitedTicketsEnabled: true,
        unlimitedTicketsPaymentId: paymentId,
        unlimitedTicketsPaidAt: new Date(),
      },
    });

    // Create invoice via Mollie Invoice Sales API
    await this.createUnlockInvoice(paymentId, eventId, orgId, unlockFee);
  },

  /**
   * Create invoice for unlock payment
   * Creates both Mollie Sales Invoice and stores in database
   *
   * @param amount - Amount in cents (EXCLUSIVE of VAT)
   */
  async createUnlockInvoice(
    paymentId: string,
    eventId: string,
    orgId: string,
    amount: number
  ) {
    // Amount is exclusive of VAT - calculate VAT to add on top
    const vatAmount = Math.round(amount * 0.21); // 21% VAT
    console.log("Amount (excl. VAT):", amount);
    console.log("VAT Amount:", vatAmount);
    console.log("Total Amount (incl. VAT):", amount + vatAmount);
    try {
      // Fetch organization and event details
      const [org, event] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: orgId },
          select: {
            name: true,
            email: true,
            vatNumber: true,
            registrationNumber: true,
            streetAndNumber: true,
            postalCode: true,
            city: true,
            country: true,
            firstName: true,
            lastName: true,
          },
        }),
        prisma.event.findUnique({
          where: { id: eventId },
          select: { title: true },
        }),
      ]);

      if (!org) {
        throw new Error("Organization not found");
      }

      if (!event) {
        throw new Error("Event not found");
      }

      // Validate organization has required billing info
      const billingEmail = org.email;
      if (!billingEmail || !org.streetAndNumber || !org.postalCode || !org.city) {
        mollieLogger.warn(
          { organizationId: orgId, eventId },
          "Organization missing billing info, skipping Mollie invoice creation"
        );
        // Still create in our database
        const invoice = await invoiceRepo.create({
          organizationId: orgId,
          eventId,
          type: "UNLOCK_FEE",
          amount, // Exclusive of VAT
          vatAmount,
          vatRate: 21.0,
          status: "PAID",
          molliePaymentId: paymentId,
          paidAt: new Date(),
          description: "Unlock unlimited tickets for free event",
          invoiceDate: new Date(),
        });

        return invoice;
      }

      // Determine recipient type based on VAT/registration number
      const isBusinessRecipient = !!(org.vatNumber || org.registrationNumber);

      // Create Mollie Sales Invoice
      const mollieInvoice = await createMollieSalesInvoice({
        recipientIdentifier: orgId,
        recipient: isBusinessRecipient
          ? {
              type: "business",
              organizationName: org.name,
              ...(org.vatNumber && { vatNumber: org.vatNumber }),
              ...(org.registrationNumber && { organizationNumber: org.registrationNumber }),
              email: billingEmail,
              streetAndNumber: org.streetAndNumber,
              postalCode: org.postalCode,
              city: org.city,
              country: org.country || "NL",
              locale: "nl_NL",
            }
          : {
              type: "consumer",
              givenName: org.firstName || org.name.split(" ")[0],
              familyName: org.lastName || org.name.split(" ").slice(1).join(" ") || "",
              email: billingEmail,
              streetAndNumber: org.streetAndNumber,
              postalCode: org.postalCode,
              city: org.city,
              country: org.country || "NL",
              locale: "nl_NL",
            },
        lines: [
          {
            description: `Unlock unlimited tickets - ${event.title}`,
            quantity: 1,
            vatRate: "21.00",
            unitPrice: {
              currency: "EUR",
              value: formatAmount(amount),
            },
          },
        ],
        memo: `Unlock unlimited tickets for event: ${event.title}\nAllows up to ${SYSTEM_MAX_TICKETS_PER_EVENT} tickets for free events`,
        emailDetails: {
          subject: `Invoice - Unlimited Tickets Unlocked`,
          body: `Dear ${org.name},\n\nYour unlimited tickets feature has been activated for the event "${event.title}".\n\nYou can now sell up to ${SYSTEM_MAX_TICKETS_PER_EVENT} tickets for this free event.\n\nThank you for using Entro!\n\nBest regards,\nThe Entro Team`,
        },
        paymentTerm: "1 days",
        markAsPaid: true, // Already paid via Mollie payment
      });

      // Store invoice in database
      const invoice = await invoiceRepo.create({
        organizationId: orgId,
        eventId,
        type: "UNLOCK_FEE",
        mollieSalesInvoiceId: mollieInvoice.id,
        invoiceNumber: mollieInvoice.invoiceNumber,
        amount, // Exclusive of VAT
        vatAmount,
        vatRate: 21.0,
        status: "PAID",
        molliePaymentId: paymentId,
        paidAt: new Date(),
        pdfUrl: mollieInvoice._links?.pdfLink?.href,
        description: "Unlock unlimited tickets for free event",
        invoiceDate: mollieInvoice.issuedAt
          ? new Date(mollieInvoice.issuedAt)
          : new Date(),
        dueDate: mollieInvoice.dueAt ? new Date(mollieInvoice.dueAt) : undefined,
      });

      mollieLogger.info(
        {
          invoiceId: invoice.id,
          mollieSalesInvoiceId: mollieInvoice.id,
          eventId,
          amount,
        },
        "Unlock invoice created"
      );

      return invoice;
    } catch (error: any) {
      // Log error but don't fail - invoice can be created manually
      mollieLogger.error(
        { err: error, eventId, amount },
        "Failed to create unlock invoice"
      );
      throw error;
    }
  },
};
