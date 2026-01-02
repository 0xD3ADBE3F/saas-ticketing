import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface PublicCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

/**
 * PublicCard - Card component for public-facing pages
 *
 * Uses the public design system with subtle shadows and borders.
 * Supports hover effect for interactive cards.
 */
export function PublicCard({
  className,
  hover = false,
  children,
  ...props
}: PublicCardProps) {
  return (
    <div
      className={cn(
        "public-card p-6",
        "bg-white border border-gray-200",
        "dark:bg-gray-800 dark:border-gray-700",
        {
          "cursor-pointer": hover,
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * PublicCardHeader - Card header with title and optional description
 */
export function PublicCardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * PublicCardTitle - Card title
 */
export function PublicCardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-xl font-bold",
        "text-gray-900 dark:text-white",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

/**
 * PublicCardDescription - Card description text
 */
export function PublicCardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-sm mt-1",
        "text-gray-600 dark:text-gray-400",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * PublicCardContent - Card body content
 */
export function PublicCardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * PublicCardFooter - Card footer with actions
 */
export function PublicCardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-6 pt-4 border-t border-public-border flex items-center gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
