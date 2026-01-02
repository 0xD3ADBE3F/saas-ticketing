# Webhook Testing Guide

## Problem: Webhooks Don't Work Locally

Mollie (and other payment providers) need to send HTTP requests to your webhook endpoints. When running on `localhost`, these URLs are not accessible from the internet.

## Solution: Use a Tunnel Service

### Option 1: Cloudflare Tunnel (Recommended - Free)

1. **Install cloudflared:**

   ```bash
   brew install cloudflare/cloudflare/cloudflared
   ```

2. **Start tunnel:**

   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

3. **Copy the public URL** (e.g., `https://random-words.trycloudflare.com`)

4. **Update your environment variable:**

   ```bash
   export NEXT_PUBLIC_APP_URL=https://random-words.trycloudflare.com
   ```

5. **Restart your dev server** with the new URL

### Option 2: ngrok (Alternative)

1. **Install ngrok:**

   ```bash
   brew install ngrok
   ```

2. **Start tunnel:**

   ```bash
   ngrok http 3000
   ```

3. **Copy the HTTPS forwarding URL** (e.g., `https://abc123.ngrok.io`)

4. **Update environment and restart:**
   ```bash
   export NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
   pnpm dev
   ```

## Testing the Unlock Payment Flow

1. **Start tunnel and dev server with public URL**

   ```bash
   # Terminal 1: Start tunnel
   cloudflared tunnel --url http://localhost:3000

   # Terminal 2: Set URL and start dev
   export NEXT_PUBLIC_APP_URL=https://your-tunnel-url.trycloudflare.com
   pnpm dev
   ```

2. **Create a free event** with total capacity > 100 tickets

3. **Click "Unlock unlimited tickets"** button

4. **Complete payment** using Mollie test mode:
   - Use test payment methods (iDEAL test mode auto-completes)
   - Don't close the payment window until redirected

5. **Verify webhook was called:**
   - Check your terminal for webhook logs
   - Check database: `unlimitedTicketsEnabled` should be TRUE

## Debugging Webhook Issues

### Check if webhook was called:

Look for console logs in your dev server:

```
Unlock payment webhook error: ...
```

### Verify webhook URL in payment:

```bash
# Get payment details from Mollie
curl https://api.mollie.com/v2/payments/tr_xxxxx \
  -H "Authorization: Bearer your_api_key"
```

Look for the `webhookUrl` field - it should match your tunnel URL.

### Manual webhook trigger (testing):

```bash
curl -X POST http://localhost:3000/api/webhooks/unlock-payment \
  -H "Content-Type: application/json" \
  -d '{"id": "tr_your_payment_id"}'
```

## Production Setup

In production, your `NEXT_PUBLIC_APP_URL` should be your actual domain:

```
NEXT_PUBLIC_APP_URL=https://entro.nl
```

Mollie will automatically call `https://entro.nl/api/webhooks/unlock-payment` after payment completion.

## Troubleshooting

### Webhook returns 500 error

- Check server logs for the actual error
- Verify Mollie API key is set correctly
- Ensure payment metadata contains `eventId`, `organizationId`, and `type: "EVENT_UNLOCK"`

### Event not updating after webhook

- Check if webhook was called (look for logs)
- Verify payment status is "paid"
- Check if payment metadata matches expected structure
- Manually trigger webhook with payment ID to test

### Payment succeeds but no webhook

- Tunnel URL changed? Restart with correct URL
- Check Mollie dashboard for webhook delivery attempts
- Verify `NEXT_PUBLIC_APP_URL` environment variable is set
