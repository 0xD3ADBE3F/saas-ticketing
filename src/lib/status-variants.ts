import { type BadgeProps } from "@/components/ui/badge";

export function getEventStatusVariant(
  status: "DRAFT" | "LIVE" | "ENDED" | "CANCELLED"
): BadgeProps["variant"] {
  const variants = {
    LIVE: "success",
    DRAFT: "neutral",
    ENDED: "info",
    CANCELLED: "destructive",
  } as const;
  return variants[status] || "neutral";
}

export function getOrderStatusVariant(
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED" | "EXPIRED"
): BadgeProps["variant"] {
  const variants = {
    PAID: "success",
    PENDING: "warning",
    FAILED: "destructive",
    CANCELLED: "neutral",
    REFUNDED: "info",
    EXPIRED: "warning",
  } as const;
  return variants[status] || "neutral";
}

export function getTicketStatusVariant(
  status: "VALID" | "USED" | "REFUNDED"
): BadgeProps["variant"] {
  const variants = {
    VALID: "success",
    USED: "neutral",
    REFUNDED: "info",
  } as const;
  return variants[status] || "neutral";
}
