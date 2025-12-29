import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const organizations = await getUserOrganizations(user.id);

  // If no organizations, redirect to onboarding
  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  // For now, use the first organization
  // TODO: Add organization switcher
  const currentOrg = organizations[0];

  return (
    <div className="min-h-screen flex">
      <DashboardNav
        organizationName={currentOrg.name}
        userEmail={user.email || ""}
      />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
