"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/server/lib/supabase";
import { organizationRepo } from "@/server/repos/organizationRepo";
import { getUserOrganizations } from "@/server/services/organizationService";

export interface UpdateOrganizationData {
  name?: string;
  email?: string;
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
      email: data.email,
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
