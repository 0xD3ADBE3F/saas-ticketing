import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
      <div className="mb-6">
        <span className="text-5xl">❌</span>
      </div>
      <h1 className="text-2xl font-bold mb-4">Er is iets misgegaan</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        De verificatielink is ongeldig of verlopen. Probeer opnieuw in te loggen
        of vraag een nieuwe verificatiemail aan.
      </p>
      <Link
        href="/auth/login"
        className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Naar inloggen
      </Link>
    </div>
  );
}
