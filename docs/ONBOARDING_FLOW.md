# Organizer Onboarding Flow - Implementation Summary

## Overview

This document describes the frictionless onboarding flow for Entro organizers. The goal is to enable organizers to create their first event within minutes, with optional Mollie Connect integration for paid events.

## State Model & Data Flow

### Backend States

1. **Organization.firstLoginCompleted** (`boolean`, default: `false`)
   - Tracks whether user has completed the welcome screen
   - Set to `true` after user proceeds from welcome screen
   - Used to determine if welcome screen should be shown

2. **Event.isPaid** (`boolean`, default: `true`)
   - Indicates whether an event has paid tickets (requires Mollie)
   - Set to `false` for free events
   - Used to determine if payment activation banner should be shown

3. **Organization.mollieOnboardingStatus** (`enum`: `PENDING | NEEDS_DATA | IN_REVIEW | COMPLETED | null`)
   - Tracks Mollie Connect onboarding progress
   - `null` = not started
   - `COMPLETED` = can accept payments

### State Transitions

```
User Registration (Magic Link)
    ↓
Create Organization (/onboarding)
    ↓
Welcome Screen (/welcome)
    ↓ (user clicks "Create first event")
Mark firstLoginCompleted = true
    ↓
Simplified Event Creation (/dashboard/events/new?onboarding=true)
    ↓
Event Detail Page
    ↓ (if isPaid && !mollieCompleted)
Show Payment Status Banner
    ↓ (user clicks "Activate payments")
Mollie Connect OAuth Flow
    ↓
Mollie Callback
    ↓
Success State → Event Detail (with success message)
```

## Component Architecture

### 1. WelcomeScreen (`/src/components/onboarding/WelcomeScreen.tsx`)

- **Purpose**: First screen after organization creation
- **Features**:
  - Confetti animation (3 seconds)
  - Headline + subtext
  - Primary CTA: "Maak je eerste evenement"
  - Secondary CTA: "Ik doe dit later"
  - Feature preview cards
- **Actions**:
  - Calls `/api/organizations/[id]/onboarding/complete` to mark `firstLoginCompleted`
  - Redirects to event creation or dashboard

### 2. OnboardingEventForm (`/src/components/onboarding/OnboardingEventForm.tsx`)

- **Purpose**: Simplified event creation for onboarding
- **Fields**:
  - Event name (required)
  - Location (optional)
  - Start & end date/time (required, defaults to tomorrow)
  - "This is a free event" checkbox (sets `isPaid = false`)
- **Usage**: Loaded when `?onboarding=true` query parameter is present

### 3. PaymentStatusBanner (`/src/components/onboarding/PaymentStatusBanner.tsx`)

- **Purpose**: Alert for paid events without Mollie activation
- **Shown when**: `event.isPaid === true` AND `mollieOnboardingStatus !== "COMPLETED"`
- **States**:
  - **Not started** (`null`): "Actie vereist om tickets te verkopen"
  - **Pending/Needs Data**: "Betaalaccount activering niet afgerond"
  - **In Review**: "Betaalaccount wordt gecontroleerd" (no CTA, info only)
- **Features**:
  - Prominent yellow/orange gradient banner
  - CTA button to start/resume Mollie Connect
  - Info box explaining: funds go direct, Entro never touches money, KYC required, 2% fee

### 4. OnboardingChecklist (`/src/components/onboarding/OnboardingChecklist.tsx`)

- **Purpose**: Show progress through onboarding steps
- **Steps tracked**:
  1. Account created (always ✓)
  2. Event created
  3. Mollie connected (only shown for paid events)
  4. Tickets created
  5. Event published (status: LIVE)
- **Features**:
  - Visual checkmarks for completed steps
  - Clickable links for incomplete steps
  - Progress counter (e.g., "3 / 5")
  - Auto-hides when all steps complete

## API Routes

### 1. `POST /api/organizations/[id]/onboarding/complete`

- **Purpose**: Mark first login as completed
- **Auth**: Requires user to be member of organization
- **Action**: Sets `organization.firstLoginCompleted = true`
- **Response**: `{ success: true }`

### 2. `POST /api/events` (updated)

- **New field**: `isPaid` (boolean, optional, defaults to `true`)
- **Validation**: Added to Zod schema
- **Usage**: Called by both standard and onboarding event forms

### 3. `POST /api/organizations/[id]/mollie/onboard` (existing)

- **Purpose**: Start Mollie Connect OAuth flow
- **Parameters**: `returnUrl` (where to redirect after completion)
- **Returns**: `{ redirectUrl: string }` (Mollie OAuth URL)

## Service Layer

### onboardingService.ts (`/src/server/services/onboardingService.ts`)

**Functions**:

1. `getOnboardingProgress(organizationId)` → `OnboardingProgress`
   - Calculates checklist completion state
   - Checks: events exist, Mollie connected, tickets created, event published

2. `shouldShowOnboardingChecklist(organizationId)` → `boolean`
   - Returns `true` if any onboarding step is incomplete
   - Used to conditionally render checklist

3. `eventNeedsMollieActivation(eventId, organizationId)` → `boolean`
   - Returns `true` if event is paid and Mollie is not completed
   - Used to show payment status banner

## Routing Logic

### Dashboard Redirect (`/app/(dashboard)/dashboard/page.tsx`)

```typescript
if (!currentOrg.firstLoginCompleted) {
  redirect("/welcome");
}
```

### Welcome Page (`/app/welcome/page.tsx`)

