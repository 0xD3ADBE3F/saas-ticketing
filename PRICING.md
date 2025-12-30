# Entro Pricing Plans

**Last Updated:** 30 December 2025

## Overview

Entro offers 4 subscription tiers to accommodate different organization types and scales. All plans include a **2% platform fee per order** (not per ticket).

### Key Pricing Rules

1. **Platform Fee:** 2% per order (paid by organizer, charged on payout)
2. **Service Fee:** €0.35 per order (paid by buyer at checkout)
3. **Overage Fees:** Charged per ticket when monthly/event limit exceeded
4. **Branding:** Entro-branding on all plans except Pro Organizer (removal available for +2% fee)

---

## Plan Details

### 1. Non-profit & Stichtingen

**Price:** €0

**Target Audience:** Foundations and non-profit organizations without profit motive

**Limits:**

- 1 active event at a time
- 500 tickets per event
- No overage allowed (hard limit)

**Platform Fee:** 2% per order

**Features:**

- ✅ Online ticketverkoop
- ✅ QR-code scanning
- ✅ iDEAL betalingen
- ✅ Real-time tracking
- ✅ E-mail notificaties
- ✅ Basis support
- ⚠️ Entro-branding (verwijdering mogelijk)

---

### 2. Pay-Per-Event

**Price:** €49 per event (one-time)

**Target Audience:** Occasional event organizers

**Limits:**

- 1 event per purchase
- 1,000 tickets per event
- **Overage:** €0.10 per extra ticket

**Platform Fee:** 2% per order

**Features:**

- ✅ Alles van Non-profit plan
- ✅ Onbeperkte ticket types
- ✅ Aangepaste vragen
- ✅ Priority support
- ⚠️ Entro-branding (verwijdering mogelijk)

---

### 3. Organizer

**Price:** €49/maand (recurring)

**Target Audience:** Regular event organizers with multiple events

**Limits:**

- Unlimited events (simultaneously active)
- 3,000 tickets per month (cumulative across all events)
- **Overage:** €0.08 per extra ticket

**Platform Fee:** 2% per order

**Features:**

- ✅ Alles van Pay-Per-Event plan
- ✅ Onbeperkt events tegelijk actief
- ✅ Aangepaste branding mogelijk
- ✅ Analytics dashboard
- ✅ API toegang
- ✅ Dedicated support
- ⚠️ Entro-branding (verwijdering mogelijk)

---

### 4. Pro Organizer

**Price:** €99/maand (recurring)

**Target Audience:** Professional organizations with high ticket volume

**Limits:**

- Unlimited events (simultaneously active)
- 10,000 tickets per month (cumulative across all events)
- **Overage:** €0.05 per extra ticket

**Platform Fee:** 2% per order

**Features:**

- ✅ Alles van Organizer plan
- ✅ **Whitelabel (geen Entro-branding)**
- ✅ Dedicated account manager
- ✅ SLA garantie
- ✅ Premium analytics
- ✅ Priority API rate limits

**Most Popular** - Highlighted on website

---

## Fee Structure Summary

| Plan          | Monthly/Event Fee | Ticket Limit | Overage Fee  | Platform Fee | Branding              |
| ------------- | ----------------- | ------------ | ------------ | ------------ | --------------------- |
| Non-profit    | €0                | 500/event    | -            | 2%           | Entro (+2% to remove) |
| Pay-Per-Event | €49/event         | 1,000/event  | €0.10/ticket | 2%           | Entro (+2% to remove) |
| Organizer     | €49/month         | 3,000/month  | €0.08/ticket | 2%           | Entro (+2% to remove) |
| Pro Organizer | €99/month         | 10,000/month | €0.05/ticket | 2%           | None (whitelabel)     |

---

## Business Model Notes

### Revenue Streams

1. **Subscription Fees:** Monthly/per-event fees (€49-€99)
2. **Platform Fees:** 2% per order (deducted on payout to organizer)
3. **Overage Fees:** Per-ticket charges when limits exceeded
4. **Branding Removal:** +2% platform fee for non-Pro plans

### Payment Flow

1. **Buyer** pays at checkout:
   - Ticket price(s)
   - Service fee (€0.99 per order)

2. **Entro** processes payment via Mollie:
   - Holds funds temporarily

3. **Payout** to organizer:
   - Ticket revenue
   - Minus 2% platform fee
   - Minus any overage fees

### Example Calculation

**Scenario:** Organizer plan, sells 3,500 tickets in a month (€10 each)

- Ticket revenue: 3,500 × €10 = €35,000
- Platform fee (2%): €35,000 × 0.02 = €700
- Overage fee: 500 tickets × €0.08 = €40
- Subscription fee: €49/month
- **Organizer receives:** €35,000 - €700 - €40 = €34,260
- **Organizer total cost:** €49 + €700 + €40 = €789

---

## Implementation Requirements

### Database Schema

Plans should be stored in the database with:

```typescript
enum PricingPlan {
  NON_PROFIT
  PAY_PER_EVENT
  ORGANIZER
  PRO_ORGANIZER
}

type PlanLimits = {
  activeEvents: number | null  // null = unlimited
  ticketLimit: number          // per event or per month
  limitPeriod: 'event' | 'month'
  overageFee: number | null    // null = no overage allowed
}
```

### Enforcement Points

1. **Event Creation:** Check `activeEvents` limit
2. **Ticket Sales:** Track cumulative ticket count per period
3. **Checkout:** Calculate overage fees if applicable
4. **Payout:** Deduct platform fee (2% + optional 2% for branding removal)

### Upgrade/Downgrade Rules

- **Upgrade:** Immediate effect, prorated billing
- **Downgrade:** Takes effect at next billing cycle
- **Free → Paid:** Requires Mollie onboarding completion
- **Paid → Free:** Not allowed if exceeds limits (must delete events/tickets first)

---

## FAQ Pricing Questions

### Wat kost Entro?

We hebben vier plannen: van gratis voor non-profits tot €99/maand voor professionele organisaties. Bekijk onze [prijzen](#pricing) voor details.

### Zijn er extra kosten?

Alle plannen hebben een platform fee van 2% per bestelling (betaald door de organisator). Kopers betalen een service fee van €0.99 per bestelling. Als je je ticket limiet overschrijdt, betaal je een kleine fee per extra ticket.

### Kan ik mijn plan later upgraden?

Ja, je kunt op elk moment upgraden. De wijziging gaat direct in en je betaalt alleen voor de resterende periode.

### Wat gebeurt er met gratis evenementen?

Ook bij gratis evenementen geldt de 2% fee. Deze wordt berekend over €0, dus de organisator betaalt alleen de platform kosten. De €0.99 service fee wordt niet gerekend bij gratis tickets.

### Kan ik de Entro-branding verwijderen?

Op alle plannen behalve Pro Organizer is Entro-branding standaard aanwezig. Je kunt deze verwijderen door een extra 2% platform fee te betalen (totaal 4%).

---

## Related Documentation

- [SPEC.md](./SPEC.md) - Technical specification with fee calculation logic
- [FEATURES.md](./FEATURES.md) - Feature list and roadmap
- [docs/MOLLIE_PLATFORM.md](./docs/MOLLIE_PLATFORM.md) - Payment processing details
