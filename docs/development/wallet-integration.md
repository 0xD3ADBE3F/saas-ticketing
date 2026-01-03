# Digital Wallet Integration (Apple Wallet & Google Wallet)

**Status:** 🟨 Planned
**Priority:** High
**Estimated Effort:** 16-24 hours (3-4 days)

## Overview

Enable ticket buyers to add their tickets to Apple Wallet (iOS) and Google Wallet (Android). This improves user experience by providing quick access to tickets from the device lock screen, offline access, automatic timezone handling, and push notification support for event updates. The existing cryptographically signed QR code system is fully compatible with both wallet platforms.

## Current State

### ✅ Completed

- Ticket model with unique codes and secret tokens
- QR code generation with HMAC-SHA256 signatures (`{baseUrl}/scan/{ticketId}:{signature}`)
- Secure ticket validation system
- Email delivery with QR codes
- Multi-tenant architecture (organizationId scoping)

### ⬜ To Build

- Apple Wallet pass generation service (PassKit)
- Google Wallet pass generation service (Google Pay API)
- Pass signing infrastructure (certificates/keys)
- API endpoints for pass generation
- "Add to Wallet" UI buttons on ticket display
- Pass template designs for both platforms
- Push notification infrastructure for pass updates
- Organization-specific wallet branding (logo, colors)

---

## Business Requirements

### User Story

As a **ticket buyer**, I want to **add my ticket to Apple Wallet or Google Wallet** so that I can **quickly access my ticket from my lock screen, use it offline at the venue, and receive automatic event updates**.

As an **event organizer**, I want my **organization's branding on the wallet passes** so that **tickets look professional and reinforce my brand**.

### Acceptance Criteria

- [ ] Buyers can add tickets to Apple Wallet on iOS devices
- [ ] Buyers can add tickets to Google Wallet on Android devices
- [ ] QR code on wallet pass matches email QR code (cryptographic signature)
- [ ] Pass displays event name, date, time, location, and ticket type
- [ ] Pass shows organization logo and brand colors
- [ ] Pass works offline at venue
- [ ] Pass can be updated via push notification (e.g., venue change)
- [ ] "Add to Wallet" button appears on ticket confirmation page
- [ ] "Add to Wallet" button appears in order confirmation email
- [ ] System handles expired tickets (removes from wallet)
- [ ] Multi-tenant: each organization can have custom pass styling

### Use Cases

1. **Primary Use Case: Add Ticket to Wallet**
   - User completes purchase → Receives email → Opens ticket page → Taps "Add to Apple/Google Wallet" → Pass downloads → User scans pass at venue

2. **Offline Access:**
   - User arrives at venue with no internet → Opens wallet → Pass displays with QR code → Scanner validates ticket

3. **Event Update Notification:**
   - Organizer changes venue → System sends push notification to all passes → User sees updated location on pass

4. **Edge Cases:**
   - **Refunded ticket:** Remove pass from user's wallet
   - **Multiple tickets in one order:** Generate separate pass for each ticket
   - **Organization without logo:** Use platform default branding
   - **Certificate expiration:** Alert admins 30 days before expiry

---

## Technical Implementation

### A) Database Schema

**New Tables/Models:**

```prisma
model WalletPass {
  id             String   @id @default(uuid())
  ticketId       String   @unique
  platform       WalletPlatform // APPLE or GOOGLE
  serialNumber   String   @unique // Platform-specific serial
  passUrl        String?  // Download URL for .pkpass or Google Wallet link
  googlePassId   String?  @unique // Google Wallet object ID
  issuedAt       DateTime @default(now())
  lastUpdatedAt  DateTime @updatedAt

  // Relations
  ticket         Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([ticketId])
  @@index([serialNumber])
  @@map("wallet_passes")
}

enum WalletPlatform {
  APPLE
  GOOGLE
}

model WalletCertificate {
  id              String   @id @default(uuid())
  organizationId  String   @unique
  platform        WalletPlatform

  // Apple Wallet specific
  passTypeId      String?  // Apple Pass Type ID (e.g., pass.com.entro.ticket)
  teamId          String?  // Apple Team ID
  certificatePem  String?  @db.Text // Encrypted certificate
  privateKeyPem   String?  @db.Text // Encrypted private key

  // Google Wallet specific
  issuerId        String?  // Google Wallet Issuer ID
  serviceAccount  String?  @db.Text // Encrypted service account JSON

  expiresAt       DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([expiresAt])
  @@map("wallet_certificates")
}

// Update Ticket model to include relation
model Ticket {
  // ... existing fields ...
  walletPasses    WalletPass[]
}

// Update Organization model
model Organization {
  // ... existing fields ...
  walletCertificate WalletCertificate?
}
```

