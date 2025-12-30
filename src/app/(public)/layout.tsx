import Link from "next/link";
import Image from "next/image";
import { Analytics } from "@vercel/analytics/next";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
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
          <nav className="flex gap-4">
            <Link
              href="/events"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Evenementen
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Organisator Login
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <Analytics />
    </div>
  );
}
