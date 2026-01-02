import { Metadata } from "next";
import {
  Shield,
  Lock,
  Eye,
  UserCheck,
  Database,
  FileCheck,
  Mail,
  AlertTriangle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacyverklaring | Entro",
  description: "Privacyverklaring van het Entro ticketplatform",
};

export default function PrivacyPage() {
  return (
    <div className="public-container py-12 md:py-16">
      {/* Header Section */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-xl">
            <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Privacyverklaring
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Hoe wij omgaan met uw persoonsgegevens
            </p>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-xl p-4 mt-6">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-semibold mb-1">Uw privacy is belangrijk</p>
              <p>
                Wij verzamelen alleen de gegevens die noodzakelijk zijn voor het
                leveren van tickets en bewaren deze niet langer dan nodig.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Section 1: Inleiding */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Eye className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                1. Inleiding
              </h2>
            </div>
          </div>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Entro hecht veel waarde aan de bescherming van uw
              persoonsgegevens. In deze privacyverklaring leggen wij uit welke
              persoonsgegevens wij verzamelen, waarom we deze verzamelen en hoe
              we deze gebruiken.
            </p>
            <p>
              Deze privacyverklaring is van toepassing op het gebruik van het
              Entro platform door ticketkopers (Gebruikers).
            </p>
          </div>
        </section>

        {/* Section 2: Verwerkingsverantwoordelijke */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <UserCheck className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                2. Verwerkingsverantwoordelijke
              </h2>
            </div>
          </div>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Voor de verwerking van persoonsgegevens in het kader van
              ticketaankopen is de Evenementenorganisator de
              verwerkingsverantwoordelijke.
            </p>
            <p>
              Entro verwerkt persoonsgegevens uitsluitend als verwerker ten
              behoeve van de technische facilitering van het platform.
            </p>
          </div>
        </section>

        {/* Section 3: Welke gegevens */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Database className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                3. Welke gegevens verzamelen we?
              </h2>
            </div>
          </div>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Wanneer u tickets aanschaft via het Entro platform, verzamelen wij
              de volgende gegevens:
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <strong className="text-gray-900 dark:text-white">
                    Contactgegevens
                  </strong>
                </div>
                <p className="text-sm">E-mailadres, optioneel naam</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <strong className="text-gray-900 dark:text-white">
                    Bestelgegevens
                  </strong>
                </div>
                <p className="text-sm">Tickettype, aantal, prijs, datum</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <strong className="text-gray-900 dark:text-white">
                    Betalingsgegevens
                  </strong>
                </div>
                <p className="text-sm">
                  Via Mollie (geen opslag van kaartgegevens)
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <strong className="text-gray-900 dark:text-white">
                    Technische gegevens
                  </strong>
                </div>
                <p className="text-sm">IP-adres, browser (voor beveiliging)</p>
              </div>
            </div>
          </div>
        </section>

        {/* Sections 4-13: Remaining sections with card styling */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            4. Waarvoor gebruiken we uw gegevens?
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Wij gebruiken uw persoonsgegevens voor de volgende doeleinden:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Het verwerken van uw ticketbestelling</li>
              <li>Het verzenden van uw digitale tickets via e-mail</li>
              <li>Het faciliteren van toegangscontrole bij evenementen</li>
              <li>
                Het afhandelen van vragen en klachten (via de
                Evenementenorganisator)
              </li>
              <li>Het voldoen aan wettelijke verplichtingen</li>
              <li>Het detecteren en voorkomen van fraude</li>
            </ul>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            5. Rechtsgrond voor verwerking
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>Wij verwerken uw persoonsgegevens op basis van:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Uitvoering van de overeenkomst:</strong> voor het
                leveren van tickets
              </li>
              <li>
                <strong>Wettelijke verplichting:</strong> voor belasting- en
                administratieve verplichtingen
              </li>
              <li>
                <strong>Gerechtvaardigd belang:</strong> voor fraudepreventie en
                beveiliging
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            6. Met wie delen we uw gegevens?
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>Wij delen uw gegevens met:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Evenementenorganisator:</strong> voor uitvoering van uw
                ticketbestelling
              </li>
              <li>
                <strong>Mollie:</strong> onze betaalprovider voor het verwerken
                van betalingen
              </li>
              <li>
                <strong>E-mailprovider:</strong> voor het verzenden van tickets
                en bevestigingen
              </li>
              <li>
                <strong>Hosting provider:</strong> voor het technisch
                faciliteren van het platform
              </li>
            </ul>
            <p className="mt-3">
              Wij verkopen of verhuren uw gegevens nooit aan derden voor
              marketingdoeleinden.
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            7. Bewaartermijn
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Wij bewaren uw persoonsgegevens niet langer dan noodzakelijk voor
              de doeleinden waarvoor ze zijn verzameld:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Bestel- en ticketgegevens:</strong> tot 7 jaar na de
                datum van het evenement (wettelijke bewaarplicht)
              </li>
              <li>
                <strong>Scanloggegevens:</strong> 2 jaar voor audit-doeleinden,
                daarna geanonimiseerd
              </li>
              <li>
                <strong>E-mailcorrespondentie:</strong> tot 2 jaar na laatste
                contact
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            8. Uw rechten
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              U heeft de volgende rechten met betrekking tot uw
              persoonsgegevens:
            </p>
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <strong className="text-gray-900 dark:text-white block mb-1">
                  Recht op inzage
                </strong>
                <p className="text-sm">Opvragen welke gegevens we verwerken</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <strong className="text-gray-900 dark:text-white block mb-1">
                  Recht op rectificatie
                </strong>
                <p className="text-sm">Onjuiste gegevens laten corrigeren</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <strong className="text-gray-900 dark:text-white block mb-1">
                  Recht op verwijdering
                </strong>
                <p className="text-sm">Verzoeken uw gegevens te verwijderen</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <strong className="text-gray-900 dark:text-white block mb-1">
                  Recht op beperking
                </strong>
                <p className="text-sm">Verzoeken de verwerking te beperken</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <strong className="text-gray-900 dark:text-white block mb-1">
                  Recht op dataportabiliteit
                </strong>
                <p className="text-sm">
                  Gegevens in gestructureerde vorm opvragen
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <strong className="text-gray-900 dark:text-white block mb-1">
                  Recht van bezwaar
                </strong>
                <p className="text-sm">Bezwaar maken tegen verwerking</p>
              </div>
            </div>
            <p className="mt-3">
              Om gebruik te maken van deze rechten, kunt u contact opnemen met
              de Evenementenorganisator of met ons via het platform.
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Lock className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                9. Beveiliging
              </h2>
            </div>
          </div>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Wij nemen passende technische en organisatorische maatregelen om
              uw persoonsgegevens te beschermen tegen verlies of enige vorm van
              onrechtmatige verwerking:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Versleutelde verbindingen (HTTPS/TLS)</li>
              <li>Beveiligde opslag in ISO-gecertificeerde datacenters</li>
              <li>Toegangscontrole en logging</li>
              <li>Regelmatige security audits</li>
            </ul>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            10. Cookies
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Het Entro platform gebruikt cookies en vergelijkbare
              technologieën. Meer informatie hierover vindt u in ons{" "}
              <a
                href="/cookies"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                cookiebeleid
              </a>
              .
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            11. Wijzigingen
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Wij kunnen deze privacyverklaring van tijd tot tijd aanpassen.
              Wezenlijke wijzigingen zullen we duidelijk communiceren op het
              platform.
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                12. Klachten
              </h2>
            </div>
          </div>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Als u een klacht heeft over de verwerking van uw persoonsgegevens,
              kunt u contact met ons opnemen. U heeft ook het recht om een
              klacht in te dienen bij de Autoriteit Persoonsgegevens.
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            13. Contact
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Voor vragen over deze privacyverklaring of over de verwerking van
              uw persoonsgegevens, kunt u contact opnemen via het platform of
              via de Evenementenorganisator.
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
              href="/cookies"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Cookiebeleid
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
