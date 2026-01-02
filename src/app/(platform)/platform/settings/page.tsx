import { platformSettingsService } from "@/server/services/platformSettingsService";
import { PlatformSettingsForm } from "@/components/platform/PlatformSettingsForm";

export default async function SettingsPage() {
  const settings = await platformSettingsService.listAll();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Platform Settings</h1>
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <PlatformSettingsForm settings={settings} />
      </div>
    </div>
  );
}
