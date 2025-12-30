# Entro

Multi-tenant ticketing platform for small organizations in the Netherlands.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## Documentation

- [SPEC.md](./SPEC.md) – Business requirements and domain model
- [.github/copilot-instructions.md](./.github/copilot-instructions.md) – Development guidelines

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public routes
│   ├── (dashboard)/       # Org dashboard
│   ├── api/               # Route handlers
│   └── webhooks/          # Payment webhooks
├── components/            # React components
├── server/
│   ├── domain/            # Domain types
│   ├── services/          # Business logic
│   ├── repos/             # Data access
│   └── lib/               # Server utilities
└── lib/                   # Client utilities
```

## Key Concepts

### Multi-Tenancy

Every data query is scoped to `organizationId`. This is enforced at the repository layer.

### Fee Model

- **Service fee**: Paid by buyer, per order
- **Platform fee**: Paid by organizer, calculated only on used (scanned) tickets

### Ticket Security

- QR codes contain signed tokens
- Signature validated on every scan
- Every scan attempt is logged for audit

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Auth**: Supabase Auth
- **Payments**: Mollie (iDEAL)
- **Email**: Resend
- **UI**: Tailwind CSS + Radix UI
- **Language**: TypeScript

## Development

### Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run ESLint
npm run test     # Run tests
```

### Platform Administration

The platform includes a SuperAdmin dashboard at `/platform` for managing all organizations.

**Creating a SuperAdmin:**

```bash
# Create a SuperAdmin user (requires Supabase user ID)
npx tsx scripts/create-super-admin.ts <user-id> <email>

# Example:
npx tsx scripts/create-super-admin.ts "abc123-def456..." "admin@example.com"
```

Once created, SuperAdmins can access:

- Platform dashboard with global statistics
- Organization management
- Subscription & billing management
- Platform analytics
- Admin audit logs
- Platform settings

**Note:** SuperAdmin access is completely separate from organization membership. Users with SuperAdmin status can access both `/platform` (admin) and `/dashboard` (organizer) routes.

### Before Committing

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Tests added/updated
- [ ] SPEC.md updated if needed

## Environment Variables

```bash
# Supabase
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
MOLLIE_API_KEY=test_...
TICKET_SIGNING_SECRET=your-secret-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your-random-secret-token  # For securing cron endpoints
```

### Cron Jobs

The application requires a daily cron job to process subscription renewals and cancellations:

**Endpoint:** `GET /api/cron/process-subscriptions`

**When deployed on Vercel:**

- Automatically configured via `vercel.json` (runs daily at 2 AM UTC)
- No manual setup required

**For other platforms or local testing:**

```bash
# Call the endpoint with authorization
curl -X GET https://your-domain.com/api/cron/process-subscriptions \
  -H "Authorization: Bearer your-cron-secret"
```

**What it does:**

- Processes all subscriptions past their `currentPeriodEnd` date
- Cancels Mollie subscriptions for cancelled plans
- Deletes subscription records for cancelled plans
- Renews active subscriptions for the next billing period

## License

Proprietary – All rights reserved.

Resend API key: re_7eGtCxHD_PydRHn9gzRTDah1ovFCvxaMN
