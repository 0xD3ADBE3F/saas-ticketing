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
DOKKU_HOST="${DOKKU_HOST:-164.92.156.106}"
KEY_NAME="${KEY_NAME:-$(whoami)-$(hostname)}"

echo_info "========================================="
echo_info "Adding SSH Key to Dokku"
echo_info "========================================="
echo ""

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa.pub ] && [ ! -f ~/.ssh/id_ed25519.pub ]; then
    echo_error "No SSH public key found!"
    echo ""
    echo_info "Generate a new SSH key with:"
    echo "  ssh-keygen -t ed25519 -C \"your_email@example.com\""
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Determine which key to use
if [ -f ~/.ssh/id_ed25519.pub ]; then
    PUB_KEY_PATH=~/.ssh/id_ed25519.pub
    echo_info "Using Ed25519 key: $PUB_KEY_PATH"
elif [ -f ~/.ssh/id_rsa.pub ]; then
    PUB_KEY_PATH=~/.ssh/id_rsa.pub
    echo_info "Using RSA key: $PUB_KEY_PATH"
fi

echo_info "Adding key as: $KEY_NAME"
echo ""

# Add the key to Dokku
cat "$PUB_KEY_PATH" | ssh root@$DOKKU_HOST "dokku ssh-keys:add $KEY_NAME"

if [ $? -eq 0 ]; then
    echo ""
    echo_info "========================================="
    echo_info "SSH Key Added Successfully!"
    echo_info "========================================="
    echo ""
    echo_info "You can now deploy with:"
    echo "  git remote add dokku dokku@$DOKKU_HOST:entro-production"
    echo "  git push dokku main:master"
    echo ""
    echo_info "Verify your keys with:"
    echo "  ssh root@$DOKKU_HOST dokku ssh-keys:list"
    echo ""
else
    echo ""
    echo_error "Failed to add SSH key!"
    echo ""
    echo_info "Manual method:"
    echo "1. Copy your public key:"
    echo "   cat $PUB_KEY_PATH"
    echo ""
    echo "2. SSH into the server:"
    echo "   ssh root@$DOKKU_HOST"
    echo ""
    echo "3. Add the key manually:"
    echo "   echo 'YOUR_PUBLIC_KEY' | dokku ssh-keys:add $KEY_NAME"
    echo ""
fi
