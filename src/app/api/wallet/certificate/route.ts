import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { encrypt } from "@/server/lib/encryption";
import { prisma } from "@/server/lib/prisma";

/**
 * POST /api/wallet/certificate
 *
 * Upload or update organization's Apple Wallet certificate
 *
 * Body: {
 *   organizationId: string;
 *   passTypeId: string;
 *   teamId: string;
 *   certificatePem: string;
 *   privateKeyPem: string;
 *   expiresAt: string; // ISO date
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      organizationId,
      passTypeId,
      teamId,
      certificatePem,
      privateKeyPem,
      expiresAt,
    } = await request.json();

    // Get user's organizations
    const organizations = await getUserOrganizations(user.id);
    const userOrgIds = organizations.map((org) => org.id);

    // Verify user belongs to organization
    if (!userOrgIds.includes(organizationId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate inputs
    if (
      !passTypeId ||
      !teamId ||
      !certificatePem ||
      !privateKeyPem ||
      !expiresAt
    ) {
      return NextResponse.json(
        { error: "Alle velden zijn verplicht" },
        { status: 400 }
      );
    }

    // Validate PEM format
    if (
      !certificatePem.includes("BEGIN CERTIFICATE") ||
      !certificatePem.includes("END CERTIFICATE")
    ) {
      return NextResponse.json(
        { error: "Ongeldig certificaat formaat. Gebruik PEM formaat." },
        { status: 400 }
      );
    }

    if (
      !privateKeyPem.includes("BEGIN") ||
      !privateKeyPem.includes("PRIVATE KEY")
    ) {
      return NextResponse.json(
        { error: "Ongeldig private key formaat. Gebruik PEM formaat." },
        { status: 400 }
      );
    }

    // Validate Team ID format (10 characters)
    if (!/^[A-Z0-9]{10}$/.test(teamId)) {
      return NextResponse.json(
        { error: "Team ID moet 10 karakters zijn (hoofdletters en cijfers)" },
        { status: 400 }
      );
    }

    // Validate expiration date
    const expirationDate = new Date(expiresAt);
    if (expirationDate <= new Date()) {
      return NextResponse.json(
        { error: "Vervaldatum moet in de toekomst liggen" },
        { status: 400 }
      );
    }

    // Encrypt sensitive data
    const encryptedCertificate = encrypt(certificatePem.trim());
    const encryptedPrivateKey = encrypt(privateKeyPem.trim());

    // Check if certificate exists for APPLE platform (platform-wide, not per-org)
    const existing = await prisma.walletCertificate.findUnique({
      where: { platform: "APPLE" },
    });

    if (existing) {
      // Update existing certificate
      await prisma.walletCertificate.update({
        where: { platform: "APPLE" },
        data: {
          passTypeId: passTypeId.trim(),
          teamId: teamId.trim(),
          certificatePem: encryptedCertificate,
          privateKeyPem: encryptedPrivateKey,
          expiresAt: expirationDate,
        },
      });
    } else {
      // Create new certificate (platform-wide)
      await prisma.walletCertificate.create({
        data: {
          platform: "APPLE",
          passTypeId: passTypeId.trim(),
          teamId: teamId.trim(),
          certificatePem: encryptedCertificate,
          privateKeyPem: encryptedPrivateKey,
          expiresAt: expirationDate,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Certificaat succesvol opgeslagen",
    });
  } catch (error) {
    console.error("Certificate upload error:", error);

    // Don't expose encryption errors to client
    if (
      error instanceof Error &&
      error.message.includes("WALLET_CERT_ENCRYPTION_KEY")
    ) {
      return NextResponse.json(
        {
          error:
            "Server configuratie fout. Neem contact op met support. (Encryption key missing)",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het opslaan van het certificaat" },
      { status: 500 }
    );
  }
}
