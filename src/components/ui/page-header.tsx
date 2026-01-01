import { Button } from "@/components/ui/button";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    icon?: LucideIcon;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  const ActionIcon = action?.icon;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          {...(action.href && { asChild: true })}
          className="w-full sm:w-auto"
        >
          {action.href ? (
            <a href={action.href} className="flex items-center gap-2">
              {ActionIcon && <ActionIcon className="w-4 h-4" />}
              {action.label}
            </a>
          ) : (
            <>
              {ActionIcon && <ActionIcon className="w-4 h-4" />}
              {action.label}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
