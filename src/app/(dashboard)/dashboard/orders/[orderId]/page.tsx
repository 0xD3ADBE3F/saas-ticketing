import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { redirect } from "next/navigation";
import { OrderDetails } from "./OrderDetails";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const organizations = await getUserOrganizations(user.id);

  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  const organization = organizations[0];
  const { orderId } = await params;

  return (
    <div>
      <OrderDetails organizationId={organization.id} orderId={orderId} />
    </div>
  );
}
