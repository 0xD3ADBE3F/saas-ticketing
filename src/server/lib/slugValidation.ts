/**
 * Slug validation utilities for organizations and events
 */

/**
 * Reserved slugs that cannot be used for organizations or events
 * to prevent conflicts with application routes
 */
export const RESERVED_SLUGS = [
  // Application routes
  "api",
  "admin",
  "dashboard",
  "new",
  "create",
  "settings",
  "auth",
  "events",
  "e",
  "checkout",
  "scan",
  "scanner",
  "login",
  "logout",
  "signup",
  "register",
  "onboarding",
  // Common reserved words
  "account",
  "profile",
  "user",
  "users",
  "organization",
  "organizations",
  "org",
  "orgs",
  "event",
  "ticket",
  "tickets",
  "order",
  "orders",
  "payment",
  "payments",
  "payout",
  "payouts",
  "invoice",
  "invoices",
  "support",
  "help",
  "contact",
  "about",
  "terms",
  "privacy",
  "webhook",
  "webhooks",
  "billing",
  "subscription",
  // HTTP methods (unlikely but safe)
  "get",
  "post",
  "put",
  "patch",
  "delete",
];

/**
 * Validates slug format
 * - Must be 3-50 characters
 * - Lowercase letters, numbers, and hyphens only
 * - Cannot start or end with hyphen
 * - No consecutive hyphens
 */
export function validateSlugFormat(slug: string): {
  valid: boolean;
  error?: string;
} {
  if (!slug) {
    return { valid: false, error: "Slug is verplicht" };
  }

  if (slug.length < 3) {
    return { valid: false, error: "Slug moet minimaal 3 tekens zijn" };
  }

  if (slug.length > 50) {
    return { valid: false, error: "Slug mag maximaal 50 tekens zijn" };
  }

  // Must be lowercase alphanumeric + hyphens only
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      valid: false,
      error: "Slug mag alleen kleine letters, cijfers en streepjes bevatten",
    };
  }

  // Cannot start or end with hyphen
  if (slug.startsWith("-") || slug.endsWith("-")) {
    return {
      valid: false,
      error: "Slug mag niet beginnen of eindigen met een streepje",
    };
  }

  // No consecutive hyphens
  if (slug.includes("--")) {
    return {
      valid: false,
      error: "Slug mag geen opeenvolgende streepjes bevatten",
    };
  }

  return { valid: true };
}

/**
 * Checks if a slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}

/**
 * Validates slug (format + reserved check)
 */
export function validateSlug(slug: string): {
  valid: boolean;
  error?: string;
} {
  const formatValidation = validateSlugFormat(slug);
  if (!formatValidation.valid) {
    return formatValidation;
  }

  if (isReservedSlug(slug)) {
    return {
      valid: false,
      error: "Deze slug is gereserveerd en kan niet gebruikt worden",
    };
  }

  return { valid: true };
}
