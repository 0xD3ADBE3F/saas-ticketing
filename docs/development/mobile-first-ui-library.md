# Mobile-First UI Component Library

**Status:** 🟨 Planned
**Priority:** High
**Estimated Effort:** 16-24 hours (3-4 days)

## Overview

Implement a standardized UI component library using shadcn/ui and Radix UI primitives to eliminate style duplication (currently 100+ inline button variants), improve accessibility, and maintain mobile-first patterns across the Entro platform. This refactor will reduce development time, ensure consistency, and improve UX on mobile devices while preserving existing app-like navigation patterns.

## Current State

### ✅ Completed

- Excellent mobile-first responsive patterns (hidden md:block, responsive grids)
- Bottom navigation bar for dashboard (5-tab mobile navigation)
- PWA setup for scanner app with iOS safe-area support
- Full dark mode implementation with `dark:` classes
- Tailwind CSS v4 with theme configuration
- Touch optimizations (-webkit-tap-highlight-color, touch scrolling)
- Consistent color semantics (blue-600 primary, green-600 success, etc.)
- html5-qrcode library for QR scanning
- Responsive typography and spacing scales

### ⬜ To Build

- Install shadcn/ui with Radix UI primitives (NOT currently installed despite docs mentioning it)
- Create `src/components/ui/` folder with base components:
  - Button (with variants: primary, secondary, danger, ghost, outline)
  - Input, Textarea, Label
  - Card, CardHeader, CardContent, CardFooter
  - Badge, Select, Tabs, Dialog, Sheet (mobile drawer)
- Install Lucide React icon library (replace 50+ inline SVG icons)
- Create mobile-specific pattern components:
  - BottomNav (codify existing bottom navigation pattern)
  - MobileDrawer (standardize slide-in drawer)
- Refactor high-traffic components to use new UI primitives
- Document component usage and mobile-first guidelines

---

## Business Requirements

### User Story

As a **developer on the Entro team**, I want to **use standardized, accessible UI components** so that **I can build features faster, maintain visual consistency across the platform, and ensure excellent mobile UX without rewriting styles for every button/form/card**.

### Acceptance Criteria

- [ ] All UI components are mobile-first (touch targets ≥44px, responsive by default)
- [ ] Components support dark mode with `dark:` variants
- [ ] Components are accessible (ARIA labels, keyboard navigation, screen reader support)
- [ ] Icons are consistent across the platform using Lucide React
- [ ] Bottom navigation and drawer patterns are reusable components
- [ ] No breaking changes to existing UI appearance (visual parity maintained)
- [ ] Documentation exists for each component with usage examples
- [ ] High-traffic pages (Dashboard, Scanner, Checkout) use new components

### Use Cases

1. **Primary Use Case: Building a New Form**
   - Developer imports `<Button>`, `<Input>`, `<Card>` from `@/components/ui`
   - Components automatically handle dark mode, focus states, mobile sizing
   - Result: 70% less code, consistent styling

2. **Primary Use Case: Mobile Navigation**
   - New page needs mobile menu
   - Developer uses `<BottomNav>` or `<MobileDrawer>` component
   - Result: Consistent app-like feel across all pages

3. **Edge Case: Custom Styling**
   - Component needs brand-specific styling
   - Developer uses `className` prop to extend/override Tailwind classes
   - Result: Flexibility maintained while keeping defaults

---

## Technical Implementation

### A) Database Schema

**No database changes required.** This is a frontend refactor only.

---

### B) Component Library Structure

**New Directory:** `src/components/ui/`

**Installation Command:**

```bash
npx shadcn@latest init
```

**Configuration (when prompted):**

- Style: Default
- Base color: Slate (neutral, works with existing gray palette)
- CSS variables: Yes (for theme support)
- Import alias: `@/components` (already in use)
- React Server Components: Yes (Next.js 16+)
- Tailwind config: `postcss.config.mjs` (v4 setup)

**Component List (install with `npx shadcn@latest add <name>`):**

```bash
# Core components
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add textarea
npx shadcn@latest add select
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add tabs
npx shadcn@latest add dialog
npx shadcn@latest add sheet  # Mobile drawer
npx shadcn@latest add dropdown-menu
npx shadcn@latest add separator
npx shadcn@latest add skeleton
npx shadcn@latest add toast  # Notifications
```

**Icons:**

```bash
pnpm add lucide-react
```

**Animations:**

```bash
pnpm add framer-motion
```

---

### C) Custom Mobile Components

**File:** `src/components/ui/bottom-nav.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface BottomNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  match?: (pathname: string) => boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
  className?: string;
}

export function BottomNav({ items, className }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 h-16",
        "bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800",
        "z-40 safe-area-bottom",
        className
      )}
    >
      <div className="flex h-full items-center justify-around">
        {items.map((item) => {
          const isActive = item.match
            ? item.match(pathname)
            : pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center",
                "w-full h-full gap-1 text-xs font-medium",
                "transition-colors touch-manipulation",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**File:** `src/components/ui/mobile-header.tsx`

```tsx
"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  title: string;
  children?: React.ReactNode; // Sidebar content
}

