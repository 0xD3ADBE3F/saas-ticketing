# [Feature Name]

**Status:** 🟨 Planned | 🚧 In Progress | ✅ Complete
**Priority:** High | Medium | Low
**Estimated Effort:** X-Y hours (N-M days)

## Overview

Brief 2-3 sentence description of what this feature does and why it's important for the business.

Example: "Implement automated email notifications for order updates. This improves customer experience by keeping buyers informed about their order status and reduces support burden."

## Current State

### ✅ Completed

- List what's already implemented that this feature builds on
- Related database models that exist
- Services or utilities already available
- Example: "Order model with status tracking"

### ⬜ To Build

- List what needs to be implemented
- New services required
- UI components needed
- Database changes
- Example: "Email notification service with templates"

---

## Business Requirements

### User Story

As a [user type], I want to [action] so that [benefit].

### Acceptance Criteria

- [ ] User can [specific action]
- [ ] System does [expected behavior]
- [ ] Edge case [scenario] is handled
- [ ] Performance meets [requirement]

### Use Cases

1. **Primary Use Case:**
   - User action → System response → Expected outcome

2. **Edge Cases:**
   - Scenario A: How to handle
   - Scenario B: How to handle

---

## Technical Implementation

### A) Database Schema

**New Tables/Models:**

```prisma
model NewModel {
  id          String   @id @default(uuid())
  // Add fields here
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([fieldName])
}
```

**Migrations:**

```sql
-- Migration: add_feature_name
ALTER TABLE existing_table
  ADD COLUMN new_field TEXT;

CREATE INDEX idx_table_field ON table(field);
```

---

### B) Services

**File:** `src/server/services/newFeatureService.ts`

```typescript
export const newFeatureService = {
  /**
   * Description of what this function does
   * @param param - What this parameter is for
   * @returns What gets returned
   */
  async functionName(param: string): Promise<ReturnType> {
    // Implementation example
    const result = await prisma.model.findMany({
      where: { param },
    });

    return result;
  },

  // Add more service functions
};
```

---

### C) API Routes

**Route:** `/api/feature/endpoint`

**Method:** `POST` | `GET` | `PUT` | `DELETE`

```typescript
// src/app/api/feature/endpoint/route.ts
export async function POST(request: Request) {
  // 1. Validate authentication
  const user = await getAuthenticatedUser(request);

  // 2. Parse and validate input
  const { field } = await request.json();

  // 3. Call service
  const result = await newFeatureService.functionName(field);

  // 4. Return response
  return NextResponse.json(result);
}
```

---

### D) UI Components

**Route:** `/path/to/feature`

**File:** `src/app/(dashboard)/path/page.tsx`

```tsx
export default async function FeaturePage() {
  // Server-side data fetching
  const data = await fetchData();

  return (
    <DashboardLayout>
      <h1>Feature Title</h1>
      <FeatureComponent data={data} />
    </DashboardLayout>
  );
}
```

**Component:** `src/components/feature/FeatureComponent.tsx`

```tsx
"use client";

export function FeatureComponent({ data }: Props) {
  const [state, setState] = useState();

  return <div>{/* Component implementation */}</div>;
}
```

---

## Implementation Checklist

Break implementation into phases of 1-2 days each. Each phase should have 3-8 actionable tasks.

### Phase 1: Database & Core Services (Day 1)

- [ ] Create database migration for new tables/fields
- [ ] Run migration on development database
- [ ] Implement `newFeatureService` with core functions
- [ ] Add unit tests for service functions
- [ ] Update Prisma schema and generate types

### Phase 2: API Endpoints (Day 1-2)

- [ ] Create API route handlers
- [ ] Add request validation (Zod schemas)
- [ ] Add authentication checks
- [ ] Add authorization checks (org scoping)
- [ ] Add error handling
- [ ] Write API integration tests

### Phase 3: UI Implementation (Day 2-3)

- [ ] Create page component
- [ ] Build main feature UI components
- [ ] Add form validation
- [ ] Implement loading states
- [ ] Add error messages
- [ ] Test responsive design

### Phase 4: Testing & Polish (Day 3-4)

- [ ] Write unit tests (aim for >80% coverage)
- [ ] Write integration tests
- [ ] E2E test: Full user flow
- [ ] Test edge cases
- [ ] Performance testing
- [ ] Accessibility audit

### Phase 5: Documentation & Deployment (Day 4)

