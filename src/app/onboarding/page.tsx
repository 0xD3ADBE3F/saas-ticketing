import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user already has an organization
  const organizations = await getUserOrganizations(user.id);
  if (organizations.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8">
          <div className="text-center mb-8">
            <span className="text-4xl mb-4 block">🎉</span>
            <h1 className="text-2xl font-bold">Welkom!</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Maak je eerste organisatie aan om te beginnen met het verkopen van
              tickets.
            </p>
          </div>

          <OnboardingForm />
        </div>
      </div>
    </div>
  );
}
