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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <DashboardNav
        organizationName={currentOrg.name}
        userEmail={user.email || ""}
      />
      {/* Main content with responsive padding for nav */}
      <main className="md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
