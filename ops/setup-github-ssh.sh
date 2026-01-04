#!/bin/bash
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo_info "========================================="
echo_info "Setup GitHub SSH Key on VPS"
echo_info "========================================="
echo ""

# Check if key already exists
if [ -f ~/.ssh/id_ed25519 ]; then
    echo_warn "SSH key already exists at ~/.ssh/id_ed25519"
    echo ""
    echo_info "Your public key:"
    cat ~/.ssh/id_ed25519.pub
    echo ""
    echo_info "Add this key to GitHub:"
    echo "1. Copy the key above"
    echo "2. Go to: https://github.com/settings/keys"
    echo "3. Click 'New SSH key'"
    echo "4. Paste and save"
    exit 0
fi

# Generate new key
EMAIL="${1:-root@$(hostname)}"
echo_info "Generating new SSH key for: $EMAIL"

ssh-keygen -t ed25519 -C "$EMAIL" -f ~/.ssh/id_ed25519 -N ""

# Start ssh-agent and add key
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add GitHub to known hosts
echo_info "Adding GitHub to known hosts..."
ssh-keyscan -H github.com >> ~/.ssh/known_hosts 2>/dev/null

echo ""
echo_info "========================================="
echo_info "SSH Key Generated!"
echo_info "========================================="
echo ""
echo_info "Your public key:"
echo ""
cat ~/.ssh/id_ed25519.pub
echo ""
echo ""
echo_info "Next steps:"
echo "1. Copy the key above (the entire line)"
echo "2. Go to: https://github.com/settings/keys"
echo "3. Click 'New SSH key'"
echo "4. Title: 'Dokku VPS - $(hostname)'"
echo "5. Paste the key and save"
echo ""
echo_info "Test the connection:"
echo "  ssh -T git@github.com"
echo ""
echo_info "Clone repos with SSH:"
echo "  git clone git@github.com:username/repo.git"
echo ""
