import { Metadata } from "next";
import { FileText, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Gebruiksvoorwaarden | Entro",
  description: "Gebruiksvoorwaarden voor ticketkopers op het Entro platform",
};

export default function TermsPage() {
  return (
    <div className="public-container py-12 md:py-16">
      {/* Header Section */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-xl">
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Gebruiksvoorwaarden
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Van toepassing op ticketkopers (B2C)
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-semibold mb-1">Belangrijk om te weten:</p>
              <p>
                Entro is een technisch platform. De overeenkomst voor
                ticketaankopen komt rechtstreeks tot stand tussen u en de
                evenementenorganisator.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Algemeen</h2>
          <p>
            Entro biedt een platform waarop Tickets van Evenementenorganisatoren
            kunnen worden aangeschaft.
          </p>
          <p>
            Entro is geen organisator, verkoper of aanbieder van Evenementen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            2. Totstandkoming overeenkomst
          </h2>
          <p>
            De overeenkomst voor de aankoop van een Ticket komt tot stand tussen
            de Gebruiker en de Evenementenorganisator.
          </p>
          <p>Entro is uitsluitend technisch facilitator.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Betaling</h2>
          <p>
            Betalingen worden uitgevoerd via de betaalmethoden aangeboden door
            de Evenementenorganisator.
          </p>
          <p>
            Eventuele servicekosten (incl. betalingskosten) worden duidelijk
            getoond tijdens het afrekenen.
          </p>
          <p>Entro is geen partij bij de betaling.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            4. Levering van Tickets
          </h2>
          <p>Tickets worden digitaal geleverd via e-mail of het Platform.</p>
          <p>
            De Gebruiker is zelf verantwoordelijk voor correcte contactgegevens.
          </p>
          <p>
            Na levering ligt het risico van verlies of misbruik bij de
            Gebruiker.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            5. Annuleringen en refunds
          </h2>
          <p>
            Annulering, restitutie en omruiling van Tickets vallen onder het
            beleid van de Evenementenorganisator.
          </p>
          <p>Entro kan hierin niet bemiddelen en is niet aansprakelijk.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Herroepingsrecht</h2>
          <p>
            Tickets voor Evenementen met een vaste datum zijn uitgesloten van
            het herroepingsrecht conform wetgeving inzake vrijetijdsbesteding.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Aansprakelijkheid</h2>
          <p>Entro is niet aansprakelijk voor:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>het niet doorgaan van Evenementen;</li>
            <li>schade tijdens of rondom het Evenement;</li>
            <li>handelen of nalaten van Evenementenorganisatoren.</li>
          </ul>
          <p>
            Iedere aansprakelijkheid van Entro is beperkt tot het bedrag aan
            servicekosten dat de Gebruiker heeft betaald.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Privacy</h2>
          <p>
            Persoonsgegevens worden verwerkt conform de{" "}
            <a href="/privacy" className="text-primary underline">
              Privacyverklaring
            </a>{" "}
            van Entro.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Toepasselijk recht</h2>
          <p>Op deze Gebruiksvoorwaarden is Nederlands recht van toepassing.</p>
        </section>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <p>Laatst bijgewerkt: 2 januari 2026</p>
          <div className="flex items-center gap-4">
            <a
              href="/privacy"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Privacybeleid
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
