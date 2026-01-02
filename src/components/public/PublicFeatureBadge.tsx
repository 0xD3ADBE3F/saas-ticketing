import { ReactNode } from "react";
import { ShieldCheck, Lock, RefreshCcw, Smartphone } from "lucide-react";

type IconType = "shield" | "lock" | "refund" | "mobile";

interface PublicFeatureBadgeProps {
  icon?: IconType | ReactNode;
  children: ReactNode;
  variant?: "default" | "success" | "primary";
}

const icons: Record<IconType, typeof ShieldCheck> = {
  shield: ShieldCheck,
  lock: Lock,
  refund: RefreshCcw,
  mobile: Smartphone,
};

export function PublicFeatureBadge({
  icon = "shield",
  children,
  variant = "default",
}: PublicFeatureBadgeProps) {
  const Icon =
    typeof icon === "string" && icon in icons ? icons[icon as IconType] : null;

  const variantClasses = {
    default:
      "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700",
    success:
      "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
    primary:
      "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${variantClasses[variant]}`}
    >
      {Icon ? (
        <Icon className="w-4 h-4" />
      ) : (
        <>{typeof icon !== "string" && icon}</>
      )}
      <span>{children}</span>
    </div>
  );
}
