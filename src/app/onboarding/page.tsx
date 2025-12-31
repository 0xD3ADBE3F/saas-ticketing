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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 sm:p-6">
      <div className="w-full max-w-lg">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-block animate-in zoom-in duration-700 delay-150">
              <span className="text-5xl sm:text-6xl mb-4 block">🎉</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Welkom bij Entro!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Laten we beginnen met het opzetten van je organisatie.{" "}
              <br className="hidden sm:inline" />
              Het duurt maar een minuutje! ✨
            </p>
          </div>

          <OnboardingForm defaultEmail={user.email || ""} />
        </div>

        <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            💡 Tip: Je kunt later altijd nog aanvullende gegevens toevoegen
          </p>
        </div>
      </div>
    </div>
  );
}
