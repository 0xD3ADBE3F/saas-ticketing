import Link from "next/link";
import Image from "next/image";
import { Analytics } from "@vercel/analytics/next";
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
 * - Mobile-first approach
 * - Accessibility-first
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-pages">
      {/* Public Header - Consumer-friendly navigation */}
      <header className="public-header px-4 sm:px-6 py-4 sticky top-0 z-50 backdrop-blur-sm bg-public-card/80">
        <div className="public-container flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/logo.svg"
              alt="Entro"
              width={32}
              height={32}
              className="dark:hidden"
            />
            <Image
              src="/logo-white.png"
              alt="Entro"
              width={32}
              height={32}
              className="hidden dark:block"
            />
            <span className="text-xl font-bold text-public-foreground">
              Entro
            </span>
          </Link>

          <nav className="flex gap-3 sm:gap-4 items-center">
            <Link
              href="/events"
              className="text-sm sm:text-base text-public-muted-foreground hover:text-public-foreground transition-colors"
            >
              Evenementen
            </Link>
            <Link
              href="/auth/login"
              className="text-sm sm:text-base px-3 sm:px-4 py-2 bg-public-primary text-public-primary-foreground rounded-lg hover:bg-public-primary/90 transition-colors font-medium"
            >
              Inloggen
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content area */}
      <main className="min-h-[calc(100vh-73px)]">{children}</main>

      {/* Footer - Trust signals and legal */}
      <footer className="border-t border-public-border bg-public-muted/30 mt-16">
        <div className="public-container py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
            <div>
              <h3 className="font-semibold text-public-foreground mb-3">
                Entro
              </h3>
              <p className="text-public-muted-foreground">
                Het eerlijke ticketplatform voor Nederland. Simpel, transparant
                en betrouwbaar.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-public-foreground mb-3">
                Links
              </h3>
              <ul className="space-y-2 text-public-muted-foreground">
                <li>
                  <Link
                    href="/events"
                    className="hover:text-public-foreground transition-colors"
                  >
                    Evenementen
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/login"
                    className="hover:text-public-foreground transition-colors"
                  >
                    Inloggen
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-public-foreground mb-3">
                Juridisch
              </h3>
              <ul className="space-y-2 text-public-muted-foreground">
                <li>
                  <Link
                    href="/algemene-voorwaarden"
                    className="hover:text-public-foreground transition-colors"
                  >
                    Algemene Voorwaarden
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-public-foreground transition-colors"
                  >
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-public-border text-center text-public-muted-foreground text-sm">
            <p>
              © {new Date().getFullYear()} Entro. Alle rechten voorbehouden.
            </p>
          </div>
        </div>
      </footer>

      <Analytics />
    </div>
  );
}
