import Image from "next/image";
import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getSuperAdmin } from "@/server/lib/platformAdmin";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login?return=/platform");
  }

  // Check if user is a SuperAdmin
  const superAdmin = await getSuperAdmin(user.id);

  if (!superAdmin) {
    // User is authenticated but not a SuperAdmin
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PlatformNav adminEmail={superAdmin.email} />
      <main className="md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

function PlatformNav({ adminEmail }: { adminEmail: string }) {
  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-800">
          <Image
            src="/logo-white.png"
            alt="Entro"
            width={100}
            height={32}
            className="dark:invert"
          />
          <span className="ml-2 text-xs font-medium text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
            Admin
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-1">
            <NavLink href="/platform" icon="📊">
              Dashboard
            </NavLink>
            <NavLink href="/platform/organizations" icon="🏢">
              Organizations
            </NavLink>
            <NavLink href="/platform/subscriptions" icon="💳">
              Subscriptions
            </NavLink>
            <NavLink href="/platform/analytics" icon="📈">
              Analytics
            </NavLink>
            <NavLink href="/platform/audit-logs" icon="📝">
              Audit Logs
            </NavLink>
            <NavLink href="/platform/settings" icon="⚙️">
              Settings
            </NavLink>
          </nav>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Admin: {adminEmail}
          </div>
          <a
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            ← Back to Organizer Dashboard
          </a>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <Image
            src="/logo-white.png"
            alt="Entro"
            width={80}
            height={26}
            className="dark:invert"
          />
          <span className="text-xs font-medium text-red-600">Admin</span>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {adminEmail}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
        <div className="grid grid-cols-4 gap-1 p-2">
          <MobileNavLink href="/platform" icon="📊" label="Dashboard" />
          <MobileNavLink
            href="/platform/organizations"
            icon="🏢"
            label="Orgs"
          />
          <MobileNavLink
            href="/platform/analytics"
            icon="📈"
            label="Analytics"
          />
          <MobileNavLink href="/platform/settings" icon="⚙️" label="Settings" />
        </div>
      </nav>
    </>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{children}</span>
    </a>
  );
}

function MobileNavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
    >
      <span className="text-xl mb-1">{icon}</span>
      <span className="text-xs">{label}</span>
    </a>
  );
}
