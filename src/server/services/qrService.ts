/**
 * QR Code generation utilities
 *
 * For MVP, we generate a simple URL-based QR code that can be scanned
 * The actual QR image generation is done client-side using a library
 * or via a QR code API service.
 */

import { generateQRData } from "./ticketService";

export type QRCodeData = {
  ticketId: string;
  code: string;
  qrUrl: string;
  qrDataUrl: string; // URL that will be encoded in the QR
};

/**
 * Generate QR code data for a ticket
 * Returns the URL to encode and a link to a QR image API
 */
export function generateTicketQR(
  ticket: { id: string; code: string; secretToken: string },
  baseUrl: string
): QRCodeData {
  const qrDataUrl = generateQRData(ticket, baseUrl);

  // Use a QR code API service for image generation
  // This can be replaced with a self-hosted solution later
  const encodedData = encodeURIComponent(qrDataUrl);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`;

  return {
    ticketId: ticket.id,
    code: ticket.code,
    qrUrl,
    qrDataUrl,
  };
}

/**
 * Generate QR codes for multiple tickets
 */
export function generateTicketQRCodes(
  tickets: Array<{ id: string; code: string; secretToken: string }>,
  baseUrl: string
): QRCodeData[] {
  return tickets.map((ticket) => generateTicketQR(ticket, baseUrl));
}

/**
 * Generate a QR code image URL using an external API
 * For MVP, we use a free QR code API
 * In production, consider self-hosting for privacy
 */
export function getQRImageUrl(data: string, size: number = 200): string {
  const encodedData = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&format=png&margin=10`;
}

/**
 * Generate a QR code as inline SVG data URL
 * This creates a simple QR placeholder - for real QR codes use qrcode library
 */
export function getQRPlaceholderSvg(code: string): string {
  // Simple placeholder - in production, use proper QR library
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="white"/>
      <rect x="20" y="20" width="60" height="60" fill="black"/>
      <rect x="30" y="30" width="40" height="40" fill="white"/>
      <rect x="40" y="40" width="20" height="20" fill="black"/>
      <rect x="120" y="20" width="60" height="60" fill="black"/>
      <rect x="130" y="30" width="40" height="40" fill="white"/>
      <rect x="140" y="40" width="20" height="20" fill="black"/>
      <rect x="20" y="120" width="60" height="60" fill="black"/>
      <rect x="30" y="130" width="40" height="40" fill="white"/>
      <rect x="40" y="140" width="20" height="20" fill="black"/>
      <text x="100" y="110" text-anchor="middle" font-size="12" font-family="monospace">${code}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
