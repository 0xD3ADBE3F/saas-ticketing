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
    default: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    success:
      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    primary: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
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
