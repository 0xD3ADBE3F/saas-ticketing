# Development Feature Plans

This directory contains detailed implementation plans for Entro features that are planned or in progress.

## Structure

Each feature has its own directory with a `plan.md` file containing:

- **Overview** - What and why
- **Current State** - What's implemented, what's not
- **Requirements** - Detailed feature specifications
- **Technical Implementation** - Code examples, services, and data models
- **Implementation Checklist** - Phased breakdown with tasks
- **Success Criteria** - How to verify completion
- **Dependencies** - Prerequisites and related features

## Active Feature Plans

### High Priority

- [vat-handling/](./vat-handling/) - VAT/BTW compliance for NL tax requirements
- [mollie-invoicing/](./mollie-invoicing/) - Automated platform fee invoicing

### Medium Priority

- [platform-admin/](./platform-admin/) - Organization management for SuperAdmins
- [analytics-monitoring/](./analytics-monitoring/) - Business metrics and system health
- [ops-polish/](./ops-polish/) - Security, observability, and UX improvements

### Low Priority

- [platform-configuration/](./platform-configuration/) - Platform-level settings management

## How to Use These Plans

1. **Starting a new feature:**
   - Copy the template: `cp _TEMPLATE.md new-feature/plan.md`
   - Read the complete plan document
   - Check dependencies are met
   - Follow the implementation checklist sequentially
   - Update the plan if requirements change

2. **Resuming work:**
   - Check the checklist for completed items
   - Review "Current State" section
   - Continue from the next uncompleted phase

3. **Updating a plan:**
   - Keep "Current State" accurate
   - Mark checklist items as complete
   - Update effort estimates if needed
   - Document any deviations from the original plan

## Plan Format Standards

All plans follow this structure:

```markdown
# Feature Name

**Status:** 🟨 Planned / 🚧 In Progress / ✅ Complete
**Priority:** High / Medium / Low
**Estimated Effort:** X-Y hours (N-M days)

## Overview

Brief description and business context

## Current State

### ✅ Completed

- List of what's done

### ⬜ To Build

- List of what's needed

## Feature Requirements

Detailed specifications with examples

## Technical Implementation

Code examples, services, database schema

## Implementation Checklist

### Phase 1: Name (Day X)

- [ ] Task 1
- [ ] Task 2

## Success Criteria

- ✅ Measurable outcomes

## Dependencies

- Prerequisites

## Future Enhancements

- Post-MVP ideas
```

## Contributing

When creating a new feature plan:

1. Use the format above
2. Be specific about implementation details
3. Include code examples where helpful
4. Break work into manageable phases (1-2 days each)
5. Define clear success criteria
6. Link to related documentation

## Questions?

See the main [FEATURES.md](../../FEATURES.md) for high-level roadmap or [SPEC.md](../../SPEC.md) for business rules.
