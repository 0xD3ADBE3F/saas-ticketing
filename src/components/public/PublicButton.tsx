import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface PublicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

/**
 * PublicButton - Button component for public-facing pages
 *
 * Uses the public design system with consumer-friendly styling.
 * Optimized for touch interactions and accessibility.
 */
export const PublicButton = forwardRef<HTMLButtonElement, PublicButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",

          // Variants
          {
            // Primary - main CTAs
            "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-sm hover:shadow-md active:shadow-sm":
              variant === "primary",

            // Accent - secondary CTAs
            "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-sm hover:shadow-md active:shadow-sm":
              variant === "accent",

            // Outline - tertiary actions
            "border-2 border-gray-300 bg-transparent hover:bg-gray-50 text-gray-900 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-white":
              variant === "outline",

            // Ghost - minimal actions
            "hover:bg-gray-100 text-gray-900 dark:hover:bg-gray-800 dark:text-white":
              variant === "ghost",
          },

          // Sizes - optimized for touch
          {
            "px-3 py-2 text-sm rounded-lg min-h-[36px]": size === "sm",
            "px-4 py-3 text-base rounded-lg min-h-[44px]": size === "md",
            "px-6 py-4 text-lg rounded-xl min-h-[52px]": size === "lg",
          },

          // Loading state
          {
            "cursor-wait": loading,
          },

          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

PublicButton.displayName = "PublicButton";
