# Docker Setup for Entro

This guide explains how to run the Entro ticketing platform in Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- `.env` file with all required environment variables

## Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop the container
docker-compose down
```

### Option 2: Using Docker directly

```bash
# Build the image
docker build -t entro:latest \
  --build-arg DATABASE_URL="$DATABASE_URL" \
  --build-arg DIRECT_URL="$DIRECT_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  --build-arg MOLLIE_API_KEY="$MOLLIE_API_KEY" \
  --build-arg TICKET_SIGNING_SECRET="$TICKET_SIGNING_SECRET" \
  --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  .

# Run the container
docker run -d \
  --name entro-app \
  -p 3000:3000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e DIRECT_URL="$DIRECT_URL" \
  -e NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  -e MOLLIE_API_KEY="$MOLLIE_API_KEY" \
  -e TICKET_SIGNING_SECRET="$TICKET_SIGNING_SECRET" \
  -e NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  entro:latest

# View logs
docker logs -f entro-app

# Stop the container
docker stop entro-app
docker rm entro-app
```

## Environment Variables

Create a `.env` file in the project root with these variables:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Payment Provider
MOLLIE_API_KEY=your_mollie_api_key

# Security
TICKET_SIGNING_SECRET=your_random_secret_min_32_chars

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Docker Architecture

The Dockerfile uses a multi-stage build:

1. **deps**: Installs dependencies with pnpm
2. **builder**: Generates Prisma client and builds Next.js
3. **runner**: Minimal production image with only necessary files

### Image Size Optimization

- Uses Alpine Linux (smaller base image)
- Multi-stage build removes build dependencies
- Standalone output includes only required files
- Non-root user for security

## Health Checks

The container includes a health check endpoint:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' entro-app

# Manual health check
curl http://localhost:3000/api/health
```

## Common Commands

```bash
# Rebuild after code changes
docker-compose up -d --build

# View real-time logs
docker-compose logs -f app

# Execute commands inside container
docker-compose exec app sh

# Check Prisma schema
docker-compose exec app pnpm prisma validate

# View container stats
docker stats entro-app

# Remove everything and start fresh
docker-compose down -v
docker-compose up -d --build
```

## Production Deployment

### Security Checklist

- [ ] Use secrets management (not `.env` files)
- [ ] Enable TLS/HTTPS termination
- [ ] Set strong `TICKET_SIGNING_SECRET` (min 32 chars)
- [ ] Use read-only filesystem where possible
- [ ] Scan image for vulnerabilities: `docker scan entro:latest`
- [ ] Set resource limits in docker-compose.yml

### Example Production Compose

```yaml
services:
  app:
    build: .
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 2G
        reservations:
          cpus: "1"
          memory: 1G
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Troubleshooting

### Build Fails

```bash
# Clear Docker cache
docker builder prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Database Connection Issues

Ensure `DATABASE_URL` and `DIRECT_URL` are accessible from the container:

```bash
# Test connection from container
docker-compose exec app sh -c 'node -e "require(\"@prisma/client\").PrismaClient"'
```

### Port Already in Use

```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Map to different host port
```

### Prisma Generation Issues

```bash
# Manually trigger Prisma generation
docker-compose exec app pnpm prisma generate
```

## Performance Tips

1. **Use BuildKit**: `DOCKER_BUILDKIT=1 docker build .`
2. **Layer caching**: Don't change `package.json` frequently
3. **Prune unused images**: `docker image prune -a`
4. **Use .dockerignore**: Already configured to exclude unnecessary files

## Monitoring

Add monitoring tools in production:

```yaml
services:
  app:
    # ... existing config
    labels:
      - "com.entro.service=ticketing"
      - "com.entro.environment=production"
```

Then use tools like:

- Prometheus + Grafana for metrics
- ELK Stack for logs
- Sentry for error tracking

## Additional Resources

- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
