import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
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
              <span className="text-xl font-bold">Entro</span>
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Het eerlijke ticketplatform voor Nederland
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <Link
                  href="#features"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Functies
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Prijzen
                </Link>
              </li>
              <li>
                <Link
                  href="/events"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Evenementen
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Organisatoren</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <Link
                  href="/auth/register"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Account aanmaken
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/login"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Inloggen
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a
                  href="mailto:support@getentro.app"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  support@getentro.app
                </a>
              </li>
              <li>
                <a
                  href="mailto:sales@getentro.app"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  sales@getentro.app
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2025 xEntro (getentro.app). Alle rechten voorbehouden.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a
              href="#"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Voorwaarden
            </a>
            <a
              href="#"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
