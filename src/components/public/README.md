# Public Components Library

This directory contains components specifically designed for **public-facing pages** (events, checkout, order portal).

## Design Principles

1. **Consumer-friendly**: Welcoming, accessible, easy to understand
2. **High conversion**: Optimized for ticket sales
3. **Mobile-first**: 70%+ of ticket buyers use mobile devices
4. **Trust signals**: Clear pricing, secure payment indicators
5. **Performance**: Fast loading, minimal JS when possible

## Isolated Design System

These components use the **public design system** defined in `app/(public)/public.css`:

- Custom color palette (warmer, more inviting)
- Consumer-friendly typography
- Larger touch targets for mobile
- Clear visual hierarchy
- Accessible by default

## Component Guidelines

### DO ✅

- Use `public-*` CSS classes from public.css
- Keep components simple and focused
- Optimize for mobile-first
- Include loading states
- Handle errors gracefully
- Add ARIA labels

### DON'T ❌

- Import dashboard components
- Use admin-specific styling
- Assume desktop layout
- Expose internal IDs or technical details
- Use jargon ("organization", "tenant", etc.)

## Component Categories

### Layout Components

- `PublicCard` - Card container with public styling
- `PublicContainer` - Max-width container
- `PublicSection` - Page section with consistent spacing

### Interactive Components

- `PublicButton` - Primary, accent, and outline variants
- `PublicInput` - Form inputs with public styling
- `PublicBadge` - Status indicators (success, warning, error)

### Domain Components

- `EventCard` - Display event info for listings
- `TicketSelector` - Ticket type selection with quantity
- `OrderSummary` - Checkout summary with fees
- `PaymentMethods` - iDEAL and other payment options

## Usage Example

```tsx
import { PublicButton } from "@/components/public/PublicButton";
import { EventCard } from "@/components/public/EventCard";

export function EventsList({ events }) {
  return (
    <div className="public-container py-8">
      <div className="grid gap-6">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
```

## Testing

All public components should be tested for:

- Mobile responsiveness (320px - 1440px)
- Touch interactions
- Loading states
- Error states
- Accessibility (WCAG 2.1 AA minimum)

## Performance Targets

- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1
