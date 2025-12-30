import createMollieClient, { SequenceType } from "@mollie/api-client";
import { env } from "@/server/lib/env";
import { subscriptionRepo } from "@/server/repos/subscriptionRepo";
import { prisma } from "@/server/lib/prisma";
import { getPlanLimits, getPlanDisplayName } from "@/server/domain/plans";
import { mollieLogger } from "@/server/lib/logger";
import { mollieInvoiceService } from "@/server/services/mollieInvoiceService";
import type { PricingPlan } from "@/generated/prisma";

// =============================================================================
// Mollie Subscription Service (Platform Billing)
// =============================================================================
//
// IMPORTANT: This service uses Entro's platform Mollie account (MOLLIE_API_KEY)
// for organization subscription billing. This is DIFFERENT from the organization's
// connected Mollie account which is used for receiving ticket sale proceeds.
//
// Flow:
// 1. Organization upgrades to paid plan
// 2. We create a Mollie customer (if not exists) using platform API key
// 3. We create a first payment to get mandate (iDEAL → recurring)
// 4. After first payment, we create a Mollie subscription for recurring billing
// 5. Mollie handles recurring payments automatically
// =============================================================================

/**
 * Get platform Mollie client (uses Entro's API key, NOT organization's)
 */
function getPlatformMollieClient() {
  return createMollieClient({ apiKey: env.MOLLIE_API_KEY });
}

export type CreateSubscriptionResult =
  | { success: true; checkoutUrl: string; paymentId: string }
  | { success: false; error: string };

export type CancelSubscriptionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Create or get Mollie customer for organization
 */
async function getOrCreateMollieCustomer(
  organizationId: string,
  organizationName: string,
  email: string
): Promise<string> {
  const mollieClient = getPlatformMollieClient();

  // Check if we already have a Mollie customer ID
  const subscription = await subscriptionRepo.findByOrganizationId(organizationId);

  if (subscription?.mollieCustomerId) {
    return subscription.mollieCustomerId;
  }

  // Create new Mollie customer
  const customer = await mollieClient.customers.create({
    name: organizationName,
    email,
    metadata: {
      organizationId,
      platform: "entro",
    },
  });

  return customer.id;
}

/**
 * Create a first payment to establish a mandate for recurring billing
 * After successful payment, we'll create the actual subscription
 */
