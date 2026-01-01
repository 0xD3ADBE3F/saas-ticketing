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
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-green-900 to-emerald-900 dark:from-gray-100 dark:via-green-100 dark:to-emerald-100 bg-clip-text text-transparent mb-2">
          Uitbetalingen
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Bekijk je saldo en uitbetalingshistorie
        </p>
      </div>

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
