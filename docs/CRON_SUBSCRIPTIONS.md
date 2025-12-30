# Subscription Cron Job

## Overview

The subscription cron job processes expired subscriptions daily, handling renewals and cancellations automatically.

## Endpoint

```
GET /api/cron/process-subscriptions
```

## What It Does

1. **Finds expired subscriptions** - All subscriptions where `currentPeriodEnd` has passed
2. **For cancelled subscriptions** (`cancelAtPeriodEnd = true`):
   - Cancels the Mollie subscription (ORGANIZER/PRO_ORGANIZER plans)
   - Deletes the subscription record
   - Sets organization's `currentPlan` to `null`
3. **For active subscriptions**:
   - Extends the billing period by one month
   - Creates new usage records for monthly plans

## Setup

### Vercel (Automatic)

Already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-subscriptions",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Runs daily at 2 AM UTC. No additional setup required.

### Other Platforms

Set up a daily cron job to call the endpoint:

```bash
# Using cron-job.org or similar service
curl -X GET https://your-domain.com/api/cron/process-subscriptions \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

**Environment Variable Required:**

```bash
CRON_SECRET=your-random-secret-token
```

### GitHub Actions (Alternative)

Create `.github/workflows/cron-subscriptions.yml`:

```yaml
name: Process Subscriptions

on:
  schedule:
    - cron: "0 2 * * *" # Daily at 2 AM UTC
  workflow_dispatch: # Allow manual trigger

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Call cron endpoint
        run: |
          curl -X GET ${{ secrets.APP_URL }}/api/cron/process-subscriptions \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Security

The endpoint checks for an `Authorization` header:

```typescript
Authorization: Bearer<CRON_SECRET>;
```

**Important:** Set a strong random token for `CRON_SECRET` in production.

## Response Format

### Success

```json
{
  "success": true,
  "processed": 5,
  "errors": [],
  "timestamp": "2025-12-31T02:00:00.000Z"
}
```

### With Errors

```json
{
  "success": true,
  "processed": 4,
  "errors": [
    {
      "subscriptionId": "abc-123",
      "error": "Failed to cancel Mollie subscription"
    }
  ],
  "timestamp": "2025-12-31T02:00:00.000Z"
}
```

### Failure

```json
{
  "success": false,
  "error": "Database connection failed",
  "timestamp": "2025-12-31T02:00:00.000Z"
}
```

## Monitoring

Check logs for:

- Number of subscriptions processed
- Any errors during processing
- Mollie API failures

Example log output:

```
[Cron] Processed 5 subscriptions with 0 errors
```

## Testing

### Manual Trigger (Local)

```bash
# Set environment variable
export CRON_SECRET=test-secret

# Call endpoint
curl -X GET http://localhost:3000/api/cron/process-subscriptions \
  -H "Authorization: Bearer test-secret"
```

### Testing Subscription Cancellation

1. Create a subscription with `currentPeriodEnd` in the past
2. Set `cancelAtPeriodEnd = true`
3. Call the cron endpoint
4. Verify:
   - Subscription record is deleted
   - Organization's `currentPlan` is `null`
   - Mollie subscription is cancelled (if applicable)

## Troubleshooting

### Endpoint returns 401 Unauthorized

- Check `CRON_SECRET` environment variable is set
- Verify `Authorization` header is included in request

### Subscriptions not processing

- Check `currentPeriodEnd` dates in database
- Verify subscription `status` is `ACTIVE` or `TRIALING`
- Check server logs for errors

### Mollie cancellation fails

- Verify platform `MOLLIE_API_KEY` is valid
- Check if Mollie subscription still exists
- Review Mollie API error messages in logs

## Related Files

- `/src/app/api/cron/process-subscriptions/route.ts` - API endpoint
- `/src/server/services/subscriptionService.ts` - Business logic
- `/vercel.json` - Vercel cron configuration
- `/README.md` - Environment variables documentation
