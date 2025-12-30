/**
 * Helper to check if organization has all required billing information
 * for invoice generation
 */
export function hasRequiredBillingInfo(organization: {
  kvkNumber: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  city: string | null;
  email: string | null;
}): boolean {
  return !!(
    organization.kvkNumber &&
    organization.streetAddress &&
    organization.postalCode &&
    organization.city &&
    organization.email
  );
}

export function getMissingBillingFields(organization: {
  kvkNumber: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  city: string | null;
  email: string | null;
}): string[] {
  const missing: string[] = [];

  if (!organization.email) missing.push("Contact e-mailadres");
  if (!organization.kvkNumber) missing.push("KVK-nummer");
  if (!organization.streetAddress) missing.push("Straat en huisnummer");
  if (!organization.postalCode) missing.push("Postcode");
  if (!organization.city) missing.push("Plaats");

  return missing;
}
