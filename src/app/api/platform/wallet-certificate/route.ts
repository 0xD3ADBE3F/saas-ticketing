import { NextRequest, NextResponse } from "next/server";
import { getSuperAdmin } from "@/server/lib/platformAdmin";
import { encrypt } from "@/server/lib/encryption";
import { prisma } from "@/server/lib/prisma";
import { getUser } from "@/server/lib/supabase";

/**
 * POST /api/platform/wallet-certificate
 *
 * Upload or update platform-wide wallet certificate (super admin only)
 *
 * Body: {
 *   platform: "APPLE" | "GOOGLE";
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

    const superAdmin = await getSuperAdmin(user.id);

    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      platform,
      passTypeId,
      teamId,
      certificatePem,
      privateKeyPem,
      expiresAt,
    } = await request.json();

    // Validate platform
    if (platform !== "APPLE" && platform !== "GOOGLE") {
      return NextResponse.json(
        { error: "Invalid platform. Must be APPLE or GOOGLE" },
        { status: 400 }
      );
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
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate PEM format
    if (
      !certificatePem.includes("BEGIN CERTIFICATE") ||
      !certificatePem.includes("END CERTIFICATE")
    ) {
      return NextResponse.json(
        { error: "Invalid certificate format. Use PEM format." },
        { status: 400 }
      );
    }

    if (
      !privateKeyPem.includes("BEGIN") ||
      !privateKeyPem.includes("PRIVATE KEY")
    ) {
      return NextResponse.json(
        { error: "Invalid private key format. Use PEM format." },
        { status: 400 }
      );
    }

    // Validate Team ID format (10 characters)
    if (!/^[A-Z0-9]{10}$/.test(teamId)) {
      return NextResponse.json(
        { error: "Team ID must be 10 characters (uppercase letters and digits)" },
        { status: 400 }
      );
    }

    // Validate expiration date
    const expirationDate = new Date(expiresAt);
    if (expirationDate <= new Date()) {
      return NextResponse.json(
        { error: "Expiration date must be in the future" },
        { status: 400 }
      );
    }

    // Encrypt sensitive data
    const encryptedCertificate = encrypt(certificatePem.trim());
    const encryptedPrivateKey = encrypt(privateKeyPem.trim());

    // Check if certificate exists for this platform
    const existing = await prisma.walletCertificate.findFirst({
      where: { platform },
    });

    if (existing) {
      // Update existing certificate
      await prisma.walletCertificate.update({
        where: { id: existing.id },
        data: {
          passTypeId: passTypeId.trim(),
          teamId: teamId.trim(),
          certificatePem: encryptedCertificate,
          privateKeyPem: encryptedPrivateKey,
          expiresAt: expirationDate,
        },
      });
    } else {
      // Create new certificate
      await prisma.walletCertificate.create({
        data: {
          platform,
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
      message: "Certificate saved successfully",
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
            "Server configuration error. Contact system administrator.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save certificate" },
      { status: 500 }
    );
  }
}