export function MobileHeader({ title, children }: MobileHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="md:hidden sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h1>

        {children && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                {open ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              {children}
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
  );
}
```

**File:** `src/components/ui/stat-card.tsx`

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
          {Icon && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          )}
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-1 text-sm">
            <span
              className={cn(
                "font-medium",
                trend.positive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {trend.value}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              vs last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### D) Page Inventory & Migration Waves

**Complete Page Inventory (34 pages across 8 route groups):**

#### **Route Group 1: Dashboard** `(dashboard)/dashboard/*` — 15 pages

| Priority  | Route                                   | Purpose           | Components              | Complexity   |
| --------- | --------------------------------------- | ----------------- | ----------------------- | ------------ |
| 🔴 High   | `/dashboard`                            | Org overview      | DashboardCard (inline)  | Simple       |
| 🔴 High   | `/dashboard/events`                     | Event listing     | EventList, EventFilters | Medium       |
| 🟡 Medium | `/dashboard/events/new`                 | Create event      | EventForm               | Complex      |
| 🟡 Medium | `/dashboard/events/[id]`                | Event details     | Stats, TicketTypeList   | Complex      |
| 🟡 Medium | `/dashboard/events/[id]/edit`           | Edit event        | EventForm               | Complex      |
| 🟢 Low    | `/dashboard/events/[id]/ticket-types/*` | Ticket management | TicketTypeForm          | Medium       |
| 🔴 High   | `/dashboard/orders`                     | Order listing     | OrderList               | Complex      |
| 🟡 Medium | `/dashboard/orders/[id]`                | Order details     | OrderDetails            | Complex      |
| 🔴 High   | `/dashboard/scanning`                   | Scanning overview | Scanner preview         | Simple       |
| 🔴 High   | `/dashboard/scanning/[eventId]`         | Live scanner      | QRScanner               | Complex      |
| 🟢 Low    | `/dashboard/scanning/terminals`         | Terminals         | TerminalList            | Medium       |
| 🟢 Low    | `/dashboard/payouts`                    | Settlements       | SettlementsView         | Very Complex |
| 🟢 Low    | `/dashboard/settings`                   | Org settings      | OrganizationForm        | Complex      |
| 🟢 Low    | `/dashboard/settings/*`                 | Settings pages    | Various forms           | Medium       |

#### **Route Group 2: Public** `(public)/*` — 4 pages

| Priority        | Route                          | Purpose               | Components                   | Complexity |
| --------------- | ------------------------------ | --------------------- | ---------------------------- | ---------- |
| 🔴 **Critical** | `/e/[slug]`                    | Event detail (public) | EventTickets, TicketSelector | Complex    |
| 🔴 **Critical** | `/checkout/[orderId]`          | Checkout & payment    | PaymentButton, Poller        | Complex    |
| 🔴 **Critical** | `/checkout/[orderId]/complete` | Payment success       | TicketDisplay                | Medium     |
| 🟢 Low          | `/events`                      | Event listing         | Basic page                   | Simple     |

#### **Route Group 3: Scanner** `scanner/*` — 3 pages

| Priority        | Route                     | Purpose           | Components         | Complexity |
| --------------- | ------------------------- | ----------------- | ------------------ | ---------- |
| 🔴 **Critical** | `/scanner`                | Terminal login    | Custom form        | Simple     |
| 🔴 **Critical** | `/scanner/events`         | Event selector    | Event cards        | Simple     |
| 🔴 **Critical** | `/scanner/scan/[eventId]` | Scanner interface | QRScanner, Results | Complex    |

#### **Route Group 4: Platform Admin** `(platform)/platform/*` — 5 pages

| Priority | Route                     | Purpose         | Components        | Complexity |
| -------- | ------------------------- | --------------- | ----------------- | ---------- |
| 🟢 Low   | `/platform`               | Admin dashboard | StatCard (inline) | Medium     |
| 🟢 Low   | `/platform/organizations` | Org management  | Placeholder       | Simple     |
| 🟢 Low   | `/platform/audit-logs`    | Audit viewer    | Placeholder       | Simple     |
| 🟢 Low   | `/platform/analytics`     | Analytics       | Placeholder       | Simple     |
| 🟢 Low   | `/platform/settings`      | Platform config | Placeholder       | Simple     |

#### **Route Group 5-8: Other Pages** — 7 pages

| Priority  | Route            | Purpose            | Components          | Complexity   |
| --------- | ---------------- | ------------------ | ------------------- | ------------ |
| 🟢 Low    | `/` (website)    | Marketing homepage | Hero, Features, FAQ | Very Complex |
| 🟡 Medium | `/auth/login`    | Login              | Custom form         | Simple       |
| 🟡 Medium | `/auth/register` | Registration       | Custom form         | Simple       |
| 🟡 Medium | `/onboarding`    | Org setup          | OnboardingForm      | Complex      |
| 🟡 Medium | `/welcome`       | Welcome screen     | Checklist           | Medium       |
| 🟢 Low    | `/auth/callback` | OAuth handler      | N/A                 | Simple       |
| 🟢 Low    | `/auth/error`    | Auth errors        | Error display       | Simple       |

---

### E) Reusable Component Patterns (Priority List)

**Components to Build (in order of impact):**

#### **Tier 1: Critical Components** (Week 1)

1. **`<Card>`** — Used in 50+ locations
   - Props: `padding`, `variant` (default/hover), `className`
   - Eliminates most inline `bg-white dark:bg-gray-900 border...` repetition

2. **`<Button>`** — Used in 30+ locations
   - Variants: `primary`, `secondary`, `danger`, `ghost`, `outline`
   - Sizes: `sm`, `md`, `lg`
   - States: `loading`, `disabled`

3. **`<Badge>`** — Used in 15+ locations
   - Variants: `success`, `warning`, `error`, `info`, `neutral`
   - Use for: Event status, Order status, Ticket status

4. **`<Input>` & `<Label>`** — Used in 40+ locations
   - Props: `label`, `error`, `helperText`, `required`
   - Supports: text, email, password, number, url

5. **`<Alert>`** — Used in 8+ locations
   - Variants: `success`, `warning`, `error`, `info`
   - Props: `title`, `dismissible`, `icon`

#### **Tier 2: High-Impact Components** (Week 2)

6. **`<StatCard>`** — Used in 8+ locations
   - Props: `label`, `value`, `description`, `icon`, `trend`, `href`, `color`
   - Replaces dashboard stat cards

7. **`<PageHeader>`** — Used in 12+ locations
   - Props: `title`, `action` (label, href, icon)
   - Consistent header pattern

8. **`<EmptyState>`** — Used in 10+ locations
   - Props: `icon`, `title`, `message`, `action`
   - Replaces "No items found" patterns

9. **`<BottomNav>`** — Used in 1 location (to standardize)
   - Props: `items` (href, icon, label, match)
   - Mobile-only navigation

10. **`<MobileHeader>`** — New pattern
    - Props: `title`, `children` (for drawer content)
    - Mobile header with optional menu

#### **Tier 3: Specialized Components** (Week 3)

11. **`<ResponsiveData>`** — Used in 6+ locations
    - Props: `items`, `columns`, `renderCard`
    - Desktop table → Mobile cards

12. **`<Tabs>`** — Used in 3+ locations
    - Props: `tabs`, `activeTab`, `onChange`
    - Horizontal scrolling tabs

13. **`<Select>` & `<Textarea>`** — Used in 20+ locations
    - Consistent form fields

14. **`<Dialog>` & `<Sheet>`** — Used in 5+ locations
    - Modal and mobile drawer

15. **`<Skeleton>`** — Used in 5+ locations
    - Loading states (card, table, text)

---

### F) Progressive Migration Strategy

**Migration Wave 1: Scanner & Checkout** (Weeks 1-2) 🔴 Critical

**Why First:** Highest mobile usage (80%+ on mobile), revenue-critical, most app-like UX

**Pages (7 pages):**

1. `/scanner` + `/scanner/events` + `/scanner/scan/[eventId]` (Scanner app)
2. `/e/[slug]` (Public event page - ticket selection)
3. `/checkout/[orderId]` (Checkout flow)
4. `/checkout/[orderId]/complete` (Success page)
5. `/dashboard/scanning/[eventId]` (Dashboard scanner)

**Components Needed:**

- ✅ Card, Button, Badge, Input, Alert (Tier 1)
- ✅ EmptyState (Tier 2)
- ✅ Dialog (for confirmations)

**Success Metrics:**

- Scanner loads <1s on mobile
- Touch targets ≥44px
- Zero inline button styles
- Visual parity with current design

**Effort:** 1-2 weeks | **Impact:** ⚡ 70% of mobile traffic improved

---

**Migration Wave 2: Dashboard Core** (Weeks 3-4) 🟡 High Priority

**Why First:** Core dashboard experience, high daily usage (90%+ logged-in users), visible to all orgs

**Pages (6 pages):**

1. `/dashboard` (Overview with stats)
2. `/dashboard/events` (Event listing)
3. `/dashboard/orders` (Order listing)
4. `/dashboard/scanning` (Scanner overview)
5. `/dashboard/events/[id]` (Event detail)
6. `/dashboard/orders/[id]` (Order detail)

**Components Needed:**

- ✅ StatCard, PageHeader (Tier 2)
- ✅ BottomNav, MobileHeader (Tier 2)
- ✅ ResponsiveData (Tier 3) for OrderList
- ✅ Tabs (Tier 3) for event/order details

**Success Metrics:**

- Dashboard loads with 0 layout shift
- Bottom nav works on all mobile devices
- Stats cards are reusable across all pages
- Table → Card switching is smooth

**Effort:** 1-2 weeks | **Impact:** ⚡ 85% of platform unified

---

**Migration Wave 3: Event Management** (Weeks 5-6) 🟡 Medium Priority

**Why Third:** Core functionality, medium complexity, builds on Tier 1-2 components

**Pages (5 pages):**

1. `/dashboard/events/new` (Create event)
2. `/dashboard/events/[id]/edit` (Edit event)
3. `/dashboard/events/[id]/ticket-types/new` (Add ticket type)
4. `/dashboard/events/[id]/ticket-types/[id]/edit` (Edit ticket type)

**Components Needed:**

- ✅ All Tier 1 components (already built)
- ✅ Select, Textarea (Tier 3)
- ✅ Form validation patterns

**Success Metrics:**

- Forms work on mobile (no zoom on input focus)
- Error messages are clear and accessible
- Loading states during submission

**Effort:** 1 week | **Impact:** ⚡ 90% of platform unified

---

**Migration Wave 4: Auth & Onboarding** (Week 7) 🟡 Medium Priority

**Why Fourth:** First-impression pages, simple but important

**Pages (5 pages):**

1. `/auth/login` (Login form)
2. `/auth/register` (Registration)
3. `/onboarding` (Org setup)
4. `/welcome` (Welcome screen)
5. `/auth/error` (Error page)

**Components Needed:**

- ✅ All form components (already built)
- ✅ Alert for error messages

**Success Metrics:**

- Mobile-optimized forms (no keyboard overlap)
- Clear error messages
- Fast load times (<500ms)

**Effort:** 3-5 days | **Impact:** ⚡ 95% of platform unified

---

**Migration Wave 5: Admin & Polish** (Weeks 8+) 🟢 Low Priority

**Why Last:** Admin-only, lower traffic, can be done post-launch

**Pages (11 pages):**

1. `/dashboard/settings` + all settings subpages (5 pages)
2. `/dashboard/payouts` (Complex, needs redesign)
3. `/dashboard/scanning/terminals` (Terminal management)
4. `/platform/*` (Admin dashboard, 5 pages)

**Components Needed:**

- ✅ DataTable with sorting/filtering (new)
- ✅ DatePicker (new)
- ✅ Combobox (new)

**Success Metrics:**

- Admin tools are efficient
- Complex tables work well
- Desktop-optimized (admin users typically on desktop)

**Effort:** 2-3 weeks | **Impact:** ⚡ 100% complete

---

**Migration Wave 6: Marketing Site** (Post-Launch) 🟢 Optional

**Pages (1 page):**

1. `/` (Homepage - 1282 lines!)

**Why Last:** Already responsive, marketing content, very large file

**Components Needed:**

- ✅ All existing components
- ✅ Hero section component
- ✅ Feature grid component
- ✅ FAQ accordion

**Effort:** 1-2 weeks | **Impact:** ⚡ Marketing consistency

**Migration Pattern:**

```tsx
// ❌ Before (inline styles)
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Scannen
</button>

// ✅ After (UI component)
<Button>Scannen</Button>

// ✅ Custom variant
<Button variant="outline" size="lg" className="w-full">
  Scannen
</Button>
```

---

## Implementation Checklist

### Week 1: Foundation Setup & Tier 1 Components

**Day 1: Installation & Core Setup**

- [ ] Run `npx shadcn@latest init` with Next.js App Router config
- [ ] Install dependencies: `pnpm add lucide-react framer-motion`
- [ ] Add shadcn components: `npx shadcn@latest add button input label card badge alert`
- [ ] Test dark mode compatibility with existing theme
- [ ] Verify Tailwind v4 compatibility
- [ ] Create `src/components/ui/index.ts` for exports

**Day 2: Custom Mobile Components**

- [ ] Create `src/components/ui/bottom-nav.tsx` (with framer-motion animations)
- [ ] Create `src/components/ui/mobile-header.tsx`
- [ ] Extend `input.tsx` with error state variant
- [ ] Test touch target sizes on mobile (min 44x44px)
- [ ] Test iOS safe-area handling
- [ ] Create component documentation in `ui/README.md`

**Day 3-5: Wave 1 - Scanner Pages**

- [ ] Migrate `/scanner` (terminal login) → Use Card, Button, Input
- [ ] Migrate `/scanner/events` (event selector) → Use Card, EmptyState
- [ ] Migrate `/scanner/scan/[eventId]` → Use Button, Badge, Alert
- [ ] Replace inline SVG icons with Lucide icons (20+ icons)
- [ ] Add loading states with Skeleton components
- [ ] Test QR scanning flow on actual mobile device
- [ ] Visual regression testing (before/after screenshots)

### Week 2: Wave 1 Completion - Checkout Flow

**Day 6-7: Public Event & Checkout**

- [ ] Migrate `/e/[slug]` (public event page) → Use Card, Button, Badge
- [ ] Migrate `/checkout/[orderId]` → Use Input, Button, Alert
- [ ] Migrate `/checkout/[orderId]/complete` → Use Card, Badge
- [ ] Add framer-motion transitions for checkout flow
- [ ] Test payment flow end-to-end on mobile
- [ ] Test with actual Mollie payment

**Day 8-9: Dashboard Scanner Interface**

- [ ] Migrate `/dashboard/scanning/[eventId]` → Use all Tier 1 components
- [ ] Test scanner from dashboard vs dedicated scanner app
- [ ] Verify feature parity

**Day 10: Wave 1 Testing & Review**

- [ ] E2E test: Terminal login → Select event → Scan ticket
- [ ] E2E test: Browse event → Buy ticket → Receive confirmation
- [ ] Mobile device testing (iOS Safari, Android Chrome)
- [ ] Performance testing (Core Web Vitals)
- [ ] Create Wave 1 PR with documentation

### Week 3: Tier 2 Components & Wave 2 Start

**Day 11-12: Tier 2 Components**

- [ ] Create `src/components/ui/stat-card.tsx`
- [ ] Create `src/components/ui/page-header.tsx`
- [ ] Create `src/components/ui/empty-state.tsx`
- [ ] Add shadcn components: `npx shadcn@latest add tabs dialog sheet`
- [ ] Test all Tier 2 components in dark mode

**Day 13-15: Dashboard Core Pages**

- [ ] Migrate `/dashboard` → Use StatCard, PageHeader, BottomNav
- [ ] Migrate `/dashboard/events` → Use Card, Badge, PageHeader, EmptyState
- [ ] Migrate `/dashboard/orders` → Use Card, Badge, PageHeader
- [ ] Migrate `/dashboard/scanning` → Use Card, EmptyState
- [ ] Update `(dashboard)/layout.tsx` to use BottomNav component
- [ ] Test bottom navigation on all dashboard pages

### Week 4: Wave 2 Completion - Dashboard Details

**Day 16-17: Tier 3 Components**

- [ ] Create `src/components/ui/responsive-data.tsx` (table/card switch)
- [ ] Add shadcn components: `npx shadcn@latest add select textarea skeleton`
- [ ] Test ResponsiveData with OrderList

**Day 18-19: Dashboard Detail Pages**

- [ ] Migrate `/dashboard/events/[id]` → Use Tabs, StatCard, ResponsiveData
- [ ] Migrate `/dashboard/orders/[id]` → Use Card, Badge, Tabs
- [ ] Replace all inline stat cards with StatCard component
- [ ] Add framer-motion page transitions

**Day 20: Wave 2 Testing & Review**

- [ ] Test dashboard navigation flow on mobile
- [ ] Verify table → card switching works smoothly
- [ ] Test all stats cards are consistent
- [ ] Performance check (dashboard should load <2s)
- [ ] Create Wave 2 PR

### Week 5-6: Wave 3 - Event Management

**Day 21-23: Event Forms**

- [ ] Migrate `/dashboard/events/new` → Use Input, Textarea, Select, Button
- [ ] Migrate `/dashboard/events/[id]/edit` → Use form components
- [ ] Add form validation with error states
- [ ] Add loading states during submission
- [ ] Test on mobile (no keyboard overlap, no zoom on focus)

**Day 24-25: Ticket Type Management**

- [ ] Migrate `/dashboard/events/[id]/ticket-types/new`
- [ ] Migrate `/dashboard/events/[id]/ticket-types/[id]/edit`
- [ ] Test creating event → adding tickets → publishing

**Day 26-27: Icon Migration Sweep**

- [ ] Create icon mapping document (SVG → Lucide)
- [ ] Replace ALL remaining inline SVGs (30+ locations)
- [ ] Standardize icon sizes (sm/md/lg)
- [ ] Test icons in light/dark mode

**Day 28-30: Wave 3 Testing**

- [ ] E2E test: Create event → Add tickets → Publish → Verify public page
- [ ] Test form validation on mobile
- [ ] Create Wave 3 PR

### Week 7: Wave 4 - Auth & Onboarding

**Day 31-33: Auth Pages**

- [ ] Migrate `/auth/login` → Use Input, Button, Alert
- [ ] Migrate `/auth/register` → Use form components
- [ ] Migrate `/auth/error` → Use Alert, EmptyState
- [ ] Test OAuth flow (Google login)

**Day 34-35: Onboarding & Welcome**

- [ ] Migrate `/onboarding` → Use Card, Input, Button, Alert
- [ ] Migrate `/welcome` → Use Card, Badge
- [ ] Test first-time user flow: Register → Onboard → Welcome → Dashboard

**Day 36-37: Wave 4 Testing & Polish**

- [ ] Test auth flow on mobile
- [ ] Test form accessibility (keyboard nav, screen reader)
- [ ] Create Wave 4 PR

### Week 8+: Wave 5 - Admin & Settings (Optional)

**Post-Launch / As Needed:**

- [ ] Migrate `/dashboard/settings/*` pages
- [ ] Migrate `/dashboard/payouts` (needs redesign)
- [ ] Migrate `/dashboard/scanning/terminals`
- [ ] Migrate `/platform/*` admin pages
- [ ] Add DataTable component with sorting/filtering
- [ ] Add DatePicker component
- [ ] Migrate homepage `/` (marketing site)

### Final Polish & Documentation

- [ ] Update `docs/development/mobile-first-ui-library.md` with completion status
- [ ] Update `.github/copilot-instructions.md` with component patterns
- [ ] Create Storybook (optional) or component showcase page
- [ ] Run full test suite: `pnpm test`
- [ ] Run build: `pnpm build`
- [ ] Deploy to staging for QA
- [ ] Get stakeholder approval
- [ ] Deploy to production

---

## Edge Cases & Error Handling

1. **Touch Target Size**
   - Problem: Small buttons hard to tap on mobile
   - Solution: All button variants enforce min-height: 44px (iOS/Android standard)
   - Implementation: shadcn Button component uses `h-10` (40px) by default, extend to `h-11` (44px)

2. **Dark Mode Compatibility**
   - Problem: Existing dark mode might conflict with shadcn defaults
   - Solution: Test all components in dark mode, override CSS variables if needed
   - Implementation: Keep existing `--background`, `--foreground` variables

3. **Safe Area Insets (iOS)**
   - Problem: Bottom navigation hidden by iPhone home indicator
   - Solution: Use `safe-area-bottom` class (already exists in globals.css)
   - Implementation: Apply to `<BottomNav>` component

4. **Responsive Grid Layouts**
   - Problem: Existing responsive patterns might break with new components
   - Solution: Cards should not enforce layout, parent controls grid
   - Implementation: Keep current `grid grid-cols-2 md:grid-cols-4` patterns

5. **Icon Size Consistency**
   - Problem: 50+ inline SVGs with varying sizes (w-4, w-5, w-6)
   - Solution: Standardize on 3 sizes: sm (w-4 h-4), md (w-5 h-5), lg (w-6 h-6)
   - Mapping: Component text-sm → icon sm, text-base → icon md, text-lg → icon lg

6. **Form Validation Visual Feedback**
   - Problem: shadcn Input doesn't show error state by default
   - Solution: Extend Input with `error` prop and red border variant
   - Implementation: Add to `input.tsx` variants

---

## Testing Strategy

### Unit Tests

Not applicable for UI components (visual changes only). Focus on integration tests.

### Integration Tests

- Test Button onClick handlers fire correctly
- Test Form components integrate with react-hook-form (if added later)
- Test Dialog/Sheet open/close state management
- Test BottomNav active state detection (pathname matching)

**Example Test:**

```typescript
// tests/components/bottom-nav.test.tsx
import { render, screen } from "@testing-library/react";
import { BottomNav } from "@/components/ui/bottom-nav";
import { Home, Ticket } from "lucide-react";

describe("BottomNav", () => {
  it("renders all navigation items", () => {
    render(
      <BottomNav
        items={[
          { href: "/", icon: Home, label: "Home" },
          { href: "/events", icon: Ticket, label: "Events" },
        ]}
      />
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
  });

  it("highlights active navigation item", () => {
    // Mock usePathname to return "/events"
    jest.mock("next/navigation", () => ({
      usePathname: () => "/events",
    }));

    render(
      <BottomNav
        items={[
          { href: "/", icon: Home, label: "Home" },
          { href: "/events", icon: Ticket, label: "Events" },
        ]}
      />
    );

    const eventsLink = screen.getByText("Events").closest("a");
    expect(eventsLink).toHaveClass("text-blue-600");
  });
});
```

### Visual Regression Tests

- **Tool:** Playwright with screenshot comparison
- **Test Scenarios:**
  - Light mode vs dark mode for all components
  - Mobile (375px) vs tablet (768px) vs desktop (1440px)
  - Scanner interface with new UI
  - Dashboard stats cards
  - Checkout form

### Manual Testing Checklist

- [ ] Test on iPhone Safari (iOS safe area)
- [ ] Test on Android Chrome (touch targets)
- [ ] Test dark mode toggle across all pages
- [ ] Test keyboard navigation (tab, enter, escape)
- [ ] Test screen reader (VoiceOver/TalkBack)
- [ ] Test landscape orientation on mobile
- [ ] Test with Chrome DevTools touch emulation

---

## Security Considerations

1. **Authentication:** No changes to auth flow (UI-only refactor)
2. **Authorization:** No changes to authorization (UI-only refactor)
3. **Data Validation:** Form components don't change validation logic (still handled by services)
4. **Accessibility:** Improved (Radix UI handles ARIA labels, keyboard nav, focus trapping)
5. **XSS Prevention:** No changes (React escapes by default, Lucide icons are components not raw SVG strings)

---

## Performance Considerations

1. **Bundle Size:**
   - shadcn/ui: ~5-10KB per component (tree-shakeable)
   - Radix UI primitives: ~20-50KB total (only for interactive components)
   - Lucide React: ~1KB per icon (tree-shakeable)
   - framer-motion: ~30KB core (only imported in animated components with "use client")
   - Impact: +80-130KB total bundle size (acceptable for improved DX, UX, and consistency)
   - Mitigation: Lazy load framer-motion in non-critical components

2. **Icon Loading:**
   - Lucide icons are React components (imported at build time)
   - No runtime SVG parsing or fetching
   - Benefit: Better than current inline SVG duplication

3. **Component Rendering:**
   - shadcn components use Client Components (`"use client"`)
   - Does NOT affect server-side rendering (SSR) for page content
   - Interactive components (Dialog, Sheet) require client JS anyway

4. **CSS Bundle:**
   - Tailwind v4 purges unused classes
   - No increase in CSS size (still using Tailwind utilities)
   - Benefit: Reduced CSS duplication (reusing variant classes)

---

## Success Criteria

List measurable outcomes that define when the feature is "done":

- ✅ All components in `src/components/ui/` are documented with usage examples
- ✅ Scanner app uses Button, Card, Badge, Dialog from UI library (zero inline button styles)
- ✅ Dashboard uses BottomNav, StatCard, and form components
- ✅ Checkout flow uses standardized Input, Button, Card components
- ✅ Icon usage is consistent (Lucide React, no inline SVGs)
- ✅ Mobile UX is preserved (bottom nav, safe area, touch targets ≥44px)
- ✅ Dark mode works correctly for all new components
- ✅ No visual regressions (screenshot comparison pass)
- ✅ Build passes with no TypeScript errors
- ✅ Components are accessible (keyboard nav, screen reader tested)

---

## Dependencies

List what must be completed before starting this feature:

- ✅ Tailwind CSS v4 setup (already configured)
- ✅ Dark mode implementation (already working)
- ✅ Mobile-first responsive patterns (already implemented)
- ✅ Next.js 16 App Router (already in use)

**No blockers.** Can start immediately.

**Blocks:** None. This is a refactor that improves existing features.

---

## Rollout Strategy

1. **Branch Strategy:**
   - Create feature branch: `feat/mobile-first-ui-library`
   - Commit per phase: "feat(ui): add shadcn core components", "feat(scanner): migrate to UI library", etc.
   - Large PR with screenshots and component documentation

2. **Deployment:**
   - No feature flag needed (visual changes only, backwards compatible)
   - Deploy to staging first
   - Manual QA on mobile devices (iPhone, Android)
   - Deploy to production once verified

3. **Monitoring:**
   - Watch for increased bundle size (expect +50-100KB)
   - Monitor Core Web Vitals (should not regress)
   - Check error logs for React component errors
   - Collect user feedback on new UI feel

4. **Rollback Plan:**
   - Revert Git commit if critical visual bugs
   - No database changes to revert
   - No API changes to revert

---

## Future Enhancements

Ideas for future iterations (out of scope for initial implementation):

- **Form Library Integration:** Add react-hook-form + Zod for better form validation
- **Advanced Gestures:** Leverage framer-motion for pull-to-refresh, drag-to-reorder lists
- **Component Variants:** Expand Button variants (loading state with spinner, icon-only)
- **Data Tables:** Add shadcn Table component with sorting/filtering for OrderList
- **Command Palette:** Add Cmd+K search for quick navigation (shadcn command component)
- **Storybook:** Set up Storybook for component documentation and visual testing
- **Theming:** Allow organizations to customize primary color (brand colors)
- **Skeleton Loaders:** Add loading skeletons for better perceived performance

---

## Related Documentation

- [Copilot Instructions](../../.github/copilot-instructions.md) - Code patterns and architecture
- [SPEC.md](../../SPEC.md) - Business rules and domain logic
- [Scanner UI Documentation](../SCANNER_UI.md) - Scanner-specific UX patterns
- [shadcn/ui Documentation](https://ui.shadcn.com/) - Component library reference
- [Radix UI Primitives](https://www.radix-ui.com/) - Accessibility and behavior patterns
- [Lucide Icons](https://lucide.dev/) - Icon library reference
- [Tailwind CSS v4](https://tailwindcss.com/docs) - Styling framework

---

## Questions & Decisions

**Decisions Made:**

- ✅ **Decision:** Use shadcn/ui over raw Radix UI
  - **Reason:** Copy-paste components provide full ownership and customization, community has extensive examples, faster setup than raw Radix

- ✅ **Decision:** Use Lucide React over Heroicons or custom SVGs
  - **Reason:** Tree-shakeable, consistent design language, 1000+ icons, React-first (better than SVG sprites)

- ✅ **Decision:** Keep existing Tailwind v4 setup instead of v3
  - **Reason:** v4 is faster (PostCSS plugin), no breaking changes needed, already configured

- ✅ **Decision:** Use framer-motion for animations
  - **Reason:** Best-in-class mobile gestures (swipe-to-dismiss, drag, etc.), excellent performance, widely adopted, pairs well with React Server Components via "use client" directive

- ✅ **Decision:** Migrate scanner app first (not dashboard)
  - **Reason:** Most app-like UI, isolated from rest of platform, immediate visual impact for event staff

- ✅ **Decision:** Preserve existing mobile patterns (bottom nav, safe area)
  - **Reason:** Current UX is good, no need to redesign, just standardize implementation

**Open Questions:**

- [ ] **Question:** Should we add react-hook-form in this PR or separate later?
  - **Impact:** Adds complexity to PR but improves form UX significantly
  - **Recommendation:** Separate PR (keeps this one focused on UI library)

- [ ] **Question:** Should we set up Storybook for component documentation?
  - **Impact:** Adds dev dependency, extra setup time
  - **Recommendation:** Nice-to-have for later, use README.md for now

- [ ] **Question:** What's the minimum iOS/Android version to support?
  - **Impact:** Affects safe-area and touch optimization strategies
  - **Recommendation:** iOS 13+ (2019), Android 8+ (2017) - covers 95%+ users

**Risks:**

- **Risk:** Bundle size increase (shadcn + Radix + Lucide = +100KB)
  - **Mitigation:** Tree-shaking enabled, only import used components, monitor Core Web Vitals

- **Risk:** Visual regressions breaking existing UI
  - **Mitigation:** Screenshot comparison tests, thorough manual QA on mobile devices

- **Risk:** Dark mode compatibility issues with shadcn defaults
  - **Mitigation:** Test all components in dark mode during Phase 1, override CSS variables if needed

---

## Notes

### Research Findings Summary

**Current Codebase Analysis (Jan 1, 2026):**

- **Component Duplication:** 100+ inline button style variations across 34 component files
- **Mobile-First Status:** ✅ Excellent (responsive patterns in 50+ locations)
- **App-Like Features:** ✅ Bottom nav, PWA manifest, iOS safe area, touch optimizations
- **UI Library:** ❌ NOT installed (docs mention Radix UI but package.json has no @radix-ui/\* packages)
- **Icon System:** ❌ None (all inline SVGs, ~50+ unique icons)
- **Reusable Components:** ❌ Low (only WarningModal is semi-reusable)

**Key Insight:** The foundation is excellent (mobile-first patterns, dark mode, PWA setup), but lacks standardization layer. Adding shadcn/ui will reduce code by ~30% and improve consistency without redesigning existing UX.

**Design Tokens Currently Used:**

- **Spacing:** `space-y-4`, `gap-4`, `p-4`, `p-6` (4px base unit)
- **Radius:** `rounded-lg` (8px), `rounded-xl` (12px), `rounded-2xl` (16px)
- **Colors:** blue-600 (primary), green-600 (success), red-600 (danger), gray-\* (neutral)
- **Typography:** text-sm, text-base, text-lg, text-2xl, text-3xl (mobile responsive)
- **Shadows:** shadow-sm, shadow-lg, shadow-xl

**Preserve These Patterns:**

1. Bottom navigation with emoji icons + labels (event staff love it)
2. iOS safe-area-bottom class (iPhone X+ support)
3. Color semantics (blue=primary, green=success, don't change)
4. Card layout patterns (grid-cols-2 md:grid-cols-4 for stats)

---

## Component Reuse Strategy

### Pattern: Composition Over Inheritance

**Example: Building Complex Components from Primitives**

```tsx
// ✅ Good: Compose StatCard from Card + other primitives
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <Card variant="hover">
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
        {trend && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingUp className="w-4 h-4" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ✅ Good: OrderCard reuses same primitives
export function OrderCard({ order }: OrderCardProps) {
  return (
    <Card variant="hover">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium">{order.event.title}</p>
            <p className="text-sm text-muted-foreground">
              #{order.orderNumber}
            </p>
          </div>
          <Badge variant={order.status === "PAID" ? "success" : "warning"}>
            {order.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Pattern: Shared Layout Components

**Example: PageLayout with Consistent Structure**

```tsx
// src/components/ui/page-layout.tsx
import { PageHeader } from "@/components/ui/page-header";
import { MobileHeader } from "@/components/ui/mobile-header";

interface PageLayoutProps {
  title: string;
  action?: { label: string; href: string };
  mobileMenu?: ReactNode;
  children: ReactNode;
}

export function PageLayout({
  title,
  action,
  mobileMenu,
  children,
}: PageLayoutProps) {
  return (
    <>
      {/* Mobile header with drawer */}
      <MobileHeader title={title}>{mobileMenu}</MobileHeader>

      {/* Desktop header */}
      <div className="hidden md:block">
        <PageHeader title={title} action={action} />
      </div>

      {/* Page content */}
      <div className="p-4 md:p-6">{children}</div>
    </>
  );
}

