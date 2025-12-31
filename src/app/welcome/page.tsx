import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";

export default async function WelcomePage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const organizations = await getUserOrganizations(user.id);

  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  const currentOrg = organizations[0];

  // If already completed first login, redirect to dashboard
  if (currentOrg.firstLoginCompleted) {
    redirect("/dashboard");
  }

  return <WelcomeScreen organizationId={currentOrg.id} />;
}
