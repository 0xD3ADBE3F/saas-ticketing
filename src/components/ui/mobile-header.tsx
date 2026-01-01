"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  title: string;
  children?: React.ReactNode; // Sidebar content
}

export function MobileHeader({ title, children }: MobileHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="md:hidden sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h1>

        {children && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                {open ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              {children}
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
  );
}
