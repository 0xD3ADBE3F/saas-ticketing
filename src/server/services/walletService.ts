/**
 * Apple Wallet Service
 *
 * Generates .pkpass files for Apple Wallet (PassKit).
 *
 * Key requirements for a valid .pkpass:
 * 1. pass.json - Contains pass data and must have all required fields
 * 2. manifest.json - SHA1 hashes of ALL files in the archive
 * 3. signature - PKCS#7 detached signature of manifest.json (must include WWDR cert)
 * 4. icon.png - REQUIRED - 29x29pt image shown in notifications
 * 5. icon@2x.png - 58x58px for retina displays
 *
 * Common issues that cause "Safari cannot download this file":
 * - Missing icon.png (REQUIRED by Apple)
 * - Incorrect PKCS#7 signature format
 * - Missing WWDR intermediate certificate in signature chain
 * - Incorrect manifest hashes
 * - Corrupted ZIP structure
 */

import { generateQRData } from "./ticketService";
import { walletPassRepo } from "../repos/walletPassRepo";
import { decrypt } from "../lib/encryption";
import { prisma } from "../lib/prisma";
import crypto from "crypto";
import forge from "node-forge";
import archiver from "archiver";
import { put } from "@vercel/blob";
import zlib from "zlib";

// ============================================================================
// Types
// ============================================================================

export type WalletPassData = {
  ticketId: string;
  ticketCode: string;
  secretToken: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string | null;
  ticketTypeName: string;
  buyerName: string | null;
  organizationName: string;
  organizationLogo?: string;
  brandColor?: string;
};

export type WalletServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: string };

// ============================================================================
// Logging Helper
// ============================================================================

const LOG_PREFIX = "[WalletService]";

