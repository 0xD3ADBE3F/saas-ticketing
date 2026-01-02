import { ReactNode } from "react";

interface PublicHeroProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  size?: "default" | "large";
  gradient?: "default" | "success" | "warm";
}

const gradients = {
  default:
    "from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-500 dark:via-indigo-500 dark:to-purple-500",
  success:
    "from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-500 dark:via-teal-500 dark:to-cyan-500",
  warm: "from-orange-600 via-red-600 to-pink-600 dark:from-orange-500 dark:via-red-500 dark:to-pink-500",
};

export function PublicHero({
  title,
  subtitle,
  children,
  size = "default",
  gradient = "default",
}: PublicHeroProps) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${gradients[gradient]} text-white`}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.12)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/8 dark:bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/8 dark:bg-white/5 rounded-full blur-3xl" />

      {/* Content */}
      <div
        className={`relative public-container ${
          size === "large" ? "py-16 md:py-24" : "py-12 md:py-16"
        }`}
      >
        <div className="max-w-4xl animate-fade-in-up">
          <h1
            className={`font-bold leading-tight mb-4 ${
              size === "large" ? "text-4xl md:text-6xl" : "text-3xl md:text-5xl"
            }`}
          >
            {title}
          </h1>

          {subtitle && (
            <p
              className={`text-white/90 mb-8 ${
                size === "large" ? "text-xl md:text-2xl" : "text-lg md:text-xl"
              }`}
            >
              {subtitle}
            </p>
          )}

          {children && <div className="mt-8">{children}</div>}
        </div>
      </div>
    </div>
  );
}
