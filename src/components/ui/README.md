# UI Component Library

This directory contains the base UI components for the Entro platform, built using shadcn/ui with Radix UI primitives.

## Core Principles

1. **Mobile-First**: All components are optimized for mobile with touch targets ≥44px
2. **Dark Mode**: Full dark mode support via Tailwind `dark:` classes
3. **Accessible**: Built on Radix UI primitives with ARIA labels and keyboard navigation
4. **Composable**: Components can be combined to create complex UIs
5. **Consistent**: Standardized styling using Tailwind CSS variables

## Base Components

### Button

Polymorphic button component with multiple variants and sizes.

```tsx
import { Button } from "@/components/ui/button";

// Basic usage
<Button>Click me</Button>

// Variants
<Button variant="default">Primary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// As Link
<Button asChild>
  <Link href="/dashboard">Dashboard</Link>
</Button>
```

### Card

Container component for grouping related content.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>;
```

### Badge

Small status indicator with color variants.

```tsx
import { Badge } from "@/components/ui/badge";

<Badge variant="default">Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="neutral">Neutral</Badge>
```

### Input

Form input with error state support.

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
    error={!!errors.email}
  />
</div>;
```

### Textarea

Multi-line text input.

```tsx
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

<div>
  <Label htmlFor="description">Description</Label>
  <Textarea
    id="description"
    placeholder="Enter description..."
    error={!!errors.description}
  />
</div>;
```

### Alert

Notification or message display.

```tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong. Please try again.</AlertDescription>
</Alert>;
```

### Sheet

Mobile drawer/sidebar component.

```tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

<Sheet>
  <SheetTrigger asChild>
    <Button>Open Menu</Button>
  </SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Menu</SheetTitle>
    </SheetHeader>
    <nav>{/* Menu items */}</nav>
  </SheetContent>
</Sheet>;
```

## Mobile Components

### BottomNav

Mobile bottom navigation bar with icon + label tabs.

```tsx
import { BottomNav } from "@/components/ui/bottom-nav";
import { Home, Calendar, QrCode, Users, Settings } from "lucide-react";

<BottomNav
  items={[
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/dashboard/events", icon: Calendar, label: "Events" },
    {
      href: "/dashboard/scanning",
      icon: QrCode,
      label: "Scan",
      match: (pathname) => pathname.startsWith("/dashboard/scanning"),
    },
    { href: "/dashboard/orders", icon: Users, label: "Orders" },
    { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  ]}
/>;
```

### MobileHeader

Mobile header with optional menu drawer.

```tsx
import { MobileHeader } from "@/components/ui/mobile-header";

<MobileHeader title="Dashboard">
  {/* Optional sidebar content */}
  <nav>
    <a href="/settings">Settings</a>
    <a href="/profile">Profile</a>
  </nav>
</MobileHeader>;
```

### StatCard

Statistics display card with icon and optional trend.

```tsx
import { StatCard } from "@/components/ui/stat-card";
import { Ticket } from "lucide-react";

<StatCard
  title="Total Tickets"
  value="1,234"
  icon={Ticket}
  description="Across all events"
  trend={{ value: "+12%", positive: true }}
/>;
```

### EmptyState

Placeholder for empty lists or no data states.

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar } from "lucide-react";

<EmptyState
  icon={Calendar}
  title="No events yet"
  description="Create your first event to get started"
  action={{
    label: "Create Event",
    href: "/dashboard/events/new",
  }}
/>;
```

### PageHeader

Page title with optional action button.

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { Plus } from "lucide-react";

<PageHeader
  title="Events"
  description="Manage your events"
  action={{
    label: "Create Event",
    icon: Plus,
    href: "/dashboard/events/new",
  }}
/>;
```

## Status Variants Helper

For consistent status badge styling, use the status mapping utilities:

```tsx
// src/lib/status-variants.ts (create this file)
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
    FAILED: "destructive",
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

// Usage:
import { Badge } from "@/components/ui/badge";
import { getEventStatusVariant } from "@/lib/status-variants";

<Badge variant={getEventStatusVariant(event.status)}>{event.status}</Badge>;
```

## Icons

Use Lucide React for all icons:

```tsx
import { Home, Calendar, QrCode, Check, X, AlertCircle } from "lucide-react";

// Standard sizes
<Home className="w-4 h-4" /> // sm (16px)
<Home className="w-5 h-5" /> // md (20px)
<Home className="w-6 h-6" /> // lg (24px)
```

## CSS Variables

The components use CSS variables defined in `globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 221.2 83.2% 53.3%; /* blue-600 */
  --destructive: 0 84.2% 60.2%; /* red-600 */
  /* ... more variables */
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  /* ... dark mode overrides */
}
```

## Extending Components

All components accept `className` prop for customization:

```tsx
<Button className="w-full">Full Width Button</Button>
<Card className="border-blue-500">Custom Border</Card>
```

## Adding New Components

To add more shadcn components:

```bash
npx shadcn@latest add [component-name]
```

Available components: https://ui.shadcn.com/docs/components

## Migration Guide

When migrating existing code:

1. Replace inline styles with component props
2. Use Lucide icons instead of inline SVGs
3. Use `cn()` utility for conditional classes
4. Preserve existing responsive patterns

Example:

```tsx
// ❌ Before
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Scannen
</button>

// ✅ After
import { Button } from "@/components/ui/button";

<Button>Scannen</Button>

// ✅ With customization
<Button className="w-full">Scannen</Button>
```
