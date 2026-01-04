# Public Design System - Quick Reference

## Color Palette

### Light Mode

```
Primary (Blue):     #3b82f6  ■ Main CTAs, links
Primary Hover:      #2563eb  ■ Hover state
Accent (Green):     #10b981  ■ Secondary CTAs, success
Accent Hover:       #059669  ■ Hover state
Background:         #ffffff  □ Page background
Foreground:         #1e293b  ■ Text color
Muted:              #f8fafc  □ Subtle backgrounds
Muted Foreground:   #64748b  ■ Secondary text
Border:             #e2e8f0  ─ Dividers, outlines
```

### Dark Mode

```
Primary (Blue):     #60a5fa  ■ Main CTAs, links
Primary Hover:      #3b82f6  ■ Hover state
Accent (Green):     #34d399  ■ Secondary CTAs, success
Accent Hover:       #10b981  ■ Hover state
Background:         #1e293b  ■ Page background
Foreground:         #f1f5f9  □ Text color
Muted:              #334155  ■ Subtle backgrounds
Muted Foreground:   #cbd5e1  □ Secondary text
Border:             #334155  ─ Dividers, outlines
```

## Component Quick Reference

### Buttons

```tsx
// Primary - main actions (buy tickets, checkout)
<PublicButton variant="primary" size="lg">Tickets kopen</PublicButton>

// Accent - secondary actions (more info)
<PublicButton variant="accent" size="md">Meer informatie</PublicButton>

// Outline - tertiary actions
<PublicButton variant="outline" size="sm">Annuleren</PublicButton>

// Ghost - minimal actions
<PublicButton variant="ghost">Terug</PublicButton>

// With loading state
<PublicButton variant="primary" loading>Bezig...</PublicButton>
```

### Cards

```tsx
<PublicCard>
  <PublicCardHeader>
    <PublicCardTitle>Card Title</PublicCardTitle>
    <PublicCardDescription>Optional description</PublicCardDescription>
  </PublicCardHeader>

  <PublicCardContent>{/* Main content */}</PublicCardContent>

  <PublicCardFooter>
    <PublicButton>Action</PublicButton>
  </PublicCardFooter>
</PublicCard>
```

### CSS Utility Classes

```tsx
// Container (max-width 1280px, responsive padding)
<div className="public-container">...</div>

// Card with hover effect
<div className="public-card">...</div>

// Buttons
<button className="public-btn-primary">Primary</button>
<button className="public-btn-accent">Accent</button>

// Input fields
<input className="public-input" />

// Badges
<span className="public-badge public-badge-success">Beschikbaar</span>
<span className="public-badge public-badge-warning">Bijna uitverkocht</span>
<span className="public-badge public-badge-error">Uitverkocht</span>
<span className="public-badge public-badge-neutral">Concept</span>

// Interactive elements with hover
<div className="public-interactive">...</div>
```

## Layout Patterns

### Mobile-First Grid

```tsx
// Stack on mobile, 2 cols on tablet, 3 cols on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map((item) => (
    <Card key={item.id} />
  ))}
</div>
```

### Responsive Padding

```tsx
<div className="px-4 sm:px-6 lg:px-8">
  {/* Increases padding on larger screens */}
</div>
```

### Container

```tsx
<div className="public-container py-8">
  {/* Max-width container with responsive padding */}
</div>
```

## Touch Targets

All interactive elements must be **44px minimum height**:

```tsx
// ✅ Good - 44px height
<PublicButton size="md">Click me</PublicButton>

// ✅ Good - explicit min-height
<button className="min-h-[44px] px-4">Click me</button>

// ❌ Bad - too small for mobile
<button className="py-1 px-2 text-xs">Click me</button>
```

## Spacing Scale

Use Tailwind's spacing for consistency:

```tsx
// Tight spacing (cards, form fields)
<div className="space-y-2">...</div>  // 0.5rem (8px)

// Normal spacing (sections within a page)
<div className="space-y-4">...</div>  // 1rem (16px)

// Loose spacing (major sections)
<div className="space-y-8">...</div>  // 2rem (32px)

// Section breaks
<div className="my-16">...</div>      // 4rem (64px)
```

## Typography

```tsx
// Page title
<h1 className="text-2xl sm:text-3xl font-bold text-public-foreground">

// Section heading
<h2 className="text-xl font-semibold text-public-foreground">

// Card title
<h3 className="text-lg font-medium text-public-foreground">

// Body text
<p className="text-base text-public-foreground">

// Secondary text
<p className="text-sm text-public-muted-foreground">

// Small text (legal, captions)
<p className="text-xs text-public-muted-foreground">
```

## Common Patterns

### Event Card

```tsx
<PublicCard hover>
  <div className="flex gap-4">
    <div className="w-16 h-16 bg-public-primary/10 rounded-lg" />
    <div className="flex-1">
      <h3 className="font-semibold text-public-foreground">Event Title</h3>
      <p className="text-sm text-public-muted-foreground">Date & Location</p>
    </div>
  </div>
  <PublicCardFooter>
    <PublicButton variant="primary" className="w-full">
      Bekijk tickets
    </PublicButton>
  </PublicCardFooter>
</PublicCard>
```

### Loading State

```tsx
<div className="flex items-center justify-center py-12">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-public-primary" />
</div>
```

### Empty State

```tsx
<div className="text-center py-12">
  <p className="text-public-muted-foreground mb-4">Geen evenementen gevonden</p>
  <PublicButton variant="primary" href="/events">
    Bekijk alle evenementen
  </PublicButton>
</div>
```

### Error Message

```tsx
<div className="public-card border-public-error/20 bg-public-error/5 p-4">
  <p className="text-sm text-public-error">
    Er is iets misgegaan. Probeer het opnieuw.
  </p>
</div>
```

## Responsive Breakpoints

```
Mobile:   < 640px   (default, mobile-first)
Tablet:   640px+    (sm:)
Desktop:  768px+    (md:)
Large:    1024px+   (lg:)
XLarge:   1280px+   (xl:)
```

## CSS Variables Reference

```css
/* Access in your CSS */
.my-element {
  color: var(--color-public-primary);
  background: var(--color-public-card);
  border-color: var(--color-public-border);
}
```

## Common Mistakes to Avoid

### ❌ DON'T

```tsx
// Don't import dashboard components
import { Button } from "@/components/ui/button";  // Dashboard component!

// Don't use dashboard colors
<div className="bg-blue-600">  // Dashboard color

// Don't skip mobile testing
<div className="grid grid-cols-3">  // No mobile fallback

// Don't use small touch targets
<button className="p-1 text-xs">  // Too small!
```

### ✅ DO

```tsx
// Use public components
import { PublicButton } from "@/components/public";

// Use public colors
<div className="bg-public-primary">

// Mobile-first grid
<div className="grid grid-cols-1 md:grid-cols-3">

// Adequate touch targets
<PublicButton size="md">  // 44px+ height
```

## Import Cheat Sheet

```tsx
// Layout utilities
import "@/app/(public)/public.css"; // In layout only

// Public components
import { PublicButton, PublicCard } from "@/components/public";

// Specific exports
import {
  PublicCard,
  PublicCardHeader,
  PublicCardTitle,
  PublicCardDescription,
  PublicCardContent,
  PublicCardFooter,
} from "@/components/public";
```
