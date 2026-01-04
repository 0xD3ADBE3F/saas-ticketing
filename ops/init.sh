#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo_error "This script must be run as root (use sudo)"
   exit 1
fi

echo_info "Starting Dokku droplet initialization..."

# ============================================================================
# 1. SYSTEM UPDATES
# ============================================================================
echo_info "Updating system packages..."
apt-get update
apt-get upgrade -y
apt-get dist-upgrade -y

# ============================================================================
# 2. INSTALL ESSENTIAL TOOLS
# ============================================================================
echo_info "Installing essential tools..."
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    iotop \
    ncdu \
    jq \
    unzip \
    ufw \
    fail2ban \
    logrotate \
    apt-transport-https \
    ca-certificates \
    software-properties-common \
    build-essential

# ============================================================================
# 3. FIREWALL CONFIGURATION
# ============================================================================
echo_info "Configuring firewall (UFW)..."

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (important!)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow Dokku SSH (if different port)
# ufw allow 2222/tcp comment 'Dokku Git'

# Enable firewall
echo "y" | ufw enable
ufw status verbose

# ============================================================================
# 4. FAIL2BAN CONFIGURATION
# ============================================================================
echo_info "Configuring fail2ban..."

cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = root@localhost
sendername = Fail2Ban

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# ============================================================================
# 5. SWAP CONFIGURATION (if needed)
# ============================================================================
echo_info "Checking swap configuration..."
if [[ $(swapon --show | wc -l) -eq 0 ]]; then
    echo_warn "No swap detected. Creating 2GB swap file..."

    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile

    # Make it permanent
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

    # Optimize swap usage
    sysctl vm.swappiness=10
    sysctl vm.vfs_cache_pressure=50

    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf

    echo_info "Swap configured successfully"
else
    echo_info "Swap already configured"
fi

# ============================================================================
# 6. DOCKER OPTIMIZATIONS
# ============================================================================
echo_info "Configuring Docker optimizations..."

mkdir -p /etc/docker

cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "userland-proxy": false
}
EOF

systemctl restart docker

# Clean up old Docker images/containers
echo_info "Cleaning up Docker resources..."
docker system prune -af --volumes || true

# ============================================================================
# 7. DOKKU CONFIGURATION
# ============================================================================
echo_info "Configuring Dokku..."

# Set Dokku domain (update this with your actual domain)
# dokku domains:set-global yourdomain.com

# Install useful Dokku plugins
dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git || true
# dokku plugin:install https://github.com/dokku/dokku-postgres.git postgres || true
# dokku plugin:install https://github.com/dokku/dokku-redis.git redis || true

# Configure Let's Encrypt (update email)
# dokku letsencrypt:set --global email your-email@example.com

echo_info "Dokku plugins installed. Configure domain with:"
echo "  dokku domains:set-global getentro.app"
echo "  dokku letsencrypt:set --global email ssl@stormzaak.nl"

# ============================================================================
# 8. AUTOMATIC UPDATES
# ============================================================================
echo_info "Configuring automatic security updates..."

apt-get install -y unattended-upgrades

cat > /etc/apt/apt.conf.d/50unattended-upgrades <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# ============================================================================
# 9. LOG ROTATION
# ============================================================================
echo_info "Configuring log rotation..."

cat > /etc/logrotate.d/dokku <<EOF
/var/log/dokku/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 dokku dokku
}
EOF

# ============================================================================
# 10. MONITORING TOOLS
# ============================================================================
echo_info "Setting up basic monitoring..."

# Install monitoring script
cat > /usr/local/bin/server-status <<'EOF'
#!/bin/bash
echo "=== Server Status ==="
echo ""
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'
echo ""
echo "Memory Usage:"
free -h | grep Mem | awk '{print $3 " / " $2 " (" int($3/$2 * 100) "%)"}'
echo ""
echo "Disk Usage:"
df -h / | awk 'NR==2 {print $3 " / " $2 " (" $5 ")"}'
echo ""
echo "Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}"
echo ""
echo "Dokku Apps:"
dokku apps:list
EOF

chmod +x /usr/local/bin/server-status

# ============================================================================
# 11. SSH HARDENING
# ============================================================================
echo_info "Hardening SSH configuration..."

# Backup original config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Update SSH config (only if not already set)
sed -i 's/#PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config

# Reload SSH (Ubuntu uses 'ssh', not 'sshd')
if systemctl list-units --type=service | grep -q 'ssh.service'; then
    systemctl reload ssh
elif systemctl list-units --type=service | grep -q 'sshd.service'; then
    systemctl reload sshd
fi

echo_warn "SSH password authentication disabled. Ensure you have SSH keys configured!"

# ============================================================================
# 12. TIME ZONE CONFIGURATION
# ============================================================================
echo_info "Setting timezone to Europe/Amsterdam..."
timedatectl set-timezone Europe/Amsterdam

# ============================================================================
# 13. CLEANUP
# ============================================================================
echo_info "Cleaning up..."
apt-get autoremove -y
apt-get autoclean

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo_info "============================================"
echo_info "Initialization Complete!"
echo_info "============================================"
echo ""
echo_info "Next steps:"
echo "  1. Configure Dokku domain: dokku domains:set-global yourdomain.com"
echo "  2. Set up Let's Encrypt: dokku letsencrypt:set --global email your-email@example.com"
echo "  3. Create your app: dokku apps:create entro"
echo "  4. Set environment variables: dokku config:set entro KEY=value"
echo "  5. Deploy with git: git remote add dokku dokku@yourserver:entro"
echo ""
echo_info "Useful commands:"
echo "  server-status          - View server health"
echo "  dokku apps:list        - List all apps"
echo "  dokku ps:report        - View app status"
echo "  docker system df       - View Docker disk usage"
echo ""
echo_warn "IMPORTANT: SSH password auth is now disabled. Ensure you have SSH keys!"
echo ""
