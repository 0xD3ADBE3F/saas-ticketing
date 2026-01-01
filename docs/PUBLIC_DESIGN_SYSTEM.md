# Public Pages Design System

## Overview

The `(public)` directory contains all **consumer-facing pages**: event listings, event details, checkout, and order management. These pages have an **isolated design system** separate from the dashboard/admin areas to provide a distinct, conversion-optimized user experience.

## Architecture

### Directory Structure

```
src/app/(public)/
├── layout.tsx              # Public layout with isolated design
├── public.css              # Public design system (CSS variables, utilities)
├── checkout/               # Checkout flow
├── e/[slug]/               # Event detail pages
└── events/                 # Event listing

src/components/public/
├── README.md               # Component library documentation
├── index.ts                # Centralized exports
├── PublicButton.tsx        # Button component
├── PublicCard.tsx          # Card components
└── ...                     # Additional public components
```

### Design Isolation Strategy

#### 1. **Separate CSS File** (`public.css`)

- Custom CSS variables prefixed with `--public-*`
- Own color palette (warmer, more inviting)
- Consumer-friendly typography scale
- Touch-optimized sizing
- Independent from dashboard styles

#### 2. **Dedicated Layout** (`layout.tsx`)

- Applies `.public-pages` class to scope styles
- Consumer-friendly header/footer
- Trust signals and legal links
- Sticky header for better UX
- Mobile-optimized navigation

#### 3. **Component Library** (`components/public/`)

- Public-specific components
- No dependencies on dashboard components
- Mobile-first responsive
- Accessibility-first approach
- High conversion focus

## Design Principles

### Consumer-Friendly

- Welcoming, approachable aesthetic
- Clear, jargon-free language
- Obvious calls-to-action
- Helpful error messages

### Conversion-Optimized

- Minimal friction in checkout
- Clear pricing breakdown
- Trust signals (security, refund policy)
- Mobile-first (70%+ mobile traffic)

### Performance

- Fast loading times (< 2.5s LCP)
- Minimal JavaScript
- Optimized images
- Progressive enhancement

### Accessibility

- WCAG 2.1 AA compliance minimum
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Focus indicators

## Color Palette

### Light Mode

```css
Primary:     hsl(221 83% 53%)    /* Blue - main CTAs */
Accent:      hsl(142 76% 36%)    /* Green - secondary CTAs */
Background:  hsl(0 0% 100%)      /* White */
Foreground:  hsl(222 47% 11%)    /* Dark text */
Muted:       hsl(210 40% 96%)    /* Light gray backgrounds */
Border:      hsl(214 32% 91%)    /* Subtle borders */
```

### Dark Mode

```css
Primary:     hsl(217 91% 60%)    /* Lighter blue */
Accent:      hsl(142 76% 40%)    /* Lighter green */
Background:  hsl(222 47% 11%)    /* Dark background */
Foreground:  hsl(210 40% 98%)    /* Light text */
Muted:       hsl(217 33% 17%)    /* Dark gray backgrounds */
Border:      hsl(217 33% 17%)    /* Subtle dark borders */
```

## Typography

- **Font**: Roboto Mono (monospace for tech feel, distinctive branding)
- **Scale**: Mobile-first sizing with larger touch targets
- **Hierarchy**: Clear visual hierarchy for scanning

## Component Usage

### Buttons

```tsx
import { PublicButton } from "@/components/public";

// Primary CTA (ticket purchase, checkout)
<PublicButton variant="primary" size="lg">
  Tickets kopen
</PublicButton>

// Secondary action
<PublicButton variant="accent" size="md">
  Meer informatie
</PublicButton>

// Tertiary action
<PublicButton variant="outline" size="sm">
  Annuleren
</PublicButton>

// Loading state
<PublicButton variant="primary" loading>
  Bezig met verwerken...
</PublicButton>
```

### Cards

```tsx
import {
  PublicCard,
  PublicCardHeader,
  PublicCardTitle,
  PublicCardDescription,
  PublicCardContent,
  PublicCardFooter,
} from "@/components/public";

<PublicCard>
  <PublicCardHeader>
    <PublicCardTitle>Evenementnaam</PublicCardTitle>
    <PublicCardDescription>
      Korte beschrijving van het evenement
    </PublicCardDescription>
  </PublicCardHeader>

  <PublicCardContent>{/* Card body content */}</PublicCardContent>

  <PublicCardFooter>
    <PublicButton variant="primary">Bekijk tickets</PublicButton>
  </PublicCardFooter>
</PublicCard>;
```

