import { PlatformMollieConnection } from "@/components/platform/PlatformMollieConnection";
import { platformTokenService } from "@/server/services/platformTokenService";
import { molliePlatformHealthService } from "@/server/services/molliePlatformHealthService";

export default async function MollieConnectionPage() {
  // Check platform Mollie connection
  const platformTokens = await platformTokenService.getTokens();
  const isPlatformConnected = !!platformTokens.accessToken;

  // Get connection health details
  const healthStatus = await molliePlatformHealthService.getHealthStatus();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mollie Connection</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage the platform's Mollie integration for organization onboarding
        </p>
      </div>

      <PlatformMollieConnection
        isConnected={isPlatformConnected}
        healthStatus={healthStatus}
      />

      {isPlatformConnected && (
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            What does this connection enable?
          </h2>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">✓</span>
              <span>
                <strong>Client Links:</strong> Generate prefilled onboarding
                links for organizations with business data pre-populated
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">✓</span>
              <span>
                <strong>Faster Onboarding:</strong> Organizations complete
                onboarding faster with less manual data entry
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">✓</span>
              <span>
                <strong>Better Experience:</strong> Seamless connection flow
                directly from your platform
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">✓</span>
              <span>
                <strong>Connection Monitoring:</strong> Automatic health checks
                and token refresh to maintain reliable integration
              </span>
            </li>
          </ul>
        </div>
      )}

      {!isPlatformConnected && (
        <div className="mt-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">Before Connecting</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Make sure you have:
          </p>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>
                A Mollie account with Partner/Platform permissions enabled
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>
                OAuth credentials configured in your Mollie dashboard (Client ID
                and Secret)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>
                Environment variables set: <code>MOLLIE_CLIENT_ID</code> and{" "}
                <code>MOLLIE_CLIENT_SECRET</code>
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
