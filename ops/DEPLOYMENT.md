# Deployment Guide for Entro on Dokku

Complete guide to deploy Entro to your Dokku VPS with SSL.

## Prerequisites

- [x] Dokku VPS initialized (run `ops/init.sh` first)
- [x] DNS configured: `www.getentro.app` -> your server IP
- [x] `.env` file with all configuration (including DigitalOcean Postgres)
- [x] SSH access to Dokku server

## Quick Start

### 1. Bootstrap the Application (on VPS)

```bash
# Copy scripts to the server
scp ops/bootstrap-app.sh root@164.92.156.106:/tmp/
scp .env root@164.92.156.106:/tmp/

# SSH into server
ssh root@164.92.156.106

# Run bootstrap
cd /tmp
chmod +x bootstrap-app.sh
./bootstrap-app.sh
```

This script will:

- Create the `entro` app on Dokku
- Configure domain (`www.getentro.app`)
- Set all environment variables from `.env`
- Configure buildpack (Node.js)
- Set up health checks (`/api/health`)
- Configure Nginx (max body size, HTTP/2)
- Configure Let's Encrypt (ready for SSL)
- Set resource limits

### 2. Add Your SSH Key to Dokku (one time)

```bash
# Option 1: Use the script (recommended)
./ops/add-ssh-key.sh

# Option 2: Manual
cat ~/.ssh/id_rsa.pub | ssh root@164.92.156.106 "dokku ssh-keys:add $(whoami)"

# Verify it was added
ssh root@164.92.156.106 dokku ssh-keys:list
```

### 3. Deploy (from local machine)

```bash
# Add Dokku remote (one time)
git remote add dokku dokku@164.92.156.106:entro-production

# Deploy
git push dokku main:master
```

### 4. Enable SSL (from local machine)

```bash
# Option 1: Use the script
./ops/enable-ssl.sh

# Option 2: Manual
ssh root@164.92.156.106 dokku letsencrypt:enable entro-production
```

Your app is now live at **https://www.getentro.app** 🎉

## CI/CD with GitHub Actions

### Option 1: Git Push (Simple)

Just push to Dokku directly:

```bash
git push dokku main:master
```

**Pros:**

- Simple, no setup needed
- Fast deployments
- Direct feedback

**Cons:**

- No automated testing
- Manual process
- No deployment history

### Option 2: GitHub Actions (Recommended)

Automated deployments with testing and validation.

#### Setup GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:

```
DOKKU_HOST=164.92.156.106
DOKKU_SSH_PRIVATE_KEY=<your-ssh-private-key>
```

To get your SSH private key:

```bash
# On your local machine
cat ~/.ssh/id_rsa
# Copy the entire output
```

#### How It Works

The workflow (`.github/workflows/deploy.yml`) will:

1. **On every push to main:**
   - Run type checking
   - Run linter
   - Run tests
   - Deploy to Dokku (if tests pass)
   - Verify deployment health

2. **Manual trigger:**
   - Go to Actions tab → Deploy to Dokku → Run workflow

**Pros:**

- Automated testing before deploy
- Deployment history in GitHub
- Prevents broken code from deploying
- Can add notifications

**Cons:**

- Requires GitHub Actions setup
- Slightly slower than direct push

### Which Should You Use?

**Use Git Push if:**

- Quick fixes/hotfixes needed
- Small team, trust in code quality
- Want immediate deployments

**Use GitHub Actions if:**

- Multiple developers
- Want quality gates (tests, linting)
- Need deployment audit trail
- Production environment

**You can use BOTH!**

- GitHub Actions for `main` branch (production)
- Direct git push for testing/staging

## Environment Variables

All configuration is in `.env`:

```env
# Database (DigitalOcean Postgres)
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
DIRECT_URL=postgresql://user:pass@host:port/db?sslmode=require

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Mollie
MOLLIE_API_KEY=...

# OpenAI (optional - for AI features)
OPENAI_API_KEY=sk-...

# Security
TICKET_SIGNING_SECRET=... # min 32 chars

# App
NEXT_PUBLIC_APP_URL=https://www.getentro.app
NODE_ENV=production
```

**Important Notes:**

- **Build-time vs Runtime:** `NEXT_PUBLIC_*` variables are baked into the client bundle at build time
- **Dokku behavior:** All env vars set via `dokku config:set` are available during both build and runtime
- **Verification:** Check with `dokku config:show entro-production`

Update config anytime:

