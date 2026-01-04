# Quick Deploy Cheatsheet

## Deploy Changes to Production

```bash
# Standard workflow
git add .
git commit -m "feat: your changes"
git push dokku main:master

# If you have database migrations, run them after deploy
ssh root@164.92.156.106 "dokku run entro-production pnpm prisma migrate deploy"
```

## Deploy with Database Migrations

```bash
# 1. Generate migration locally
pnpm prisma migrate dev --name your_migration_name

# 2. Commit everything (code + migration files)
git add .
git commit -m "feat: add feature with migration"

# 3. Deploy
git push dokku main:master

# 4. Apply migrations on production
ssh root@164.92.156.106 "dokku run entro-production pnpm prisma migrate deploy"

# 5. Verify
curl https://www.getentro.app/api/health
```

## Common Tasks

```bash
# View logs
ssh root@164.92.156.106 "dokku logs entro-production -t"

# Restart app
ssh root@164.92.156.106 "dokku ps:restart entro-production"

# Update environment variable
ssh root@164.92.156.106 "dokku config:set entro-production KEY=value"

# Run migrations
ssh root@164.92.156.106 "dokku run entro-production pnpm prisma migrate deploy"

# Check health
curl https://www.getentro.app/api/health
```

## Aliases (Optional)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Dokku deployment aliases
alias dokku-deploy='git push dokku main:master'
alias dokku-logs='ssh root@164.92.156.106 "dokku logs entro-production -t"'
alias dokku-restart='ssh root@164.92.156.106 "dokku ps:restart entro-production"'
alias dokku-status='ssh root@164.92.156.106 "dokku ps:report entro-production"'
alias dokku-config='ssh root@164.92.156.106 "dokku config:show entro-production"'

# Then just use:
# dokku-deploy
# dokku-logs
```

Reload your shell: `source ~/.zshrc`
