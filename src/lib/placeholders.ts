/**
 * Placeholder text utilities for Entro
 */

export const EVENT_NAME_PLACEHOLDERS = [
  "Jaarlijkse Bingo",
  "Filmavond bij de vereniging",
  "Nieuwjaarsreceptie 2026",
  "Voorjaarsborrel",
  "Kerst Gala",
  "Zomeravondconcert",
  "Sportdag",
  "Quiz Night",
  "Theater voorstelling De Kom",
  "Sinterklaasfeest",
  "Benefietavond",
  "Open Mic Night",
  "Braderie",
  "Koningsdag Festival",
  "Wijkfeest",
  "Pubquiz",
  "Klaverjasavond",
  "Sponsorloop",
  "Koffieconcert",
  "Dansgala",
];

/**
 * Returns a random event name placeholder for input fields
 */
export function getRandomEventPlaceholder(): string {
  return EVENT_NAME_PLACEHOLDERS[
    Math.floor(Math.random() * EVENT_NAME_PLACEHOLDERS.length)
  ];
}
