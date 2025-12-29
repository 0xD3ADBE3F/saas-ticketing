import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { redirect } from "next/navigation";
import { SettlementsView } from "./SettlementsView";

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
      <h1 className="text-2xl font-bold mb-6">Uitbetalingen</h1>

      {!isMollieConnected ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Om uitbetalingen te ontvangen moet je eerst Mollie koppelen.
          </p>
          <a
            href="/dashboard/settings"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Naar instellingen
          </a>
        </div>
      ) : (
        <SettlementsView organizationId={organization.id} />
      )}
    </div>
  );
}
