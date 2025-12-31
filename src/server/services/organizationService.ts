import { organizationRepo, membershipRepo } from "@/server/repos/organizationRepo";
import type { Organization, Role } from "@/generated/prisma";

export type CreateOrganizationResult =
  | { success: true; organization: Organization }
  | { success: false; error: string };

/**
 * Create a new organization for a user
 */
export async function createOrganization(
  userId: string,
  name: string,
  slug: string,
  email?: string,
  additionalData?: {
    firstName?: string;
    lastName?: string;
    streetAndNumber?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    registrationNumber?: string;
    vatNumber?: string;
  }
): Promise<CreateOrganizationResult> {
  // Validate slug format
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return {
      success: false,
      error: "Slug mag alleen kleine letters, cijfers en streepjes bevatten",
    };
  }

  // Check slug availability
  const isAvailable = await organizationRepo.isSlugAvailable(slug);
  if (!isAvailable) {
    return {
      success: false,
      error: "Deze slug is al in gebruik",
    };
  }

  try {
    const organization = await organizationRepo.create(
      { name, slug, email, ...additionalData },
      userId
    );
    return { success: true, organization };
  } catch (error) {
    console.error("Failed to create organization:", error);
    return {
      success: false,
      error: "Er is iets misgegaan bij het aanmaken van de organisatie",
    };
  }
}

/**
 * Get all organizations for the current user
 */
export async function getUserOrganizations(
  userId: string
): Promise<Organization[]> {
  return organizationRepo.findByUser(userId);
}

/**
 * Get organization by ID (with membership check)
 */
export async function getOrganization(
  organizationId: string,
  userId: string
): Promise<Organization | null> {
  return organizationRepo.findById(organizationId, userId);
}

/**
 * Get user's role in an organization
 */
export async function getUserRole(
  organizationId: string,
  userId: string
): Promise<Role | null> {
  return membershipRepo.getRole(organizationId, userId);
}

/**
 * Check if user has required role or higher
 */
export async function hasRole(
  organizationId: string,
  userId: string,
  requiredRole: Role
): Promise<boolean> {
  const role = await membershipRepo.getRole(organizationId, userId);
  if (!role) return false;

  const roleHierarchy: Record<Role, number> = {
    ADMIN: 4,
    FINANCE: 3,
    MEMBER: 2,
    SCANNER: 1,
  };

  return roleHierarchy[role] >= roleHierarchy[requiredRole];
}

/**
 * Require user to have a role (throws if not)
 */
export async function requireRole(
  organizationId: string,
  userId: string,
  requiredRole: Role
): Promise<void> {
  const hasRequiredRole = await hasRole(organizationId, userId, requiredRole);
  if (!hasRequiredRole) {
    throw new Error("Insufficient permissions");
  }
}
