# Design Settings (Ontwerp)

**Status:** 📝 Planning
**Priority:** Medium
**Estimated Effort:** 3-5 days

## Overview

Allow organization admins to customize the branding of their ticket order portal by uploading a logo and selecting a light/dark theme preference. This enhances white-labeling capabilities and improves brand consistency for organizers selling tickets through the Entro platform.

## Current State

### ✅ Existing

- Settings page structure at `/dashboard/settings`
- Multi-tenant Organization model with `organizationId` scoping
- Vercel hosting environment (perfect for Vercel Blob Storage)
- Dark mode support via Tailwind CSS `dark:` classes
- Mobile-first UI components from shadcn/ui

### ❌ Missing

- Logo upload functionality
- Vercel Blob Storage integration
- Theme preference storage in Organization model
- Design settings UI page at `/dashboard/settings/design`
- Logo display in public ticket portal
- Theme application to public ticket portal

---

## Business Requirements

### User Story

As an **organization admin**, I want to **upload my organization's logo and choose a light or dark theme** so that **my ticket order portal reflects my brand identity and provides a consistent experience for ticket buyers**.

### Acceptance Criteria

- [ ] Logo upload supports common image formats (PNG, JPG, SVG) with max 2MB file size
- [ ] Logo preview shows immediately after upload
- [ ] Theme selector offers "Light" (Licht) and "Dark" (Donker) options
- [ ] Changes are scoped to the current organization (multi-tenancy enforced)
- [ ] Logo is displayed on public event pages (`/e/[slug]`) and checkout pages
- [ ] Theme preference applies to public pages only (dashboard remains user-controlled)
- [ ] Settings page is mobile-responsive with touch-friendly controls
- [ ] Invalid file uploads show clear error messages
- [ ] Logo can be removed/replaced
- [ ] Changes save with loading states and success confirmation

### Use Cases

1. **Primary Use Case: Upload Logo**
   - Admin navigates to `/dashboard/settings/design`
   - Clicks "Upload logo" button
   - Selects image file from device
   - Image uploads to Vercel Blob Storage
   - Preview shows immediately
   - URL is saved to Organization record
   - Result: Logo appears on all public ticket pages for that organization

2. **Primary Use Case: Change Theme**
   - Admin selects "Dark" from theme dropdown
   - Setting is saved to Organization record
   - Result: All public ticket pages for that organization use dark theme

3. **Edge Case: Invalid File Upload**
   - Admin uploads 5MB PNG file
   - System rejects file with error: "File must be under 2MB"
   - Admin compresses file and retries successfully

4. **Edge Case: Remove Logo**
   - Admin clicks "Remove logo" button
   - Confirmation dialog appears
   - Logo is deleted from storage and URL removed from database
   - Result: Public pages show default Entro branding

---

## Technical Implementation

### A) Database Schema

**Migration: `20260102_add_design_settings`**

Add fields to `Organization` model:

```prisma
model Organization {
  // ... existing fields ...

  // Design settings
  logoUrl         String? // Vercel Blob Storage URL
  portalTheme     PortalTheme @default(LIGHT) // Theme preference for public portal

  // ... existing relations ...
}

enum PortalTheme {
  LIGHT
  DARK
}
```

**Migration SQL:**

```sql
-- Add design settings columns
ALTER TABLE "organizations" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "organizations" ADD COLUMN "portalTheme" TEXT NOT NULL DEFAULT 'LIGHT';

-- Create enum type
CREATE TYPE "PortalTheme" AS ENUM ('LIGHT', 'DARK');

-- Convert column to enum
ALTER TABLE "organizations"
  ALTER COLUMN "portalTheme" TYPE "PortalTheme"
  USING ("portalTheme"::text::"PortalTheme");

-- Add index for faster queries
CREATE INDEX "organizations_logoUrl_idx" ON "organizations"("logoUrl");
```

---

### B) Vercel Blob Storage Configuration

**Why Vercel Blob:**

- Native Vercel integration (deployed on Vercel already)
- Edge network for fast global delivery
- Simple API (`put()`, `del()`, `list()`)
- Automatic CDN caching
- No CORS configuration needed
- Pay-as-you-go pricing (~$5-10/month for typical usage)

