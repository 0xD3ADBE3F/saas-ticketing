# Apple Wallet Integration Setup Guide

## Overview

The wallet integration is now fully implemented with PKCS#7 signing, certificate encryption, and a complete admin UI. Users can add tickets directly to Apple Wallet.

## Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com/programs/

2. **Pass Type ID Certificate**
   - Created in Apple Developer Portal
   - Converted to PEM format

3. **Encryption Key**
   - 32-byte base64-encoded key for certificate encryption

## Setup Steps

### 1. Generate Encryption Key

```bash
# Generate a 32-byte key for certificate encryption
openssl rand -base64 32
```

Add to your `.env.local` file:

```env
WALLET_CERT_ENCRYPTION_KEY="your-generated-key-here"
```

⚠️ **IMPORTANT:** Never commit this key to version control! Keep it secure in production.

### 2. Create Pass Type ID in Apple Developer Portal

1. Log in to https://developer.apple.com/account
2. Go to **Certificates, Identifiers & Profiles**
3. Select **Identifiers** from the sidebar
4. Click the **+** button
5. Select **Pass Type IDs** and click **Continue**
6. Enter a description: `Entro Event Tickets`
7. Enter an identifier: `pass.com.yourcompany.ticket`
8. Click **Continue** and then **Register**

### 3. Create Pass Type ID Certificate

1. In the Pass Type IDs list, click on your newly created Pass Type ID
2. Click **Create Certificate**
3. Follow the instructions to create a Certificate Signing Request (CSR):
   - Open **Keychain Access** on Mac
   - Menu: **Keychain Access > Certificate Assistant > Request a Certificate From a Certificate Authority**
   - Enter your email and common name
   - Select "Saved to disk"
   - Click **Continue**
4. Upload the CSR file to Apple Developer Portal
5. Download the resulting `.cer` file

### 4. Export Private Key from Keychain

1. Open **Keychain Access**
2. Find the private key associated with your certificate (usually named "Pass Type ID: pass.com.yourcompany.ticket")
3. Right-click > **Export**
4. Save as `Certificates.p12`
5. Set a password (you'll need it in the next step)

### 5. Convert to PEM Format

```bash
# Convert certificate from .cer to .pem
openssl x509 -in certificate.cer -out certificate.pem -outform PEM

# Extract private key from .p12 to .pem (will prompt for password)
openssl pkcs12 -in Certificates.p12 -out key.pem -nocerts -nodes
```

### 6. Upload Certificate via Admin UI

1. Log in to your Entro dashboard
2. Navigate to **Settings > Wallet**
3. Fill in the form:
   - **Pass Type ID**: `pass.com.yourcompany.ticket`
   - **Team ID**: Found in Apple Developer Portal under Membership
   - **Certificate (PEM)**: Copy entire content of `certificate.pem`
   - **Private Key (PEM)**: Copy entire content of `key.pem`
   - **Expiration Date**: Certificates expire after 1 year
4. Click **Upload Certificate**

### 7. Test the Integration

1. Create a test event
2. Purchase a ticket (use test mode if available)
3. On the order confirmation page, expand the ticket
4. Click **Add to Apple Wallet** (visible on iOS devices)
5. The pass should download and open in Wallet

## Architecture

### Components

- **`/dashboard/settings/wallet`** - Admin UI for certificate upload
- **`/api/wallet/certificate`** - API for storing encrypted certificates
- **`/api/wallet/apple/generate`** - API for generating .pkpass files
- **`AddToWalletButtons.tsx`** - Client component with platform detection
- **`walletService.ts`** - Business logic with PKCS#7 signing
- **`encryption.ts`** - AES-256-GCM encryption utilities

### Security

1. **Certificate Encryption**
   - AES-256-GCM authenticated encryption
   - Salt-based key derivation (PBKDF2)
   - IV and auth tag stored with ciphertext

2. **Multi-Tenancy**
   - Certificates scoped to `organizationId`
   - Unique constraint on `(organizationId, platform)`

3. **Validation**
   - PEM format validation
   - Team ID format check (10 alphanumeric chars)
   - Expiration date validation

### Pass Structure

Generated `.pkpass` files contain:

- `pass.json` - Pass definition with ticket details
- `manifest.json` - SHA-1 hashes of all files
- `signature` - PKCS#7 detached signature

### QR Code Security

- Uses existing `generateQRData()` from `ticketService`
- Same HMAC-SHA256 signature as email QR codes
- Ensures consistency across all ticket delivery methods

## Troubleshooting

### "Certificate not found or expired"

- Check certificate exists in database
- Verify `expiresAt` date is in the future
- Ensure you're testing with the correct organization

### "Invalid certificate format"

- Ensure PEM files include `BEGIN` and `END` markers
- Check for extra whitespace or line breaks
- Verify certificate was exported correctly from Keychain

### "WALLET_CERT_ENCRYPTION_KEY not set"

- Add the encryption key to `.env.local`
- Restart the development server
- Ensure environment variable is loaded in production

### Pass doesn't open on iPhone

- Verify file is served with MIME type `application/vnd.apple.pkpass`
- Check signature is valid (use `openssl` to verify)
- Ensure Pass Type ID matches certificate

## Google Wallet (Future)

Google Wallet support is prepared but not yet fully implemented. It will require:

1. Google Cloud Project
2. Google Wallet API enabled
3. Service account credentials
4. JWT generation for pass objects

Unlike Apple Wallet, Google Wallet doesn't require certificates—only service account credentials.

## Production Deployment

### Environment Variables

Ensure these are set in production:

```env
WALLET_CERT_ENCRYPTION_KEY="your-production-key"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
TICKET_SIGNING_SECRET="your-ticket-signing-secret"
```

### Security Checklist

- [ ] Encryption key is unique for production
- [ ] Encryption key is stored in secure secrets management
- [ ] Certificate expiration monitoring is set up
- [ ] Backup of certificates is stored securely
- [ ] Access to certificate upload is restricted to admins

### Certificate Renewal

Apple certificates expire after 1 year. To renew:

1. Generate new certificate in Apple Developer Portal
2. Upload new certificate via Settings > Wallet
3. Old certificate will be replaced automatically
4. Existing passes remain valid (Apple caches them)

## Support

For issues or questions:

- Check TypeScript errors: `npm run typecheck`
- Run tests: `npm test -- walletService.test.ts`
- Review error logs in application logs
- Verify certificate format with `openssl x509 -text -in certificate.pem`
