import Link from "next/link";

export default function VerifyPage() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
      <div className="mb-6">
        <span className="text-5xl">✉️</span>
      </div>
      <h1 className="text-2xl font-bold mb-4">Check je e-mail</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        We hebben een bevestigingslink naar je e-mailadres gestuurd. Klik op de
        link om je account te activeren.
      </p>
      <Link
        href="/auth/login"
        className="text-blue-600 hover:text-blue-700 text-sm"
      >
        Terug naar inloggen
      </Link>
    </div>
  );
}