- [ ] Update SPEC.md with business rules
- [ ] Update README if needed
- [ ] Write API documentation
- [ ] Add inline code comments
- [ ] Create PR with detailed description
- [ ] Deploy to staging
- [ ] Smoke test in staging

---

## Edge Cases & Error Handling

List scenarios that need special handling:

1. **Scenario Name**
   - Problem: What can go wrong
   - Solution: How to handle it
   - Example: User has no internet → Queue action for later sync

2. **Race Condition**
   - Problem: Two requests at the same time
   - Solution: Use database transactions or locks

3. **Invalid Input**
   - Problem: User sends malformed data
   - Solution: Validate with Zod, return 400 with clear message

---

## Testing Strategy

### Unit Tests

- `tests/featureName.test.ts`
- Test all service functions
- Test calculation logic
- Test validation rules

### Integration Tests

- Test database interactions
- Test external API calls
- Test service-to-service communication

### E2E Tests

- Test complete user flow from UI to database
- Test authentication/authorization
- Test error scenarios

**Example Test:**

```typescript
describe("Feature Service", () => {
  it("should create new record", async () => {
    const result = await newFeatureService.create({
      field: "value",
    });

    expect(result).toBeDefined();
    expect(result.field).toBe("value");
  });

  it("should throw error for invalid input", async () => {
    await expect(newFeatureService.create({ field: "" })).rejects.toThrow(
      "Invalid field"
    );
  });
});
```

---

## Security Considerations

1. **Authentication:** How is access controlled?
2. **Authorization:** Who can access this feature?
3. **Data Validation:** What input validation is needed?
4. **Rate Limiting:** Should requests be rate limited?
5. **Audit Logging:** What actions should be logged?
6. **Data Privacy:** What PII is involved? Retention policy?

---

## Performance Considerations

1. **Database Queries:**
   - Add indexes on frequently queried fields
   - Use pagination for large datasets
   - Consider materialized views for aggregations

2. **Caching:**
   - What data can be cached?
   - TTL strategy?
   - Cache invalidation triggers?

3. **Background Jobs:**
   - Should any operations run async?
   - Queue system needed?

---

## Success Criteria

List measurable outcomes that define when the feature is "done":

- ✅ User can complete [action] successfully
- ✅ Feature works on mobile devices
- ✅ All tests passing (>80% coverage)
- ✅ Performance meets requirements (<500ms response time)
- ✅ No errors in production logs after 1 week
- ✅ Documentation is complete and accurate
- ✅ Code review approved
- ✅ QA/UAT completed

---

## Dependencies

List what must be completed before starting this feature:

- ✅ [Feature Name] - Why this is needed
- ✅ [Service Name] - What functionality is required
- ⬜ [External API] - What needs to be set up
- ⬜ [Database Migration] - What schema changes are needed

**Blocks:** What features depend on this one being completed?

---

## Rollout Strategy

1. **Feature Flag:** `FEATURE_NAME_ENABLED`
   - Initially disabled globally
   - Enable for test organization
   - Enable for beta testers
   - Enable globally after validation

2. **Monitoring:**
   - Track usage metrics
   - Monitor error rates
   - Watch performance metrics
   - Collect user feedback

3. **Rollback Plan:**
   - Can disable feature flag
   - Database migration is reversible
   - Backup strategy for data changes

---

## Future Enhancements

Ideas for future iterations (out of scope for initial implementation):

- Enhancement idea 1
- Enhancement idea 2
- Potential optimization 1
- Feature expansion idea

---

## Related Documentation

- [SPEC.md](../../SPEC.md) - Business rules
- [README.md](../../README.md) - Development setup
- [docs/OTHER_DOC.md](../OTHER_DOC.md) - Related feature docs
- [External API Docs](https://example.com/docs) - Third-party integration

---

## Questions & Decisions

Track important decisions and open questions:

**Decisions Made:**

- [ ] Decision: Chose X over Y because [reason]
- [ ] Decision: Will use Z approach for [problem]

**Open Questions:**

- [ ] Question: Should we support [feature]? (Assigned to: @person)
- [ ] Question: How to handle [edge case]? (Needs research)

**Risks:**

- Risk: [Potential issue] - Mitigation: [How to address]

---

## Notes

Add any additional context, links to discussions, or implementation notes here.

- Link to Slack discussion: [URL]
- Link to GitHub issue: [URL]
- Design mockup: [URL]
- Performance benchmarks: [data]
