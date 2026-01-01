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
      <PageHeader title="Bestellingen" />
      <OrderList organizationId={organization.id} />
    </div>
  );
}
