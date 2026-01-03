import { Metadata } from "next";
import { WalletCertificateForm } from "@/components/platform/WalletCertificateForm";
import { getSuperAdmin } from "@/server/lib/platformAdmin";
import { redirect } from "next/navigation";
import { prisma } from "@/server/lib/prisma";
import { Shield, AlertCircle, Smartphone } from "lucide-react";
import { getUser } from "@/server/lib/supabase";

export const metadata: Metadata = {
  title: "Wallet Certificates - Entro Platform",
  description: "Manage Apple Wallet and Google Wallet certificates",
};

export default async function WalletCertificatesPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const superAdmin = await getSuperAdmin(user.id);

  if (!superAdmin) {
    redirect("/login");
  }

  // Fetch existing Apple certificate if any
  const appleCertificate = await prisma.walletCertificate.findFirst({
    where: {
      platform: "APPLE",
    },
    select: {
      id: true,
      passTypeId: true,
      teamId: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  // Fetch existing Google certificate if any
  const googleCertificate = await prisma.walletCertificate.findFirst({
    where: {
      platform: "GOOGLE",
    },
    select: {
      id: true,
      issuerId: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const isAppleExpired = appleCertificate
    ? appleCertificate.expiresAt < new Date()
    : false;

  const isGoogleExpired = googleCertificate
    ? googleCertificate.expiresAt < new Date()
    : false;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Wallet Certificates
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage platform-wide Apple Wallet and Google Wallet signing
          certificates. Entro is the issuer of all wallet passes.
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 rounded-lg border bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 text-blue-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Platform Certificate
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              These certificates are used for all organizations. Entro is the
              official issuer, while organization logos can be included in
              individual passes.
            </p>
          </div>
        </div>
      </div>

      {/* Apple Wallet Status Card */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Apple Wallet</h2>
        {appleCertificate && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              isAppleExpired
                ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <Shield
                className={`w-5 h-5 mt-0.5 ${
                  isAppleExpired ? "text-red-600" : "text-green-600"
                }`}
              />
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    isAppleExpired
                      ? "text-red-900 dark:text-red-100"
                      : "text-green-900 dark:text-green-100"
                  }`}
                >
                  {isAppleExpired
                    ? "Certificate Expired"
                    : "Certificate Active"}
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    isAppleExpired
                      ? "text-red-800 dark:text-red-200"
                      : "text-green-800 dark:text-green-200"
                  }`}
                >
                  Pass Type ID: {appleCertificate.passTypeId || "Not set"}
                </p>
                <p
                  className={`text-sm ${
                    isAppleExpired
                      ? "text-red-800 dark:text-red-200"
                      : "text-green-800 dark:text-green-200"
                  }`}
                >
                  Team ID: {appleCertificate.teamId || "Not set"}
                </p>
                <p
                  className={`text-sm ${
                    isAppleExpired
                      ? "text-red-800 dark:text-red-200"
                      : "text-green-800 dark:text-green-200"
                  }`}
                >
                  Expires: {appleCertificate.expiresAt.toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              1. Create Pass Type ID
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Go to{" "}
              <a
                href="https://developer.apple.com/account/resources/identifiers/list/passTypeId"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Apple Developer Portal
              </a>{" "}
              and create a new Pass Type ID (e.g., pass.com.entro.ticket)
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              2. Generate Certificate
            </h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>Download the Pass Type ID certificate from Apple</li>
              <li>Convert to PEM format using OpenSSL:</li>
            </ol>
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded font-mono text-xs">
              # Convert certificate
              <br />
              openssl x509 -inform der -in pass.cer -out certificate.pem
              <br />
              <br />
              # Convert private key (from .p12)
              <br />
              openssl pkcs12 -in Certificates.p12 -nocerts -out private-key.pem
              -nodes
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              3. Upload Certificate
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Use the form below to upload your certificate. All data is
              encrypted at rest.
            </p>
          </div>
        </div>
      </div>

      {/* Certificate Form */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-8">
        <WalletCertificateForm
          platform="APPLE"
          passTypeId={appleCertificate?.passTypeId || null}
          teamId={appleCertificate?.teamId || null}
        />
      </div>

      {/* =========== Google Wallet Section =========== */}
      <div className="mb-6 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Google Wallet
        </h2>
        {googleCertificate && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              isGoogleExpired
                ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <Shield
                className={`w-5 h-5 mt-0.5 ${
                  isGoogleExpired ? "text-red-600" : "text-green-600"
                }`}
              />
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    isGoogleExpired
                      ? "text-red-900 dark:text-red-100"
                      : "text-green-900 dark:text-green-100"
                  }`}
                >
                  {isGoogleExpired
                    ? "Service Account Expired"
                    : "Service Account Active"}
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    isGoogleExpired
                      ? "text-red-800 dark:text-red-200"
                      : "text-green-800 dark:text-green-200"
                  }`}
                >
                  Issuer ID: {googleCertificate.issuerId || "Not set"}
                </p>
                <p
                  className={`text-sm ${
                    isGoogleExpired
                      ? "text-red-800 dark:text-red-200"
                      : "text-green-800 dark:text-green-200"
                  }`}
                >
                  Reminder: {googleCertificate.expiresAt.toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Google Wallet Setup Instructions */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Google Wallet Setup</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              1. Maak een Google Cloud Project
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Ga naar{" "}
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Cloud Console
              </a>{" "}
              en maak een nieuw project aan of selecteer een bestaand project.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              2. Activeer Google Wallet API
            </h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>Ga naar APIs & Services → Library</li>
              <li>Zoek naar &quot;Google Wallet API&quot;</li>
              <li>Klik op &quot;Enable&quot;</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              3. Maak een Service Account
            </h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>Ga naar IAM & Admin → Service Accounts</li>
              <li>Klik op &quot;Create Service Account&quot;</li>
              <li>Geef het een naam (bijv. &quot;entro-wallet&quot;)</li>
              <li>Creëer een JSON key en download deze</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              4. Stel een Issuer Account in
            </h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>
                Ga naar{" "}
                <a
                  href="https://pay.google.com/business/console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Pay & Wallet Console
                </a>
              </li>
              <li>Maak een Issuer Account aan</li>
              <li>Koppel je service account email</li>
              <li>Kopieer de Issuer ID</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Google Wallet Certificate Form */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <WalletCertificateForm
          platform="GOOGLE"
          issuerId={googleCertificate?.issuerId || null}
        />
      </div>
    </div>
  );
}
