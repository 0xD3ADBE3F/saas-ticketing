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
 * Body for Apple: {
 *   platform: "APPLE";
 *   passTypeId: string;
 *   teamId: string;
 *   certificatePem: string;
 *   privateKeyPem: string;
 *   expiresAt: string; // ISO date
 * }
 *
 * Body for Google: {
 *   platform: "GOOGLE";
 *   issuerId: string;
 *   serviceAccountJson: string;
 *   expiresAt: string; // ISO date (reminder)
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

    const body = await request.json();
    const { platform } = body;

    // Validate platform
    if (platform !== "APPLE" && platform !== "GOOGLE") {
      return NextResponse.json(
        { error: "Invalid platform. Must be APPLE or GOOGLE" },
        { status: 400 }
      );
    }

    // Handle Apple Wallet
    if (platform === "APPLE") {
      return handleAppleCertificate(body);
    }

    // Handle Google Wallet
    return handleGoogleCertificate(body);
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

/**
 * Handle Apple Wallet certificate upload
 */
async function handleAppleCertificate(body: {
  platform: string;
  passTypeId?: string;
  teamId?: string;
  certificatePem?: string;
  privateKeyPem?: string;
  expiresAt?: string;
}) {
  const { passTypeId, teamId, certificatePem, privateKeyPem, expiresAt } = body;

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
    where: { platform: "APPLE" },
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
    message: "Apple Wallet certificate saved successfully",
  });
}

/**
 * Handle Google Wallet service account upload
 */
async function handleGoogleCertificate(body: {
  platform: string;
  issuerId?: string;
  serviceAccountJson?: string;
  expiresAt?: string;
}) {
  const { issuerId, serviceAccountJson, expiresAt } = body;

  // Validate inputs
  if (!issuerId || !serviceAccountJson || !expiresAt) {
    return NextResponse.json(
      { error: "Issuer ID, Service Account JSON, and expiration date are required" },
      { status: 400 }
    );
  }

  // Validate Issuer ID format (numeric)
  if (!/^\d+$/.test(issuerId.trim())) {
    return NextResponse.json(
      { error: "Issuer ID must be a numeric value" },
      { status: 400 }
    );
  }

  // Validate JSON format
  let parsedServiceAccount;
  try {
    parsedServiceAccount = JSON.parse(serviceAccountJson);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON format for service account" },
      { status: 400 }
    );
  }

  // Validate required service account fields
  if (
    !parsedServiceAccount.type ||
    parsedServiceAccount.type !== "service_account" ||
    !parsedServiceAccount.private_key ||
    !parsedServiceAccount.client_email
  ) {
    return NextResponse.json(
      { error: "Service account JSON must contain type, private_key, and client_email" },
      { status: 400 }
    );
  }

  // Validate private key format
  if (
    !parsedServiceAccount.private_key.includes("BEGIN") ||
    !parsedServiceAccount.private_key.includes("PRIVATE KEY")
  ) {
    return NextResponse.json(
      { error: "Invalid private key in service account JSON" },
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
  const encryptedServiceAccount = encrypt(serviceAccountJson.trim());

  // Check if certificate exists for Google platform
  const existing = await prisma.walletCertificate.findFirst({
    where: { platform: "GOOGLE" },
  });

  if (existing) {
    // Update existing certificate
    await prisma.walletCertificate.update({
      where: { id: existing.id },
      data: {
        issuerId: issuerId.trim(),
        serviceAccount: encryptedServiceAccount,
        expiresAt: expirationDate,
      },
    });
  } else {
    // Create new certificate
    await prisma.walletCertificate.create({
      data: {
        platform: "GOOGLE",
        issuerId: issuerId.trim(),
        serviceAccount: encryptedServiceAccount,
        expiresAt: expirationDate,
      },
    });
  }

  return NextResponse.json({
    success: true,
    message: "Google Wallet service account saved successfully",
  });
}
