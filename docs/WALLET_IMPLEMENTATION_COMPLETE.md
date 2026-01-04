# Apple Wallet Implementation Complete ✅

## What Was Built

### 1. Certificate Encryption System

- **File:** `src/server/lib/encryption.ts`
- AES-256-GCM authenticated encryption
- PBKDF2 key derivation with salt
- Test utility function included

### 2. Apple Wallet Signing Service

- **File:** `src/server/services/walletService.ts`
- PKCS#7 signing using node-forge
- Manifest generation with SHA-1 hashes
- ZIP archive creation for .pkpass files
- Reuses existing `generateQRData()` for security consistency

### 3. Admin Certificate Management UI

- **Page:** `/dashboard/settings/wallet`
- **Form Component:** `src/components/dashboard/WalletCertificateForm.tsx`
- Upload interface for certificates and private keys
- PEM format validation
- Team ID format validation
- Expiration date tracking
- Certificate status display

### 4. Certificate Upload API

- **Route:** `/api/wallet/certificate`
- Multi-tenancy support (organization-scoped)
- Input validation (PEM format, Team ID, expiration)
- Secure encryption before database storage
- Update existing or create new certificates

### 5. Pass Generation API

- **Route:** `/api/wallet/apple/generate` (updated)
- Fetches ticket with full relations
- Validates order status (must be PAID)
- Validates ticket status (not REFUNDED)
- Generates signed .pkpass file
- Returns proper MIME type

### 6. UI Integration

- **Component:** `src/components/checkout/AddToWalletButtons.tsx`
- Platform detection (iOS/Android)
- Loading states
- Error handling
- Dutch translations

- **Integration:** Added to `src/components/checkout/TicketDisplay.tsx`
- Appears when ticket is expanded
- Below QR code display

### 7. Documentation

- **Setup Guide:** `docs/APPLE_WALLET_SETUP.md`
- Step-by-step Apple Developer setup
- Certificate conversion commands
- Security best practices
- Troubleshooting guide

## What You Need to Do

### 1. Generate Encryption Key

```bash
openssl rand -base64 32
```

Add to `.env.local`:

```env
WALLET_CERT_ENCRYPTION_KEY="<paste-generated-key-here>"
```

### 2. Create Apple Pass Type ID

1. Go to https://developer.apple.com/account
2. Certificates, Identifiers & Profiles → Identifiers → + button
3. Select "Pass Type IDs"
4. Enter identifier: `pass.com.yourcompany.ticket`

### 3. Generate Certificate

1. In Pass Type IDs list, click your new ID → Create Certificate
2. Create CSR in Keychain Access (see docs/APPLE_WALLET_SETUP.md)
3. Upload CSR, download .cer file
4. Export private key from Keychain as .p12

### 4. Convert to PEM

```bash
# Certificate
openssl x509 -in certificate.cer -out certificate.pem -outform PEM

# Private key (will prompt for .p12 password)
openssl pkcs12 -in Certificates.p12 -out key.pem -nocerts -nodes
```

### 5. Upload via UI

1. Start dev server: `npm run dev`
2. Navigate to `/dashboard/settings/wallet`
3. Fill in form with:
   - Pass Type ID
   - Team ID (10 chars from Apple Developer account)
   - Certificate PEM content
   - Private Key PEM content
   - Expiration date (1 year from now)
4. Click "Upload Certificaat"

### 6. Test It!

1. Create a test event
2. Purchase a ticket (complete payment)
3. On order success page, expand the ticket
4. Click "Add to Apple Wallet" (on iOS) or "Add to Google Wallet" (Android - placeholder)
5. Pass should download and open in Wallet app

## Technical Details

### Dependencies Added

- `node-forge`: PKCS#7 signing
- `archiver`: ZIP file creation
- `@types/node-forge`
- `@types/archiver`

### Database Schema

- `WalletCertificate` model (already migrated)
- `WalletPass` model (already migrated)
- `WalletPlatform` enum (APPLE, GOOGLE)

### Security Features

1. Certificates encrypted with AES-256-GCM before storage
2. Multi-tenant isolation (organizationId scoping)
3. Expiration date validation
4. PEM format validation
5. Same QR signature as email tickets (HMAC-SHA256)

### Pass Structure

Each `.pkpass` file contains:

- `pass.json` - Pass definition
- `manifest.json` - SHA-1 hashes
- `signature` - PKCS#7 detached signature

### Future Enhancements (Not Implemented Yet)

- [ ] Logo/icon assets in passes
- [ ] Pass update push notifications
- [ ] Google Wallet full implementation
- [ ] Certificate expiration monitoring/alerts
- [ ] Batch pass generation

## Testing

Run wallet tests:

```bash
npm test -- walletService.test.ts
```

All 13 tests should pass (they expect certificate error until you upload one).

## Support

If you encounter issues:

1. **"Certificate not found"** - Upload certificate via `/dashboard/settings/wallet`
2. **"Encryption key missing"** - Add `WALLET_CERT_ENCRYPTION_KEY` to `.env.local`
3. **Invalid PEM format** - Ensure files include BEGIN/END markers
4. **Pass doesn't open** - Check Safari console for signature errors

See `docs/APPLE_WALLET_SETUP.md` for complete troubleshooting guide.

## Summary

✅ Complete PKCS#7 signing implementation
✅ Secure certificate encryption
✅ Admin UI for certificate management
✅ API routes for upload and generation
✅ UI integration in checkout flow
✅ Comprehensive documentation
✅ Type-safe throughout
✅ Multi-tenant secure

**Next step:** Generate your encryption key and upload your Apple certificate!
