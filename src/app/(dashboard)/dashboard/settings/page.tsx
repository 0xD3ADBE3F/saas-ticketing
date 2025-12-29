import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { MollieConnection } from "@/components/dashboard/MollieConnection";

export default async function SettingsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const organizations = await getUserOrganizations(user.id);

  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  const currentOrg = organizations[0];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Instellingen</h1>

      <div className="space-y-6">
        {/* Mollie Connection */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="font-semibold mb-4">Betalingen</h2>
          <MollieConnection organizationId={currentOrg.id} />
        </section>

        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="font-semibold mb-4">Organisatie</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Organisatienaam
              </label>
              <input
                type="text"
                defaultValue={currentOrg.name}
                placeholder="Jouw organisatie"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Contact E-mail
              </label>
              <input
                type="email"
                defaultValue={currentOrg.email || ""}
                placeholder="contact@voorbeeld.nl"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
              />
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="font-semibold mb-4">Teamleden</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Beheer wie toegang heeft tot jouw organisatie.
          </p>
          <button className="mt-4 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            + Lid Uitnodigen
          </button>
        </section>
      </div>
    </div>
  );
}
