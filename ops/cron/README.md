# Cron Jobs for Entro

This directory contains scripts to set up scheduled tasks for the Entro application on your Dokku VPS.

## Available Cron Jobs

| Job                       | Schedule            | Endpoint                              | Purpose                                |
| ------------------------- | ------------------- | ------------------------------------- | -------------------------------------- |
| Expire Orders             | Every minute        | `/api/cron/expire-orders`             | Expire unpaid orders after 15 minutes  |
| Check Mollie Connections  | Every 6 hours       | `/api/cron/check-mollie-connections`  | Check organization Mollie connections  |
| Check Platform Connection | Every 6 hours       | `/api/cron/check-platform-connection` | Check platform-level Mollie connection |
| Generate Invoices         | Monthly (1st, 3 AM) | `/api/cron/generate-invoices`         | Generate platform fee invoices         |

## Setup

### 1. Ensure CRON_SECRET is Set

On your VPS:

```bash
# Generate a secure secret (32+ characters)
CRON_SECRET=$(openssl rand -base64 32)

# Set it in Dokku
dokku config:set entro-production CRON_SECRET="$CRON_SECRET"
```

### 2. Install Cron Jobs

Copy the setup script to your VPS and run it:

```bash
# From your local machine
scp ops/cron/setup-cron.sh root@164.92.156.106:/tmp/

# SSH into server
ssh root@164.92.156.106

# Run setup
cd /tmp
chmod +x setup-cron.sh
./setup-cron.sh
```

## Verification

### Check if cron jobs are installed:

```bash
sudo cat /etc/cron.d/entro-cron
```

### Monitor cron execution:

```bash
# View cron logs
sudo tail -f /var/log/syslog | grep CRON

# Or on some systems
sudo tail -f /var/log/cron.log
```

### Test endpoints manually:

```bash
# Get CRON_SECRET
CRON_SECRET=$(dokku config:get entro-production CRON_SECRET)

# Test expire orders endpoint
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://www.getentro.app/api/cron/expire-orders

# Should return: {"success":true,"expiredCount":0}
```

## Alternative: Using Dokku Plugin

If you prefer using a Dokku plugin instead:

```bash
# Install dokku-scheduler-docker-local plugin
sudo dokku plugin:install https://github.com/dokku/dokku-scheduler-docker-local.git

# Schedule jobs
dokku scheduler-docker-local:set entro-production \
  "* * * * *|curl -X POST -H 'Authorization: Bearer $CRON_SECRET' http://localhost:5000/api/cron/expire-orders"
```

**Note:** The system cron approach (recommended above) is simpler and more reliable for this use case.

## Troubleshooting

### Cron jobs not running

1. Check if cron service is running:

```bash
sudo service cron status
```

2. Check cron file syntax:

```bash
sudo cat /etc/cron.d/entro-cron
```

3. Verify CRON_SECRET matches:

```bash
dokku config:get entro-production CRON_SECRET
```

### Jobs running but failing

Check application logs:

```bash
dokku logs entro-production --tail 100
```

Look for unauthorized (401) responses - indicates CRON_SECRET mismatch.

## Updating Cron Jobs

1. Modify `setup-cron.sh` with new schedules
2. Re-run the setup script on your VPS:

```bash
scp ops/cron/setup-cron.sh root@164.92.156.106:/tmp/
ssh root@164.92.156.106 "/tmp/setup-cron.sh"
```

## Security Notes

- All endpoints require `Authorization: Bearer <CRON_SECRET>` header
- CRON_SECRET should be 32+ characters (generated with `openssl rand -base64 32`)
- Never commit CRON_SECRET to git
- Rotate CRON_SECRET periodically for security
