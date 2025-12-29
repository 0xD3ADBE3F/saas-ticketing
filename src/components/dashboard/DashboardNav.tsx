"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overzicht", icon: "📊" },
  { href: "/dashboard/events", label: "Evenementen", icon: "🎫" },
  { href: "/dashboard/orders", label: "Bestellingen", icon: "📦" },
  { href: "/dashboard/scanning", label: "Scannen", icon: "📱" },
  { href: "/dashboard/payouts", label: "Uitbetalingen", icon: "💰" },
  { href: "/dashboard/settings", label: "Instellingen", icon: "⚙️" },
];

interface DashboardNavProps {
  organizationName: string;
  userEmail: string;
}

export function DashboardNav({
  organizationName,
  userEmail,
}: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <nav className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col">
      <div className="mb-8">
        <Link href="/" className="text-xl font-bold">
          🎟️ Ticketing
        </Link>
      </div>

      <ul className="space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
          <p className="font-medium truncate">{organizationName}</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 truncate">
            {userEmail}
          </p>
        </div>
        <form action="/api/auth/signout" method="POST" className="mt-2">
          <button
            type="submit"
            className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
          >
            Uitloggen
          </button>
        </form>
      </div>
    </nav>
  );
}
