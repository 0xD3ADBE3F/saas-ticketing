import Link from "next/link";
import Image from "next/image";
import { clientEnv } from "@/lib/env";

export function Header() {
  const isLive = clientEnv.NEXT_PUBLIC_IS_LIVE;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/logo.png"
              alt="Entro"
              width={150}
              height={32}
              className="dark:hidden"
            />
            <Image
              src="/logo-white.png"
              alt="Entro"
              width={150}
              height={32}
              className="hidden dark:block"
            />
          </Link>
          {isLive ? (
            <>
              <div className="hidden md:flex items-center gap-8">
                <a
                  href="#features"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Features
                </a>
                <a
                  href="#organisers"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Voor Organisatoren
                </a>
                <a
                  href="#attendees"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Voor Bezoekers
                </a>
                <a
                  href="#pricing"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Prijzen
                </a>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="/auth/login"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Inloggen
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Gratis
                </Link>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full">
                🚀 Binnenkort live
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