// Usage in any page:
export default function EventsPage() {
  return (
    <PageLayout
      title="Evenementen"
      action={{ label: "+ Nieuw Evenement", href: "/dashboard/events/new" }}
    >
      <EventList />
    </PageLayout>
  );
}
```

### Pattern: Polymorphic Components

**Example: Button that can be Link or Button**

```tsx
// Extend shadcn Button to support href (becomes Link)
import Link from "next/link";
import { Button as ShadcnButton } from "@/components/ui/button";

interface ButtonProps extends React.ComponentProps<typeof ShadcnButton> {
  href?: string;
}

export function Button({ href, children, ...props }: ButtonProps) {
  if (href) {
    return (
      <ShadcnButton asChild {...props}>
        <Link href={href}>{children}</Link>
      </ShadcnButton>
    );
  }
  return <ShadcnButton {...props}>{children}</ShadcnButton>;
}

// Usage:
<Button href="/events/new">Create Event</Button> {/* Renders as Link */}
<Button onClick={handleSubmit}>Submit</Button>    {/* Renders as button */}
```

### Pattern: Consistent Status Mapping

**Example: Centralized Status → Badge Variant Mapping**

```tsx
// src/lib/status-variants.ts
import { BadgeProps } from "@/components/ui/badge";

export function getEventStatusVariant(
  status: EventStatus
): BadgeProps["variant"] {
  const variants = {
    LIVE: "success",
    DRAFT: "neutral",
    ARCHIVED: "neutral",
    SCHEDULED: "info",
  } as const;
  return variants[status] || "neutral";
}

export function getOrderStatusVariant(
  status: OrderStatus
): BadgeProps["variant"] {
  const variants = {
    PAID: "success",
    PENDING: "warning",
    FAILED: "error",
    REFUNDED: "info",
  } as const;
  return variants[status] || "neutral";
}

export function getTicketStatusVariant(
  status: TicketStatus
): BadgeProps["variant"] {
  const variants = {
    VALID: "success",
    USED: "neutral",
    REFUNDED: "info",
  } as const;
  return variants[status] || "neutral";
}

// Usage in any component:
import { Badge } from "@/components/ui/badge";
import { getEventStatusVariant } from "@/lib/status-variants";

<Badge variant={getEventStatusVariant(event.status)}>{event.status}</Badge>;
```

### Key Principles

1. **Single Source of Truth:** Base components (Card, Button, Badge) defined once in `ui/`
2. **Composition:** Complex components built from simple primitives
3. **Consistent Patterns:** Same spacing, colors, shadows across all components
4. **Type Safety:** TypeScript ensures correct prop usage
5. **Extensibility:** `className` prop allows customization without forking components

---

**Implementation Start Date:** TBD (Ready to begin immediately)
