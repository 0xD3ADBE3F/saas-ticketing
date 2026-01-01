import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { MollieConnection } from "@/components/dashboard/MollieConnection";
import { OrganizationForm } from "@/components/dashboard/OrganizationForm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-6">
      {/* Mollie Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Betalingen</CardTitle>
        </CardHeader>
        <CardContent>
          <MollieConnection organizationId={currentOrg.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Algemeen</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Deze gegevens zijn verplicht voor facturering en worden gebruikt op
            facturen.
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teamleden</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Beheer wie toegang heeft tot jouw organisatie.
          </p>
          <Button variant="outline">+ Lid Uitnodigen</Button>
        </CardContent>
      </Card>
    </div>
  );
}