**Migrations:**

```sql
-- Migration: add_wallet_integration

CREATE TYPE "WalletPlatform" AS ENUM ('APPLE', 'GOOGLE');

CREATE TABLE "wallet_passes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ticketId" TEXT NOT NULL UNIQUE,
  "platform" "WalletPlatform" NOT NULL,
  "serialNumber" TEXT NOT NULL UNIQUE,
  "passUrl" TEXT,
  "googlePassId" TEXT UNIQUE,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "wallet_passes_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "wallet_certificates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL UNIQUE,
  "platform" "WalletPlatform" NOT NULL,
  "passTypeId" TEXT,
  "teamId" TEXT,
  "certificatePem" TEXT,
  "privateKeyPem" TEXT,
  "issuerId" TEXT,
  "serviceAccount" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "wallet_certificates_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "wallet_passes_ticketId_idx" ON "wallet_passes"("ticketId");
CREATE INDEX "wallet_passes_serialNumber_idx" ON "wallet_passes"("serialNumber");
CREATE INDEX "wallet_certificates_organizationId_idx" ON "wallet_certificates"("organizationId");
CREATE INDEX "wallet_certificates_expiresAt_idx" ON "wallet_certificates"("expiresAt");
```

---

### B) Services

**File:** `src/server/services/walletService.ts`

