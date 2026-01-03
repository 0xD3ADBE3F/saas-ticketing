import { NextResponse } from "next/server";
import { prisma } from "@/server/lib/prisma";

/**
 * GET /api/wallet/status
 *
 * Check wallet certificate status (debug endpoint)
 */
export async function GET() {
  try {
    const appleCert = await prisma.walletCertificate.findFirst({
      where: {
        platform: "APPLE",
      },
      select: {
        id: true,
        platform: true,
        passTypeId: true,
        teamId: true,
        expiresAt: true,
        createdAt: true,
        certificatePem: true,
        privateKeyPem: true,
      },
    });

    const googleCert = await prisma.walletCertificate.findFirst({
      where: {
        platform: "GOOGLE",
      },
      select: {
        id: true,
        platform: true,
        issuerId: true,
        serviceAccount: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const now = new Date();

    return NextResponse.json({
      apple: appleCert ? {
        configured: true,
        passTypeId: appleCert.passTypeId,
        teamId: appleCert.teamId,
        expiresAt: appleCert.expiresAt,
        isExpired: appleCert.expiresAt < now,
        hasCertificate: !!appleCert.certificatePem,
        hasPrivateKey: !!appleCert.privateKeyPem,
        certificateLength: appleCert.certificatePem?.length || 0,
        privateKeyLength: appleCert.privateKeyPem?.length || 0,
      } : {
        configured: false,
      },
      google: googleCert ? {
        configured: true,
        issuerId: googleCert.issuerId,
        expiresAt: googleCert.expiresAt,
        isExpired: googleCert.expiresAt < now,
        hasServiceAccount: !!googleCert.serviceAccount,
        serviceAccountLength: googleCert.serviceAccount?.length || 0,
      } : {
        configured: false,
      },
    });
  } catch (error) {
    console.error("Wallet status check error:", error);
    return NextResponse.json(
      { error: "Failed to check wallet status" },
      { status: 500 }
    );
  }
}
