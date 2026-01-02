import Link from "next/link";
import Image from "next/image";
import { Analytics } from "@vercel/analytics/next";
import { Shield, Smartphone, Mail } from "lucide-react";
import "./public.css";

/**
 * Public Layout - Consumer-facing pages
 *
 * This layout wraps all public-facing pages (events, checkout, order portal).
 * It uses an isolated design system defined in public.css to maintain
 * a distinct visual identity from the dashboard/admin areas.
 *
 * Design principles:
 * - Consumer-friendly and welcoming
 * - High conversion optimization
 * - Mobile-first approach (48px+ touch targets)
 * - Accessibility-first (WCAG 2.1 AA)
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-pages">
      {/* Public Header - Mobile-optimized navigation */}
      <header className="public-header sticky top-0 z-50">
        <div className="public-container flex justify-between items-center py-4">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
            aria-label="Ga naar homepage"
          >
            <Image
              src="/logo.svg"
              alt=""
              width={180}
              height={36}
              className="dark:hidden"
            />
            <Image
              src="/logo-white.png"
              alt=""
              width={180}
              height={36}
              className="hidden dark:block"
            />
          </Link>

          <nav
            className="flex gap-2 sm:gap-3 items-center"
            aria-label="Hoofdnavigatie"
          >
            <Link
              href="/events"
              className="public-btn public-btn-ghost public-btn-sm hidden sm:inline-flex"
            >
              Alle evenementen
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content area */}
      <main className="min-h-[calc(100vh-theme(spacing.20))]">{children}</main>

      {/* Footer - Enhanced with trust signals */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 mt-16">
        {/* Trust Signals Bar */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="public-container py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    Veilig Betalen
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    SSL beveiligd met iDEAL
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    Direct Digitaal
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Tickets per email & app
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    24/7 Support
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Altijd bereikbaar
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Content */}
        <div className="public-container py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* About */}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                Over Entro
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Het eerlijke ticketplatform voor Nederland. Simpel, transparant
                en betrouwbaar ticketverkoop voor organisatoren.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                Voor Bezoekers
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/events"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Evenementen
                  </Link>
                </li>
                <li>
                  <Link
                    href="/hoe-werkt-het"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Hoe werkt het?
                  </Link>
                </li>
                <li>
                  <Link
                    href="/veelgestelde-vragen"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Veelgestelde vragen
                  </Link>
                </li>
              </ul>
            </div>

            {/* Organizers */}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                Voor Organisatoren
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/auth/login"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Inloggen
                  </Link>
                </li>
                <li>
                  <Link
                    href="/prijzen"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Prijzen
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                Juridisch
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Algemene voorwaarden
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Privacybeleid
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cookies"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Cookiebeleid
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                © {new Date().getFullYear()} Entro. Alle rechten voorbehouden.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>
                  Gemaakt met ❤️ door{" "}
                  <a
                    href="https://www.stormzaak.nl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Stormzaak
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <Analytics />
    </div>
  );
}
