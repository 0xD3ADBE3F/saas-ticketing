/**
 * Generate a URL-friendly slug from a title
 * Matches backend logic in eventService.ts
 */
export function generateSlug(title: string): string {
  if (!title) return "";

  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Trim hyphens from start and end
    .substring(0, 50); // Limit to 50 characters
}