export async function createSubscriptionPayment(
  organizationId: string,
  targetPlan: PricingPlan,
  email: string,
  baseUrl: string
): Promise<CreateSubscriptionResult> {
  const mollieClient = getPlatformMollieClient();

  const planLimits = getPlanLimits(targetPlan);
  const monthlyPrice = planLimits.monthlyPrice;

  // Only paid plans have monthly price
  if (!monthlyPrice || monthlyPrice === 0) {
    return { success: false, error: "Dit plan vereist geen betaling" };
  }

  try {
    // Get organization
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return { success: false, error: "Organisatie niet gevonden" };
    }

    // Get or create Mollie customer
    const customerId = await getOrCreateMollieCustomer(
      organizationId,
      org.name,
      email
    );

    // Create first payment to establish mandate
    // Note: Don't specify method - Mollie will show methods that support mandates (iDEAL, creditcard, etc.)
    // iDEAL payment creates a SEPA Direct Debit mandate for future recurring charges
    const payment = await mollieClient.payments.create({
      amount: {
        currency: "EUR",
        value: (monthlyPrice / 100).toFixed(2), // Convert cents to euros
      },
      customerId,
      sequenceType: SequenceType.first, // This creates a mandate for future payments
      description: `${getPlanDisplayName(targetPlan)} - Eerste betaling`,
      redirectUrl: `${baseUrl}/dashboard/settings/subscription?payment=success&plan=${targetPlan}`,
      webhookUrl: `${baseUrl}/api/webhooks/subscriptions`,
      metadata: {
        type: "subscription_first_payment",
        organizationId,
        targetPlan,
      },
    });

    // Store pending subscription info
    // Use TRIALING status while awaiting first payment
    const subscription = await subscriptionRepo.findByOrganizationId(organizationId);
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    if (subscription) {
      // If upgrading from another paid plan, cancel the old Mollie subscription first
      if (subscription.mollieSubscriptionId && subscription.mollieCustomerId) {
        try {
          await mollieClient.customerSubscriptions.cancel(
            subscription.mollieSubscriptionId,
            { customerId: subscription.mollieCustomerId }
          );
          mollieLogger.info(
            { oldSubscriptionId: subscription.mollieSubscriptionId, targetPlan },
            "Cancelled old Mollie subscription for upgrade"
          );
        } catch (error) {
          mollieLogger.error({ error }, "Failed to cancel old Mollie subscription during upgrade");
          // Continue anyway - the new subscription will replace it
        }
      }

      await subscriptionRepo.update(subscription.id, {
        plan: targetPlan, // Update to new plan immediately
        mollieCustomerId: customerId,
        mollieSubscriptionId: undefined, // Clear old subscription ID
        status: "TRIALING", // Awaiting first payment
        cancelAtPeriodEnd: false, // Clear any pending cancellation
      });
    } else {
      await subscriptionRepo.create({
        organizationId,
        plan: targetPlan,
        status: "TRIALING", // Awaiting first payment
        mollieCustomerId: customerId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }

    return {
      success: true,
      checkoutUrl: payment.getCheckoutUrl() ?? "",
      paymentId: payment.id,
    };
  } catch (error) {
    mollieLogger.error({ error }, "Failed to create subscription payment");
    // Provide more specific error message
    const errorMessage = error instanceof Error
      ? error.message
      : "Er is een fout opgetreden bij het aanmaken van de betaling";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Create a Mollie subscription after first payment is successful
 * Called from webhook handler after first payment completes
 */
export async function createMollieSubscription(
  organizationId: string,
  targetPlan: PricingPlan,
  customerId: string
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  const mollieClient = getPlatformMollieClient();

  const planLimits = getPlanLimits(targetPlan);
  const monthlyPrice = planLimits.monthlyPrice;

  mollieLogger.info({ organizationId, targetPlan, customerId }, "Creating Mollie subscription");

  if (!monthlyPrice || monthlyPrice === 0) {
    mollieLogger.error({ targetPlan }, "Plan has no monthly price");
    return { success: false, error: "Dit plan vereist geen abonnement" };
  }

  try {
    // Create recurring subscription
    mollieLogger.info({ amount: (monthlyPrice / 100).toFixed(2) }, "Creating Mollie subscription");

    // Check if customer has a valid mandate
    // Retry logic: Mollie may take up to 15 seconds to validate the mandate after first payment
    let validMandate = null;
    let attempts = 0;
    const maxAttempts = 6; // Increased from 3 to 6 attempts
    const delayMs = 3000; // Increased from 2 to 3 seconds between attempts (total ~18 seconds)

    while (!validMandate && attempts < maxAttempts) {
      attempts++;
      mollieLogger.info({ customerId, attempt: attempts }, "Checking for valid mandate");

      const mandatesList = await mollieClient.customerMandates.iterate({ customerId });
      const mandates = [];
      for await (const mandate of mandatesList) {
        mandates.push(mandate);
      }
      validMandate = mandates.find(m => m.status === "valid") ?? null;

      if (!validMandate && attempts < maxAttempts) {
        // Wait before retrying (only if not the last attempt)
        mollieLogger.info({ delayMs, nextAttempt: attempts + 1 }, "No valid mandate yet, waiting before retry");
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else if (!validMandate) {
        // Last attempt failed, log all mandates for debugging
        mollieLogger.error({ customerId, mandates, attempts }, "No valid mandate found after all retries");
        return {
          success: false,
          error: "Geen geldig mandaat gevonden. De eerste betaling wordt nog verwerkt. Probeer het over een paar minuten opnieuw."
        };
      }
    }

    if (!validMandate) {
      // This should never happen due to the loop logic, but TypeScript needs the check
      mollieLogger.error({ customerId, attempts }, "No valid mandate found");
      return {
        success: false,
        error: "Geen geldig mandaat gevonden"
      };
    }

    mollieLogger.info({ mandateId: validMandate.id, attempts }, "Found valid mandate");

    // Calculate start date: beginning of next month
    // First payment covers current period, subscription starts next period
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    mollieLogger.info({ startDate: startDate.toISOString() }, "Subscription will start on");

    const mollieSubscription = await mollieClient.customerSubscriptions.create({
      customerId,
      amount: {
        currency: "EUR",
        value: (monthlyPrice / 100).toFixed(2),
      },
      interval: "1 month",
      startDate: startDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
      description: `${getPlanDisplayName(targetPlan)} - Maandelijks abonnement`,
      webhookUrl: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/subscriptions`,
      metadata: {
        organizationId,
        plan: targetPlan,
      },
    });

    mollieLogger.info({ subscriptionId: mollieSubscription.id }, "Mollie subscription created");

    // Update subscription record with Mollie subscription ID
    const subscription = await subscriptionRepo.findByOrganizationId(organizationId);
    if (subscription) {
      await subscriptionRepo.update(subscription.id, {
        mollieSubscriptionId: mollieSubscription.id,
        plan: targetPlan,
        status: "ACTIVE",
        cancelAtPeriodEnd: false, // Clear any pending cancellation
      });
    }

    // Update organization's plan
    await prisma.organization.update({
      where: { id: organizationId },
      data: { currentPlan: targetPlan },
    });

    return { success: true, subscriptionId: mollieSubscription.id };
  } catch (error) {
    mollieLogger.error({ error }, "Failed to create Mollie subscription");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Er is een fout opgetreden",
    };
  }
}

/**
 * Cancel a Mollie subscription
 */
export async function cancelMollieSubscription(
  organizationId: string
): Promise<CancelSubscriptionResult> {
  const mollieClient = getPlatformMollieClient();

  const subscription = await subscriptionRepo.findByOrganizationId(organizationId);

  if (!subscription) {
    return { success: false, error: "Geen abonnement gevonden" };
  }

  if (!subscription.mollieSubscriptionId || !subscription.mollieCustomerId) {
    // No Mollie subscription, just mark as cancelled
    await subscriptionRepo.update(subscription.id, {
      cancelAtPeriodEnd: true,
    });
    return { success: true };
  }

  try {
    // Cancel in Mollie
    await mollieClient.customerSubscriptions.cancel(
      subscription.mollieSubscriptionId,
      { customerId: subscription.mollieCustomerId }
    );

    // Mark as cancelling at period end
    await subscriptionRepo.update(subscription.id, {
      cancelAtPeriodEnd: true,
    });

    return { success: true };
  } catch (error) {
    mollieLogger.error({ error }, "Failed to cancel Mollie subscription");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Er is een fout opgetreden",
    };
  }
}

/**
 * Handle subscription payment webhook
 */
export async function handleSubscriptionPayment(
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  const mollieClient = getPlatformMollieClient();

  try {
    const payment = await mollieClient.payments.get(paymentId);
    const metadata = payment.metadata as {
      type?: string;
      organizationId?: string;
      targetPlan?: PricingPlan;
    };

    if (metadata.type !== "subscription_first_payment") {
      return { success: true }; // Not a subscription payment
    }

    const { organizationId, targetPlan } = metadata;

    if (!organizationId || !targetPlan) {
      return { success: false, error: "Missing metadata" };
    }

    const subscription = await subscriptionRepo.findByOrganizationId(organizationId);

    switch (payment.status) {
      case "paid":
        // First payment successful - create recurring subscription
        mollieLogger.info({ organizationId }, "First payment paid, creating Mollie subscription");
        if (subscription?.mollieCustomerId) {
          const result = await createMollieSubscription(
            organizationId,
            targetPlan,
            subscription.mollieCustomerId
          );
          if (!result.success) {
            mollieLogger.error({ error: result.error }, "Failed to create Mollie subscription");
            // Mark subscription as PAST_DUE so user knows there's an issue
            await subscriptionRepo.update(subscription.id, {
              status: "PAST_DUE",
            });
            return { success: false, error: result.error };
          }
          mollieLogger.info({ subscriptionId: result.subscriptionId }, "Mollie subscription created");

          // Generate invoice for the first payment
          const amount = Math.round(parseFloat(payment.amount.value) * 100);
          await mollieInvoiceService.generateSubscriptionInvoice({
            organizationId,
            subscriptionId: subscription.id,
            plan: targetPlan,
            amount,
            molliePaymentId: paymentId,
          });
        } else {
          mollieLogger.error({ organizationId }, "No mollieCustomerId found for org");
          return { success: false, error: "No customer ID" };
        }
        break;

      case "failed":
      case "expired":
      case "canceled":
        // Payment failed - mark subscription as failed
        if (subscription) {
          await subscriptionRepo.update(subscription.id, {
            status: "PAST_DUE",
          });
        }
        break;
    }

    return { success: true };
  } catch (error) {
    mollieLogger.error({ error }, "Failed to handle subscription payment");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Er is een fout opgetreden",
    };
  }
}

/**
 * Handle recurring subscription payment webhook
 */
export async function handleRecurringPayment(
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  const mollieClient = getPlatformMollieClient();

  try {
    const payment = await mollieClient.payments.get(paymentId);

    // Get subscription from payment's subscriptionId
    if (!payment.subscriptionId) {
      return { success: true }; // Not a subscription payment
    }

    const subscription = await subscriptionRepo.findByMollieSubscriptionId(
      payment.subscriptionId
    );

    if (!subscription) {
      return { success: false, error: "Subscription not found" };
    }

    switch (payment.status) {
      case "paid":
        // Payment successful - update period dates
        const now = new Date();
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

        await subscriptionRepo.update(subscription.id, {
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        });

        // Generate invoice for this recurring payment
        const amount = Math.round(parseFloat(payment.amount.value) * 100);
        await mollieInvoiceService.generateSubscriptionInvoice({
          organizationId: subscription.organizationId,
          subscriptionId: subscription.id,
          plan: subscription.plan,
          amount,
          molliePaymentId: paymentId,
        });
        break;

      case "failed":
        await subscriptionRepo.update(subscription.id, {
          status: "PAST_DUE",
        });
        break;
    }

    return { success: true };
  } catch (error) {
    mollieLogger.error({ error }, "Failed to handle recurring payment");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Er is een fout opgetreden",
    };
  }
}

// =============================================================================
// Event Payment (PAY_PER_EVENT plan)
// =============================================================================

export type CreateEventPaymentResult =
  | { success: true; checkoutUrl: string; paymentId: string }
  | { success: false; error: string };

/**
 * Create a payment for publishing an event (PAY_PER_EVENT plan)
 * €49 per event, charged when publishing
 */
export async function createEventPayment(
  organizationId: string,
  eventId: string,
  eventTitle: string,
  email: string,
  baseUrl: string
): Promise<CreateEventPaymentResult> {
  const mollieClient = getPlatformMollieClient();

  // Get event price from plan limits
  const eventPrice = getPlanLimits("PAY_PER_EVENT").eventPrice;

  if (!eventPrice) {
    return { success: false, error: "Geen evenementprijs geconfigureerd" };
  }

  try {
    // Get organization
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return { success: false, error: "Organisatie niet gevonden" };
    }

    // Verify organization is on PAY_PER_EVENT plan
    if (org.currentPlan !== "PAY_PER_EVENT") {
      return { success: false, error: "Organisatie heeft geen pay-per-event plan" };
    }

    // Get or create Mollie customer
    const customerId = await getOrCreateMollieCustomer(
      organizationId,
      org.name,
      email
    );

    // Create one-off payment for event
    // Note: Test mode is determined by the API key (test_ vs live_ prefix)
    const payment = await mollieClient.payments.create({
      amount: {
        currency: "EUR",
        value: (eventPrice / 100).toFixed(2), // Convert cents to euros (€49.00)
      },
      customerId,
      description: `Evenement publicatie: ${eventTitle}`,
      redirectUrl: `${baseUrl}/dashboard/events/${eventId}?payment=success`,
      webhookUrl: `${baseUrl}/api/webhooks/subscriptions`,
      metadata: {
        type: "event_publication",
        organizationId,
        eventId,
        eventTitle, // Add eventTitle to metadata for invoice generation
      },
    });

    // Note: Invoice will be created via webhook after successful payment
    // This ensures we only generate Mollie Sales Invoices for paid events

    return {
      success: true,
      checkoutUrl: payment.getCheckoutUrl() ?? "",
      paymentId: payment.id,
    };
  } catch (error) {
    mollieLogger.error({ error }, "Failed to create event payment");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Er is een fout opgetreden",
    };
  }
}

/**
 * Handle event payment webhook
 * Called after successful payment to publish the event
 */
export async function handleEventPayment(
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  const mollieClient = getPlatformMollieClient();

  try {
    // Note: For API key authentication, test mode is determined by key prefix (test_ vs live_)
    // No testmode parameter needed
    const payment = await mollieClient.payments.get(paymentId);
    const metadata = payment.metadata as {
      type?: string;
      organizationId?: string;
      eventId?: string;
      eventTitle?: string;
    };

    if (metadata.type !== "event_publication") {
      return { success: true }; // Not an event payment
    }

    const { organizationId, eventId, eventTitle } = metadata;

    if (!organizationId || !eventId) {
      return { success: false, error: "Missing metadata" };
    }

    switch (payment.status) {
      case "paid":
        // Payment successful - publish the event
        await prisma.event.update({
          where: { id: eventId },
          data: { status: "LIVE" },
        });

        // Generate invoice via Mollie Sales Invoice API
        const amount = Math.round(parseFloat(payment.amount.value) * 100);
        await mollieInvoiceService.generateEventInvoice({
          organizationId,
          eventTitle: eventTitle || "Event",
          amount,
          molliePaymentId: paymentId,
        });

        mollieLogger.info({ eventId }, "Event published after successful payment");
        break;

      case "failed":
      case "expired":
      case "canceled":
        // Payment failed - no invoice to update (invoice only created on success)
        mollieLogger.info({ eventId, status: payment.status }, "Event payment failed");
        break;
    }

    return { success: true };
  } catch (error) {
    mollieLogger.error({ error }, "Failed to handle event payment");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Er is een fout opgetreden",
    };
  }
}