```typescript
import { Organization } from "@prisma/client";
import crypto from "crypto";

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
  | { success: false; error: string };

/**
 * Generate Apple Wallet pass (.pkpass file)
 *
 * @param data - Ticket and event information
 * @param baseUrl - Base URL for QR code generation
 * @returns .pkpass file buffer or error
 */
export async function generateApplePass(
  data: WalletPassData,
  baseUrl: string
): Promise<WalletServiceResult<Buffer>> {
  try {
    // 1. Generate QR code data (same as email QR)
    const qrData = generateQRData(
      { id: data.ticketId, secretToken: data.secretToken },
      baseUrl
    );

    // 2. Create pass.json structure
    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: "pass.com.entro.ticket", // TODO: Get from organization config
      serialNumber: crypto.randomUUID(),
      teamIdentifier: "YOUR_TEAM_ID", // TODO: Get from organization config
      organizationName: data.organizationName,
      description: data.eventTitle,

      // Barcode (QR code)
      barcodes: [
        {
          format: "PKBarcodeFormatQR",
          message: qrData,
          messageEncoding: "iso-8859-1",
        },
      ],

      // Visual appearance
      backgroundColor: data.brandColor || "rgb(50, 120, 200)",
      foregroundColor: "rgb(255, 255, 255)",
      labelColor: "rgb(255, 255, 255)",

      // Pass content
      eventTicket: {
        primaryFields: [
          {
            key: "event",
            label: "EVENT",
            value: data.eventTitle,
          },
        ],
        secondaryFields: [
          {
            key: "date",
            label: "DATE",
            value: data.eventDate.toISOString(),
            dateStyle: "PKDateStyleMedium",
            timeStyle: "PKDateStyleShort",
          },
        ],
        auxiliaryFields: [
          {
            key: "ticketType",
            label: "TYPE",
            value: data.ticketTypeName,
          },
          {
            key: "ticketCode",
            label: "CODE",
            value: data.ticketCode,
          },
        ],
        backFields: [
          {
            key: "location",
            label: "LOCATION",
            value: data.eventLocation || "TBD",
          },
          {
            key: "holder",
            label: "TICKET HOLDER",
            value: data.buyerName || "General Admission",
          },
        ],
      },

      // Auto-update
      webServiceURL: `${baseUrl}/api/wallet/apple`,
      authenticationToken: generateAuthToken(data.ticketId),
    };

    // 3. Create pass package structure
    // - pass.json
    // - manifest.json (SHA-1 hashes of all files)
    // - signature (PKCS#7 detached signature of manifest)
    // - logo.png, icon.png (organization branding)

    // 4. Sign the pass using organization's certificate
    const passBuffer = await signApplePass(passJson, data.organizationName);

    // 5. Store pass record in database
    await walletPassRepo.create({
      ticketId: data.ticketId,
      platform: "APPLE",
      serialNumber: passJson.serialNumber,
    });

    return { success: true, data: passBuffer };
  } catch (error) {
    console.error("Failed to generate Apple Wallet pass:", error);
    return { success: false, error: "Failed to generate pass" };
  }
}

/**
 * Generate Google Wallet pass (Web API link)
 *
 * @param data - Ticket and event information
 * @param baseUrl - Base URL for QR code generation
 * @returns Google Wallet "Add to Wallet" URL or error
 */
export async function generateGooglePass(
  data: WalletPassData,
  baseUrl: string
): Promise<WalletServiceResult<string>> {
  try {
    // 1. Generate QR code data (same as email QR)
    const qrData = generateQRData(
      { id: data.ticketId, secretToken: data.secretToken },
      baseUrl
    );

    // 2. Create event ticket class (template) - do once per event
    const classId = `${data.organizationName}.${data.eventTitle}`.replace(
      /\s+/g,
      "_"
    );

    // 3. Create event ticket object (individual ticket)
    const objectId = `${classId}.${data.ticketId}`;

    const ticketObject = {
      id: objectId,
      classId: `issuer_id.${classId}`, // TODO: Get issuer_id from organization config
      state: "ACTIVE",

      // QR code
      barcode: {
        type: "QR_CODE",
        value: qrData,
      },

      // Ticket information
      ticketHolderName: data.buyerName || "General Admission",
      ticketNumber: data.ticketCode,

      // Event details
      eventName: {
        defaultValue: {
          language: "nl",
          value: data.eventTitle,
        },
      },

      // Dates
      validTimeInterval: {
        start: {
          date: data.eventDate.toISOString(),
        },
      },

      // Branding
      hexBackgroundColor: data.brandColor || "#3278C8",
      logo: {
        sourceUri: {
          uri: data.organizationLogo || `${baseUrl}/images/default-logo.png`,
        },
      },
    };

    // 4. Call Google Wallet API to create/update object
    const jwt = await generateGoogleWalletJWT(ticketObject);

    // 5. Generate "Add to Google Wallet" link
    const addToWalletUrl = `https://pay.google.com/gp/v/save/${jwt}`;

    // 6. Store pass record in database
    await walletPassRepo.create({
      ticketId: data.ticketId,
      platform: "GOOGLE",
      serialNumber: crypto.randomUUID(),
      googlePassId: objectId,
      passUrl: addToWalletUrl,
    });

    return { success: true, data: addToWalletUrl };
  } catch (error) {
    console.error("Failed to generate Google Wallet pass:", error);
    return { success: false, error: "Failed to generate pass" };
  }
}

/**
 * Update existing wallet pass (e.g., venue change)
 */
export async function updateWalletPass(
  ticketId: string,
  updates: Partial<WalletPassData>
): Promise<WalletServiceResult<void>> {
  // Implementation for push notifications
}

/**
 * Delete/invalidate wallet pass (e.g., refund)
 */
export async function invalidateWalletPass(
  ticketId: string
): Promise<WalletServiceResult<void>> {
  // Implementation to mark pass as void
}

// Helper functions
async function signApplePass(passJson: any, orgName: string): Promise<Buffer> {
  // Sign pass using PKCS#7
}

async function generateGoogleWalletJWT(ticketObject: any): Promise<string> {
  // Generate JWT for Google Wallet API
}

function generateAuthToken(ticketId: string): string {
  // Generate secure token for pass updates
  return crypto.randomBytes(16).toString("hex");
}
```

**File:** `src/server/repos/walletPassRepo.ts`

```typescript
import { prisma } from "@/server/lib/prisma";
import { WalletPlatform } from "@prisma/client";