**Setup:**

1. **Install Package:**

```bash
pnpm add @vercel/blob
```

2. **Configure Environment Variable:**

In Vercel Dashboard → Settings → Environment Variables:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx  # Generated automatically
```

For local development, add to `.env.local`:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

3. **Enable Vercel Blob in Project:**

- Go to Vercel Dashboard → Storage → Create Store → Blob
- Or run: `vercel blob create production`

**File Naming Convention:**

```
{organizationId}/logo.{ext}  # e.g., "abc-123/logo.png"
```

Files are automatically served via: `https://[random].public.blob.vercel-storage.com/...`

**Security:**

- Multi-tenancy enforced in application code (orgId in path)
- Public read access (required for public event pages)
- Write/delete protected by authentication checks in API routes
- No RLS policies needed (simpler than Supabase)

**Cost Estimate:**

- Storage: $0.15/GB/month
- Bandwidth: $0.20/GB
- For 100 orgs with 100KB logos: ~$0.50/month
- For 1,000 orgs: ~$5/month

---

### C) Server Layer (Repository & Service)

**File: `src/server/repos/organizationRepo.ts`**

Add methods:

```typescript
export const organizationRepo = {
  // ... existing methods ...

  updateDesignSettings: async (
    orgId: string,
    data: { logoUrl?: string | null; portalTheme?: PortalTheme }
  ) => {
    return prisma.organization.update({
      where: { id: orgId },
      data,
      select: { id: true, logoUrl: true, portalTheme: true },
    });
  },

  getDesignSettings: async (orgId: string) => {
    return prisma.organization.findUnique({
      where: { id: orgId },
      select: { logoUrl: true, portalTheme: true },
    });
  },
};
```

**File: `src/server/services/designService.ts`** (new)

```typescript
import { put, del } from "@vercel/blob";
import { organizationRepo } from "@/server/repos/organizationRepo";

export async function uploadLogo(
  orgId: string,
  file: File
): Promise<{ url: string }> {
  // Validate file
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("File must be under 2MB");
  }

  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/svg+xml",
  ];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only PNG, JPG, and SVG files are allowed");
  }

  // Delete old logo if exists
  const oldSettings = await organizationRepo.getDesignSettings(orgId);
  if (oldSettings?.logoUrl) {
    await deleteLogo(orgId, oldSettings.logoUrl);
  }

  // Upload new logo to Vercel Blob
  const ext = file.name.split(".").pop();
  const pathname = `${orgId}/logo.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false, // Keep consistent filename
  });

  // Save URL to database
  await organizationRepo.updateDesignSettings(orgId, {
    logoUrl: blob.url,
  });

  return { url: blob.url };
}

export async function deleteLogo(orgId: string, logoUrl: string) {
  // Delete from Vercel Blob
  if (logoUrl) {
    await del(logoUrl);
  }

  // Remove from database
  await organizationRepo.updateDesignSettings(orgId, { logoUrl: null });
}

export async function updateTheme(orgId: string, theme: "LIGHT" | "DARK") {
  return organizationRepo.updateDesignSettings(orgId, {
    portalTheme: theme,
  });
}
```

---

### D) API Routes

**File: `src/app/api/design/logo/route.ts`** (new)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedOrg } from "@/lib/auth";
import { uploadLogo } from "@/server/services/designService";

export async function POST(req: NextRequest) {
  try {
    const org = await getAuthenticatedOrg(req);
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await uploadLogo(org.id, file);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const org = await getAuthenticatedOrg(req);
    const { searchParams } = new URL(req.url);
    const logoUrl = searchParams.get("url");

    if (!logoUrl) {
      return NextResponse.json({ error: "Logo URL required" }, { status: 400 });
    }

    await deleteLogo(org.id, logoUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
```

**File: `src/app/api/design/theme/route.ts`** (new)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedOrg } from "@/lib/auth";
import { updateTheme } from "@/server/services/designService";

