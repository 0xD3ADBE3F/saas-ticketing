import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { redirect } from "next/navigation";
import { SettlementsView } from "./SettlementsView";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Wallet } from "lucide-react";

export default async function PayoutsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const organizations = await getUserOrganizations(user.id);

  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  const organization = organizations[0];
  const isMollieConnected = organization.mollieOnboardingStatus === "COMPLETED";

  return (
    <div>
      <PageHeader title="Uitbetalingen" />

      {!isMollieConnected ? (
        <EmptyState
          icon={Wallet}
          title="Mollie koppeling vereist"
          description="Om uitbetalingen te ontvangen moet je eerst Mollie koppelen."
          action={{
            label: "Naar instellingen",
            href: "/dashboard/settings",
          }}
        />
      ) : (
        <SettlementsView organizationId={organization.id} />
      )}
    </div>
  );
}
