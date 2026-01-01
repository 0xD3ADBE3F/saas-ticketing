"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface BottomNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  match?: (pathname: string) => boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
  className?: string;
}

export function BottomNav({ items, className }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 h-16",
        "bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800",
        "z-40 safe-area-bottom",
        className
      )}
    >
      <div className="flex h-full items-center justify-around">
        {items.map((item) => {
          const isActive = item.match
            ? item.match(pathname)
            : pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center",
                "w-full h-full gap-1 text-xs font-medium",
                "transition-colors touch-manipulation",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