export async function PATCH(req: NextRequest) {
  try {
    const org = await getAuthenticatedOrg(req);
    const { theme } = await req.json();

    if (!["LIGHT", "DARK"].includes(theme)) {
      return NextResponse.json(
        { error: "Invalid theme value" },
        { status: 400 }
      );
    }

    await updateTheme(org.id, theme);

    return NextResponse.json({ success: true, theme });
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
```

---

### E) Server Actions

**File: `src/app/(dashboard)/dashboard/settings/design/actions.ts`** (new)

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { designService } from "@/server/services/designService";
import { getCurrentOrg } from "@/lib/auth";

export async function updateThemeAction(theme: "LIGHT" | "DARK") {
  const org = await getCurrentOrg();

  await designService.updateTheme(org.id, theme);

  revalidatePath("/dashboard/settings/design");
  revalidatePath("/e/[slug]", "page"); // Revalidate public pages

  return { success: true };
}

export async function deleteLogoAction(logoUrl: string) {
  const org = await getCurrentOrg();

  await designService.deleteLogo(org.id, logoUrl);

  revalidatePath("/dashboard/settings/design");
  revalidatePath("/e/[slug]", "page");

  return { success: true };
}
```

---

### F) UI Components

**File: `src/app/(dashboard)/dashboard/settings/design/page.tsx`** (new)

```tsx
import { DesignSettingsForm } from "@/components/dashboard/design-settings-form";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentOrg } from "@/lib/auth";
import { organizationRepo } from "@/server/repos/organizationRepo";

export const metadata = {
  title: "Ontwerp - Instellingen",
  description: "Pas het uiterlijk van je ticketportaal aan",
};

export default async function DesignSettingsPage() {
  const org = await getCurrentOrg();
  const settings = await organizationRepo.getDesignSettings(org.id);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Ontwerp"
        description="Pas het uiterlijk van je ticketportaal aan"
      />

      <DesignSettingsForm
        organizationId={org.id}
        initialLogoUrl={settings?.logoUrl}
        initialTheme={settings?.portalTheme || "LIGHT"}
      />
    </div>
  );
}
```

**File: `src/components/dashboard/design-settings-form.tsx`** (new)

```tsx
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import {
  updateThemeAction,
  deleteLogoAction,
} from "@/app/(dashboard)/dashboard/settings/design/actions";
import { toast } from "@/hooks/use-toast";

type Props = {
  organizationId: string;
  initialLogoUrl: string | null;
  initialTheme: "LIGHT" | "DARK";
};

export function DesignSettingsForm({
  organizationId,
  initialLogoUrl,
  initialTheme,
}: Props) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [theme, setTheme] = useState(initialTheme);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/design/logo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload mislukt");
      }

      const { url } = await res.json();
      setLogoUrl(url);

      toast({
        title: "Logo geüpload",
        description: "Je logo wordt nu getoond op je ticketportaal",
      });
    } catch (error) {
      toast({
        title: "Upload mislukt",
        description:
          error instanceof Error ? error.message : "Probeer het opnieuw",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteLogo() {
    if (!logoUrl) return;

    setDeleting(true);
    try {
      await deleteLogoAction(logoUrl);
      setLogoUrl(null);

      toast({
        title: "Logo verwijderd",
        description: "Het standaard Entro logo wordt nu getoond",
      });
    } catch (error) {
      toast({
        title: "Verwijderen mislukt",
        description: "Probeer het opnieuw",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleThemeChange(newTheme: "LIGHT" | "DARK") {
    setTheme(newTheme);
    try {
      await updateThemeAction(newTheme);

      toast({
        title: "Thema bijgewerkt",
        description: `Je ticketportaal gebruikt nu het ${newTheme === "LIGHT" ? "lichte" : "donkere"} thema`,
      });
    } catch (error) {
      toast({
        title: "Update mislukt",
        description: "Probeer het opnieuw",
        variant: "destructive",
      });
      setTheme(initialTheme); // Revert
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Upload je organisatie logo (PNG, JPG of SVG, max 2MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl ? (
            <div className="space-y-4">
              <div className="relative w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                <img
                  src={logoUrl}
                  alt="Organization logo"
                  className="max-w-full max-h-full object-contain p-4"
                />
              </div>
              <div className="flex gap-2">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" disabled={uploading} asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Vervang logo
                    </span>
                  </Button>
                </Label>
                <Button
                  variant="destructive"
                  onClick={handleDeleteLogo}
                  disabled={deleting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Verwijder
                </Button>
              </div>
            </div>
          ) : (
            <Label
              htmlFor="logo-upload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <ImageIcon className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Klik om te uploaden</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG of SVG (max 2MB)
                </p>
              </div>
            </Label>
          )}

          <input
            id="logo-upload"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </CardContent>
      </Card>

      {/* Theme Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Thema</CardTitle>
          <CardDescription>
            Kies het thema voor je ticketbestelportaal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="theme">Thema voorkeur</Label>
            <Select value={theme} onValueChange={handleThemeChange}>
              <SelectTrigger id="theme" className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LIGHT">Licht</SelectItem>
                <SelectItem value="DARK">Donker</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Dit thema wordt toegepast op je publieke ticketpagina's
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### G) Integration with Public Portal

**File: `src/app/(public)/e/[slug]/page.tsx`** (update existing)

Add organization logo and theme application:

```tsx
// Fetch organization data with logo and theme
const event = await eventRepo.findBySlugWithOrg(slug);
const { logoUrl, portalTheme } = event.organization;

// Apply theme class to root element
<div className={portalTheme === "DARK" ? "dark" : ""}>
  {/* Event page content */}

  {/* Display logo if exists */}
  {logoUrl && (
    <img src={logoUrl} alt={event.organization.name} className="h-12 w-auto" />
  )}
</div>;
```

**File: `src/server/repos/eventRepo.ts`** (update)

```typescript
findBySlugWithOrg: async (slug: string) => {
  return prisma.event.findUnique({
    where: { slug },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          portalTheme: true,
        },
      },
      ticketTypes: true,
    },
  });
},
```

---

### H) Navigation Integration

**File: `src/app/(dashboard)/dashboard/settings/layout.tsx`** (update)

Add "Ontwerp" link to settings navigation:

```tsx
const settingsNav = [
  { name: "Algemeen", href: "/dashboard/settings" },
  { name: "Ontwerp", href: "/dashboard/settings/design" },
  { name: "Facturatie", href: "/dashboard/settings/invoicing" },
  // ... other items
];
```

---

## Testing Requirements

### Unit Tests

**File: `tests/designSettings.test.ts`** (new)

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { designService } from "@/server/services/designService";

describe("Design Settings", () => {
  it("should reject files over 2MB", async () => {
    const largeFile = new File(["x".repeat(3 * 1024 * 1024)], "large.png", {
      type: "image/png",
    });

    await expect(
      designService.uploadLogo("org-123", largeFile)
    ).rejects.toThrow("File must be under 2MB");
  });

  it("should reject invalid file types", async () => {
    const pdfFile = new File(["pdf content"], "doc.pdf", {
      type: "application/pdf",
    });

    await expect(designService.uploadLogo("org-123", pdfFile)).rejects.toThrow(
      "Only PNG, JPG, and SVG files are allowed"
    );
  });

  it("should update theme successfully", async () => {
    const result = await designService.updateTheme("org-123", "DARK");
    expect(result.portalTheme).toBe("DARK");
  });
});
```

