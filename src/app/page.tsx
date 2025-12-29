import Link from "next/link";

// Icon components
function TicketIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"
      />
    </svg>
  );
}

function QrCodeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
      />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function DevicePhoneMobileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
      />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <TicketIcon className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold">Entro</span>
            </div>
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
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-8">
              <BoltIcon className="w-4 h-4" />
              <span>Entro - Het eerlijke ticketplatform voor Nederland</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Tickets verkopen
              <span className="text-blue-600"> zonder gedoe</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
              Verkoop tickets zonder gedoe. Lage kosten per verkocht ticket,
              geen maandelijkse fees. Simpel, transparant en volledig gericht op
              de Nederlandse markt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30"
              >
                Start gratis als organisator
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Bekijk evenementen
              </Link>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-950 to-transparent z-10 pointer-events-none h-32 bottom-0 top-auto" />
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-w-5xl mx-auto">
              <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center text-sm text-gray-500 dark:text-gray-400">
                  dashboard.getentro.app
                </div>
              </div>
              <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Totale verkoop
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      €12.450
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      +23% deze maand
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Tickets verkocht
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      847
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      van 1.000 beschikbaar
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Gescand vandaag
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      234
                    </div>
                    <div className="text-sm text-blue-600 mt-1">
                      Live tracking
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-4">Alles wat je nodig hebt</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Een compleet platform voor ticketverkoop, zonder de complexiteit
              van grote systemen.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-6">
                <CreditCardIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">iDEAL Betalingen</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Directe betalingen via iDEAL, de meest gebruikte betaalmethode
                in Nederland. Veilig en vertrouwd.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-6">
                <QrCodeIcon className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">QR-code Scanning</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Scan tickets met je smartphone. Werkt ook offline - perfect voor
                locaties zonder bereik.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-6">
                <ChartIcon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Live Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Volg je verkoop in real-time. Zie wie er binnenkomt en
                optimaliseer je evenementen.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-6">
                <ShieldIcon className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Fraudepreventie</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Cryptografisch beveiligde QR-codes. Elk ticket is uniek en kan
                niet worden gekopieerd.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center mb-6">
                <DevicePhoneMobileIcon className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Mobiel Eerst</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Geoptimaliseerd voor smartphones. Je bezoekers kopen tickets in
                seconden.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center mb-6">
                <UsersIcon className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Multi-tenant</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Beheer meerdere organisaties vanuit één account. Perfect voor
                evenementenbureaus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Organisers Section */}
      <section
        id="organisers"
        className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-6">
                Voor Organisatoren
              </div>
              <h2 className="text-4xl font-bold mb-6">
                Verkoop tickets, niet je ziel
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                Geen verborgen kosten, geen lange contracten, geen gedoe. Begin
                vandaag nog met verkopen en betaal alleen voor wat je gebruikt.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Lage kosten per ticket</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Slechts 2% per verkocht ticket. Geen maandelijkse kosten
                      of verborgen fees.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Binnen 5 minuten live</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Maak je evenement aan, stel tickets in, en begin met
                      verkopen. Zo simpel is het.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      Uitbetalingen naar je eigen rekening
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Directe uitbetalingen via Mollie. Jouw geld op jouw
                      Nederlandse bankrekening.
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all"
              >
                Maak gratis account aan
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-lg">
                  Nieuw evenement aanmaken
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Evenement naam
                  </label>
                  <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                    Zomerfestival 2025
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Datum
                    </label>
                    <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                      15 juli 2025
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tijd
                    </label>
                    <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                      14:00
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Locatie
                  </label>
                  <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                    Vondelpark, Amsterdam
                  </div>
                </div>
                <div className="pt-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                      <div className="font-medium">Early Bird Ticket</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        100 beschikbaar
                      </div>
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      €25,00
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Attendees Section */}
      <section id="attendees" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <TicketIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold">Jouw Ticket</div>
                    <div className="text-white/70 text-sm">
                      Zomerfestival 2025
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 mb-6">
                  <div className="aspect-square max-w-[200px] mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <QrCodeIcon className="w-32 h-32 text-gray-800" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-white/70 text-sm">Datum</div>
                    <div className="font-semibold">15 juli 2025</div>
                  </div>
                  <div>
                    <div className="text-white/70 text-sm">Tijd</div>
                    <div className="font-semibold">14:00</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium mb-6">
                Voor Bezoekers
              </div>
              <h2 className="text-4xl font-bold mb-6">
                Tickets kopen in seconden
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                Ontdek evenementen bij jou in de buurt en koop tickets met
                iDEAL. Je tickets staan direct op je telefoon.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckIcon className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Geen account nodig</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Koop tickets zonder registratie. Je ontvangt ze direct per
                      e-mail.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckIcon className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Betaal met iDEAL</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Veilig en vertrouwd betalen via je eigen bank.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckIcon className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Digitale tickets</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Je ticket als QR-code op je telefoon. Geen gedoe met
                      printen.
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all"
              >
                Bekijk evenementen
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-4">Hoe het werkt</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Van aanmaken tot scannen in drie simpele stappen
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Maak je evenement aan
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Vul de details in, stel je tickettypes in met prijzen en
                capaciteit.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Deel je evenement</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Deel de link via social media, je website of e-mail. Bezoekers
                kunnen direct kopen.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Scan bij de deur</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Gebruik je smartphone om QR-codes te scannen. Ook zonder
                internet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-4">Eerlijke prijzen</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Geen maandelijkse kosten, geen verrassingen. Je betaalt alleen
              wanneer je verkoopt.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-blue-600 shadow-xl overflow-hidden">
              <div className="bg-blue-600 text-white text-center py-2 text-sm font-medium">
                Meest gekozen
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2">Pay as you go</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Perfect voor organisaties van elke grootte
                </p>

                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-5xl font-bold">2%</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    per verkocht ticket
                  </span>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckIcon className="w-5 h-5 text-green-600" />
                    <span>Onbeperkt evenementen</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckIcon className="w-5 h-5 text-green-600" />
                    <span>Onbeperkt tickets verkopen</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckIcon className="w-5 h-5 text-green-600" />
                    <span>QR-code scanning (ook offline)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckIcon className="w-5 h-5 text-green-600" />
                    <span>Real-time analytics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckIcon className="w-5 h-5 text-green-600" />
                    <span>iDEAL betalingen</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckIcon className="w-5 h-5 text-green-600" />
                    <span>E-mail ondersteuning</span>
                  </div>
                </div>

                <Link
                  href="/auth/register"
                  className="block w-full py-4 bg-blue-600 text-white text-center font-semibold rounded-xl hover:bg-blue-700 transition-all"
                >
                  Start gratis
                </Link>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Servicekosten (€0,99 per bestelling) worden betaald door de
                  koper
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Grotere volumes? We bieden aangepaste tarieven voor grote
              organisaties.
            </p>
            <a
              href="mailto:sales@getentro.app"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Neem contact op →
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Veelgestelde vragen</h2>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-lg mb-2">
                Wat zijn de kosten voor bezoekers?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Bezoekers betalen €0,99 servicekosten per bestelling (niet per
                ticket). Dit is transparant en wordt getoond voor de betaling.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-lg mb-2">
                Wanneer krijg ik mijn geld?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Uitbetalingen gebeuren automatisch via Mollie. Je kunt kiezen
                voor directe uitbetaling of na afloop van je evenement.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-lg mb-2">
                Kan ik gratis evenementen organiseren?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Ja! Voor gratis evenementen betaal je helemaal niets. De 2%
                platformkosten gelden alleen over de ticketprijs.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-lg mb-2">
                Werkt het scannen ook zonder internet?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Ja, onze scanner app werkt offline. Scans worden opgeslagen en
                gesynchroniseerd zodra je weer verbinding hebt.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-lg mb-2">
                Kan ik tickets refunden?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Ja, je kunt tickets eenvoudig refunden via het dashboard. Het
                geld wordt automatisch teruggestort naar de koper.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Klaar om te beginnen?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-10">
            Maak vandaag nog je eerste evenement aan. Geen creditcard nodig,
            geen verplichtingen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25"
            >
              Start gratis als organisator
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Bekijk evenementen
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TicketIcon className="w-6 h-6 text-blue-600" />
                <span className="text-lg font-bold">Entro</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Het eerlijke ticketplatform voor kleine organisaties in
                Nederland.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <a
                    href="#features"
                    className="hover:text-gray-900 dark:hover:text-white"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="hover:text-gray-900 dark:hover:text-white"
                  >
                    Prijzen
                  </a>
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
              © 2025 Entro (getentro.app). Alle rechten voorbehouden.
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
    </div>
  );
}
