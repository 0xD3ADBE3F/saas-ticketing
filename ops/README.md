# Operations Scripts

Scripts for managing Entro on DigitalOcean Dokku droplet.

## Initial Setup

### 1. Connect to Your Droplet

```bash
ssh root@your-droplet-ip
```

### 2. Upload and Run Initialization Script

From your local machine:

```bash
# Copy the init script to the server
scp ops/init.sh root@164.92.156.106:/tmp/

# SSH into the server and run it
ssh root@your-droplet-ip
chmod +x /tmp/init.sh
/tmp/init.sh
```

The init script will:

- ✅ Update all system packages
- ✅ Install essential tools (htop, vim, jq, etc.)
- ✅ Configure firewall (UFW) for HTTP/HTTPS/SSH
- ✅ Set up fail2ban for SSH protection
- ✅ Create and configure swap (2GB)
- ✅ Optimize Docker settings
- ✅ Install Dokku plugins (postgres, redis, letsencrypt)
- ✅ Configure automatic security updates
- ✅ Harden SSH (disable password auth)
- ✅ Set timezone to Europe/Amsterdam

### 3. Configure Dokku

```bash
# Set your domain
dokku domains:set-global entro.yourdomain.com

# Configure Let's Encrypt email
dokku letsencrypt:set --global email your-email@example.com

# Create the app
dokku apps:create entro
```

### 4. Set Environment Variables

```bash
# Set all required env vars
dokku config:set entro \
  DATABASE_URL="postgresql://..." \
  DIRECT_URL="postgresql://..." \
  NEXT_PUBLIC_SUPABASE_URL="https://..." \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="..." \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  MOLLIE_API_KEY="..." \
  TICKET_SIGNING_SECRET="..." \
  NEXT_PUBLIC_APP_URL="https://entro.yourdomain.com"

# View all config
dokku config:show entro
```

### 5. Deploy from Local Machine

```bash
# Add Dokku remote (one time)
git remote add dokku dokku@your-droplet-ip:entro

# Deploy
git push dokku main:master

# Or use the deploy script
./ops/deploy.sh entro
```

### 6. Enable SSL

```bash
# SSH into server
ssh root@your-droplet-ip

# Enable Let's Encrypt for your app
dokku letsencrypt:enable entro

# Auto-renew certificates
dokku letsencrypt:cron-job --add
```

## Common Commands

### Deployment

```bash
# Deploy to Dokku
git push dokku main:master

# Force rebuild
git push dokku main:master --force

# Deploy specific branch
git push dokku feature-branch:master
```

### App Management

```bash
# List all apps
dokku apps:list

# View app status
dokku ps:report entro

# Restart app
dokku ps:restart entro

# Scale app (multiple containers)
dokku ps:scale entro web=2

# View logs (live)
dokku logs entro -t

# Run one-off commands
dokku run entro pnpm prisma migrate deploy
```

### Database (Postgres)

```bash
# Create database
dokku postgres:create entro-db

# Link to app
dokku postgres:link entro-db entro

# Backup database
dokku postgres:export entro-db > backup-$(date +%Y%m%d).sql

# Import database
dokku postgres:import entro-db < backup.sql

# Connect to database
dokku postgres:connect entro-db
```

### Monitoring

```bash
# Server status (installed by init.sh)
server-status

# Docker stats
docker stats

# Disk usage
docker system df
df -h

# Memory usage
free -h

# View processes
htop
```

### SSL/Certificates

```bash
# Enable SSL
dokku letsencrypt:enable entro

# Renew certificate
dokku letsencrypt:renew entro

# Check certificate expiry
dokku letsencrypt:list
```

### Cleanup

```bash
# Clean up Docker resources
docker system prune -af

# Remove unused images
docker image prune -a

# View what would be deleted
docker system df
```

## Troubleshooting

### Deployment Fails

```bash
# View detailed logs
dokku logs entro -t

# Check build logs
dokku logs entro --num 1000

# Rebuild without cache
dokku ps:rebuild entro
```

### App Not Responding

```bash
# Check if app is running
dokku ps:report entro

# Restart app
dokku ps:restart entro

# Check nginx config
dokku nginx:show-config entro
```

### Database Connection Issues

```bash
# Check database status
dokku postgres:info entro-db

# View database logs
dokku postgres:logs entro-db -t

# Check connection string
dokku config:get entro DATABASE_URL
```

### Out of Disk Space

```bash
# Check disk usage
df -h
docker system df

# Clean up old containers/images
docker system prune -af --volumes

# Check app logs size
du -sh /var/log/dokku/*
```

### SSL Certificate Issues

```bash
# Renew certificate manually
dokku letsencrypt:renew entro

# Check certificate details
dokku letsencrypt:list

# View nginx config
dokku nginx:show-config entro
```

## Backup Strategy

### Automated Backups

```bash
# Create backup script
cat > /usr/local/bin/backup-entro <<'EOF'
#!/bin/bash
BACKUP_DIR="/backups/entro"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
dokku postgres:export entro-db > $BACKUP_DIR/db-$DATE.sql

# Compress
gzip $BACKUP_DIR/db-$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup complete: $BACKUP_DIR/db-$DATE.sql.gz"
EOF

chmod +x /usr/local/bin/backup-entro

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-entro") | crontab -
```

### Manual Backup

```bash
# Backup database
dokku postgres:export entro-db > entro-backup-$(date +%Y%m%d).sql

# Download to local machine
scp root@your-droplet-ip:/root/entro-backup-*.sql ./backups/
```

## Security Checklist

- ✅ Firewall enabled (UFW)
- ✅ fail2ban configured
- ✅ SSH password authentication disabled
- ✅ Automatic security updates enabled
- ✅ SSL/TLS enabled via Let's Encrypt
- ✅ Docker logs rotation configured
- ✅ Non-root user for apps
- ✅ Strong environment variable secrets

## Monitoring and Alerts

### DigitalOcean Monitoring

Enable in DigitalOcean dashboard:

- CPU usage alerts
- Disk usage alerts
- Bandwidth monitoring

### Custom Health Checks

```bash
# Install monitoring script
cat > /usr/local/bin/health-check <<'EOF'
#!/bin/bash
APP="entro"

# Check if app responds
if curl -f -s -o /dev/null https://entro.yourdomain.com/api/health; then
    echo "✅ App is healthy"
else
    echo "❌ App is down!"
    dokku ps:restart $APP
fi
EOF

chmod +x /usr/local/bin/health-check

# Run every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/health-check") | crontab -
```

## Performance Optimization

```bash
# Enable HTTP/2
dokku config:set entro DOKKU_HTTP_VERSION=2

# Set max request body size (for file uploads)
dokku nginx:set entro client-max-body-size 10m

# Configure keepalive timeout
dokku nginx:set entro keepalive-timeout 65
```

## Useful Dokku Plugins

```bash
# Maintenance mode
dokku plugin:install https://github.com/dokku/dokku-maintenance.git
dokku maintenance:enable entro

# Redis
dokku plugin:install https://github.com/dokku/dokku-redis.git
dokku redis:create entro-redis
dokku redis:link entro-redis entro
```

## Resources

- [Dokku Documentation](https://dokku.com/docs/getting-started/installation/)
- [DigitalOcean Dokku Image](https://marketplace.digitalocean.com/apps/dokku)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
