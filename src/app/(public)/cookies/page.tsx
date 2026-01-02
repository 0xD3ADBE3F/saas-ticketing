import { Metadata } from "next";
import {
  Cookie,
  Settings,
  Clock,
  Info,
  Globe,
  CheckCircle,
  XCircle,
  Database,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Cookiebeleid | Entro",
  description: "Cookiebeleid van het Entro ticketplatform",
};

export default function CookiesPage() {
  return (
    <div className="public-container py-12 md:py-16">
      {/* Header Section */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-xl">
            <Cookie className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Cookiebeleid
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Hoe wij cookies en tracking gebruiken
            </p>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-semibold mb-1">Transparantie over cookies</p>
              <p>
                Wij gebruiken alleen cookies die noodzakelijk zijn voor het
                functioneren van het platform en, met uw toestemming,
                analytische cookies om onze dienst te verbeteren.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Section 1: Wat zijn cookies */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Info className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                1. Wat zijn cookies?
              </h2>
            </div>
          </div>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Cookies zijn kleine tekstbestanden die op uw computer of mobiele
              apparaat worden geplaatst wanneer u een website bezoekt. Cookies
              worden veel gebruikt om websites te laten werken of efficiënter te
              laten werken, en om informatie te verstrekken aan de eigenaren van
              de website.
            </p>
          </div>
        </section>

        {/* Section 2: Welke cookies */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            2. Welke cookies gebruiken wij?
          </h2>
          <div className="space-y-6">
            {/* Functionele cookies */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Functionele cookies
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Altijd actief
                  </p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Deze cookies zijn noodzakelijk om het platform te laten werken
                en kunnen niet worden uitgeschakeld in onze systemen.
              </p>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <strong className="text-sm text-gray-900 dark:text-white block mb-1">
                    Sessiecookies
                  </strong>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Sessie onderhouden tijdens afrekenen
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <strong className="text-sm text-gray-900 dark:text-white block mb-1">
                    Authenticatie
                  </strong>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Ingelogd blijven (organisatoren)
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <strong className="text-sm text-gray-900 dark:text-white block mb-1">
                    Beveiliging
                  </strong>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    CSRF-bescherming & fraudedetectie
                  </p>
                </div>
              </div>
            </div>

            {/* Analytische cookies */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Analytische cookies
                  </h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Met uw toestemming
                  </p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Deze cookies helpen ons te begrijpen hoe bezoekers interageren
                met de website door informatie anoniem te verzamelen.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                <li>Paginaweergaven en navigatiepatronen</li>
                <li>Apparaattype en browserinformatie</li>
                <li>Laadtijden en technische prestaties</li>
              </ul>
            </div>

            {/* Third-party cookies */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Cookies van derde partijen
                  </h3>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Sommige cookies worden geplaatst door diensten van derden:
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <strong className="text-sm text-gray-900 dark:text-white block mb-1">
                    Mollie
                  </strong>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Betalingsverwerking en fraudedetectie
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <strong className="text-sm text-gray-900 dark:text-white block mb-1">
                    Supabase
                  </strong>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Authenticatie en database-functionaliteit
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                Deze partijen hebben hun eigen privacyverklaringen. Wij hebben
                geen controle over deze cookies.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Cookie duration */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Clock className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                3. Hoe lang blijven cookies bewaard?
              </h2>
            </div>
          </div>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <strong className="text-gray-900 dark:text-white block mb-2">
                  Sessiecookies
                </strong>
                <p className="text-sm">Verwijderd wanneer u uw browser sluit</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <strong className="text-gray-900 dark:text-white block mb-2">
                  Blijvende cookies
                </strong>
                <p className="text-sm">Tot ze verlopen of u ze verwijdert</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <strong className="text-gray-900 dark:text-white block mb-2">
                  Authenticatiecookies
                </strong>
                <p className="text-sm">Maximaal 30 dagen</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <strong className="text-gray-900 dark:text-white block mb-2">
                  Analytische cookies
                </strong>
                <p className="text-sm">Maximaal 13 maanden</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Beheren */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                4. Cookies beheren en verwijderen
              </h2>
            </div>
          </div>
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              U kunt cookies op elk moment beheren of verwijderen. De meeste
              browsers accepteren automatisch cookies, maar u kunt uw
              browserinstellingen meestal aanpassen om cookies te weigeren als u
              dat liever heeft.
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">
                    Let op
                  </p>
                  <p className="text-sm">
                    Als u cookies uitschakelt, werken sommige delen van het
                    platform mogelijk niet correct. Met name het afrekenproces
                    vereist functionele cookies om te kunnen werken.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-3">
                Cookies verwijderen in populaire browsers:
              </p>
              <div className="space-y-2 pl-4">
                <div className="flex items-start gap-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <strong className="text-gray-900 dark:text-white min-w-[80px]">
                    Chrome:
                  </strong>
                  <p className="text-sm">
                    Instellingen → Privacy en beveiliging → Cookies en andere
                    sitegegevens
                  </p>
                </div>
                <div className="flex items-start gap-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <strong className="text-gray-900 dark:text-white min-w-[80px]">
                    Firefox:
                  </strong>
                  <p className="text-sm">
                    Instellingen → Privacy en beveiliging → Cookies en
                    sitegegevens
                  </p>
                </div>
                <div className="flex items-start gap-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <strong className="text-gray-900 dark:text-white min-w-[80px]">
                    Safari:
                  </strong>
                  <p className="text-sm">
                    Voorkeuren → Privacy → Websitegegevens beheren
                  </p>
                </div>
                <div className="flex items-start gap-3 py-2">
                  <strong className="text-gray-900 dark:text-white min-w-[80px]">
                    Edge:
                  </strong>
                  <p className="text-sm">
                    Instellingen → Cookies en sitetoestemmingen
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Remaining sections */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            5. Uw cookievoorkeuren wijzigen
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              U kunt uw cookievoorkeuren op elk moment wijzigen. Bij uw eerste
              bezoek aan het platform krijgt u een cookiebanner te zien waarin u
              uw voorkeuren kunt instellen.
            </p>
            <p>
              Let op: functionele cookies kunnen niet worden uitgeschakeld omdat
              ze noodzakelijk zijn voor het correct functioneren van het
              platform.
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Database className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                6. Local Storage en Session Storage
              </h2>
            </div>
          </div>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Naast cookies gebruikt het platform ook Local Storage en Session
              Storage voor het tijdelijk opslaan van niet-gevoelige gegevens
              zoals:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Uw winkelwagen tijdens het afrekenproces</li>
              <li>UI-voorkeuren (bijvoorbeeld taalinstelling)</li>
              <li>
                Tijdelijke formuliergegevens om gegevensverlies te voorkomen
              </li>
            </ul>
            <p className="mt-3">
              Deze gegevens blijven alleen lokaal op uw apparaat en worden niet
              naar onze servers verzonden, tenzij u een actie uitvoert (zoals
              een bestelling plaatsen).
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            7. Updates van dit cookiebeleid
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Wij kunnen dit cookiebeleid van tijd tot tijd bijwerken om
              wijzigingen in onze praktijken of om andere operationele,
              juridische of regelgevende redenen weer te geven.
            </p>
            <p>
              Wij raden u aan deze pagina regelmatig te raadplegen voor de meest
              recente informatie over ons gebruik van cookies.
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            8. Contact
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Als u vragen heeft over ons gebruik van cookies of andere
              trackingtechnologieën, neem dan contact met ons op via het
              platform.
            </p>
            <p>
              Voor meer informatie over hoe wij omgaan met uw persoonsgegevens,
              raadpleeg dan onze{" "}
              <a
                href="/privacy"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Privacyverklaring
              </a>
              .
            </p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <p>Laatst bijgewerkt: 2 januari 2026</p>
          <div className="flex items-center gap-4">
            <a
              href="/terms"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Gebruiksvoorwaarden
            </a>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <a
              href="/privacy"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Privacybeleid
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
