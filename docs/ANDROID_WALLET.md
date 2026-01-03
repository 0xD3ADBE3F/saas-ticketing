entro-wallet@stormzaak.iam.gserviceaccount.com

114638120991163822695

Summary
I've implemented Google Wallet (Android Wallet) integration for Entro. Here's what was done:

1. Core Service Implementation (walletService.ts)
   Added generateGooglePass() function that creates signed JWTs for Google Wallet
   Implemented loadGoogleCertificate() to load service account credentials from the database
   Created createEventTicketClass() and createEventTicketObject() helper functions
   Implemented generateGoogleWalletJWT() to sign JWTs using the jose library
   The QR code data is identical to Apple Wallet and email QR codes (cryptographic signature)
2. Platform Admin UI (wallet-certificates/page.tsx/platform/wallet-certificates/page.tsx))
   Added Google Wallet section with status card showing issuer ID and expiration
   Added setup instructions for Google Cloud Project, Wallet API, Service Account, and Issuer Account
3. Certificate Form Component (WalletCertificateForm.tsx)
   Updated to support both Apple and Google Wallet platforms
   Google form accepts: Issuer ID, Service Account JSON, and expiration date
   Validates JSON format and required fields in service account
4. API Endpoint (wallet-certificate/route.ts)
   Updated to handle Google Wallet service account uploads
   Validates Issuer ID (numeric), JSON format, and required service account fields
   Encrypts service account JSON before storing in database
5. Status Endpoint (wallet/status/route.ts)
   Updated to show Google Wallet configuration status
6. Tests (walletService.test.ts)
   Added tests for Google Wallet pass generation
   Tests certificate loading, error handling, and ID sanitization
   All 14 tests pass
   How It Works
   Setup: Platform admin uploads Google Cloud service account JSON and Issuer ID
   Generation: When user clicks "Add to Google Wallet", the API:
   Loads credentials from database
   Creates an Event Ticket Class and Object
   Signs with service account private key
   Returns https://pay.google.com/gp/v/save/{jwt} URL
   User Flow: The URL opens Google Wallet and saves the pass directly
   Prerequisites for Production
   To enable Google Wallet in production:

Create a Google Cloud project and enable Google Wallet API
Create a service account with JSON key
Register an Issuer account at pay.google.com/business/console
Upload the credentials in Platform → Wallet Certificates → Google Wallet section
