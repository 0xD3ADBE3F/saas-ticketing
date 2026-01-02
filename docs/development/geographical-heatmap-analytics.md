# Geographical Heatmap Analytics

**Status:** 🟨 Planned
**Priority:** Medium
**Estimated Effort:** 12-16 hours (3-4 days)

## Overview

Add geographical visualization to show where ticket buyers are located across the Netherlands. This helps event organizers understand their audience distribution, optimize marketing spend by region, and identify expansion opportunities. The feature will display interactive heatmaps at both organization-level (all events) and event-level dashboards.

## Current State

### ✅ Completed

- Order model with `buyerEmail` (indexed) and optional `buyerName`
- AuditLog model with optional `ipAddress` field for audit tracking
- Dashboard statistics service with basic revenue/ticket metrics
- StatCard component for displaying metrics
- Multi-tenancy architecture (all queries org-scoped)

### ⬜ To Build

- Location data collection mechanism (buyer city/province)
- Optional buyer location fields in Order model
- Geographical aggregation service
- Interactive heatmap component (Netherlands map)
- Province-level and city-level aggregation views
- CSV export for geographical data

---

## Business Requirements

### User Story

As an event organizer, I want to see where my ticket buyers are located on a map of the Netherlands, so that I can understand my audience reach, optimize local marketing efforts, and make data-driven decisions about future event locations.

### Acceptance Criteria

- [ ] User can view a Netherlands heatmap with buyer distribution on organization dashboard
- [ ] User can view event-specific geographical breakdown on event detail page
- [ ] Map shows data at province level (12 provinces) by default
- [ ] User can drill down to city level when clicking a province
- [ ] Hover shows count and percentage of buyers per region
- [ ] Location field is optional during checkout (respects data minimization)
- [ ] System gracefully handles missing/partial location data
- [ ] Export functionality includes geographical breakdown
- [ ] Performance: Map loads in <2s with up to 10,000 orders

### Use Cases

1. **Primary Use Case: Organization Dashboard Heatmap**
   - User navigates to dashboard → Sees nationwide buyer distribution → Identifies strong/weak regions → Plans targeted marketing

2. **Event-Specific Analysis**
   - User views event details → Clicks geography tab → Sees buyer distribution for this event → Compares to other events → Adjusts local promotion strategy

3. **Edge Cases:**
   - Missing location data → Show as "Unknown" category with count
   - Non-NL addresses (edge case) → Show as "International" category
   - Zero sales → Show empty map with message "No geographical data yet"
   - Very small sample size (<10 orders) → Show warning about statistical significance

---

## Data Collection Strategy

### ⚠️ Privacy & Data Minimization Considerations

Per project guidelines: "Store only: email, optional name. No addresses unless required for specific events."

**Approach:** Collect **minimal optional location data** during checkout:

- City name (optional text field, max 100 chars)
- Province selection (optional dropdown with 12 NL provinces)
- **Do NOT collect:** Street address, postal code, house number

**Justification:**

- City/province are low-resolution identifiers
- Optional field respects user privacy
- Provides sufficient granularity for marketing insights
- Can be used for venue selection without privacy concerns

### Alternative Approaches (Considered & Rejected)

❌ **GeoIP Lookup:**

- Requires storing IP addresses (privacy concern)
- Inaccurate for VPN/mobile users
- Adds external API dependency
- Cost implications at scale

❌ **Payment Method Geolocation:**

