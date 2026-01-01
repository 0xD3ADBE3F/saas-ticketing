import { redirect } from "next/navigation";
import { Sparkles, Lightbulb } from "lucide-react";
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
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-xl border-2 border-gray-200/50 dark:border-gray-800/50 p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4 animate-in zoom-in duration-700 delay-150">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Welkom bij Entro!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Laten we beginnen met het opzetten van je organisatie.{" "}
              <br className="hidden sm:inline" />
              Het duurt maar een minuutje!
            </p>
          </div>

          <OnboardingForm defaultEmail={user.email || ""} />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tip: Je kunt later altijd nog aanvullende gegevens toevoegen
          </p>
        </div>
      </div>
    </div>
  );
}