### Integration Tests

- [ ] Logo upload flow (upload → preview → save)
- [ ] Logo deletion (confirm → delete from storage → remove from DB)
- [ ] Theme change (select → save → apply to public pages)
- [ ] Multi-tenancy enforcement (org A cannot modify org B's logo)

### Manual Testing Checklist

- [ ] Upload valid logo (PNG, JPG, SVG under 2MB)
- [ ] Try uploading file over 2MB (should show error)
- [ ] Try uploading invalid file type (should show error)
- [ ] Change theme from Light to Dark
- [ ] Verify logo appears on public event page
- [ ] Verify theme applies to public event page
- [ ] Delete logo and verify fallback
- [ ] Test on mobile device (touch-friendly upload)
- [ ] Test with slow network (loading states visible)

---

## Migration Plan

### Phase 1: Database & Storage Setup (Day 1)

- [ ] Create Prisma migration for design settings columns
- [ ] Run migration on development database
- [ ] Enable Vercel Blob Storage in Vercel Dashboard (or `vercel blob create`)
- [ ] Install `@vercel/blob` package (`pnpm add @vercel/blob`)
- [ ] Configure `BLOB_READ_WRITE_TOKEN` environment variable
- [ ] Test blob upload/delete with simple script

### Phase 2: Backend Services (Day 2)

- [ ] Create `designService.ts` with upload/delete/theme methods
- [ ] Add repository methods to `organizationRepo.ts`
- [ ] Create API routes (`/api/design/logo`, `/api/design/theme`)
- [ ] Write unit tests for service layer
- [ ] Test API routes with Postman/cURL

### Phase 3: UI Implementation (Day 3)

- [ ] Create design settings page at `/dashboard/settings/design`
- [ ] Build `DesignSettingsForm` component
- [ ] Add server actions for theme and logo deletion
- [ ] Integrate with settings navigation
- [ ] Test form interactions and error states

### Phase 4: Public Portal Integration (Day 4)

- [ ] Update event page to fetch organization design settings
- [ ] Apply theme class to public pages
- [ ] Display logo on event pages
- [ ] Display logo on checkout pages
- [ ] Test theme switching on public pages

### Phase 5: Polish & Testing (Day 5)

- [ ] Run all unit and integration tests
- [ ] Manual testing on desktop and mobile
- [ ] Fix bugs and edge cases
- [ ] Update SPEC.md with design settings documentation
- [ ] Deploy to staging environment

---

## Security Considerations

### File Upload Security

- **File Size Validation:** Hard limit of 2MB enforced server-side
- **File Type Validation:** Whitelist only PNG, JPG, SVG (check MIME type and extension)
- **Malware Scanning:** Vercel Blob includes automatic malware detection
- **Path Traversal:** Use `organizationId` in file path, no user input in paths

### Multi-Tenancy Enforcement

- **Upload:** Check user membership before allowing upload (enforced in API route)
- **Delete:** Verify user belongs to org before deleting files (enforced in API route)
- **Read:** Public read for logos (required for public display)
- **Path Scoping:** Files stored with `{orgId}/` prefix to prevent cross-org access

### API Security

- **Authentication:** All upload/delete endpoints require authenticated user
- **Authorization:** Verify user belongs to organization via membership check
- **Rate Limiting:** 10 uploads/hour per org (implement with Vercel Edge Config or middleware)
- **CSRF Protection:** Next.js built-in CSRF protection for API routes

---

## Performance Considerations

### Image Optimization

- **Client-Side Resize:** Optionally resize images in browser before upload (using canvas API)
- **Vercel Edge Network:** Blob Storage automatically serves via Edge CDN for fast global delivery
- **Cache Headers:** Vercel Blob sets appropriate cache headers (long TTL for immutable files)
- **Lazy Loading:** Use `loading="lazy"` on logo images in public portal

### Database Queries

- **Index on logoUrl:** Added in migration for faster filtering
- **Select Specific Fields:** Only fetch `logoUrl` and `portalTheme` for public pages

### Edge Caching

- **CDN:** Vercel Edge Network automatically caches logo files globally
- **Cache Invalidation:** Updating logo automatically invalidates old URL
- **Response Times:** <100ms for cached assets from edge nodes

---

## Future Enhancements (Not in MVP)

- [ ] Color picker for custom brand colors (primary, accent)
- [ ] Custom fonts upload
- [ ] Preview mode (see changes before saving)
- [ ] Multiple logo variants (light/dark versions)
- [ ] Favicon upload
- [ ] Custom CSS injection (advanced users)
- [ ] Banner image for event pages
- [ ] Logo position options (left, center, right)

---

## Success Metrics

### User Adoption

- **Target:** 50% of active organizations upload a logo within 30 days
- **Measurement:** Track `logoUrl IS NOT NULL` percentage

### Engagement

- **Target:** 80% of organizations with logo uploaded also customize theme
- **Measurement:** Track both fields populated

### Technical Performance

- **Upload Success Rate:** >95% of uploads succeed
- **Load Time:** Logo images load in <500ms on 3G connection
- **Error Rate:** <5% of uploads fail due to validation errors

---

## Dependencies

### External Services

- **Vercel Blob Storage:** Required for file hosting (native Vercel service)
- **Vercel Hosting:** Already in use (no additional setup)

### NPM Packages

```json
{
  "dependencies": {
    "@vercel/blob": "^0.23.0"
  }
}
```

### Environment Variables

```bash
# Auto-generated by Vercel when Blob Storage is enabled
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

### Internal Systems

- **Organization Model:** Requires multi-tenancy enforcement
- **Public Event Pages:** Must integrate logo and theme display
- **Settings Navigation:** Add new menu item
- **Authentication:** Supabase Auth for user authentication

---

## Rollout Plan

### Development Environment

1. Install `@vercel/blob` package
2. Enable Vercel Blob Storage (locally via Vercel CLI)
3. Run migration on dev database
4. Test upload/delete workflow end-to-end

### Staging Environment

1. Enable Vercel Blob Storage in staging project
2. Deploy backend changes
3. Run migration
4. Smoke test with test organization
5. Verify blob storage costs in Vercel dashboard

### Production Environment

1. **Pre-deployment:**
   - Backup production database
   - Enable Vercel Blob Storage in production project
   - Verify `BLOB_READ_WRITE_TOKEN` environment variable

2. **Deployment:**
   - Deploy application code
   - Run migration (zero downtime)
   - Monitor error logs
   - Check Vercel Blob dashboard for upload activity

3. **Post-deployment:**
   - Test with real organization account
   - Monitor upload success rate
   - Track storage costs (should be <$5/month initially)
   - Send announcement email to all admins

---

## Documentation Updates

### SPEC.md

Add section on design settings:

```markdown
## Design Settings

Organizations can customize their ticket portal appearance:

- **Logo Upload:** PNG, JPG, or SVG (max 2MB)
- **Theme Selection:** Light or Dark mode
- **Scope:** Applied to all public event and checkout pages

File storage: Vercel Blob Storage (Edge CDN)
Database fields: `Organization.logoUrl`, `Organization.portalTheme`

### Costs

Vercel Blob Storage operates on pay-as-you-go pricing:

- Storage: $0.15/GB/month
- Bandwidth: $0.20/GB
- Estimated cost: ~$5-10/month for 1000 organizations
```

### Internal Developer Docs

- Add Vercel Blob Storage setup guide
- Document environment variable configuration
- Update architecture diagram with Vercel Blob layer
- Add cost monitoring dashboard instructions

---

## Open Questions

- [ ] Should we support automatic dark/light logo variants?
- [ ] Do we need client-side image compression or rely on Vercel Blob's CDN?
- [ ] Should theme preference sync with user's system preference (light/dark detection)?
- [ ] Do we want to track logo upload events in audit logs?
- [ ] Should we set up cost alerts in Vercel for Blob Storage usage?

---

## Work Style Checklist

### Before Coding

- [x] Summarized plan in this document
- [x] Listed all files to be created/modified
- [x] Identified security risks (file upload, multi-tenancy)
- [ ] Get approval on database schema changes

### After Coding

- [ ] `pnpm run build` passes
- [ ] `pnpm run lint` passes
- [ ] Unit tests added for services
- [ ] SPEC.md updated with design settings docs
- [ ] Migration created (not modified)
- [ ] Tested on mobile device

---

## Commit Style

```
feat(settings): add design settings page with logo upload

- Add logoUrl and portalTheme to Organization model
- Create designService for upload/delete operations
- Build DesignSettingsForm with file upload and theme selector
- Configure Supabase Storage bucket with RLS policies
- Integrate logo and theme into public event pages

Closes #XXX
```

---

## Notes

- Logo appears on public pages only (dashboard keeps Entro branding)
- Theme setting is per-organization, not per-user
- Future: Add color picker, custom fonts, banner images
- Consider adding analytics tracking for logo display impressions
