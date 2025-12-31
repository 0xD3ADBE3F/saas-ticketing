"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function WelcomeScreen({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Hide confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  async function handleCreateEvent() {
    // Mark first login as completed
    await fetch(`/api/organizations/${organizationId}/onboarding/complete`, {
      method: "POST",
    });

    router.push("/dashboard/events/new?onboarding=true");
  }

  async function handleSkip() {
    // Mark first login as completed
    await fetch(`/api/organizations/${organizationId}/onboarding/complete`, {
      method: "POST",
    });

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      {showConfetti && <ConfettiAnimation />}

      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-xl">
          {/* Icon/Emoji */}
          <div className="text-7xl mb-6 animate-bounce">🎉</div>

          {/* Headline */}
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Welkom bij Entro
          </h1>

          {/* Subtext */}
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-lg mx-auto">
            Je bent één stap verwijderd van het verkopen van tickets. Laten we
            beginnen met je eerste evenement.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleCreateEvent}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
            >
              ➕ Maak je eerste evenement
            </button>

            <button
              onClick={handleSkip}
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-lg font-medium rounded-xl border-2 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all"
            >
              Ik doe dit later
            </button>
          </div>

          {/* Features preview */}
          <div className="grid md:grid-cols-3 gap-6 mt-16 pt-12 border-t border-gray-200 dark:border-gray-700">
            <FeatureCard
              icon="🎫"
              title="Tickets verkopen"
              description="Online ticketverkoop binnen minuten"
            />
            <FeatureCard
              icon="💳"
              title="Betaling ontvangen"
              description="Direct naar jouw bankrekening"
            />
            <FeatureCard
              icon="📱"
              title="Scannen bij de deur"
              description="Online en offline scanning"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

function ConfettiAnimation() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: "-10px",
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: [
                "#60A5FA",
                "#818CF8",
                "#F472B6",
                "#FBBF24",
                "#34D399",
              ][Math.floor(Math.random() * 5)],
            }}
          />
        </div>
      ))}

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}