```bash
# SSH into server
ssh root@164.92.156.106

# Update single variable
dokku config:set entro MOLLIE_API_KEY=new_key

# Update multiple
dokku config:set entro \
  DATABASE_URL="new_url" \
  MOLLIE_API_KEY="new_key"

# View all config
dokku config:show entro
```

## DNS Configuration

Add an A record in your DNS provider (Cloudflare, etc.):

```
Type: A
Name: www
Value: 164.92.156.106
TTL: Auto
```

Verify DNS:

```bash
dig +short www.getentro.app
# Should output: 164.92.156.106
```

## Database Migration

Since you're using external DigitalOcean Postgres:

```bash
# Run migrations after deployment
ssh root@164.92.156.106 dokku run entro-production pnpm prisma migrate deploy

# Or from local (one-time setup)
# Set DATABASE_URL locally, then:
pnpm prisma migrate deploy
```

## Deployment Workflow

### Quick Deploy (Most Common)

After making code changes, deploy to production:

```bash
# 1. Commit your changes
git add .
git commit -m "feat: your change description"

# 2. Deploy to production
git push dokku main:master

# 3. Watch the deployment logs (opens automatically during push)
# Wait for: "=====> Application deployed"

# 4. Verify the deployment
curl https://www.getentro.app/api/health
```

That's it! Your changes are live.

### Deploy with Database Migrations

When you have Prisma schema changes:

```bash
# 1. Create migration locally (creates migration files)
pnpm prisma migrate dev --name add_new_field

# 2. Commit code AND migration files
git add .
git commit -m "feat: add new field to users table"

# 3. Deploy code
git push dokku main:master

# 4. Apply migrations to production database
ssh root@164.92.156.106 "dokku run entro-production pnpm prisma migrate deploy"

# 5. Verify
curl https://www.getentro.app/api/health
```

**Important:**

- Always test migrations locally first
- Deploy code before running migrations (deployment includes schema)
- Migrations run inside the app container, so env vars are available
- Use `migrate deploy` (not `migrate dev`) in production

### Deploy from Feature Branch

If you're working on a branch:

```bash
# Deploy your current branch to production
git push dokku your-branch-name:master

# Or merge to main first (recommended)
git checkout main
git merge your-branch-name
git push dokku main:master
```

### Force Rebuild

If you need to rebuild without code changes (e.g., after changing env vars):

```bash
ssh root@164.92.156.106 "dokku ps:rebuild entro-production"
```

### Regular Deployments

```bash
# 1. Make changes locally
git add .
git commit -m "feat: new feature"

# 2. Push to GitHub (triggers CI/CD if enabled)
git push origin main

# 3. Or deploy directly to Dokku
git push dokku main:master
```

### Rollback

```bash
# View deployment history
ssh root@164.92.156.106 dokku ps:report entro

# Rollback to previous version
ssh root@164.92.156.106 dokku ps:rebuild entro

# Or restore from a specific git commit
git push dokku <commit-hash>:master
```

### Zero-Downtime Deployments

Dokku automatically does zero-downtime deployments:

1. Builds new container
2. Runs health check (`/api/health`)
3. If healthy, routes traffic to new container
4. Removes old container

If health check fails, old container keeps running!

## Monitoring

### View Logs

```bash
# Real-time logs
ssh root@164.92.156.106 dokku logs entro-production -t

# Last 100 lines
ssh root@164.92.156.106 dokku logs entro-production --num 100

# From local machine
ssh root@164.92.156.106 "dokku logs entro-production -t"
```

### Check App Status

```bash
ssh root@164.92.156.106 dokku ps:report entro
```

### Health Check

```bash
curl https://www.getentro.app/api/health
# Should return: {"status":"ok",...}
```

### Resource Usage

```bash
ssh root@164.92.156.106 docker stats
```

## Troubleshooting

### Build Fails

```bash
# View build logs
ssh root@164.92.156.106 dokku logs entro

# Rebuild from scratch
ssh root@164.92.156.106 dokku ps:rebuild entro

# Check Prisma generation
ssh root@164.92.156.106 dokku run entro pnpm prisma generate
```

### App Crashes on Start

```bash
# Check logs
ssh root@164.92.156.106 dokku logs entro -t

# Common issues:
# - Missing env vars: dokku config:show entro
# - Database connection: check DATABASE_URL
# - Port binding: app should listen on PORT env var (3000)
```

### SSL Certificate Issues

```bash
# Check certificate status
ssh root@164.92.156.106 dokku letsencrypt:list

# Renew manually
ssh root@164.92.156.106 dokku letsencrypt:renew entro

# Check Nginx config
ssh root@164.92.156.106 dokku nginx:show-config entro
```