export const walletPassRepo = {
  /**
   * Create a new wallet pass record
   */
  async create(data: {
    ticketId: string;
    platform: WalletPlatform;
    serialNumber: string;
    passUrl?: string;
    googlePassId?: string;
  }) {
    return await prisma.walletPass.create({
      data: {
        ...data,
        lastUpdatedAt: new Date(),
      },
    });
  },

  /**
   * Find wallet pass by ticket ID
   */
  async findByTicketId(ticketId: string) {
    return await prisma.walletPass.findUnique({
      where: { ticketId },
    });
  },

  /**
   * Find wallet pass by serial number (for Apple Wallet updates)
   */
  async findBySerialNumber(serialNumber: string) {
    return await prisma.walletPass.findUnique({
      where: { serialNumber },
      include: {
        ticket: {
          include: {
            event: true,
            ticketType: true,
            order: true,
          },
        },
      },
    });
  },

  /**
   * Update pass last updated timestamp
   */
  async touch(id: string) {
    return await prisma.walletPass.update({
      where: { id },
      data: { lastUpdatedAt: new Date() },
    });
  },

  /**
   * Delete wallet pass (when ticket is refunded)
   */
  async delete(ticketId: string) {
    return await prisma.walletPass.delete({
      where: { ticketId },
    });
  },
};
```

---

### C) API Routes

**Route:** `/api/wallet/apple/generate`

**Method:** `POST`

```typescript
// src/app/api/wallet/apple/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/services/authService";
import { generateApplePass } from "@/server/services/walletService";
import { ticketRepo } from "@/server/repos/ticketRepo";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate ticket ownership (optional for MVP - tickets are public via URL)
    const { ticketId } = await request.json();

    // 2. Fetch ticket details
    const ticket = await ticketRepo.findById(ticketId);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // 3. Check if ticket belongs to paid order
    if (ticket.order.status !== "PAID") {
      return NextResponse.json(
        { error: "Ticket not valid for wallet" },
        { status: 400 }
      );
    }

    // 4. Generate pass
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const result = await generateApplePass(
      {
        ticketId: ticket.id,
        ticketCode: ticket.code,
        secretToken: ticket.secretToken,
        eventTitle: ticket.event.title,
        eventDate: ticket.event.startsAt,
        eventLocation: ticket.event.location,
        ticketTypeName: ticket.ticketType.name,
        buyerName: ticket.order.buyerName,
        organizationName: ticket.event.organization.name,
      },
      baseUrl
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // 5. Return .pkpass file
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="ticket-${ticket.code}.pkpass"`,
      },
    });
  } catch (error) {
    console.error("Apple Wallet generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Route:** `/api/wallet/apple/v1/passes/{passTypeId}/{serialNumber}`

**Method:** `GET` (Apple Wallet update endpoint)

```typescript
// src/app/api/wallet/apple/v1/passes/[passTypeId]/[serialNumber]/route.ts
// Apple Wallet will call this endpoint to check for updates
export async function GET(
  request: NextRequest,
  { params }: { params: { passTypeId: string; serialNumber: string } }
) {
  // Verify authentication token
  const authToken = request.headers
    .get("Authorization")
    ?.replace("ApplePass ", "");

  // Return updated pass.json if ticket details changed
  // Return 304 Not Modified if no changes
}
```

**Route:** `/api/wallet/google/generate`

**Method:** `POST`

```typescript
// src/app/api/wallet/google/generate/route.ts
// Similar structure to Apple Wallet endpoint
// Returns JSON with "Add to Google Wallet" URL
```

---

### D) UI Components

**Component:** `src/components/checkout/AddToWalletButtons.tsx`

```tsx
"use client";

import { useState } from "react";
import { WalletIcon, Smartphone } from "lucide-react";

type AddToWalletButtonsProps = {
  ticketId: string;
};

export function AddToWalletButtons({ ticketId }: AddToWalletButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const handleAddToAppleWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/wallet/apple/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate pass");
      }

      // Download .pkpass file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-${ticketId}.pkpass`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Kon ticket niet toevoegen aan Apple Wallet");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToGoogleWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/wallet/google/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate pass");
      }

      const { url } = await response.json();

      // Redirect to Google Wallet
      window.location.href = url;
    } catch (err) {
      setError("Kon ticket niet toevoegen aan Google Wallet");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Voeg toe aan wallet voor makkelijke toegang
      </div>

      <div className="flex gap-3">
        {/* Show Apple Wallet button on iOS or desktop */}
        {(isIOS || !isAndroid) && (
          <button
            onClick={handleAddToAppleWallet}
            disabled={loading}
            className="flex-1 bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <WalletIcon className="w-5 h-5" />
            <span>Apple Wallet</span>
          </button>
        )}

        {/* Show Google Wallet button on Android or desktop */}
        {(isAndroid || !isIOS) && (
          <button
            onClick={handleAddToGoogleWallet}
            disabled={loading}
            className="flex-1 bg-white border-2 border-gray-300 text-gray-900 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Smartphone className="w-5 h-5" />
            <span>Google Wallet</span>
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400">
        Je ticket verschijnt in je wallet en kan offline gebruikt worden.
      </div>
    </div>
  );
}
```

**Update:** `src/components/checkout/TicketDisplay.tsx`

```tsx
// Add AddToWalletButtons component below QR code display
import { AddToWalletButtons } from "./AddToWalletButtons";

// Inside ticket card render:
<div className="mt-4 pt-4 border-t">
  <AddToWalletButtons ticketId={ticket.id} />
</div>;
```

**Update:** Email template to include wallet buttons

---

## Implementation Checklist

### Phase 1: Setup & Infrastructure (Day 1)

- [ ] Research and document Apple Developer account requirements
- [ ] Research and document Google Wallet API account requirements
- [ ] Create database migration for `wallet_passes` and `wallet_certificates` tables
- [ ] Run migration on development database
- [ ] Set up environment variables for wallet credentials
- [ ] Install required npm packages (`@walletpass/pass-js`, `googleapis`)

### Phase 2: Apple Wallet Integration (Day 1-2)

- [ ] Create `walletService.ts` with Apple Pass generation
- [ ] Implement PKCS#7 signing for .pkpass files
- [ ] Create `/api/wallet/apple/generate` endpoint
- [ ] Create Apple Wallet update endpoint (for push notifications)
- [ ] Test Apple Wallet pass generation in development
- [ ] Create Apple Wallet pass template with Entro branding
- [ ] Add walletPassRepo CRUD operations

### Phase 3: Google Wallet Integration (Day 2)

- [ ] Implement Google Wallet JWT generation
- [ ] Create `/api/wallet/google/generate` endpoint
- [ ] Create Google Wallet event ticket class
- [ ] Test Google Wallet pass generation in development
- [ ] Design Google Wallet pass template with Entro branding
- [ ] Implement Google Wallet API error handling

### Phase 4: UI Components (Day 2-3)

- [ ] Create `AddToWalletButtons` component
- [ ] Add platform detection (iOS/Android)
- [ ] Integrate buttons into `TicketDisplay` component
- [ ] Update email template with wallet buttons
- [ ] Add loading states and error handling
- [ ] Test responsive design (mobile/desktop)
- [ ] Accessibility audit (keyboard navigation, screen readers)

### Phase 5: Advanced Features (Day 3-4)

- [ ] Implement wallet pass updates (venue changes)
- [ ] Implement pass invalidation (refunds)
- [ ] Add organization-specific branding (logo, colors)
- [ ] Create admin UI for managing wallet certificates
- [ ] Add certificate expiration monitoring/alerts
- [ ] Implement rate limiting for wallet generation

### Phase 6: Testing & Documentation (Day 4)

- [ ] Write unit tests for wallet service functions (>80% coverage)
- [ ] Write integration tests for API endpoints
- [ ] E2E test: Generate and add pass to Apple Wallet
- [ ] E2E test: Generate and add pass to Google Wallet
- [ ] Test pass updates via push notifications
- [ ] Test pass invalidation on refund
- [ ] Update SPEC.md with wallet feature documentation
- [ ] Create API documentation for wallet endpoints
- [ ] Document certificate setup process for organizations

---

## Edge Cases & Error Handling

1. **Certificate Expiration**
   - Problem: Organization's signing certificate expires
   - Solution: Monitor expiration dates, alert admins 30 days in advance, prevent pass generation after expiry
   - Implementation: Cron job checking `wallet_certificates.expiresAt`

2. **Multiple Tickets Per Order**
   - Problem: User orders 5 tickets, needs 5 separate passes
   - Solution: Generate individual pass for each ticket, batch download option
   - Implementation: Loop through tickets array, generate passes asynchronously

3. **Organization Without Certificates**
   - Problem: Organization hasn't set up wallet credentials yet
   - Solution: Use platform default credentials (Entro master account), show setup prompt in dashboard
   - Fallback: Hide "Add to Wallet" buttons if feature not configured

4. **Ticket Already in Wallet**
   - Problem: User tries to add same ticket twice
   - Solution: Check `wallet_passes` table, return existing pass or allow re-download
   - Implementation: Idempotent pass generation

5. **Refunded Ticket**
   - Problem: User has pass in wallet but ticket was refunded
   - Solution: Send push notification to expire pass, update pass state to "void"
   - Implementation: Call `invalidateWalletPass()` in refund flow

6. **Offline Pass Updates**
   - Problem: Pass needs updating but user is offline
   - Solution: Passes update automatically when device reconnects
   - Implementation: Rely on Apple/Google wallet infrastructure

7. **QR Code Mismatch**
   - Problem: Wallet QR differs from email QR
   - Solution: Use exact same `generateQRData()` function for both
   - Validation: Unit test comparing wallet QR and email QR

8. **Rate Limiting**
   - Problem: User spams "Add to Wallet" button
   - Solution: Rate limit per ticket (1 request per 10 seconds)
   - Implementation: Redis cache or in-memory rate limiter

---

## Testing Strategy

### Unit Tests

- `tests/walletService.test.ts`
  - Test Apple Pass JSON generation
  - Test Google Wallet JWT generation
  - Test QR code consistency (wallet vs email)
  - Test pass signing/validation
  - Test certificate encryption/decryption

### Integration Tests

- Test database interactions (wallet_passes CRUD)
- Test Apple Wallet API calls (mocked)
- Test Google Wallet API calls (mocked)
- Test organization certificate lookup
- Test multi-tenant isolation (orgId scoping)

### E2E Tests

- Test complete flow: Purchase → Email → Add to Apple Wallet → Scan at venue
- Test complete flow: Purchase → Email → Add to Google Wallet → Scan at venue
- Test pass update notification flow
- Test refund invalidation flow
- Test multi-ticket order (5 passes generated)

**Example Test:**

```typescript
describe("Wallet Service", () => {
  it("should generate Apple Wallet pass with correct QR code", async () => {
    const ticket = await createMockTicket();
    const baseUrl = "https://example.com";

    const result = await generateApplePass(
      {
        ticketId: ticket.id,
        ticketCode: ticket.code,
        secretToken: ticket.secretToken,
        eventTitle: "Test Event",
        eventDate: new Date(),
        eventLocation: "Test Venue",
        ticketTypeName: "General Admission",
        buyerName: "John Doe",
        organizationName: "Test Org",
      },
      baseUrl
    );

    expect(result.success).toBe(true);

    // Verify QR code matches email QR
    const emailQR = generateQRData(ticket, baseUrl);
    const passJson = JSON.parse(result.data.toString());
    expect(passJson.barcodes[0].message).toBe(emailQR);
  });

  it("should throw error for refunded ticket", async () => {
    const ticket = await createMockTicket({ status: "REFUNDED" });

    await expect(
      generateApplePass(ticket, "https://example.com")
    ).rejects.toThrow("Ticket not valid for wallet");
  });
});
```

---

## Security Considerations

1. **Certificate Storage:**
   - Encrypt private keys and service account JSONs at rest
   - Use environment variable for encryption key
   - Rotate encryption keys annually

2. **Authentication:**
   - Pass update endpoints require authentication token
   - Validate ticket ownership before generating pass
   - Rate limit pass generation (prevent abuse)

3. **QR Code Security:**
   - Use same cryptographic signature as email QR codes
   - HMAC-SHA256 with `TICKET_SIGNING_SECRET`
   - Prevents QR code forgery

4. **Multi-Tenancy:**
   - Always scope queries by `organizationId`
   - Use organization-specific certificates (not global)
   - Prevent cross-organization pass generation

5. **Data Minimization:**
   - Only include necessary ticket information in pass
   - Don't expose sensitive order details
   - Comply with GDPR (buyer can request pass deletion)

6. **Audit Logging:**
   - Log all pass generation events
   - Log pass updates and invalidations
   - Track certificate usage and expiration

---

## Performance Considerations

1. **Pass Generation:**
   - Cache pass templates per event
   - Generate passes asynchronously for large orders
   - Use worker queue for batch processing (>10 tickets)

2. **File Storage:**
   - Store generated .pkpass files in S3/R2 (not database)
   - Set TTL on pass URLs (24 hours, allow regeneration)
   - Use CDN for logo images

3. **API Calls:**
   - Batch Google Wallet API calls where possible
   - Cache organization certificates in Redis (1 hour TTL)
   - Implement retry logic with exponential backoff

4. **Database:**
   - Index `wallet_passes.ticketId` for quick lookups
   - Index `wallet_passes.serialNumber` for Apple Wallet callbacks
   - Archive old pass records after event date (retention: 6 months)

---

## Success Criteria

- ✅ Users can add tickets to Apple Wallet (iOS 12+)
- ✅ Users can add tickets to Google Wallet (Android 5+)
- ✅ QR codes in wallet passes are identical to email QR codes
- ✅ Wallet passes work offline at venue entrance
- ✅ Pass updates delivered within 1 hour of event change
- ✅ Refunded tickets automatically removed from wallets
- ✅ All tests passing (>80% coverage)
- ✅ Pass generation completes in <3 seconds
- ✅ No wallet-related errors in production logs after 1 week
- ✅ Documentation complete (setup guide + API docs)
- ✅ Feature works on iOS and Android devices
- ✅ Accessibility: passes readable by screen readers

---

## Dependencies

### External Services

- ✅ **Apple Developer Account** - $99/year for Pass Type ID and certificates
- ✅ **Google Cloud Project** - Free tier sufficient for MVP
- ✅ **Google Wallet API** - Enable API and create issuer account
- ⬜ **File Storage** - S3/Cloudflare R2 for storing .pkpass files
- ⬜ **Certificate Management** - Process for organizations to upload certificates

### Internal Dependencies

- ✅ **Ticket Service** - QR code generation (already implemented)
- ✅ **Email Service** - Template updates for wallet buttons
- ✅ **Payment Service** - Refund flow triggers pass invalidation
- ⬜ **Admin Dashboard** - UI for managing wallet certificates

**Blocks:** Wallet push notifications block real-time event updates feature.

---

## Rollout Strategy

### Phase 1: Platform Setup (Week 1)

1. **Setup Accounts:**
   - Create Apple Developer account ($99)
   - Create Google Cloud project
   - Enable Google Wallet API
   - Generate Apple Pass Type ID
   - Create Google Wallet issuer account

2. **Infrastructure:**
   - Deploy database migrations
   - Set up S3/R2 bucket for pass files
   - Configure environment variables
   - Set up monitoring/alerts

### Phase 2: Beta Testing (Week 2)

1. **Feature Flag:** `WALLET_INTEGRATION_ENABLED`
   - Initially disabled globally
   - Enable for test organization only
   - Generate test passes and validate

2. **Beta Group:**
   - Internal team members
   - 1-2 friendly organizations
   - Collect feedback on UX

3. **Monitoring:**
   - Track pass generation success rate
   - Monitor API response times
   - Watch for errors in Sentry

### Phase 3: Gradual Rollout (Week 3-4)

1. **Phased Enablement:**
   - Enable for 10% of organizations
   - Monitor for 3 days
   - Enable for 50% of organizations
   - Monitor for 3 days
   - Enable for 100% of organizations

2. **Metrics to Watch:**
   - Pass generation rate (% of tickets)
   - Platform split (Apple vs Google)
   - Error rate (<1% target)
   - User feedback scores

3. **Success Indicators:**
   - > 30% of tickets added to wallets
   - <0.5% error rate
   - Positive user feedback
   - No critical bugs reported

### Phase 4: Rollback Plan

- **If issues detected:**
  - Disable feature flag immediately
  - Existing passes continue to work
  - New passes not generated until fix deployed
  - Database migrations NOT rolled back (data preserved)

---

## Future Enhancements

Ideas for future iterations (out of scope for initial implementation):

1. **Multi-Pass Support:**
   - Bundle all tickets from one order into single pass
   - "Family pack" wallet pass with multiple QR codes

2. **NFC Support:**
   - Add NFC tags to passes for tap-to-enter
   - Integrate with smart venue systems

3. **Dynamic Pass Content:**
   - Show seat numbers (for assigned seating events)
   - Display parking information
   - Include venue maps

4. **Marketing Integration:**
   - Add promotional offers to back of pass
   - Cross-promote upcoming events
   - Loyalty program integration

5. **Analytics Dashboard:**
   - Track wallet adoption rates per event
   - Platform distribution (iOS vs Android)
   - Conversion funnel: ticket → wallet → scan

6. **Self-Service Certificate Management:**
   - Allow organizations to upload own Apple certificates
   - UI for managing Google Wallet service accounts
   - Automated certificate renewal reminders

7. **Multi-Language Support:**
   - Pass content in Dutch, English, German
   - Auto-detect user's device language

8. **Accessibility Features:**
   - High-contrast pass designs
   - VoiceOver optimized content
   - Larger text options

---

## Related Documentation

- [Apple Wallet Developer Guide](https://developer.apple.com/wallet/)
- [Google Wallet Developer Guide](https://developers.google.com/wallet)
- [PassKit Documentation](https://developer.apple.com/documentation/passkit)
- [SPEC.md](../../SPEC.md) - Business rules for tickets
- [docs/development/enhanced-dashboard-analytics.md](./enhanced-dashboard-analytics.md) - Can track wallet adoption
- [src/server/services/ticketService.ts](../../src/server/services/ticketService.ts) - QR code generation

---

## Questions & Decisions

**Decisions Made:**

- [x] **Decision:** Use organization-specific certificates (not global platform account)
  - **Reason:** Allows white-label branding, more secure, scales better

- [x] **Decision:** Store passes in S3/R2 instead of database
  - **Reason:** Reduce database size, better performance, easier CDN integration

- [x] **Decision:** Generate passes on-demand (not pre-generated)
  - **Reason:** Ensures latest event data, reduces storage costs, simpler architecture

- [x] **Decision:** Support both platforms from day 1
  - **Reason:** NL market is ~50/50 iOS/Android, need feature parity

**Open Questions:**

- [ ] **Question:** Should we charge organizations for wallet feature? (Assigned to: @product)
  - Certificate costs $99/year per organization
  - Could bundle with paid plans

- [ ] **Question:** How to handle certificate expiration gracefully? (Needs research)
  - Auto-renewal not possible
  - Need clear process for organizations

- [ ] **Question:** Should passes auto-delete after event date? (Assigned to: @legal)
  - GDPR considerations
  - User might want ticket as "memorabilia"

**Risks:**

- **Risk:** Apple certificate approval takes 1-2 weeks
  - **Mitigation:** Start approval process immediately, use development certificates for testing

- **Risk:** Organizations don't set up certificates
  - **Mitigation:** Provide fallback using platform master certificate

- **Risk:** High pass generation volume causes rate limiting
  - **Mitigation:** Implement queue system, batch processing, caching

---

## Notes

### Technical Compatibility Confirmation

✅ **QR Code Format:** The existing Entro ticket system uses:

- Format: `{baseUrl}/scan/{ticketId}:{signature}`
- Signature: HMAC-SHA256 (16 chars, truncated)
- Example: `https://entro.app/scan/abc-123:a1b2c3d4e5f6g7h8`

✅ **Apple Wallet Compatibility:**

- Supports `PKBarcodeFormatQR`
- Can encode any string up to 4,296 characters
- Our format uses ~80-120 characters ✓

✅ **Google Wallet Compatibility:**

- Supports `BarcodeType.QR_CODE`
- Can encode any string
- Same QR data works identically ✓

### Certificate Setup Process

**Apple Wallet:**

1. Enroll in Apple Developer Program ($99/year)
2. Create Pass Type ID (e.g., `pass.com.entro.ticket`)
3. Generate certificate signing request (CSR)
4. Download signing certificate (.p12)
5. Export private key
6. Store encrypted in database

**Google Wallet:**

1. Create Google Cloud project
2. Enable Google Wallet API
3. Create service account
4. Download JSON key file
5. Create issuer account (application form)
6. Store encrypted in database

### Performance Benchmarks

- Pass generation time: <2s (Apple), <1s (Google)
- File size: ~50KB (.pkpass), ~0KB (Google URL)
- Concurrent generations: 100/sec (with queue)

### References

- Apple PassKit: https://developer.apple.com/documentation/passkit
- Google Wallet API: https://developers.google.com/wallet/generic/rest
- OpenSSL for signing: https://www.openssl.org/docs/
- JWT library: https://github.com/auth0/node-jsonwebtoken
