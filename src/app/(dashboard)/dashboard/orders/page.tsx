import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { redirect } from "next/navigation";
import { OrderList } from "@/components/dashboard/OrderList";
import { PageHeader } from "@/components/ui/page-header";

export default async function OrdersPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const organizations = await getUserOrganizations(user.id);

  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  const organization = organizations[0];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-gray-100 dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent mb-2">
          Bestellingen
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Bekijk en beheer al je bestellingen
        </p>
      </div>
      <OrderList organizationId={organization.id} />
    </div>
  );
}