- Shows welcome screen if `firstLoginCompleted === false`
- Redirects to dashboard if already completed

### Onboarding Form Handler (`/app/onboarding/OnboardingForm.tsx`)

- After org creation, redirects to `/welcome` instead of `/dashboard`

### Event Creation (`/app/(dashboard)/dashboard/events/new/page.tsx`)

- Checks for `?onboarding=true` query parameter
- Uses `OnboardingEventForm` instead of standard `EventForm` when onboarding
- Shows contextual help text

## Database Migrations

### Migration: `20251231_add_onboarding_fields`

```sql
-- Add firstLoginCompleted to Organization
ALTER TABLE "organizations"
  ADD COLUMN "firstLoginCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Add isPaid to Event
ALTER TABLE "events"
  ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT true;

-- Add indexes
CREATE INDEX "organizations_firstLoginCompleted_idx"
  ON "organizations"("firstLoginCompleted");

CREATE INDEX "events_isPaid_idx"
  ON "events"("isPaid");
```

## Key Design Principles

### 1. Free Events Never Block

- Users can create unlimited free events without Mollie
- Payment activation only required when trying to sell paid tickets
- Clear checkbox: "Dit is een gratis evenement"

### 2. State-Driven UX

- No hard-coded flows or step numbers
- Everything reacts to backend state
- Components show/hide based on data
- User can skip steps and come back later

### 3. MVP-Friendly

- Minimal required fields (name + date)
- Can always add more details later
- No forced wizard flow
- Progressive disclosure of complexity

### 4. Visual Feedback

- Confetti animation on welcome
- Checkmarks on completed steps
- Status badges (pending, in review, completed)
- Prominent banners for required actions

### 5. Mollie Onboarding Is Opt-In

- Not shown during initial signup
- Only prompted when needed (paid event without Mollie)
- Clear explanation of why it's needed
- Resume functionality if abandoned

## Edge Cases Handled

### 1. User Creates Free Event First

- No payment banner shown
- Mollie step not shown in checklist
- Can still add paid events later

### 2. User Abandons Mollie Onboarding

- Banner shows "Betaalaccount activering niet afgerond"
- CTA: "Activering voltooien"
- Can resume from where they left off

### 3. Mollie In Review

- Banner shows waiting state
- No actionable CTA (Mollie must complete review)
- Info: "Je ontvangt een e-mail zodra je kunt beginnen"

### 4. User Skips Welcome Screen

- `firstLoginCompleted` still marked as true
- No impact on functionality
- Dashboard works normally

### 5. User Has Multiple Organizations

- Onboarding state tracked per organization
- First organization's state checked for dashboard redirects

## Testing Checklist

- [ ] New user → organization creation → welcome screen shown
- [ ] Welcome screen → "Create event" → simplified form shown
- [ ] Simplified form → free event → no payment banner
- [ ] Simplified form → paid event → payment banner shown
- [ ] Payment banner → "Activate" → Mollie OAuth redirect
- [ ] Mollie callback → success message shown
- [ ] Checklist → all steps tracked correctly
- [ ] Checklist → hidden when complete
- [ ] Skip welcome → dashboard works normally
- [ ] Free event → add paid event later → payment banner shown then

## Future Enhancements (Post-MVP)

1. **Success Modal After Event Creation**
   - Show quick wins ("Your event is created!")
   - Next step suggestions

2. **Guided Tour**
   - Interactive walkthrough of dashboard
   - Highlight key features

3. **Email Reminders**
   - If Mollie onboarding abandoned for 24h
   - When Mollie review complete

4. **Analytics**
   - Track onboarding completion rates
   - Identify drop-off points

5. **Personalized Onboarding**
   - Different flows for different event types
   - Skip steps based on intent

6. **Multi-Event Onboarding**
   - Bulk event creation
   - Template events

## Dependencies

- **Existing**: Mollie Connect OAuth (fully implemented)
- **Existing**: Event CRUD (works, extended with `isPaid`)
- **New**: Welcome screen routing
- **New**: Onboarding checklist calculation
- **New**: Payment status banner logic

## Files Created/Modified

### New Files

- `/src/components/onboarding/WelcomeScreen.tsx`
- `/src/components/onboarding/OnboardingEventForm.tsx`
- `/src/components/onboarding/PaymentStatusBanner.tsx`
- `/src/components/onboarding/OnboardingChecklist.tsx`
- `/src/server/services/onboardingService.ts`
- `/src/app/welcome/page.tsx`
- `/src/app/api/organizations/[id]/onboarding/complete/route.ts`
- `/prisma/migrations/20251231_add_onboarding_fields/migration.sql`

### Modified Files

- `/prisma/schema.prisma` (added `firstLoginCompleted`, `isPaid`)
- `/src/app/(dashboard)/dashboard/page.tsx` (added welcome redirect)
- `/src/app/onboarding/OnboardingForm.tsx` (redirect to welcome)
- `/src/app/(dashboard)/dashboard/events/new/page.tsx` (onboarding form logic)
- `/src/app/api/events/route.ts` (accept `isPaid` parameter)
- `/src/server/services/eventService.ts` (support `isPaid` in types)
- `/src/server/repos/eventRepo.ts` (support `isPaid` in schema)
- `/FEATURES.md` (added Slice 1.5 documentation)

## Conclusion

This onboarding flow balances **speed** (event creation in minutes) with **flexibility** (free events, skip steps, no forced flow). The state-driven architecture ensures the UX always reflects the current backend state, and the modular components can be easily extended or modified post-MVP.
