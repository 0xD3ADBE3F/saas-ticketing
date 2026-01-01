"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  ShoppingCart,
  ScanLine,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Overzicht",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    href: "/dashboard/events",
    label: "Evenementen",
    icon: Ticket,
    badge: null,
  },
  {
    href: "/dashboard/orders",
    label: "Bestellingen",
    icon: ShoppingCart,
    badge: null,
  },
  {
    href: "/dashboard/scanning",
    label: "Scannen",
    icon: ScanLine,
    badge: null,
  },
  {
    href: "/dashboard/payouts",
    label: "Uitbetalingen",
    icon: Wallet,
    badge: null,
  },
  {
    href: "/dashboard/settings",
    label: "Instellingen",
    icon: Settings,
    badge: null,
  },
];

// Bottom nav shows only 5 items on mobile
const mobileNavItems = navItems.slice(0, 5);

interface DashboardNavProps {
  organizationName: string;
  userEmail: string;
}

export function DashboardNav({
  organizationName,
  userEmail,
}: DashboardNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-64 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 p-4 flex-col fixed inset-y-0 left-0 z-30">
        <div className="mb-8 pb-4 border-b border-gray-200/50 dark:border-gray-800/50">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Image
                src="/logo-icon.svg"
                alt="Entro"
                width={24}
                height={24}
                className="brightness-0 invert"
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Entro
            </span>
          </Link>
        </div>

        <ul className="space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:translate-x-1"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isActive
                        ? ""
                        : "group-hover:scale-110 transition-transform"
                    }`}
                  />
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  )}
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-4 border-t border-gray-200/50 dark:border-gray-800/50">
          <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-xl text-sm border border-gray-200/50 dark:border-gray-700/50 mb-2">
            <p className="font-semibold truncate text-gray-900 dark:text-white">
              {organizationName}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 truncate">
              {userEmail}
            </p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all text-left flex items-center gap-3 group"
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Uitloggen</span>
            </button>
          </form>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 z-40 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Image
              src="/logo-icon.svg"
              alt="Entro"
              width={20}
              height={20}
              className="brightness-0 invert"
            />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Entro
          </span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95 touch-manipulation"
          aria-label="Menu"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </header>

      {/* Mobile Slide-out Menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="md:hidden fixed top-16 right-0 bottom-0 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-l border-gray-200/50 dark:border-gray-800/50 z-50 p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl text-sm mb-6 border border-blue-100 dark:border-blue-900/30">
              <p className="font-semibold truncate text-gray-900 dark:text-white mb-1">
                {organizationName}
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-xs truncate">
                {userEmail}
              </p>
            </div>

            <ul className="space-y-2 mb-6">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname?.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all touch-manipulation group ${
                        isActive
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 active:scale-95"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          isActive
                            ? ""
                            : "group-hover:scale-110 transition-transform"
                        }`}
                      />
                      <span className="font-medium flex-1">{item.label}</span>
                      {!isActive && (
                        <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <form
              action="/api/auth/signout"
              method="POST"
              className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-800"
            >
              <button
                type="submit"
                className="w-full px-4 py-4 text-sm text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all text-left flex items-center gap-4 group touch-manipulation active:scale-95"
              >
                <LogOut className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="font-medium flex-1">Uitloggen</span>
              </button>
            </form>
          </div>
        </>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 z-40 safe-area-bottom">
        <ul className="flex h-full px-2">
          {mobileNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center h-full gap-1 transition-all touch-manipulation relative group ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400 active:scale-95"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl transition-all ${
                      isActive
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : "group-hover:bg-gray-100 dark:group-hover:bg-gray-800"
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        isActive ? "scale-110" : "group-hover:scale-105"
                      } transition-transform`}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-medium ${
                      isActive ? "font-semibold" : ""
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
