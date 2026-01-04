#!/bin/bash
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Configuration
APP_NAME="entro"
DOKKU_HOST="${DOKKU_HOST:-164.92.156.106}"

echo_info "========================================="
echo_info "Enabling SSL for $APP_NAME"
echo_info "========================================="
echo ""

# Check DNS before enabling SSL
echo_info "Checking DNS configuration..."
DNS_IP=$(dig +short www.getentro.app | tail -n1)

if [ -z "$DNS_IP" ]; then
    echo_warn "⚠️  DNS not configured!"
    echo "Please add an A record:"
    echo "  www.getentro.app -> $DOKKU_HOST"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
elif [ "$DNS_IP" != "$DOKKU_HOST" ]; then
    echo_warn "⚠️  DNS points to $DNS_IP but server is at $DOKKU_HOST"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo_info "✅ DNS correctly configured: www.getentro.app -> $DOKKU_HOST"
fi

# Enable Let's Encrypt
echo_info "Enabling Let's Encrypt SSL..."
ssh root@$DOKKU_HOST "dokku letsencrypt:enable $APP_NAME"

echo ""
echo_info "========================================="
echo_info "SSL Enabled Successfully!"
echo_info "========================================="
echo ""
echo_info "Your app is now accessible at:"
echo "  https://www.getentro.app"
echo ""
echo_info "Certificate will auto-renew. Check status with:"
echo "  ssh root@$DOKKU_HOST dokku letsencrypt:list"
echo ""
