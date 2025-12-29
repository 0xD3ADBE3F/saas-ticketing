/**
 * Date formatting utilities for Dutch locale
 */

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Format a date as "15 januari 2025"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return dateFormatter.format(d);
}

/**
 * Format a date with time as "15 januari 2025 om 20:00"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return dateTimeFormatter.format(d).replace(",", " om");
}

/**
 * Format only the time as "20:00"
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return timeFormatter.format(d);
}

/**
 * Format a short date as "15 jan 2025"
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return shortDateFormatter.format(d);
}

/**
 * Format a date range, e.g.:
 * - Same day: "15 januari 2025, 20:00 - 23:00"
 * - Different days: "15 - 16 januari 2025"
 * - Different months: "31 december 2024 - 1 januari 2025"
 */
export function formatDateRange(start: Date | string, end: Date | string): string {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;

  const sameDay =
    startDate.getDate() === endDate.getDate() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear();

  const sameMonth =
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear();

  if (sameDay) {
    // Same day: show date with time range
    return `${formatDate(startDate)}, ${formatTime(startDate)} - ${formatTime(endDate)}`;
  }

  if (sameMonth) {
    // Same month: "15 - 16 januari 2025"
    const monthYear = new Intl.DateTimeFormat("nl-NL", {
      month: "long",
      year: "numeric",
    }).format(startDate);
    return `${startDate.getDate()} - ${endDate.getDate()} ${monthYear}`;
  }

  // Different months
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}

/**
 * Get relative time (e.g., "over 3 dagen", "2 uur geleden")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (Math.abs(diffMinutes) < 60) {
    if (diffMinutes === 0) return "nu";
    if (diffMinutes > 0) return `over ${diffMinutes} ${diffMinutes === 1 ? "minuut" : "minuten"}`;
    return `${Math.abs(diffMinutes)} ${Math.abs(diffMinutes) === 1 ? "minuut" : "minuten"} geleden`;
  }

  if (Math.abs(diffHours) < 24) {
    if (diffHours > 0) return `over ${diffHours} ${diffHours === 1 ? "uur" : "uur"}`;
    return `${Math.abs(diffHours)} uur geleden`;
  }

  if (diffDays > 0) return `over ${diffDays} ${diffDays === 1 ? "dag" : "dagen"}`;
  return `${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? "dag" : "dagen"} geleden`;
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getTime() < Date.now();
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Format for HTML datetime-local input
 */
export function toDateTimeLocalValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  // Format: YYYY-MM-DDTHH:MM
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parse HTML datetime-local value to Date
 */
export function fromDateTimeLocalValue(value: string): Date {
  return new Date(value);
}
