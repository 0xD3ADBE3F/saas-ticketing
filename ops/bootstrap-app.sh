#!/bin/bash
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
APP_NAME="entro-production"
DOMAIN="www.getentro.app"
SSL_EMAIL="ssl@stormzaak.nl"

# Check if running on Dokku server
if ! command -v dokku &> /dev/null; then
    echo_error "Dokku not found! This script must run on the Dokku server."
    echo "Run this on your VPS: ssh root@your-droplet-ip"
    exit 1
fi

echo_info "========================================="
echo_info "Bootstrapping Entro on Dokku"
echo_info "========================================="
echo ""

# ============================================================================
# 1. CREATE APP
# ============================================================================
if dokku apps:list | grep -q "^$APP_NAME$"; then
    echo_warn "App '$APP_NAME' already exists, skipping creation"
else
    echo_info "Creating app '$APP_NAME'..."
    dokku apps:create $APP_NAME
fi

# ============================================================================
# 2. CONFIGURE DOMAIN
# ============================================================================
echo_info "Configuring domain: $DOMAIN"
dokku domains:clear $APP_NAME
dokku domains:add $APP_NAME $DOMAIN

# ============================================================================
# 3. SET ENVIRONMENT VARIABLES
# ============================================================================
echo_info "Setting environment variables..."

if [ ! -f .env ]; then
    echo_error ".env file not found!"
    echo "Please create .env file with all required variables or run this script from the project root."
    exit 1
fi

# Read .env and set config (skip comments and empty lines)
echo_info "Reading .env file..."
while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue

    # Extract key=value
    if [[ "$line" =~ ^([A-Z_]+)=(.*)$ ]]; then
        key="${BASH_REMATCH[1]}"
        value="${BASH_REMATCH[2]}"

        # Remove quotes if present
        value="${value%\"}"
        value="${value#\"}"

        echo_info "Setting $key..."
        dokku config:set --no-restart $APP_NAME "$key=$value"
    fi
done < .env

# ============================================================================
# 4. CONFIGURE BUILDPACK (Heroku buildpack for Node.js)
# ============================================================================
echo_info "Configuring buildpack..."
dokku buildpacks:set $APP_NAME heroku/nodejs

# ============================================================================
# 5. CONFIGURE CHECKS (Health check endpoint)
# ============================================================================
# echo_info "Configuring health checks..."
# dokku checks:set $APP_NAME web /api/health

# ============================================================================
# 6. CONFIGURE NGINX SETTINGS
# ============================================================================
echo_info "Configuring Nginx settings..."

# Max request body size (for image uploads)
dokku nginx:set $APP_NAME client-max-body-size 10m

# Enable HTTP/2
dokku nginx:set $APP_NAME hsts true
dokku nginx:set $APP_NAME hsts-max-age 31536000
dokku nginx:set $APP_NAME hsts-include-subdomains true

# ============================================================================
# 7. CONFIGURE PROXY PORTS
# ============================================================================
echo_info "Configuring proxy ports..."
# Dokku will auto-detect port 3000 from the app
# Manual port configuration is optional
dokku ports:set $APP_NAME http:80:3000 https:443:3000 2>/dev/null || echo_warn "Ports auto-configuration skipped (will be detected from app)"

# ============================================================================
# 8. CONFIGURE PERSISTENT STORAGE (if needed)
# ============================================================================
# Uncomment if you need persistent storage
# echo_info "Setting up persistent storage..."
# mkdir -p /var/lib/dokku/data/storage/$APP_NAME
# dokku storage:ensure-directory $APP_NAME
# dokku storage:mount $APP_NAME /var/lib/dokku/data/storage/$APP_NAME:/app/storage

# ============================================================================
# 9. CONFIGURE RESOURCE LIMITS
# ============================================================================
echo_info "Configuring resource limits..."
dokku resource:limit $APP_NAME --memory 1024 --memory-swap 2048
dokku resource:reserve $APP_NAME --memory 512

# ============================================================================
# 10. ENABLE LET'S ENCRYPT SSL
# ============================================================================
echo_info "Configuring Let's Encrypt SSL..."

# Check if letsencrypt plugin is installed
if ! dokku plugin:list | grep -q "letsencrypt"; then
    echo_info "Installing Let's Encrypt plugin..."
    dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git || echo_warn "Let's Encrypt plugin installation skipped (may already be installed)"
else
    echo_info "Let's Encrypt plugin already installed"
fi

# Set Let's Encrypt email
dokku letsencrypt:set $APP_NAME email $SSL_EMAIL

# Note: SSL will be enabled after first deployment
echo_warn "SSL will be enabled after first successful deployment"
echo_warn "Run: dokku letsencrypt:enable $APP_NAME"

# Enable auto-renewal
if ! dokku letsencrypt:cron-job --list 2>/dev/null | grep -q "letsencrypt"; then
    echo_info "Enabling automatic SSL certificate renewal..."
    dokku letsencrypt:cron-job --add
fi

# ============================================================================
# 11. CONFIGURE DEPLOYMENT SETTINGS
# ============================================================================
echo_info "Configuring deployment settings..."

# Zero-downtime deployment
dokku ps:set $APP_NAME restart-policy unless-stopped

# Configure deployment checks wait time (only valid key)
# dokku checks:set $APP_NAME wait-to-retire 30 || echo_warn "Could not set wait-to-retire (may not be supported)"

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo_info "========================================="
echo_info "Bootstrap Complete!"
echo_info "========================================="
echo ""
echo_info "App Configuration:"
echo "  Name:   $APP_NAME"
echo "  Domain: $DOMAIN"
echo "  SSL:    Let's Encrypt (will be enabled after deployment)"
echo ""
echo_info "Next Steps:"
echo ""
echo "1. From your LOCAL machine, add Dokku remote:"
echo "   git remote add dokku dokku@$(hostname -I | awk '{print $1}'):$APP_NAME"
echo ""
echo "2. Deploy the application:"
echo "   git push dokku main:master"
echo ""
echo "3. After successful deployment, enable SSL:"
echo "   ssh root@$(hostname -I | awk '{print $1}') dokku letsencrypt:enable $APP_NAME"
echo ""
echo "4. View logs:"
echo "   dokku logs $APP_NAME -t"
echo ""
echo "5. Check app status:"
echo "   dokku ps:report $APP_NAME"
echo ""
echo_info "Useful commands:"
echo "  dokku config:show $APP_NAME     - View environment variables"
echo "  dokku ps:restart $APP_NAME       - Restart the app"
echo "  dokku domains:report $APP_NAME   - View domain configuration"
echo "  dokku logs $APP_NAME -t          - Tail logs"
echo ""
echo_warn "Make sure DNS is pointing to this server before enabling SSL!"
echo_warn "Add A record: www.getentro.app -> $(hostname -I | awk '{print $1}')"
echo ""
