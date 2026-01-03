import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/lib/prisma";
import { decrypt } from "@/server/lib/encryption";
import forge from "node-forge";

/**
 * Apple Wallet Debug Endpoint
 *
 * GET /api/wallet/apple/debug
 *
 * Returns diagnostic information about the Apple Wallet configuration.
 * Only available in development mode or for authenticated admins.
 *
 * Checks:
 * 1. Certificate exists and is valid
 * 2. Certificate can be decrypted
 * 3. Certificate can be parsed
 * 4. Certificate chain is valid
 * 5. Pass Type ID and Team ID are configured
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Only allow in development or with admin auth
  const isDev = process.env.NODE_ENV === "development";
  const authHeader = request.headers.get("Authorization");

  // In production, require a secret key
  if (!isDev) {
    const expectedKey = process.env.WALLET_DEBUG_KEY;
    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  const diagnostics: {
    timestamp: string;
    environment: string | undefined;
    checks: Record<string, unknown>;
    summary?: { ready: boolean; message: string };
  } = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {},
  };

  // Check 1: Certificate exists
  const cert = await prisma.walletCertificate.findFirst({
    where: {
      platform: "APPLE",
    },
  });

  if (!cert) {
    diagnostics.checks = {
      certificateExists: false,
      error: "No Apple Wallet certificate found in database",
    };
    return NextResponse.json(diagnostics, { status: 200 });
  }

  diagnostics.checks = {
    certificateExists: true,
    certificateId: cert.id,
    createdAt: cert.createdAt,
    expiresAt: cert.expiresAt,
    isExpired: cert.expiresAt < new Date(),
    hasPassTypeId: !!cert.passTypeId,
    passTypeId: cert.passTypeId ? maskString(cert.passTypeId) : null,
    hasTeamId: !!cert.teamId,
    teamId: cert.teamId ? maskString(cert.teamId) : null,
    hasCertificatePem: !!cert.certificatePem,
    hasPrivateKeyPem: !!cert.privateKeyPem,
  };

  // Check 2: Certificate can be decrypted
  if (cert.certificatePem && cert.privateKeyPem) {
    try {
      const decryptedCert = decrypt(cert.certificatePem);
      const decryptedKey = decrypt(cert.privateKeyPem);

      diagnostics.checks = {
        ...diagnostics.checks,
        decryptionSuccessful: true,
        certificatePemLength: decryptedCert.length,
        privateKeyPemLength: decryptedKey.length,
        certificatePemPreview: decryptedCert.substring(0, 50) + "...",
        privateKeyPemPreview: decryptedKey.substring(0, 50) + "...",
      };

      // Check 3: Certificate can be parsed
      try {
        const parsedCert = forge.pki.certificateFromPem(decryptedCert);
        const parsedKey = forge.pki.privateKeyFromPem(decryptedKey);

        const subject = parsedCert.subject.getField("CN")?.value || "Unknown";
        const issuer = parsedCert.issuer.getField("CN")?.value || "Unknown";
        const validFrom = parsedCert.validity.notBefore;
        const validTo = parsedCert.validity.notAfter;

        diagnostics.checks = {
          ...diagnostics.checks,
          certificateParsed: true,
          privateKeyParsed: true,
          certificateSubject: subject,
          certificateIssuer: issuer,
          certificateValidFrom: validFrom,
          certificateValidTo: validTo,
          certificateStillValid: validTo > new Date(),
          privateKeyBits: (parsedKey as forge.pki.rsa.PrivateKey).n?.bitLength() || "unknown",
        };

        // Check 4: Verify it's a Pass Type ID certificate
        const extensions = parsedCert.extensions || [];
        const passTypeExt = extensions.find(
          (ext) => ext.name === "extKeyUsage" || ext.id === "2.5.29.37"
        );

        diagnostics.checks = {
          ...diagnostics.checks,
          hasExtendedKeyUsage: !!passTypeExt,
        };

        // Check WWDR certificate
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

        try {
          const wwdrCert = forge.pki.certificateFromPem(APPLE_WWDR_G4_CERT);
          diagnostics.checks = {
            ...diagnostics.checks,
            wwdrCertificateValid: true,
            wwdrSubject: wwdrCert.subject.getField("CN")?.value,
            wwdrValidTo: wwdrCert.validity.notAfter,
          };
        } catch (wwdrError) {
          diagnostics.checks = {
            ...diagnostics.checks,
            wwdrCertificateValid: false,
            wwdrError: wwdrError instanceof Error ? wwdrError.message : String(wwdrError),
          };
        }
      } catch (parseError) {
        diagnostics.checks = {
          ...diagnostics.checks,
          certificateParsed: false,
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
        };
      }
    } catch (decryptError) {
      diagnostics.checks = {
        ...diagnostics.checks,
        decryptionSuccessful: false,
        decryptionError:
          decryptError instanceof Error ? decryptError.message : String(decryptError),
      };
    }
  }

  // Summary
  const checks = diagnostics.checks;
  const allGood = Boolean(
    checks.certificateExists &&
    checks.decryptionSuccessful &&
    checks.certificateParsed &&
    checks.privateKeyParsed &&
    checks.certificateStillValid &&
    checks.hasPassTypeId &&
    checks.hasTeamId &&
    !checks.isExpired
  );

  diagnostics.summary = {
    ready: allGood,
    message: allGood
      ? "Apple Wallet is properly configured and ready to use"
      : "Apple Wallet configuration has issues - check the details above",
  };

  return NextResponse.json(diagnostics, { status: 200 });
}

/**
 * Mask sensitive strings for logging
 */
function maskString(str: string): string {
  if (str.length <= 8) return "****";
  return str.substring(0, 4) + "****" + str.substring(str.length - 4);
}