function log(level: "info" | "warn" | "error", message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} ${LOG_PREFIX} [${level.toUpperCase()}] ${message}`;

  if (data) {
    console[level](logMessage, data);
  } else {
    console[level](logMessage);
  }
}

// ============================================================================
// Apple WWDR Certificate (required for signing)
// ============================================================================

/**
 * Apple Worldwide Developer Relations (WWDR) G4 Certificate
 *
 * This intermediate certificate MUST be included in the PKCS#7 signature.
 * Without it, iOS will reject the pass.
 *
 * Download from: https://www.apple.com/certificateauthority/
 * File: AppleWWDRCAG4.cer
 * Valid: 2020-12-16 to 2030-12-10
 */
const APPLE_WWDR_G4_CERT = `-----BEGIN CERTIFICATE-----
MIIEVTCCAz2gAwIBAgIUE9x3lVJx5T3GMujM/+Uh88zFztIwDQYJKoZIhvcNAQEL
BQAwYjELMAkGA1UEBhMCVVMxEzARBgNVBAoTCkFwcGxlIEluYy4xJjAkBgNVBAsT
HUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRYwFAYDVQQDEw1BcHBsZSBS
b290IENBMB4XDTIwMTIxNjE5MzYwNFoXDTMwMTIxMDAwMDAwMFowdTFEMEIGA1UE
Aww7QXBwbGUgV29ybGR3aWRlIERldmVsb3BlciBSZWxhdGlvbnMgQ2VydGlmaWNh
dGlvbiBBdXRob3JpdHkxCzAJBgNVBAsMAkc0MRMwEQYDVQQKDApBcHBsZSBJbmMu
MQswCQYDVQQGEwJVUzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANAf
eKp6JzKwRl/nF3bYoJ0OKY6tPTKlxGs3yeRBkWq3eXFdDDQEYHX3rkOPR8SGHgjo
v9Y5Ui8eZ/xx8YJtPH4GUnadLLzVQ+mxtLxAOnhRXVGhJeG+bJGdayFZGEHVD41t
QSo5SiHgkJ9OE0/QjJoyuNdqkh4laqQyziIZhQVg3AJK8lrrd3kCfcCXVGySjnYB
5kaP5eYq+6KwrRitbTOFOCOL6oqW7Z+uZk+jDEAnbZXQYojZQykn/e2kv1MukBVl
PNkuYmQzHWxq3Y4hqqRfFcYw7V/mjDaSlLfcOQIA+2SM1AyB8j/VNJeHdSbCb64D
YyEMe9QbsWLFApy9/a8CAwEAAaOB7zCB7DASBgNVHRMBAf8ECDAGAQH/AgEAMB8G
A1UdIwQYMBaAFCvQaUeUdgn+9GuNLkCm90dNfwheMEQGCCsGAQUFBwEBBDgwNjA0
BggrBgEFBQcwAYYoaHR0cDovL29jc3AuYXBwbGUuY29tL29jc3AwMy1hcHBsZXJv
b3RjYTAuBgNVHR8EJzAlMCOgIaAfhh1odHRwOi8vY3JsLmFwcGxlLmNvbS9yb290
LmNybDAdBgNVHQ4EFgQUW9n6HeeaGgujmXYiUIY+kchbd6gwDgYDVR0PAQH/BAQD
AgEGMBAGCiqGSIb3Y2QGAgEEAgUAMA0GCSqGSIb3DQEBCwUAA4IBAQA/Vj2e5bbD
eeZFIGi9v3OLLBKeAuOugCKMBB7DUshwgKj7zqew1UJEggOCTwb8O0kU+9h0UoWv
p50h5wESA5/NQFjQAde/MoMrU1goPO6cn1R2PWQnxn6NHThNLa6B5rmluJyJlPef
x4elUWY0GzlxOSTjh2fvpbFoe4zuPfeutnvi0v/fYcZqdUmVIkSoBPyUuAsuORFJ
EtHlgepZAE9bPFo22noicwkJac3AfOriJP6YRLj477JxPxpd1F1+M02cHSS+APCQ
A1iZQT0xWmJArzmoUUOSqwSonMJNsUvSq3xKX+udO7xPiEAGE/+QF4oIRynoYpgp
pU8RBWk6z/Kf
-----END CERTIFICATE-----`;

// ============================================================================
// Default Icons (PNG generation)
// ============================================================================

// CRC32 lookup table for PNG
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): Buffer {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  crc = (crc ^ 0xffffffff) >>> 0;
  const result = Buffer.alloc(4);
  result.writeUInt32BE(crc, 0);
  return result;
}

/**
 * Generates a colored PNG image as a Buffer
 * Creates a solid color rectangle that's valid for Apple Wallet
 *
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 */
function generateColoredPng(width: number, height: number, r: number, g: number, b: number): Buffer {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk (image header)
  const bitDepth = 8;
  const colorType = 2; // RGB
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(bitDepth, 8);
  ihdrData.writeUInt8(colorType, 9);
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrCrc = crc32(Buffer.concat([Buffer.from("IHDR"), ihdrData]));
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), // length
    Buffer.from("IHDR"),
    ihdrData,
    ihdrCrc,
  ]);

  // IDAT chunk (image data)
  const rawData = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 3 + 1)] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 3 + 1) + 1 + x * 3;
      rawData[offset] = r;
      rawData[offset + 1] = g;
      rawData[offset + 2] = b;
    }
  }

  // Compress with zlib (deflate)
  const compressedData = zlib.deflateSync(rawData);

  const idatCrc = crc32(Buffer.concat([Buffer.from("IDAT"), compressedData]));
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(compressedData.length, 0);
  const idat = Buffer.concat([idatLength, Buffer.from("IDAT"), compressedData, idatCrc]);

  // IEND chunk (image end)
  const iendCrc = crc32(Buffer.from("IEND"));
  const iend = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from("IEND"), iendCrc]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

/**
 * Parse hex color to RGB components
 */
function parseHexColor(hexColor?: string): { r: number; g: number; b: number } | null {
  if (!hexColor) return null;
  const hex = hexColor.replace("#", "");
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

/**
 * Generate a contrasting text color (white or black) based on background
 */
function getContrastColor(hexColor?: string): string {
  const rgb = parseHexColor(hexColor);
  if (!rgb) return "rgb(255, 255, 255)"; // Default white

  // Calculate luminance using perceived brightness formula
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)";
}

/**
 * Lighten/darken a color by adjusting brightness
 */
function adjustColor(hexColor: string | undefined, amount: number): string {
  const rgb = parseHexColor(hexColor) || { r: 0x1a, g: 0x36, b: 0x5d };
  const adjust = (c: number) => Math.min(255, Math.max(0, Math.round(c + amount)));
  return `rgb(${adjust(rgb.r)}, ${adjust(rgb.g)}, ${adjust(rgb.b)})`;
}

/**
 * Fetch organization logo and return as PNG buffers
 * Falls back to null if logo cannot be fetched (will use logoText instead)
 */
async function fetchLogoImage(
  logoUrl: string | undefined
): Promise<{ logo: Buffer; logo2x: Buffer; logo3x: Buffer } | null> {
  if (!logoUrl) {
    log("info", "No logo URL provided, will use logoText instead");
    return null;
  }

  try {
    log("info", "Fetching organization logo", { logoUrl });
    const response = await fetch(logoUrl, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      log("warn", "Failed to fetch logo", { status: response.status });
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const buffer = Buffer.from(await response.arrayBuffer());

    // Check if it's a PNG (required for Apple Wallet)
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;

    if (isPng || contentType.includes("png")) {
      log("info", "Logo is PNG format, using directly", { size: buffer.length });
      // Use same image for all sizes (Apple will scale down if needed)
      return {
        logo: buffer,
        logo2x: buffer,
        logo3x: buffer,
      };
    }

    // For JPEG/WebP etc., we can't convert without sharp/canvas
    // Log and fall back to logoText
    log("warn", "Logo is not PNG format, will use logoText instead", { contentType });
    return null;
  } catch (error) {
    log("warn", "Error fetching logo", {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

// Pre-generate default icons at startup (dark blue)
const DEFAULT_ICON_29 = generateColoredPng(29, 29, 0x1a, 0x36, 0x5d);
const DEFAULT_ICON_58 = generateColoredPng(58, 58, 0x1a, 0x36, 0x5d);
const DEFAULT_ICON_87 = generateColoredPng(87, 87, 0x1a, 0x36, 0x5d);

// ============================================================================
// Main API
// ============================================================================

/**
 * Generate an Apple Wallet pass (.pkpass file)
 *
 * @param data - Ticket and event information
 * @param baseUrl - Base URL for QR code generation
 * @returns Buffer containing the .pkpass file or error
 */
export async function generateApplePass(
  data: WalletPassData,
  baseUrl: string
): Promise<WalletServiceResult<Buffer>> {
  log("info", "Starting Apple Wallet pass generation", {
    ticketId: data.ticketId,
    ticketCode: data.ticketCode,
    eventTitle: data.eventTitle,
  });

  try {
    // Step 1: Load and validate certificate
    log("info", "Loading Apple Wallet certificate...");
    const certResult = await loadAppleCertificate();
    if (!certResult.success) {
      return certResult;
    }
    const { certificatePem, privateKeyPem, passTypeId, teamId } = certResult.data;
    log("info", "Certificate loaded successfully", { passTypeId, teamId });

    // Step 2: Generate QR code data
    log("info", "Generating QR code data...");
    const qrData = generateQRData(
      { id: data.ticketId, secretToken: data.secretToken },
      baseUrl
    );
    log("info", "QR code generated", { qrDataLength: qrData.length });

    // Step 3: Create pass.json
    const serialNumber = crypto.randomUUID();
    log("info", "Creating pass.json", { serialNumber });

    const passJson = createPassJson({
      ...data,
      passTypeId,
      teamId,
      serialNumber,
      qrData,
      baseUrl,
    });

    // Step 4: Prepare all files for the archive
    log("info", "Preparing pass files...");

    // Generate icons using brand color (or default dark blue)
    const brandRgb = parseHexColor(data.brandColor) || { r: 0x1a, g: 0x36, b: 0x5d };
    const icon29 = generateColoredPng(29, 29, brandRgb.r, brandRgb.g, brandRgb.b);
    const icon58 = generateColoredPng(58, 58, brandRgb.r, brandRgb.g, brandRgb.b);
    const icon87 = generateColoredPng(87, 87, brandRgb.r, brandRgb.g, brandRgb.b);

    const files: Record<string, Buffer> = {
      "pass.json": Buffer.from(JSON.stringify(passJson, null, 2), "utf8"),
      "icon.png": icon29,
      "icon@2x.png": icon58,
      "icon@3x.png": icon87,
    };

    // Try to fetch organization logo
    const logoImages = await fetchLogoImage(data.organizationLogo);
    if (logoImages) {
      files["logo.png"] = logoImages.logo;
      files["logo@2x.png"] = logoImages.logo2x;
      files["logo@3x.png"] = logoImages.logo3x;
      log("info", "Added organization logo to pass");
    } else {
      log("info", "No logo added, will display logoText instead");
    }

    // Step 5: Create manifest.json with SHA1 hashes
    log("info", "Creating manifest with SHA1 hashes...");
    const manifest: Record<string, string> = {};
    for (const [filename, content] of Object.entries(files)) {
      manifest[filename] = sha1Hash(content);
      log("info", `  ${filename}: ${manifest[filename]}`);
    }
    const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");

    // Step 6: Sign the manifest
    log("info", "Signing manifest with PKCS#7...");
    const signatureResult = signManifest(manifestBuffer, certificatePem, privateKeyPem);
    if (!signatureResult.success) {
      return signatureResult;
    }
    log("info", "Manifest signed successfully", {
      signatureSize: signatureResult.data.length,
    });

    // Step 7: Create ZIP archive
    log("info", "Creating .pkpass ZIP archive...");
    const pkpassBuffer = await createPkpassArchive({
      ...files,
      "manifest.json": manifestBuffer,
      signature: signatureResult.data,
    });
    log("info", "Archive created", { archiveSize: pkpassBuffer.length });

    // Step 8: Store in blob storage
    log("info", "Uploading to blob storage...");
    const blobFilename = `wallet-passes/apple/${data.ticketCode}-${serialNumber}.pkpass`;
    const blob = await put(blobFilename, pkpassBuffer, {
      access: "public",
      contentType: "application/vnd.apple.pkpass",
      addRandomSuffix: false,
    });
    log("info", "Uploaded to blob storage", { url: blob.url });

    // Step 9: Store pass record in database
    log("info", "Storing pass record in database...");
    await walletPassRepo.create({
      ticketId: data.ticketId,
      platform: "APPLE",
      serialNumber,
      passUrl: blob.url,
    });
    log("info", "Pass record stored");

    log("info", "Apple Wallet pass generated successfully!", {
      ticketId: data.ticketId,
      serialNumber,
      archiveSize: pkpassBuffer.length,
    });

    return { success: true, data: pkpassBuffer };
  } catch (error) {
    log("error", "Failed to generate Apple Wallet pass", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: "Kon Apple Wallet pass niet genereren",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Certificate Loading
// ============================================================================

type CertificateData = {
  certificatePem: string;
  privateKeyPem: string;
  passTypeId: string;
  teamId: string;
};

async function loadAppleCertificate(): Promise<WalletServiceResult<CertificateData>> {
  const cert = await prisma.walletCertificate.findFirst({
    where: {
      platform: "APPLE",
      expiresAt: { gt: new Date() },
    },
  });

  if (!cert) {
    log("error", "No valid Apple Wallet certificate found");
    return {
      success: false,
      error: "Apple Wallet certificaat niet gevonden of verlopen",
      details: "Upload een geldig certificaat in de platform instellingen",
    };
  }

  if (!cert.certificatePem || !cert.privateKeyPem || !cert.passTypeId || !cert.teamId) {
    log("error", "Apple Wallet certificate is incomplete", {
      hasCertPem: !!cert.certificatePem,
      hasKeyPem: !!cert.privateKeyPem,
      hasPassTypeId: !!cert.passTypeId,
      hasTeamId: !!cert.teamId,
    });
    return {
      success: false,
      error: "Apple Wallet certificaat is incompleet",
      details: "Certificaat, private key, Pass Type ID en Team ID zijn allemaal vereist",
    };
  }

  try {
    const certificatePem = decrypt(cert.certificatePem);
    const privateKeyPem = decrypt(cert.privateKeyPem);

    // Validate the certificate can be parsed
    forge.pki.certificateFromPem(certificatePem);
    forge.pki.privateKeyFromPem(privateKeyPem);

    return {
      success: true,
      data: {
        certificatePem,
        privateKeyPem,
        passTypeId: cert.passTypeId,
        teamId: cert.teamId,
      },
    };
  } catch (error) {
    log("error", "Failed to decrypt/parse certificate", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: "Kon certificaat niet lezen",
      details: error instanceof Error ? error.message : "Ongeldige certificaat data",
    };
  }
}

// ============================================================================
// Pass.json Creation
// ============================================================================

type CreatePassJsonParams = WalletPassData & {
  passTypeId: string;
  teamId: string;
  serialNumber: string;
  qrData: string;
  baseUrl: string;
};

function createPassJson(params: CreatePassJsonParams) {
  const {
    passTypeId,
    teamId,
    serialNumber,
    organizationName,
    eventTitle,
    eventDate,
    eventLocation,
    ticketTypeName,
    ticketCode,
    buyerName,
    brandColor,
    qrData,
  } = params;

  // Parse brand color or use default (dark blue)
  const bgColor = parseColorToRgb(brandColor) || "rgb(26, 54, 93)";
  // Get contrasting text color based on background luminance
  const textColor = getContrastColor(brandColor);
  // Slightly lighter label color for visual hierarchy
  const labelColor = adjustColor(brandColor, 80);

  // Format date beautifully in Dutch
  const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedDate = dateFormatter.format(eventDate);
  const formattedTime = timeFormatter.format(eventDate);
  // Capitalize first letter of weekday
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return {
    formatVersion: 1,
    passTypeIdentifier: passTypeId,
    serialNumber,
    teamIdentifier: teamId,
    organizationName,
    description: `Ticket voor ${eventTitle}`,

    // Logo text - shown next to logo image (or alone if no logo)
    logoText: organizationName,

    // Barcode - QR code with ticket verification URL
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: qrData,
        messageEncoding: "iso-8859-1",
      },
    ],

    // Visual styling with smart color selection
    backgroundColor: bgColor,
    foregroundColor: textColor,
    labelColor: labelColor,

    // Event ticket structure with enhanced layout
    eventTicket: {
      // Header fields - always visible even when passes are stacked
      headerFields: [
        {
          key: "time",
          label: "TIJD",
          value: formattedTime,
        },
      ],
      // Primary fields - most prominent, event name
      primaryFields: [
        {
          key: "event",
          label: "EVENEMENT",
          value: eventTitle,
        },
      ],
      // Secondary fields - date and location in a row
      secondaryFields: [
        {
          key: "date",
          label: "DATUM",
          value: capitalizedDate,
        },
        {
          key: "location",
          label: "LOCATIE",
          value: eventLocation || "Zie details",
          textAlignment: "PKTextAlignmentRight",
        },
      ],
      // Auxiliary fields - ticket type and code
      auxiliaryFields: [
        {
          key: "ticketType",
          label: "TICKET TYPE",
          value: ticketTypeName,
        },
        {
          key: "ticketCode",
          label: "TICKET CODE",
          value: ticketCode,
          textAlignment: "PKTextAlignmentRight",
        },
      ],
      // Back fields - detailed information on the back of the pass
      backFields: [
        {
          key: "holder",
          label: "TICKETHOUDER",
          value: buyerName || "Algemene toegang",
        },
        {
          key: "eventDateTime",
          label: "DATUM EN TIJD",
          value: `${capitalizedDate} om ${formattedTime}`,
        },
        {
          key: "fullLocation",
          label: "LOCATIE",
          value: eventLocation || "Zie event details voor locatie informatie",
        },
        {
          key: "organizer",
          label: "GEORGANISEERD DOOR",
          value: organizationName,
        },
        {
          key: "info",
          label: "BELANGRIJKE INFORMATIE",
          value:
            "• Toon deze QR-code bij de ingang\n• Dit ticket is strikt persoonlijk\n• Niet overdraagbaar of door te verkopen\n• Bewaar dit ticket tot na het evenement",
        },
      ],
    },

    // Relevance - show pass on lock screen near event time
    relevantDate: eventDate.toISOString(),
  };
}

/**
 * Parse hex color to RGB format for Apple Wallet
 */
function parseColorToRgb(color: string | undefined): string | null {
  if (!color) return null;

  // Handle hex colors
  const hex = color.replace("#", "");
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Already in rgb format
  if (color.startsWith("rgb")) {
    return color;
  }

  return null;
}

// ============================================================================
// Cryptographic Functions
// ============================================================================

/**
 * Calculate SHA1 hash of content
 * Required for Apple Wallet manifest
 */
function sha1Hash(content: Buffer | string): string {
  const buffer = typeof content === "string" ? Buffer.from(content, "utf8") : content;
  return crypto.createHash("sha1").update(buffer).digest("hex");
}

/**
 * Sign manifest using PKCS#7 (CMS) detached signature
 *
 * Apple requires:
 * 1. Detached signature (content not included in signature)
 * 2. SHA256 digest algorithm (SHA1 deprecated)
 * 3. Certificate chain including WWDR intermediate certificate
 * 4. Signing-time authenticated attribute
 */
function signManifest(
  manifest: Buffer,
  certificatePem: string,
  privateKeyPem: string
): WalletServiceResult<Buffer> {
  try {
    // Parse certificates
    const signingCert = forge.pki.certificateFromPem(certificatePem);
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const wwdrCert = forge.pki.certificateFromPem(APPLE_WWDR_G4_CERT);

    log("info", "Certificate parsed", {
      subject: signingCert.subject.getField("CN")?.value,
      issuer: signingCert.issuer.getField("CN")?.value,
      validFrom: signingCert.validity.notBefore,
      validTo: signingCert.validity.notAfter,
    });

    // Create PKCS#7 signed data structure
    const p7 = forge.pkcs7.createSignedData();

    // Set content (manifest)
    p7.content = forge.util.createBuffer(manifest.toString("binary"));

    // Add certificate chain - signing cert first, then intermediate
    p7.addCertificate(signingCert);
    p7.addCertificate(wwdrCert);

    // Add signer with SHA256 digest (modern, recommended by Apple)
    p7.addSigner({
      key: privateKey,
      certificate: signingCert,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data,
        },
        {
          type: forge.pki.oids.messageDigest,
          // Value will be auto-calculated
        },
        {
          type: forge.pki.oids.signingTime,
          value: new Date().toISOString(),
        },
      ],
    });

    // Sign in detached mode (required for .pkpass)
    p7.sign({ detached: true });

    // Convert to DER format
    const asn1 = p7.toAsn1();
    const der = forge.asn1.toDer(asn1).getBytes();
    const signatureBuffer = Buffer.from(der, "binary");

    log("info", "Signature created", { signatureSize: signatureBuffer.length });

    return { success: true, data: signatureBuffer };
  } catch (error) {
    log("error", "Failed to sign manifest", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: "Kon manifest niet ondertekenen",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate authentication token for pass updates
 */
function generateAuthToken(ticketId: string): string {
  return crypto
    .createHmac("sha256", process.env.TICKET_SIGNING_SECRET || "fallback-secret")
    .update(ticketId)
    .digest("hex")
    .substring(0, 32);
}

// ============================================================================
// Archive Creation
// ============================================================================

/**
 * Create .pkpass ZIP archive
 *
 * Apple requirements:
 * - No compression (store mode) - Actually, Apple accepts deflate too
 * - No extra metadata files (like .DS_Store)
 * - Files at root level (no subdirectories)
 */
async function createPkpassArchive(files: Record<string, Buffer>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip", {
      zlib: { level: 0 }, // No compression - some implementations require this
    });

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", (err: Error) => reject(err));

    // Add all files to archive at root level
    for (const [filename, content] of Object.entries(files)) {
      archive.append(content, { name: filename });
    }

    archive.finalize();
  });
}

// ============================================================================
// Google Wallet (Stub)
// ============================================================================

/**
 * Generate Google Wallet pass
 * TODO: Implement when Google Wallet API is set up
 */
export async function generateGooglePass(
  data: WalletPassData,
  baseUrl: string
): Promise<WalletServiceResult<string>> {
  log("warn", "Google Wallet not yet implemented");

  // Store pass record for tracking
  const serialNumber = crypto.randomUUID();
  const objectId = `${data.organizationName}.${data.eventTitle}.${data.ticketId}`.replace(
    /\s+/g,
    "_"
  );

  try {
    await walletPassRepo.create({
      ticketId: data.ticketId,
      platform: "GOOGLE",
      serialNumber,
      googlePassId: objectId,
    });
  } catch (error) {
    log("error", "Failed to create Google pass record", { error });
  }

  return {
    success: false,
    error: "Google Wallet integratie is nog niet beschikbaar",
    details: "Neem contact op met support voor meer informatie",
  };
}

// ============================================================================
// Pass Management
// ============================================================================

/**
 * Update existing wallet pass
 */
export async function updateWalletPass(
  ticketId: string,
  _updates: Partial<WalletPassData>
): Promise<WalletServiceResult<void>> {
  log("info", "Updating wallet pass", { ticketId });

  try {
    const pass = await walletPassRepo.findByTicketId(ticketId);

    if (!pass) {
      return { success: false, error: "Pass niet gevonden" };
    }

    // TODO: Implement platform-specific update mechanisms
    // - Apple: Send push notification via APNs
    // - Google: Update pass object via API

    await walletPassRepo.touch(pass.id);
    log("info", "Pass record updated", { passId: pass.id });

    return { success: true, data: undefined };
  } catch (error) {
    log("error", "Failed to update wallet pass", { error });
    return { success: false, error: "Kon pass niet updaten" };
  }
}

/**
 * Invalidate/delete wallet pass
 */
export async function invalidateWalletPass(
  ticketId: string
): Promise<WalletServiceResult<void>> {
  log("info", "Invalidating wallet pass", { ticketId });

  try {
    const pass = await walletPassRepo.findByTicketId(ticketId);

    if (!pass) {
      log("info", "Pass not found, nothing to invalidate");
      return { success: true, data: undefined };
    }

    // TODO: Implement platform-specific invalidation
    await walletPassRepo.delete(ticketId);
    log("info", "Pass invalidated", { passId: pass.id });

    return { success: true, data: undefined };
  } catch (error) {
    log("error", "Failed to invalidate wallet pass", { error });
    return { success: false, error: "Kon pass niet ongeldig maken" };
  }
}

// ============================================================================
// Utility Exports
// ============================================================================

export { generateAuthToken, sha1Hash };