### Database Connection Fails

```bash
# Test connection from server
ssh root@164.92.156.106 dokku run entro node -e "console.log('Testing DB...'); require('@prisma/client')"

# Check if DATABASE_URL is correct
ssh root@164.92.156.106 dokku config:get entro DATABASE_URL

# Verify DigitalOcean Postgres allows connections from VPS IP
```

## Maintenance

### Update Dependencies

```bash
# Local machine
pnpm update
pnpm test
git commit -am "chore: update dependencies"
git push dokku main:master
```

### Maintenance Mode

```bash
# Enable maintenance page
ssh root@164.92.156.106 dokku maintenance:enable entro

# Disable
ssh root@164.92.156.106 dokku maintenance:disable entro
```

### Backup Before Major Changes

```bash
# Backup config
ssh root@164.92.156.106 dokku config:show entro > config-backup.txt

# Backup database (if needed)
# Since you're using DigitalOcean Postgres, use their backup tools
```

## Performance Optimization

### Scale Horizontally

```bash
# Run 2 instances
ssh root@164.92.156.106 dokku ps:scale entro web=2

# Dokku will load balance between them
```

### Increase Resources

```bash
# Allow more memory
ssh root@164.92.156.106 dokku resource:limit entro --memory 2048

# View current limits
ssh root@164.92.156.106 dokku resource:report entro
```

### Enable Caching

Already configured in Next.js config - static assets cached for 1 year.

## Security Checklist

- [x] SSL enabled (Let's Encrypt)
- [x] Environment variables not in git
- [x] Strong TICKET_SIGNING_SECRET (min 32 chars)
- [x] Database uses SSL (sslmode=require)
- [x] Health checks enabled
- [x] Resource limits set
- [x] Firewall configured (from init.sh)
- [x] fail2ban active (from init.sh)

## Useful Scripts

All scripts in `ops/`:

- `init.sh` - Initialize fresh Dokku VPS
- `bootstrap-app.sh` - Setup Entro app on Dokku
- `deploy.sh` - Quick deploy helper
- `enable-ssl.sh` - Enable Let's Encrypt SSL

Make them executable:

```bash
chmod +x ops/*.sh
```

## Quick Reference

```bash
# ============================================
# DEPLOYMENT
# ============================================

# Deploy to production (most common)
git add .
git commit -m "feat: description"
git push dokku main:master

# Deploy specific branch
git push dokku branch-name:master

# Force rebuild
ssh root@164.92.156.106 "dokku ps:rebuild entro-production"

# ============================================
# MONITORING
# ============================================

# View logs (real-time)
ssh root@164.92.156.106 "dokku logs entro-production -t"

# Check app status
ssh root@164.92.156.106 "dokku ps:report entro-production"

# Test health endpoint
curl https://www.getentro.app/api/health

# ============================================
# CONFIGURATION
# ============================================

# Update env var
ssh root@164.92.156.106 "dokku config:set entro-production KEY=value"

# View all config
ssh root@164.92.156.106 "dokku config:show entro-production"

# Restart app (after config changes)
ssh root@164.92.156.106 "dokku ps:restart entro-production"

# ============================================
# DATABASE
# ============================================

# Run migrations
ssh root@164.92.156.106 "dokku run entro-production pnpm prisma migrate deploy"

# Open Prisma Studio (from local)
pnpm prisma studio

# ============================================
# TROUBLESHOOTING
# ============================================

# View last 100 log lines
ssh root@164.92.156.106 "dokku logs entro-production --num 100"

# Restart app
ssh root@164.92.156.106 "dokku ps:restart entro-production"

# Rebuild from scratch
ssh root@164.92.156.106 "dokku ps:rebuild entro-production"

# Check domains
ssh root@164.92.156.106 "dokku domains:report entro-production"
```

## Next Steps

1. Set up monitoring (optional but recommended)
   - [Sentry](https://sentry.io) for error tracking
   - DigitalOcean monitoring for server metrics
   - [UptimeRobot](https://uptimerobot.com) for uptime monitoring

2. Set up staging environment (optional)

   ```bash
   # Create staging app
   ssh root@164.92.156.106 dokku apps:create entro-staging
   git remote add staging dokku@164.92.156.106:entro-staging
   ```

3. Configure backups
   - DigitalOcean Postgres has automatic backups
   - Consider backing up uploaded files (if any)

4. Set up proper monitoring and alerts
   - CPU/Memory alerts
   - Disk space alerts
   - SSL certificate expiry alerts (auto-handled by Dokku)
