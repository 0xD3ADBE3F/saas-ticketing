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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/10 dark:to-purple-950/10">
      <DashboardNav
        organizationName={currentOrg.name}
        userEmail={user.email || ""}
      />
      {/* Main content with responsive padding for nav */}
      <main className="md:ml-64 pt-20 md:pt-0 pb-24 md:pb-0 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
