#!/bin/bash
set -e

# Setup Entro Cron Jobs on Dokku VPS
# Run this script on your VPS after deployment

echo "🔧 Setting up Entro cron jobs..."

# Load environment variables from Dokku
export CRON_SECRET=$(dokku config:get entro-production CRON_SECRET)

if [ -z "$CRON_SECRET" ]; then
  echo "❌ Error: CRON_SECRET not set in Dokku environment"
  echo "   Run: dokku config:set entro-production CRON_SECRET=<your-secret>"
  exit 1
fi

# Create cron file with substituted secret
cat > /tmp/entro-cron << EOF
# Entro Cron Jobs
# Generated: $(date)

# Expire old orders - every 5 minutes
*/5 * * * * root curl -X POST -H "Authorization: Bearer ${CRON_SECRET}" https://www.getentro.app/api/cron/expire-orders > /dev/null 2>&1

# Check Mollie connections - every 6 hours
0 */6 * * * root curl -X POST -H "Authorization: Bearer ${CRON_SECRET}" https://www.getentro.app/api/cron/check-mollie-connections > /dev/null 2>&1

# Check platform connection - every 6 hours
0 */6 * * * root curl -X POST -H "Authorization: Bearer ${CRON_SECRET}" https://www.getentro.app/api/cron/check-platform-connection > /dev/null 2>&1

# Generate invoices - every 8 hours
0 */8 * * * root curl -X POST -H "Authorization: Bearer ${CRON_SECRET}" https://www.getentro.app/api/cron/generate-invoices > /dev/null 2>&1
EOF

# Install the cron file
sudo mv /tmp/entro-cron /etc/cron.d/entro-cron
sudo chmod 0644 /etc/cron.d/entro-cron

# Restart cron service
sudo service cron restart

echo "✅ Cron jobs installed successfully!"
echo ""
echo "Scheduled jobs:"
echo "  - Expire orders: Every minute"
echo "  - Check Mollie connections: Every 6 hours"
echo "  - Check platform connection: Every 6 hours"
echo "  - Generate invoices: Monthly (1st at 3 AM)"
echo ""
echo "To verify:"
echo "  sudo cat /etc/cron.d/entro-cron"
echo "  sudo tail -f /var/log/syslog | grep CRON"
