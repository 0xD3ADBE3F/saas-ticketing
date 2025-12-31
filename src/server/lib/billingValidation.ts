/**
 * Helper to check if organization has all required billing information
 * for invoice generation
 */
export function hasRequiredBillingInfo(organization: {
  registrationNumber: string | null;
  streetAndNumber: string | null;
  postalCode: string | null;
  city: string | null;
  email: string | null;
}): boolean {
  return !!(
    organization.registrationNumber &&
    organization.streetAndNumber &&
    organization.postalCode &&
    organization.city &&
    organization.email
  );
}

export function getMissingBillingFields(organization: {
  registrationNumber: string | null;
  streetAndNumber: string | null;
  postalCode: string | null;
  city: string | null;
  email: string | null;
}): string[] {
  const missing: string[] = [];

  if (!organization.email) missing.push("Contact e-mailadres");
  if (!organization.registrationNumber) missing.push("KVK-nummer");
  if (!organization.streetAndNumber) missing.push("Straat en huisnummer");
  if (!organization.postalCode) missing.push("Postcode");
  if (!organization.city) missing.push("Plaats");

  return missing;
}
