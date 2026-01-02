/**
 * System Constants
 *
 * Platform-wide system limits and constraints to ensure stability and performance.
 * These are hardcoded limits that protect the system from overload.
 *
 * IMPORTANT: These constants are non-configurable by design.
 * Changing these values requires careful performance testing.
 */

/**
 * Maximum tickets per event (all event types)
 *
 * This hard limit prevents:
 * - Database performance degradation
 * - Memory issues during bulk ticket operations
 * - Webhook processing delays
 * - QR code generation timeouts
 *
 * Applies to ALL events regardless of:
 * - Event type (paid/free)
 * - Unlock status
 * - Organization tier
 */
export const SYSTEM_MAX_TICKETS_PER_EVENT = 2500;
