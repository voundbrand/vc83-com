# Layer Scope Pattern

Reusable pattern for querying data across the 4-layer organization hierarchy.

## Hierarchy

```
L1 Platform
 └─ L2 Agency (top-level org, no parent)
     └─ L3 Client (sub-org, has parentOrganizationId)
         └─ L4 End-Customer (agent subtype context)
```

## Core Helper: `convex/lib/layerScope.ts`

### `getOrgIdsForScope(db, orgId, scope)`

Returns a list of `ScopedOrg` objects for the given scope.

| Scope | Behavior |
|-------|----------|
| `"org"` | Just the current org |
| `"layer"` | Current org + direct children (via `by_parent` index, capped at 20) |

Each `ScopedOrg` contains: `{ orgId, orgName, orgSlug, layer }`.

### `hasSubOrganizations(db, orgId)`

Lightweight boolean check using `.first()` — avoids loading all children.

### `determineOrgLayer(org)`

Simplified layer detection for org context (without agent subtype):
- No `parentOrganizationId` → L2 (Agency)
- Has `parentOrganizationId` → L3 (Client)

For agent-specific layer assignment (L1/L4), use `determineAgentLayer()` from `convex/ai/harness.ts`.

## Usage in Queries

```typescript
import { getOrgIdsForScope, type Scope } from "../lib/layerScope";

export const myQuery = query({
  args: {
    organizationId: v.id("organizations"),
    scope: v.optional(v.union(v.literal("org"), v.literal("layer"))),
  },
  handler: async (ctx, args) => {
    const scope: Scope = args.scope ?? "org";
    const orgs = await getOrgIdsForScope(ctx.db, args.organizationId, scope);

    for (const org of orgs) {
      // Query data for org.orgId
      // Tag results with org.orgName, org.orgSlug, org.layer
    }
  },
});
```

## Frontend Integration

1. Query `checkLayerScopeAvailable` to know if the toggle should be shown
2. Show `[org] [layer]` toggle buttons only when sub-orgs exist
3. In layer mode, show `LayerBadge` with layer number + org slug
4. Use layer colors: L1=#a855f7 (purple), L2=#3b82f6 (blue), L3=#22c55e (green), L4=#f59e0b (amber)

## Database Dependencies

- `organizations` table with `by_parent` index on `parentOrganizationId`
- `LAYER_NAMES` from `convex/ai/harness.ts`

## Files

| File | Purpose |
|------|---------|
| `convex/lib/layerScope.ts` | Core helper (getOrgIdsForScope, hasSubOrganizations) |
| `convex/terminal/terminalFeed.ts` | First consumer (layer-aware terminal feed) |
| `src/components/window-content/terminal-window.tsx` | Frontend scope toggle + layer badges |
