"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle, Check } from "lucide-react";

type WalletCertificateFormProps = {
  platform: "APPLE" | "GOOGLE";
  passTypeId: string | null;
  teamId: string | null;
};

export function WalletCertificateForm({
  platform,
  passTypeId,
  teamId,
}: WalletCertificateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    passTypeId: passTypeId || "",
    teamId: teamId || "",
    certificatePem: "",
    privateKeyPem: "",
    expiresAt: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/platform/wallet-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save certificate");
      }

      setSuccess(true);
      router.refresh();

      // Clear sensitive fields
      setFormData((prev) => ({
        ...prev,
        certificatePem: "",
        privateKeyPem: "",
      }));

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (platform !== "APPLE") {
    return (
      <div className="text-gray-600 dark:text-gray-400">
        Google Wallet support coming soon
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                Error
              </h3>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                Saved
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                Certificate encrypted and saved. Apple Wallet is now active!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pass Type ID */}
      <div>
        <label
          htmlFor="passTypeId"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Pass Type ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="passTypeId"
          required
          placeholder="pass.com.entro.ticket"
          value={formData.passTypeId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, passTypeId: e.target.value }))
          }
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          The Pass Type ID configured in Apple Developer account
        </p>
      </div>

      {/* Team ID */}
      <div>
        <label
          htmlFor="teamId"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Team ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="teamId"
          required
          placeholder="ABC1234DEF"
          maxLength={10}
          value={formData.teamId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, teamId: e.target.value }))
          }
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your 10-character Apple Developer Team ID
        </p>
      </div>

      {/* Certificate PEM */}
      <div>
        <label
          htmlFor="certificatePem"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Certificate (PEM) <span className="text-red-500">*</span>
        </label>
        <textarea
          id="certificatePem"
          required
          rows={8}
          placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
          value={formData.certificatePem}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              certificatePem: e.target.value,
            }))
          }
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Paste the certificate.pem content
        </p>
      </div>

      {/* Private Key PEM */}
      <div>
        <label
          htmlFor="privateKeyPem"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Private Key (PEM) <span className="text-red-500">*</span>
        </label>
        <textarea
          id="privateKeyPem"
          required
          rows={8}
          placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
          value={formData.privateKeyPem}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, privateKeyPem: e.target.value }))
          }
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Paste the private-key.pem content
        </p>
      </div>

      {/* Expiration Date */}
      <div>
        <label
          htmlFor="expiresAt"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Expiration Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="expiresAt"
          required
          value={formData.expiresAt}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))
          }
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Apple certificates typically expire after 1 year
        </p>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Security
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Certificate and private key are encrypted with AES-256-GCM before
              storage. They are only decrypted when generating wallet passes.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Save Certificate
            </>
          )}
        </button>
      </div>
    </form>
  );
}
