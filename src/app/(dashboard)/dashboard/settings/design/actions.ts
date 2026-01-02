'use server';

import { revalidatePath } from 'next/cache';
import { designService } from '@/server/services/designService';
import { getUser } from '@/server/lib/supabase';
import { getUserOrganizations } from '@/server/services/organizationService';

export async function updateWebsiteUrlAction(websiteUrl: string) {
  const user = await getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    throw new Error('No organization found');
  }

  const org = organizations[0];

  await designService.updateWebsiteUrl(org.id, websiteUrl || null);

  revalidatePath('/dashboard/settings/design');
  revalidatePath('/e/[slug]', 'page'); // Revalidate public pages

  return { success: true };
}

export async function updateTicketAvailabilityAction(showTicketAvailability: boolean) {
  const user = await getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    throw new Error('No organization found');
  }

  const org = organizations[0];

  await designService.updateTicketAvailability(org.id, showTicketAvailability);

  revalidatePath('/dashboard/settings/design');
  revalidatePath('/e/[slug]', 'page');

  return { success: true };
}

export async function deleteLogoAction(logoUrl: string) {
  const user = await getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const organizations = await getUserOrganizations(user.id);
  if (organizations.length === 0) {
    throw new Error('No organization found');
  }

  const org = organizations[0];

  await designService.deleteLogo(org.id, logoUrl);

  revalidatePath('/dashboard/settings/design');
  revalidatePath('/e/[slug]', 'page');

  return { success: true };
}
