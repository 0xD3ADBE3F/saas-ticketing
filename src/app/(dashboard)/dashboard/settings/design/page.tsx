import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { organizationRepo } from "@/server/repos/organizationRepo";
import { DesignSettingsForm } from "@/components/dashboard/design-settings-form";

export const metadata = {
  title: "Ontwerp - Instellingen",
  description: "Pas het uiterlijk van je ticketportaal aan",
};

export default async function DesignSettingsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const organizations = await getUserOrganizations(user.id);

  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  const org = organizations[0];
  const settings = await organizationRepo.getDesignSettings(org.id);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Ontwerp</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Pas het uiterlijk van je ticketbestelportaal aan
        </p>
      </div>

      <DesignSettingsForm
        initialLogoUrl={settings?.logoUrl ?? null}
        initialWebsiteUrl={settings?.websiteUrl ?? null}
        initialShowTicketAvailability={settings?.showTicketAvailability ?? true}
      />
    </div>
  );
}
