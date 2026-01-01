import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { MollieConnection } from "@/components/dashboard/MollieConnection";
import { OrganizationForm } from "@/components/dashboard/OrganizationForm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Building2, Users } from "lucide-react";

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
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-pink-900 dark:from-gray-100 dark:via-purple-100 dark:to-pink-100 bg-clip-text text-transparent mb-2">
          Instellingen
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Beheer je organisatie, betalingen en teamleden
        </p>
      </div>

      <div className="space-y-6">
        {/* Mollie Connection */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Betalingen
              </h2>
            </div>
          </div>
          <div className="p-6">
            <MollieConnection organizationId={currentOrg.id} />
          </div>
        </div>

        {/* Organization Form */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Algemeen
              </h2>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Deze gegevens zijn verplicht voor facturering en worden gebruikt
              op facturen.
            </p>
            <OrganizationForm
              organization={{
                id: currentOrg.id,
                name: currentOrg.name,
                email: currentOrg.email,
                firstName: currentOrg.firstName,
                lastName: currentOrg.lastName,
                streetAndNumber: currentOrg.streetAndNumber,
                postalCode: currentOrg.postalCode,
                city: currentOrg.city,
                country: currentOrg.country,
                registrationNumber: currentOrg.registrationNumber,
                vatNumber: currentOrg.vatNumber,
              }}
            />
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Teamleden
              </h2>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-relaxed">
              Beheer wie toegang heeft tot jouw organisatie.
            </p>
            <Button variant="outline" className="font-semibold">
              + Lid Uitnodigen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
