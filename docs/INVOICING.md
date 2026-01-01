# Platform Fee Invoicing Implementation

## Overview

This implementation adds automated platform fee invoicing using Mollie's Sales Invoice API (Beta). After an event ends, the system automatically generates an invoice for the platform fees (service fees minus Mollie transaction fees) and sends it to the organization's billing email.

## Features Implemented

### ✅ Core Services

1. **Platform Fee Invoice Service** (`src/server/services/platformFeeInvoiceService.ts`)
   - Generates invoices for platform fees after events end
   - Calculates fees from payout breakdown
   - Validates organization billing information
   - Creates Mollie Sales Invoices via API
   - Stores invoice records in database

2. **Invoice Email Service** (`src/server/services/invoiceEmailService.ts`)
   - Sends professional HTML emails when invoices are created
   - Sends payment confirmation emails
   - Uses Resend for email delivery

### ✅ API Endpoints

1. **Cronjob Endpoint** (`/api/cron/generate-invoices`)
   - Runs daily at 2 AM (configured in vercel.json)
   - Generates invoices for events that ended yesterday
   - Protected by CRON_SECRET environment variable
   - Returns summary of generated invoices

2. **Manual Invoice Generation** (`/api/events/[eventId]/generate-invoice`)
   - Allows admins to manually trigger invoice generation
   - Useful for testing or regenerating failed invoices
   - Requires ADMIN role on the organization

### ✅ Dashboard UI

1. **Invoices Page** (`/instellingen/facturatie`)
   - Lists all invoices for the organization
   - Shows invoice number, date, amount, status, due date
   - Filter by status (all, sent, pending, paid, overdue)
   - Download PDF action
   - Pay Now action for pending invoices
   - Mobile-responsive table

2. **Navigation Integration**
   - Added "Facturatie" to settings navigation
   - Settings page redirects to invoices by default

### ✅ Configuration

1. **Vercel Cron** (`vercel.json`)
   - Configured to run daily at 2:00 AM UTC
   - Calls `/api/cron/generate-invoices` endpoint

2. **Environment Variables**
   - Added `CRON_SECRET` validation to env schema
   - Must be at least 32 characters

## How It Works

### Invoice Generation Flow

```
Event ends → Cronjob runs (daily 2 AM) →
  1. Find events that ended yesterday without invoices
  2. For each event:
     - Calculate platform fee breakdown
     - Validate organization billing info
     - Create Mollie Sales Invoice (status: "issued")
     - Store invoice in database
     - Send email notification to organization
```

### Platform Fee Calculation

```typescript
Platform Fee = Service Fees Collected - Mollie Transaction Fees

Example:
- 100 tickets sold @ €20 each = €2,000 gross
- Service fees = (€0.50 + 2%) × 100 = €90
- Mollie fees = €0.35 × 100 = €35
- Platform fee (invoice amount) = €90 - €35 = €55
```

### VAT Treatment

- Platform fees are VAT-inclusive (21% standard rate)
- Invoice shows amount excl. VAT and VAT amount separately
- Mollie calculates VAT automatically using `vatMode: "exclusive"`

## Testing

### 1. Test Invoice Generation Locally

```bash
# Set environment variable
export CRON_SECRET="your-secret-key-at-least-32-chars"

# Call cronjob endpoint (GET allowed in development)
curl http://localhost:3000/api/cron/generate-invoices \
  -H "Authorization: Bearer your-secret-key-at-least-32-chars"
```

### 2. Test Manual Invoice Generation

```bash
# Generate invoice for specific event
curl -X POST http://localhost:3000/api/events/[eventId]/generate-invoice \
  -H "Cookie: your-session-cookie"
```

### 3. Test Email Notifications

Check your organization's billing email for:

- Invoice created notification (with PDF link)
- Payment confirmation (when invoice is paid)

## Configuration Steps

### 1. Set Environment Variables

Add to `.env`:

```bash
# Cronjob secret (generate with: openssl rand -base64 32)
CRON_SECRET="your-secret-key-at-least-32-chars"

# Ensure these are set for Mollie Sales Invoice API
MOLLIE_API_KEY="live_..." # Platform's Mollie API key
RESEND_API_KEY="re_..." # For email notifications
```

### 2. Deploy to Vercel

The `vercel.json` configuration will automatically set up the cron job.

### 3. Complete Organization Billing Info

Ensure organizations have complete billing information:

- Billing email (required)
- Billing name
- Street and number (required)
- Postal code (required)
- City (required)
- Country (defaults to NL)
- VAT number (optional, for businesses)

## Monitoring

### Logs

All invoice operations are logged via `mollieLogger`:

```typescript
// Success
[INFO] Platform fee invoice generated successfully
  invoiceId: "xxx"
  eventId: "xxx"
  amount: 5500 (in cents)

// Failure
[ERROR] Failed to generate platform fee invoice
  eventId: "xxx"
  error: "Organization missing billing email"
```

### Alerts

Consider setting up alerts for:

- Failed invoice generation (check cronjob logs)
- Missing billing information
- Mollie API errors
- Email delivery failures

## Edge Cases Handled

1. **Zero platform fee** - Skips invoice generation (free events or no sales)
2. **Missing billing info** - Throws error, logs details for admin follow-up
3. **Duplicate invoice** - Checks for existing invoice before creation
4. **Mollie API failure** - Retries handled by cronjob (runs daily)
5. **Email failure** - Logs error but doesn't break invoice creation

## Future Enhancements

See [FEATURES.md](../FEATURES.md#future-enhancements-out-of-scope-for-mvp) for planned improvements:

- Multiple invoices per event
- Credit notes for refunds
- Automatic payment reminders
- SEPA Direct Debit integration
- PDF customization

## API Documentation

### POST /api/cron/generate-invoices

**Authorization:** Bearer token (CRON_SECRET)

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-01-01T02:00:00.000Z",
  "invoicesGenerated": 5,
  "durationMs": 3421,
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "INV-0001",
      "organizationId": "uuid",
      "eventId": "uuid",
      "amount": 5500,
      "vatAmount": 1155,
      "status": "SENT"
    }
  ]
}
```

### POST /api/events/[eventId]/generate-invoice

**Authorization:** Session cookie (requires ADMIN role)

**Response:**

```json
{
  "success": true,
  "invoice": {
    "id": "uuid",
    "invoiceNumber": "INV-0001",
    "amount": 5500,
    "vatAmount": 1155,
    "status": "SENT",
    "pdfUrl": "https://mollie.com/..."
  }
}
```

## Support

For issues or questions:

- Check logs in Vercel dashboard
- Review Mollie API documentation: https://docs.mollie.com/reference/create-sales-invoice
- Contact Mollie support for API-specific issues