### CSS Utilities

Use public-specific classes for consistent styling:

```tsx
// Containers
<div className="public-container">...</div>

// Cards with hover effect
<div className="public-card">...</div>

// Buttons
<button className="public-btn-primary">...</button>
<button className="public-btn-accent">...</button>

// Inputs
<input className="public-input" />

// Badges
<span className="public-badge public-badge-success">Beschikbaar</span>
<span className="public-badge public-badge-warning">Bijna uitverkocht</span>
<span className="public-badge public-badge-error">Uitverkocht</span>
```

## Layout Guidelines

### Mobile-First Approach

```tsx
// Stack on mobile, grid on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>

// Responsive padding
<div className="px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>

// Hide on mobile, show on desktop
<div className="hidden md:block">
  {/* Desktop-only content */}
</div>
```

### Touch Targets

- Minimum 44px height for interactive elements
- Adequate spacing between touch targets
- Large, clear buttons for primary actions

### Visual Hierarchy

1. **Hero/Primary Content**: Large, bold text with primary CTA
2. **Secondary Content**: Medium text, supporting information
3. **Tertiary Content**: Small text, metadata, legal info

## Differences from Dashboard

| Aspect              | Public Pages                  | Dashboard                   |
| ------------------- | ----------------------------- | --------------------------- |
| **Color Palette**   | Warmer, inviting blues/greens | Professional blues/purples  |
| **Typography**      | Larger, easier to scan        | Compact, information-dense  |
| **Layout**          | Simple, focused               | Complex, feature-rich       |
| **Navigation**      | Minimal, sticky header        | Full sidebar navigation     |
| **Target Audience** | Ticket buyers (consumers)     | Organizers (business users) |
| **Goal**            | High conversion               | Productivity & management   |

## Best Practices

### DO ✅

- Use public components from `components/public/`
- Apply `.public-pages` class at layout level
- Use public CSS variables (`--public-*`)
- Test on mobile devices (< 375px width)
- Include loading states
- Show clear error messages
- Add trust signals (secure payment, refund policy)
- Optimize images (WebP, lazy loading)

### DON'T ❌

- Import dashboard components into public pages
- Use dashboard-specific styling classes
- Expose technical jargon ("organization", "tenant")
- Show internal IDs or technical details
- Assume desktop layout
- Skip mobile testing
- Forget accessibility (ARIA labels, focus states)

## Testing Checklist

### Responsive Design

- [ ] Works on 320px width (iPhone SE)
- [ ] Works on 768px width (tablets)
- [ ] Works on 1440px width (desktop)
- [ ] No horizontal scroll on mobile
- [ ] Touch targets are 44px+ height

### Accessibility

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] ARIA labels on icons
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader tested

### Performance

- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.5s
- [ ] No layout shift (CLS < 0.1)
- [ ] Images optimized and lazy loaded

### Conversion

- [ ] Clear CTAs above the fold
- [ ] Obvious path to purchase
- [ ] Trust signals visible
- [ ] Pricing transparent
- [ ] Error handling clear

## Migration Guide

### Converting Existing Pages

If you need to convert an existing page to use the public design system:

1. **Move to `(public)` directory** if not already there
2. **Replace component imports**:

   ```tsx
   // Before
   import { Button } from "@/components/ui/button";

   // After
   import { PublicButton } from "@/components/public";
   ```

3. **Update styling classes**:

   ```tsx
   // Before
   <div className="bg-white border rounded-lg">

   // After
   <div className="public-card">
   ```

4. **Test mobile-first**:
   - Start at 320px width
   - Verify touch targets
   - Check text readability

## Future Enhancements

- [ ] Add more public components (badges, alerts, modals)
- [ ] Create public form components
- [ ] Add animation utilities
- [ ] Implement skeleton loaders
- [ ] Add theme switcher (light/dark)
- [ ] Create Storybook documentation
- [ ] Add E2E tests for checkout flow

## Questions?

Refer to:

- [Component Library README](../../components/public/README.md) for component details
- [SPEC.md](../../../SPEC.md) for overall project architecture
- [Copilot Instructions](.github/copilot-instructions.md) for coding standards
