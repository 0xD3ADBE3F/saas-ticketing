import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { MollieConnection } from "@/components/dashboard/MollieConnection";
import { PaymentFlowDiagram } from "@/components/dashboard/PaymentFlowDiagram";
import Image from "next/image";

export default async function PaymentProviderPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const organizations = await getUserOrganizations(user.id);

  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  const currentOrg = organizations[0];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-pink-900 dark:from-gray-100 dark:via-purple-100 dark:to-pink-100 bg-clip-text text-transparent mb-2">
          Betalingen
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Entro regelt de ticketverkoop en toegangscontrole. Mollie verwerkt de
          betalingen (bijv. iDEAL) en keert het geld uit aan jullie organisatie.
        </p>
      </div>

      <div className="space-y-6">
        {/* Mollie Connection */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <Image
                  src="/mollie-logo-black.svg"
                  alt="Mollie"
                  width={60}
                  height={24}
                  className="dark:invert"
                />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Koppeling
              </h2>
            </div>
          </div>
          <div className="p-6">
            <MollieConnection organizationId={currentOrg.id} />
          </div>
        </div>

        {/* Why Mollie */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Waarom een Mollie-account?
            </h2>
          </div>

          <div className="p-6 space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              <span className="font-semibold text-gray-900 dark:text-white">
                Entro
              </span>{" "}
              is het ticketingplatform: wij regelen je eventpagina, checkout,
              tickets en het scannen bij de ingang.{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                Mollie
              </span>{" "}
              is de betaalprovider: Mollie verwerkt de betaling en zorgt dat het
              geld bij jullie organisatie terechtkomt.
            </p>

            {/* Visual Flow Diagram */}
            <PaymentFlowDiagram />

            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                  •
                </span>
                <span>
                  Zonder Mollie-koppeling kunnen bezoekers geen tickets
                  afrekenen met iDEAL.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                  •
                </span>
                <span>
                  Mollie verzorgt de afhandeling van betalingen, terugbetalingen
                  en uitbetalingen.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                  •
                </span>
                <span>
                  Jullie bank- en verificatiegegevens blijven bij Mollie; Entro
                  slaat geen bankgegevens op.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                  •
                </span>
                <span>
                  De Mollie-koppeling is per organisatie, zodat de uitbetalingen
                  altijd naar de juiste organisatie gaan.
                </span>
              </li>
            </ul>

            <div className="rounded-xl border border-blue-100/80 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/80 to-purple-50/60 dark:from-blue-950/30 dark:to-purple-950/20 p-4 space-y-2">
              <p className="font-semibold text-gray-900 dark:text-white">
                ✨ Eenvoudig aan de slag
              </p>
              <p className="text-sm">
                Entro en Mollie werken samen om het zo makkelijk mogelijk te
                maken. Je kunt het hele onboarding-proces direct vanaf dit
                platform starten:
              </p>
              <ol className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600 dark:text-blue-400 min-w-[1.25rem]">
                    1.
                  </span>
                  <span>
                    <span className="font-medium">
                      Heb je al een Mollie-account?
                    </span>{" "}
                    Klik hieronder op "Verbind met Mollie" en rond de
                    autorisatie af.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-blue-600 dark:text-blue-400 min-w-[1.25rem]">
                    2.
                  </span>
                  <span>
                    <span className="font-medium">
                      Nog geen Mollie-account?
                    </span>{" "}
                    Klik op "Verbind met Mollie" en je wordt automatisch
                    doorgeleid om een account aan te maken. Doorloop de
                    verificatie (KVK/identiteit) en koppel direct aan Entro.
                  </span>
                </li>
              </ol>
              <p className="text-sm text-gray-600 dark:text-gray-400 pt-2">
                Zodra de koppeling actief is, kun je betaalde tickets verkopen
                en worden betalingen via Mollie verwerkt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