- Mollie provides limited location data
- Only available post-payment (can't pre-populate)
- Inconsistent across payment methods

✅ **Chosen: Optional User-Provided Location**

- User controls their data sharing
- Accurate (self-reported)
- No external dependencies
- Aligns with GDPR transparency requirements

---

## Technical Implementation

### A) Database Schema

**New Fields in Order Model:**

```prisma
model Order {
  // ... existing fields ...

  // Geographical data (optional, for analytics)
  buyerCity       String? // e.g., "Amsterdam", "Rotterdam"
  buyerProvince   Province? // Enum: NL provinces

  // ... rest of model ...
}

enum Province {
  DRENTHE
  FLEVOLAND
  FRIESLAND
  GELDERLAND
  GRONINGEN
  LIMBURG
  NOORD_BRABANT
  NOORD_HOLLAND
  OVERIJSSEL
  UTRECHT
  ZEELAND
  ZUID_HOLLAND
}
```

**Migrations:**

```sql
-- Migration: add_geographical_data_to_orders
ALTER TABLE orders
  ADD COLUMN buyer_city VARCHAR(100),
  ADD COLUMN buyer_province TEXT;

CREATE INDEX idx_orders_province ON orders(buyer_province)
  WHERE buyer_province IS NOT NULL;

CREATE INDEX idx_orders_city ON orders(buyer_city)
  WHERE buyer_city IS NOT NULL;
```

**Alternative: Separate GeoData Table** (if future expansion to postal codes/districts)

```prisma
model OrderGeoData {
  id             String   @id @default(uuid())
  orderId        String   @unique
  city           String?
  province       Province?
  collectedAt    DateTime @default(now())

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([province])
  @@index([city])
}
```

---

### B) Services

**File:** `src/server/services/geoStatsService.ts`

```typescript
export const geoStatsService = {
  /**
   * Get buyer distribution by province for an organization
   * @param organizationId - Organization to scope query
   * @param eventId - Optional event filter
   * @param dateRange - Optional date filter
   * @returns Province breakdown with counts and percentages
   */
  async getProvinceDistribution(
    organizationId: string,
    filters?: {
      eventId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<ProvinceDistribution[]> {
    const where: Prisma.OrderWhereInput = {
      organizationId,
      status: "PAID", // Only count paid orders
      buyerProvince: { not: null }, // Exclude missing data
      ...(filters?.eventId && { eventId: filters.eventId }),
      ...(filters?.dateFrom && { paidAt: { gte: filters.dateFrom } }),
      ...(filters?.dateTo && { paidAt: { lte: filters.dateTo } }),
    };

    // Aggregate by province
    const results = await prisma.order.groupBy({
      by: ["buyerProvince"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    // Calculate total for percentages
    const total = results.reduce((sum, r) => sum + r._count.id, 0);

    return results.map((r) => ({
      province: r.buyerProvince as Province,
      count: r._count.id,
      percentage: (r._count.id / total) * 100,
    }));
  },

  /**
   * Get buyer distribution by city within a province
   */
  async getCityDistribution(
    organizationId: string,
    province: Province,
    filters?: { eventId?: string; dateFrom?: Date; dateTo?: Date }
  ): Promise<CityDistribution[]> {
    const where: Prisma.OrderWhereInput = {
      organizationId,
      status: "PAID",
      buyerProvince: province,
      buyerCity: { not: null },
      ...(filters?.eventId && { eventId: filters.eventId }),
      ...(filters?.dateFrom && { paidAt: { gte: filters.dateFrom } }),
      ...(filters?.dateTo && { paidAt: { lte: filters.dateTo } }),
    };

    const results = await prisma.order.groupBy({
      by: ["buyerCity"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const total = results.reduce((sum, r) => sum + r._count.id, 0);

    return results.map((r) => ({
      city: r.buyerCity as string,
      count: r._count.id,
      percentage: (r._count.id / total) * 100,
    }));
  },

  /**
   * Get data quality metrics (% of orders with location data)
   */
  async getDataCoverage(
    organizationId: string,
    filters?: { eventId?: string }
  ): Promise<DataCoverage> {
    const where = {
      organizationId,
      status: "PAID" as const,
      ...(filters?.eventId && { eventId: filters.eventId }),
    };

    const [total, withProvince, withCity] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, buyerProvince: { not: null } } }),
      prisma.order.count({ where: { ...where, buyerCity: { not: null } } }),
    ]);

    return {
      totalOrders: total,
      ordersWithProvince: withProvince,
      ordersWithCity: withCity,
      provinceCoverage: total > 0 ? (withProvince / total) * 100 : 0,
      cityCoverage: total > 0 ? (withCity / total) * 100 : 0,
    };
  },

  /**
   * Compare geographical distribution across multiple events
   */
  async compareEventDistributions(
    organizationId: string,
    eventIds: string[]
  ): Promise<EventComparison[]> {
    const comparisons = await Promise.all(
      eventIds.map(async (eventId) => {
        const distribution = await this.getProvinceDistribution(
          organizationId,
          { eventId }
        );
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { title: true, slug: true },
        });

        return {
          eventId,
          eventTitle: event?.title || "Unknown",
          distribution,
        };
      })
    );

    return comparisons;
  },
};

// Types
export interface ProvinceDistribution {
  province: Province;
  count: number;
  percentage: number;
}

export interface CityDistribution {
  city: string;
  count: number;
  percentage: number;
}

export interface DataCoverage {
  totalOrders: number;
  ordersWithProvince: number;
  ordersWithCity: number;
  provinceCoverage: number; // Percentage
  cityCoverage: number; // Percentage
}

export interface EventComparison {
  eventId: string;
  eventTitle: string;
  distribution: ProvinceDistribution[];
}
```

---

### C) API Routes

**Route 1:** `/api/stats/geography`

**Method:** `GET`

```typescript
// src/app/api/stats/geography/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "@/server/lib/session";
import { geoStatsService } from "@/server/services/geoStatsService";

export async function GET(request: Request) {
  // 1. Validate authentication
  const session = await getServerSession();
  if (!session?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse query parameters
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId") || undefined;
  const level = searchParams.get("level") || "province"; // "province" | "city"
  const province = searchParams.get("province") as Province | undefined;

  try {
    // 3. Get distribution data
    if (level === "province") {
      const distribution = await geoStatsService.getProvinceDistribution(
        session.organizationId,
        { eventId }
      );

      const coverage = await geoStatsService.getDataCoverage(
        session.organizationId,
        { eventId }
      );

      return NextResponse.json({
        level: "province",
        distribution,
        coverage,
      });
    } else if (level === "city" && province) {
      const distribution = await geoStatsService.getCityDistribution(
        session.organizationId,
        province,
        { eventId }
      );

      return NextResponse.json({
        level: "city",
        province,
        distribution,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid level or missing province for city-level data" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Geography stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch geographical data" },
      { status: 500 }
    );
  }
}
```

**Route 2:** `/api/stats/geography/compare`

**Method:** `POST`

```typescript
// For comparing multiple events
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventIds } = await request.json();

  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    return NextResponse.json({ error: "Invalid eventIds" }, { status: 400 });
  }

  const comparison = await geoStatsService.compareEventDistributions(
    session.organizationId,
    eventIds
  );

  return NextResponse.json(comparison);
}
```

---

### D) UI Components

#### 1. Province Heatmap Component

**File:** `src/components/analytics/NetherlandsHeatmap.tsx`

```tsx
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProvinceData {
  province: string;
  count: number;
  percentage: number;
}

interface NetherlandsHeatmapProps {
  data: ProvinceData[];
  coverage: {
    provinceCoverage: number;
    totalOrders: number;
  };
  onProvinceClick?: (province: string) => void;
}

export function NetherlandsHeatmap({
  data,
  coverage,
  onProvinceClick,
}: NetherlandsHeatmapProps) {
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  // Calculate color intensity based on percentage
  const getProvinceColor = (province: string): string => {
    const item = data.find((d) => d.province === province);
    if (!item) return "fill-gray-100 hover:fill-gray-200";

    // Color scale: blue gradient based on percentage
    if (item.percentage >= 15) return "fill-blue-600 hover:fill-blue-700";
    if (item.percentage >= 10) return "fill-blue-500 hover:fill-blue-600";
    if (item.percentage >= 5) return "fill-blue-400 hover:fill-blue-500";
    if (item.percentage >= 2) return "fill-blue-300 hover:fill-blue-400";
    return "fill-blue-200 hover:fill-blue-300";
  };

  const getProvinceData = (province: string) =>
    data.find((d) => d.province === province);

  // SVG map of Netherlands with province paths
  // (Simplified - actual implementation would use accurate province boundaries)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Buyer Distribution by Province</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="gap-1">
                  <Info className="h-3 w-3" />
                  {coverage.provinceCoverage.toFixed(0)}% coverage
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {coverage.totalOrders} total orders,{" "}
                  {Math.round(
                    (coverage.provinceCoverage / 100) * coverage.totalOrders
                  )}{" "}
                  with location data
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* SVG Map */}
          <div className="relative aspect-square">
            <svg
              viewBox="0 0 400 500"
              className="h-full w-full"
              onMouseLeave={() => setHoveredProvince(null)}
            >
              {/* Example: Noord-Holland (simplified path) */}
              <path
                d="M150 100 L180 90 L200 110 L190 130 L160 135 Z"
                className={`${getProvinceColor("NOORD_HOLLAND")} cursor-pointer transition-colors stroke-gray-300 stroke-[1]`}
                onClick={() => onProvinceClick?.("NOORD_HOLLAND")}
                onMouseEnter={() => setHoveredProvince("NOORD_HOLLAND")}
              />

              {/* Add all other provinces... */}
              {/* Zuid-Holland, Utrecht, Gelderland, etc. */}

              {/* Tooltip on hover */}
              {hoveredProvince && (
                <foreignObject x="200" y="250" width="180" height="80">
                  <div className="rounded-lg border bg-white p-3 shadow-lg">
                    <p className="font-semibold">
                      {hoveredProvince.replace("_", " ")}
                    </p>
                    <p className="text-sm text-gray-600">
                      {getProvinceData(hoveredProvince)?.count || 0} orders (
                      {getProvinceData(hoveredProvince)?.percentage.toFixed(
                        1
                      ) || 0}
                      %)
                    </p>
                  </div>
                </foreignObject>
              )}
            </svg>
          </div>

          {/* Legend & Top Provinces */}
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium">Top Provinces</h4>
              <div className="space-y-2">
                {data.slice(0, 5).map((item) => (
                  <div
                    key={item.province}
                    className="flex items-center justify-between rounded-lg border p-2 hover:bg-gray-50"
                  >
                    <span className="font-medium">
                      {item.province.replace("_", " ")}
                    </span>
                    <div className="text-right">
                      <p className="font-semibold">{item.count}</p>
                      <p className="text-xs text-gray-500">
                        {item.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Color legend */}
            <div>
              <h4 className="mb-2 text-sm font-medium">Legend</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-blue-600" />
                  <span>≥15% of orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-blue-400" />
                  <span>5-15%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-blue-200" />
                  <span>&lt;5%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-gray-100" />
                  <span>No data</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 2. City Distribution Bar Chart

**File:** `src/components/analytics/CityDistributionChart.tsx`

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CityDistributionChartProps {
  data: Array<{
    city: string;
    count: number;
    percentage: number;
  }>;
  province: string;
}

export function CityDistributionChart({
  data,
  province,
}: CityDistributionChartProps) {
  // Take top 15 cities
  const topCities = data.slice(0, 15);

  // Color gradient for bars
  const getColor = (index: number) => {
    const colors = [
      "#3b82f6", // blue-500
      "#60a5fa", // blue-400
      "#93c5fd", // blue-300
    ];
    if (index < 3) return colors[index];
    return "#dbeafe"; // blue-100
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Cities in {province.replace("_", " ")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topCities} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="city"
              width={100}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-white p-2 shadow-lg">
                    <p className="font-semibold">{data.city}</p>
                    <p className="text-sm">
                      {data.count} orders ({data.percentage.toFixed(1)}%)
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {topCities.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

#### 3. Dashboard Integration

**File:** `src/app/(dashboard)/dashboard/page.tsx`

Add new section to dashboard:

```tsx
import { NetherlandsHeatmap } from "@/components/analytics/NetherlandsHeatmap";
import { geoStatsService } from "@/server/services/geoStatsService";

export default async function DashboardPage() {
  const session = await getServerSession();
  // ... existing stats queries ...

  // Fetch geographical data
  const geoDistribution = await geoStatsService.getProvinceDistribution(
    session.organizationId
  );
  const geoCoverage = await geoStatsService.getDataCoverage(
    session.organizationId
  );

  return (
    <div className="space-y-8">
      {/* Existing stats cards */}
      {/* ... */}

      {/* Geographical Analytics Section */}
      {geoCoverage.provinceCoverage > 5 && ( // Only show if >5% coverage
        <section>
          <h2 className="mb-4 text-2xl font-bold">Geographical Insights</h2>
          <NetherlandsHeatmap data={geoDistribution} coverage={geoCoverage} />
        </section>
      )}
    </div>
  );
}
```

---

### E) Checkout Form Updates

**File:** `src/app/(public)/[orgSlug]/e/[eventSlug]/checkout/CheckoutForm.tsx`

Add optional location fields:

```tsx
// Add to form state
const [buyerCity, setBuyerCity] = useState("");
const [buyerProvince, setBuyerProvince] = useState<Province | "">("");

// Add to form JSX (after email/name fields)
<div className="space-y-4">
  <div>
    <label className="text-sm font-medium">
      Stad (optioneel)
      <span className="ml-2 text-xs text-gray-500">
        Helpt ons onze diensten te verbeteren
      </span>
    </label>
    <input
      type="text"
      value={buyerCity}
      onChange={(e) => setBuyerCity(e.target.value)}
      placeholder="bijv. Amsterdam"
      className="w-full rounded-lg border p-2"
      maxLength={100}
    />
  </div>

  <div>
    <label className="text-sm font-medium">Provincie (optioneel)</label>
    <select
      value={buyerProvince}
      onChange={(e) => setBuyerProvince(e.target.value as Province)}
      className="w-full rounded-lg border p-2"
    >
      <option value="">Selecteer provincie</option>
      <option value="DRENTHE">Drenthe</option>
      <option value="FLEVOLAND">Flevoland</option>
      <option value="FRIESLAND">Friesland</option>
      <option value="GELDERLAND">Gelderland</option>
      <option value="GRONINGEN">Groningen</option>
      <option value="LIMBURG">Limburg</option>
      <option value="NOORD_BRABANT">Noord-Brabant</option>
      <option value="NOORD_HOLLAND">Noord-Holland</option>
      <option value="OVERIJSSEL">Overijssel</option>
      <option value="UTRECHT">Utrecht</option>
      <option value="ZEELAND">Zeeland</option>
      <option value="ZUID_HOLLAND">Zuid-Holland</option>
    </select>
  </div>
</div>;

// Include in order creation payload
const orderData = {
  // ... existing fields ...
  buyerCity: buyerCity || undefined,
  buyerProvince: buyerProvince || undefined,
};
```

---

## Implementation Checklist

### Phase 1: Database & Core Services (Day 1, ~4 hours)

- [ ] Add Province enum to Prisma schema
- [ ] Add `buyerCity` and `buyerProvince` optional fields to Order model
- [ ] Create migration `add_geographical_data_to_orders`
- [ ] Run migration on development database
- [ ] Implement `geoStatsService` with all functions
- [ ] Add unit tests for `getProvinceDistribution` and `getCityDistribution`
- [ ] Test with mock data (seed 100+ orders with random provinces)

### Phase 2: API Endpoints (Day 1-2, ~3 hours)

- [ ] Create `/api/stats/geography` route handler
- [ ] Add authentication checks (org-scoped)
- [ ] Add query parameter validation (level, eventId, province)
- [ ] Create `/api/stats/geography/compare` for multi-event comparison
- [ ] Add error handling for missing data
- [ ] Test API with Postman/curl
- [ ] Write integration tests for endpoints

### Phase 3: Checkout Form Updates (Day 2, ~2 hours)

- [ ] Add city input field to CheckoutForm
- [ ] Add province dropdown to CheckoutForm
- [ ] Update order creation service to accept new fields
- [ ] Update POST `/api/checkout` to validate and store location
- [ ] Add client-side validation (max 100 chars for city)
- [ ] Test checkout flow with and without location data
- [ ] Ensure form works on mobile devices

### Phase 4: UI Components - Map (Day 2-3, ~5 hours)

- [ ] Install recharts: `pnpm add recharts`
- [ ] Create `NetherlandsHeatmap` component with SVG map
- [ ] Source accurate province boundary paths (use GeoJSON → SVG converter)
- [ ] Implement color gradient based on buyer percentage
- [ ] Add hover tooltips showing province stats
- [ ] Add click handler for drilling down to cities
- [ ] Create `CityDistributionChart` bar chart component
- [ ] Add legend and data coverage indicator
- [ ] Test responsive layout (desktop & mobile)
- [ ] Add loading states

### Phase 5: Dashboard Integration (Day 3, ~2 hours)

- [ ] Add geographical section to main dashboard page
- [ ] Add conditional rendering (only show if >5% coverage)
- [ ] Add event-specific geography tab to event detail page
- [ ] Implement province drill-down interaction
- [ ] Add "Export Geography Data" button
- [ ] Test with real organization data
- [ ] Verify multi-tenancy (org scoping works correctly)

### Phase 6: Testing & Polish (Day 3-4, ~4 hours)

- [ ] Write unit tests for geoStatsService (aim for >85% coverage)
- [ ] Write integration tests for API endpoints
- [ ] E2E test: Checkout with location → View on dashboard
- [ ] Test edge cases: no data, partial data, all provinces covered
- [ ] Performance test: Load map with 10,000 orders
- [ ] Accessibility audit (keyboard navigation, screen readers)
- [ ] Test on mobile devices (iOS & Android)
- [ ] Add loading skeletons for map component

### Phase 7: Documentation & Deployment (Day 4, ~2 hours)

- [ ] Update SPEC.md with geographical data business rules
- [ ] Document Province enum values and Dutch names mapping
- [ ] Add inline comments to geoStatsService
- [ ] Update CSV export to include geographical breakdown
- [ ] Create PR with detailed description
- [ ] Deploy to staging environment
- [ ] Smoke test in staging with test orders
- [ ] Monitor performance metrics after production deploy

---

## Edge Cases & Error Handling

1. **No Geographical Data Available**
   - Problem: New organization with no orders containing location
   - Solution: Show empty state with message "Start collecting location data by adding optional fields to your checkout"
   - UI: Display call-to-action to enable location collection

2. **Low Coverage (<5%)**
   - Problem: Not enough data for meaningful insights
   - Solution: Hide map, show banner "Only X% of orders have location data. Encourage buyers to share their location for better analytics."
   - Threshold: Only display map if coverage >5%

3. **Non-NL Addresses**
   - Problem: International orders (edge case for NL-focused platform)
   - Solution: Add "International" category in stats, don't show on map
   - Filter: Exclude from map visualization but show in separate metric

4. **Inconsistent City Names**
   - Problem: User enters "A'dam" vs "Amsterdam", "'s-Gravenhage" vs "Den Haag"
   - Solution: Normalize common variations in service layer
   - Implementation: Create city name normalization mapping

5. **Province Mismatch**
   - Problem: User selects wrong province for their city
   - Solution: Accept as-is (user-provided), optionally add validation in future
   - Note: Don't over-engineer with postal code validation (avoid data collection)

6. **Simultaneous Requests**
   - Problem: Multiple dashboard loads hitting geo stats API
   - Solution: Implement caching with 5-minute TTL
   - Use React cache() or Redis for server-side caching

7. **Large Dataset Performance**
   - Problem: Organizations with 50,000+ orders slow to aggregate
   - Solution: Add database indexes on province/city, consider materialized view
   - Monitoring: Log slow queries >1s, optimize with EXPLAIN ANALYZE

---

## Testing Strategy

### Unit Tests

**File:** `tests/geoStats.test.ts`

```typescript
describe("geoStatsService", () => {
  beforeEach(async () => {
    // Seed test data: organization with orders in different provinces
    await seedTestOrders();
  });

  it("should aggregate orders by province", async () => {
    const result = await geoStatsService.getProvinceDistribution(testOrgId);

    expect(result).toHaveLength(12); // All provinces
    expect(result[0]).toHaveProperty("province");
    expect(result[0]).toHaveProperty("count");
    expect(result[0]).toHaveProperty("percentage");
    expect(result.reduce((sum, r) => sum + r.percentage, 0)).toBeCloseTo(100);
  });

  it("should filter by event", async () => {
    const result = await geoStatsService.getProvinceDistribution(testOrgId, {
      eventId: testEventId,
    });

    // Verify only orders from specific event
    expect(result.reduce((sum, r) => sum + r.count, 0)).toBe(50); // Seeded 50 orders
  });

  it("should handle no location data gracefully", async () => {
    // Create orders without province data
    const result = await geoStatsService.getProvinceDistribution(emptyOrgId);

    expect(result).toEqual([]);
  });

  it("should calculate data coverage correctly", async () => {
    const coverage = await geoStatsService.getDataCoverage(testOrgId);

    expect(coverage.totalOrders).toBe(100);
    expect(coverage.ordersWithProvince).toBe(75); // 75% coverage
    expect(coverage.provinceCoverage).toBe(75);
  });
});
```

### Integration Tests

```typescript
describe("GET /api/stats/geography", () => {
  it("should return province distribution for authenticated user", async () => {
    const response = await fetch("/api/stats/geography", {
      headers: { Cookie: sessionCookie },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("distribution");
    expect(data).toHaveProperty("coverage");
  });

  it("should return 401 for unauthenticated request", async () => {
    const response = await fetch("/api/stats/geography");
    expect(response.status).toBe(401);
  });

  it("should filter by eventId query parameter", async () => {
    const response = await fetch(
      `/api/stats/geography?eventId=${testEventId}`,
      { headers: { Cookie: sessionCookie } }
    );

    const data = await response.json();
    expect(data.distribution[0].count).toBeLessThanOrEqual(50);
  });
});
```

### E2E Tests

```typescript
describe("Geographical Heatmap E2E", () => {
  it("should show location fields in checkout", async () => {
    await page.goto(`/org/e/test-event/checkout`);

    const cityInput = await page.$('input[placeholder*="Amsterdam"]');
    expect(cityInput).toBeTruthy();

    const provinceSelect = await page.$("select");
    expect(provinceSelect).toBeTruthy();
  });

  it("should display heatmap after orders with location", async () => {
    // Create order with location
    await createTestOrderWithLocation({
      buyerCity: "Amsterdam",
      buyerProvince: "NOORD_HOLLAND",
    });

    // Navigate to dashboard
    await page.goto("/dashboard");

    // Verify heatmap is visible
    const heatmap = await page.$('[data-testid="netherlands-heatmap"]');
    expect(heatmap).toBeTruthy();

    // Verify Noord-Holland is colored
    const province = await page.$('path[data-province="NOORD_HOLLAND"]');
    const fillColor = await province?.evaluate(
      (el) => window.getComputedStyle(el).fill
    );
    expect(fillColor).toContain("blue");
  });
});
```

---

## Security Considerations

1. **Authentication:** All geography endpoints require authenticated session with organizationId
2. **Authorization:** All queries scoped to organization (multi-tenancy enforced)
3. **Data Validation:**
   - City: Max 100 chars, alphanumeric + spaces/hyphens
   - Province: Enum validation, only accept 12 valid NL provinces
4. **Rate Limiting:** Geography endpoints limited to 60 requests/minute per org
5. **Audit Logging:** Log suspicious patterns (mass data scraping attempts)
6. **Data Privacy:**
   - City/province are non-PII (low sensitivity)
   - Optional fields (user consent implied by providing data)
   - Include in privacy policy: "Location data used for analytics"
   - Support data deletion (cascade delete with Order)

---

## Performance Considerations

1. **Database Queries:**
   - Add indexes: `@@index([buyerProvince])`, `@@index([buyerCity])`
   - Use `groupBy` for aggregation (more efficient than multiple counts)
   - Consider partial index: `WHERE buyer_province IS NOT NULL`

2. **Caching:**
   - Cache province distribution for 5 minutes (low volatility)
   - Use React `cache()` for SSR deduplication
   - Invalidate cache on new order (optional)
   - Future: Use Redis for multi-instance deployments

3. **Frontend Performance:**
   - Lazy load map component (only when visible)
   - Use dynamic imports: `const Heatmap = dynamic(() => import(...))`
   - Optimize SVG paths (simplify polygons, reduce coordinates)
   - Use CSS transforms for smooth hover animations

4. **Scalability:**
   - Monitor query performance with >10,000 orders
   - If slow, create materialized view for province aggregation
   - Consider denormalization: pre-calculate stats on order creation
   - Background job: Update geo stats every 15 minutes (for very large orgs)

---

## Success Criteria

- ✅ User can view geographical distribution on dashboard
- ✅ Map loads in <2 seconds with 10,000 orders
- ✅ Location fields are optional and don't break existing checkout flow
- ✅ Coverage indicator shows data quality (% of orders with location)
- ✅ All queries properly scoped to organization (multi-tenancy)
- ✅ Tests passing (>80% coverage for geoStatsService)
- ✅ Responsive design works on mobile devices
- ✅ Accessibility: Keyboard navigation and screen reader support
- ✅ No performance regression on dashboard load time
- ✅ Documentation complete (inline comments + this spec)

---

## Dependencies

- ✅ Prisma schema with Order model
- ✅ Dashboard statistics service
- ✅ StatCard and Card UI components
- ⬜ Recharts library installation (`pnpm add recharts`)
- ⬜ Database migration for new fields
- ⬜ SVG map of Netherlands with province boundaries (source GeoJSON)

**Blocks:** Enhanced analytics dashboard (time-series charts, ticket performance)

---

## Rollout Strategy

1. **Feature Flag:** `GEOGRAPHY_ANALYTICS_ENABLED`
   - Initially enabled for development/staging only
   - Enable for 2-3 test organizations (monitor adoption)
   - Collect feedback on UI/UX
   - Enable globally after 2 weeks validation

2. **Monitoring:**
   - Track % of new orders with location data (target: >30%)
   - Monitor geo API endpoint latency (target: <500ms p95)
   - Count dashboard views of geography section
   - Collect user feedback via in-app survey

3. **Adoption Strategy:**
   - Add tooltip in checkout: "Help us improve by sharing your location"
   - Email existing users: "New feature - see where your audience is"
   - Show example screenshot in onboarding flow

4. **Rollback Plan:**
   - Disable feature flag if performance issues
   - Migration is reversible (DROP COLUMN buyer_city, buyer_province)
   - No data loss (location data optional)

---

## Future Enhancements

Ideas for future iterations (out of scope for MVP):

- **Postal Code Level:** More granular analysis (requires 4-digit postal codes)
- **Choropleth Animation:** Animate buyer growth over time per province
- **Event Radius Analysis:** Show distance between event venue and buyer locations
- **Competitor Benchmarking:** Compare geographical reach vs. similar events
- **Marketing Integration:** Export geo data for Facebook/Google Ads targeting
- **Automatic Venue Suggestions:** AI recommends event locations based on audience distribution
- **International Expansion:** Add Belgium/Germany maps when expanding market
- **Demographic Overlay:** Combine with age/gender data (requires collection)

---

## Related Documentation

- [SPEC.md](../../SPEC.md) - Business rules for orders and tickets
- [README.md](../../README.md) - Development setup
- [docs/PUBLIC_DESIGN_SYSTEM.md](../PUBLIC_DESIGN_SYSTEM.md) - UI component patterns
- [docs/development/analytics-monitoring/](./analytics-monitoring/) - Related analytics features
- [Recharts Documentation](https://recharts.org/en-US/) - Charting library
- [GeoJSON.io](https://geojson.io/) - Tool for creating province boundary data

---

## Questions & Decisions

**Decisions Made:**

- [x] **Decision:** Use optional user-provided location over GeoIP
  - **Reason:** Better accuracy, respects privacy, no external dependencies
- [x] **Decision:** Province-level granularity (not postal codes)
  - **Reason:** Sufficient for marketing insights, lower privacy concerns
- [x] **Decision:** Use Recharts for bar charts, custom SVG for map
  - **Reason:** Recharts lacks map support; custom SVG allows exact province boundaries
- [x] **Decision:** Only show map if >5% data coverage
  - **Reason:** Avoid misleading visualizations with insufficient data

**Open Questions:**

- [ ] **Question:** Should we auto-populate city/province from IP on checkout page load? (Assigned to: Product)
  - **Note:** Could improve data collection rate but requires GeoIP service
- [ ] **Question:** Should we validate city belongs to selected province? (Assigned to: Dev)
  - **Note:** Could prevent errors but adds complexity; user-reported data should be trusted
- [ ] **Question:** Export format for geo data - CSV or JSON? Both? (Assigned to: Product)
  - **Note:** CSV easier for Excel users, JSON better for API integrations

**Risks:**

- **Risk:** Low adoption of optional location field (<10% completion rate)
  - **Mitigation:** A/B test different copy/tooltips, consider small incentive (discount code)
- **Risk:** Performance degradation with very large datasets (>100k orders)
  - **Mitigation:** Monitor query performance, implement caching early, consider materialized views

---

## Notes

- **SVG Map Source:** Use official CBS (Centraal Bureau voor de Statistiek) province boundaries from [https://www.cbs.nl/nl-nl/dossier/nederland-regionaal/geografische-data](https://www.cbs.nl/nl-nl/dossier/nederland-regionaal/geografische-data)
- **Province Names:** Ensure Dutch names match enum values (NOORD_HOLLAND = "Noord-Holland")
- **Accessibility:** Map must be navigable via keyboard; provide data table alternative
- **Mobile Consideration:** On small screens, show bar chart instead of map for better readability
- **Data Retention:** Location data has same retention as Order data (follow GDPR guidelines)
