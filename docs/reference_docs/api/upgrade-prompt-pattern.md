# Upgrade Prompt Pattern - License Enforcement

This document describes the universal pattern for enforcing licensing limits across all apps in the platform.

## Overview

When users hit their tier limits (e.g., 100 contacts for Free tier), they see a friendly upgrade prompt with a direct link to the Store window, rather than a generic error message.

## Architecture

### 1. Backend: License Enforcement

**Location**: `convex/licensing/helpers.ts`

The `checkResourceLimit()` function automatically:
- Checks the organization's current tier
- Counts existing resources
- Throws a formatted error if limit is reached

**Error Format:**
```
"You've reached your {limitKey} limit ({limit}). Upgrade to {NextTier} for more capacity."
```

### 2. Frontend: Upgrade Prompt Component

**Location**: `src/components/ui/upgrade-prompt.tsx`

Reusable component that displays:
- Clear message about the limit
- Current usage vs. limit
- Recommended upgrade tier with pricing
- "View Upgrade Options" button (opens Store window)
- "Contact your admin" hint for non-billing users

## Implementation Guide

### Step 1: Add Backend Limit Check

In your Convex mutation (e.g., `createContact`, `createProject`), add the license check:

```typescript
import { checkResourceLimit } from "./licensing/helpers";

export const createResource = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // CHECK LICENSE LIMIT before creating resource
    await checkResourceLimit(
      ctx,
      args.organizationId,
      "resource_type",      // e.g., "crm_contact", "project", "workflow"
      "maxResourceLimit"     // e.g., "maxContacts", "maxProjects", "maxWorkflows"
    );

    // Continue with creation...
  }
});
```

**Resource Types and Limit Keys:**

| Resource Type | Limit Key | Free Tier | Starter | Pro | Agency | Enterprise |
|---------------|-----------|-----------|---------|-----|--------|------------|
| `crm_contact` | `maxContacts` | 100 | 1,000 | 5,000 | 10,000 | Unlimited |
| `crm_organization` | `maxOrganizations` | 10 | 50 | 200 | 500 | Unlimited |
| `project` | `maxProjects` | 3 | 20 | Unlimited | Unlimited | Unlimited |
| `event` | `maxEvents` | 3 | 20 | 100 | Unlimited | Unlimited |
| `product` | `maxProducts` | 5 | 50 | 200 | Unlimited | Unlimited |
| `form` | `maxForms` | 3 | 20 | 100 | Unlimited | Unlimited |
| `checkout_instance` | `maxCheckoutInstances` | 1 | 5 | 20 | 100 | Unlimited |
| `workflow` | `maxWorkflows` | 2 | 10 | 50 | Unlimited | Unlimited |

### Step 2: Handle Errors in Frontend

In your React component, catch the limit error and show the upgrade prompt:

```tsx
import { UpgradePrompt, parseLimitError } from "@/components/ui/upgrade-prompt";
import { useState } from "react";

function MyComponent() {
  const [limitError, setLimitError] = useState<ReturnType<typeof parseLimitError>>(null);

  const handleCreate = async () => {
    try {
      await createResource({ /* ... */ });
    } catch (error) {
      const parsed = parseLimitError(error);
      if (parsed) {
        setLimitError(parsed);
        return;
      }
      // Handle other errors...
    }
  };

  if (limitError) {
    return <UpgradePrompt {...limitError} />;
  }

  // Normal UI...
}
```

### Step 3: Alternative - Manual Upgrade Prompt

If you want custom styling or messages:

```tsx
import { UpgradePrompt } from "@/components/ui/upgrade-prompt";

<UpgradePrompt
  resource="contacts"
  current={100}
  limit={100}
  upgradeTier="Starter (€199/month)"
  message="You've reached your contact limit. Upgrade for more capacity!"
  size="md"
/>
```

## Examples by App

### CRM App
```typescript
// convex/crmOntology.ts:202
await checkResourceLimit(ctx, args.organizationId, "crm_contact", "maxContacts");
```

### Projects App
```typescript
// convex/projectOntology.ts:132-134
await checkResourceLimit(ctx, args.organizationId, "project", "maxProjects");
```

### Events App
```typescript
// convex/eventOntology.ts:110-112
await checkResourceLimit(ctx, args.organizationId, "event", "maxEvents");
```

### Products App
```typescript
// convex/productOntology.ts:327-329
await checkResourceLimit(ctx, args.organizationId, "product", "maxProducts");
```

### Forms App
```typescript
// convex/formsOntology.ts:224-226
await checkResourceLimit(ctx, args.organizationId, "form", "maxForms");
```

### Checkout App
```typescript
// convex/checkoutOntology.ts:149-151
await checkResourceLimit(ctx, args.organizationId, "checkout_instance", "maxCheckoutInstances");
```

### Workflows App
```typescript
// convex/workflows/workflowOntology.ts:331-338
await checkResourceLimit(ctx, args.organizationId, "workflow", "maxWorkflows");
```

## User Experience Flow

1. **User tries to create resource** (e.g., 101st contact on Free tier)
2. **Backend checks license** via `checkResourceLimit()`
3. **Limit exceeded** → Backend throws formatted error
4. **Frontend catches error** → Parses with `parseLimitError()`
5. **UpgradePrompt shown** → User sees friendly message
6. **User clicks "View Upgrade Options"** → Store window opens
7. **User can upgrade** or contact admin

## Benefits

✅ **Consistent UX**: All apps show the same upgrade prompts
✅ **Clear messaging**: Users know exactly what's limited and how to upgrade
✅ **Direct conversion**: One click to Store window
✅ **No breaking errors**: Graceful handling prevents broken UI
✅ **Tier-aware**: Automatically suggests next tier based on licensing matrix

## Adding New Limits

To add a new resource limit:

1. **Update `tierConfigs.ts`**: Add `maxYourResource` to limits
2. **Update backend mutation**: Add `checkResourceLimit()` call
3. **Frontend handles automatically**: `parseLimitError()` extracts all info
4. **Test**: Create resources up to limit, verify prompt on limit+1

## Testing Checklist

For each app with limits:

- [ ] Create resources up to free tier limit (should work)
- [ ] Try to create one more (should show upgrade prompt)
- [ ] Click "View Upgrade Options" (should open Store window)
- [ ] Verify message mentions correct tier and pricing
- [ ] Verify current count and limit are accurate
- [ ] Test with different roles (billing access vs. member)

## Files Modified

### Backend:
- `convex/licensing/tierConfigs.ts` - Tier definitions
- `convex/licensing/helpers.ts` - License checking functions
- `convex/crmOntology.ts` - CRM limits
- `convex/projectOntology.ts` - Project limits
- `convex/eventOntology.ts` - Event limits
- `convex/productOntology.ts` - Product limits
- `convex/formsOntology.ts` - Form limits
- `convex/checkoutOntology.ts` - Checkout limits
- `convex/workflows/workflowOntology.ts` - Workflow limits

### Frontend:
- `src/components/ui/upgrade-prompt.tsx` - Reusable upgrade prompt component

## Next Steps

### Future Enhancements:
1. Add monthly limits (invoices, emails)
2. Track usage dashboards per tier
3. Proactive upgrade prompts (80% of limit)
4. Custom upgrade CTAs per resource
5. A/B test upgrade messaging

## License Matrix Source of Truth

All limits are defined in:
- **Code**: `convex/licensing/tierConfigs.ts`
- **Docs**: `.kiro/starter_onboarding_flow/LICENSING-ENFORCEMENT-MATRIX.md`

These must stay in sync!
