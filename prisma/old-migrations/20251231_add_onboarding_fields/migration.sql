-- Add onboarding tracking fields to Organization and Event tables
-- Part of Slice 1.5: Organizer Onboarding Flow

-- Add firstLoginCompleted to Organization
-- This tracks if the user has completed the initial welcome/onboarding flow
ALTER TABLE "organizations" ADD COLUMN "firstLoginCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Add isPaid to Event
-- This determines if an event requires Mollie payment setup (paid tickets vs free event)
ALTER TABLE "events" ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT true;

-- Add index for querying organizations by onboarding status
CREATE INDEX "organizations_firstLoginCompleted_idx" ON "organizations"("firstLoginCompleted");

-- Add index for querying events by payment type
CREATE INDEX "events_isPaid_idx" ON "events"("isPaid");
