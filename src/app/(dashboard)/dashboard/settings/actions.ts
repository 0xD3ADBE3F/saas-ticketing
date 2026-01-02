"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/server/lib/supabase";
import { organizationRepo } from "@/server/repos/organizationRepo";
import { getUserOrganizations, canChangeSlug } from "@/server/services/organizationService";
import { validateSlug } from "@/server/lib/slugValidation";

export interface UpdateOrganizationData {
  name?: string;
  slug?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  streetAndNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  registrationNumber?: string;
  vatNumber?: string;
}

export async function updateOrganization(data: UpdateOrganizationData) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get user's organizations
    const organizations = await getUserOrganizations(user.id);
    if (organizations.length === 0) {
      return { success: false, error: "No organization found" };
    }

    const currentOrg = organizations[0];

    // Validate and handle slug update
    if (data.slug && data.slug !== currentOrg.slug) {
      // Validate slug format and reserved words
      const slugValidation = validateSlug(data.slug);
      if (!slugValidation.valid) {
        return {
          success: false,
          error: slugValidation.error || "Ongeldige slug",
        };
      }

      // Check if slug can be changed
      const changeCheck = await canChangeSlug(currentOrg.id);
      if (!changeCheck.allowed) {
        return {
          success: false,
          error: changeCheck.reason || "Slug kan niet gewijzigd worden",
        };
      }

      // Check availability
      const isAvailable = await organizationRepo.isSlugAvailable(data.slug);
      if (!isAvailable) {
        return {
          success: false,
          error: "Deze slug is al in gebruik",
        };
      }
    }

    // Validate postal code format (Dutch: 1234AB)
    if (data.postalCode && !/^\d{4}\s?[A-Z]{2}$/i.test(data.postalCode)) {
      return {
        success: false,
        error: "Postcode moet het formaat 1234AB hebben",
      };
    }

    // Update organization
    await organizationRepo.update(currentOrg.id, user.id, {
      name: data.name,
      slug: data.slug,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      streetAndNumber: data.streetAndNumber,
      postalCode: data.postalCode?.toUpperCase(), // Normalize to uppercase
      city: data.city,
      country: data.country,
      registrationNumber: data.registrationNumber,
      vatNumber: data.vatNumber,
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update organization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Er is een fout opgetreden",
    };
  }
}
