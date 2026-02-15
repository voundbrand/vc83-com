/**
 * LAYER SCOPE — Reusable Org Hierarchy Helper
 *
 * Provides helpers for querying data across the 4-layer org hierarchy:
 *   L1 Platform → L2 Agency → L3 Client → L4 End-Customer
 *
 * Usage:
 *   const orgs = await getOrgIdsForScope(ctx, orgId, "layer");
 *   // Returns current org + its children (capped at 20)
 *
 * See docs/patterns/LAYER-SCOPE-PATTERN.md for details.
 */

import type { GenericDatabaseReader } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import { LAYER_NAMES } from "../ai/harness";

export type Scope = "org" | "layer";

export interface ScopedOrg {
  orgId: Id<"organizations">;
  orgName: string;
  orgSlug: string;
  layer: 1 | 2 | 3 | 4;
}

const MAX_CHILD_ORGS = 20;

/**
 * Determine layer from org record.
 * No parent = L2 (Agency), has parent = L3 (Client).
 * L1 (Platform) and L4 (End-Customer) require agent subtype context
 * which is not available here — use determineAgentLayer() from harness.ts
 * for agent-specific layer assignment.
 */
export function determineOrgLayer(
  org: { parentOrganizationId?: Id<"organizations"> | null }
): 2 | 3 {
  return org.parentOrganizationId ? 3 : 2;
}

/**
 * Get org IDs for a given scope.
 *
 * scope="org"   → just the current org
 * scope="layer" → current org + its direct children via by_parent index (capped at 20)
 */
export async function getOrgIdsForScope(
  db: GenericDatabaseReader<DataModel>,
  orgId: Id<"organizations">,
  scope: Scope
): Promise<ScopedOrg[]> {
  const org = await db.get(orgId);
  if (!org) return [];

  const selfLayer = determineOrgLayer(org);
  const self: ScopedOrg = {
    orgId: org._id,
    orgName: org.name || "Unknown",
    orgSlug: org.slug || "",
    layer: selfLayer,
  };

  if (scope === "org") {
    return [self];
  }

  // scope === "layer": include children
  const children = await db
    .query("organizations")
    .withIndex("by_parent", (q) => q.eq("parentOrganizationId", orgId))
    .take(MAX_CHILD_ORGS);

  const childOrgs: ScopedOrg[] = children
    .filter((c) => c.isActive !== false)
    .map((c) => ({
      orgId: c._id,
      orgName: c.name || "Unknown",
      orgSlug: c.slug || "",
      layer: (selfLayer + 1) as 3 | 4,
    }));

  return [self, ...childOrgs];
}

/**
 * Lightweight check: does this org have any sub-organizations?
 * Uses .first() to avoid loading all children.
 */
export async function hasSubOrganizations(
  db: GenericDatabaseReader<DataModel>,
  orgId: Id<"organizations">
): Promise<boolean> {
  const first = await db
    .query("organizations")
    .withIndex("by_parent", (q) => q.eq("parentOrganizationId", orgId))
    .first();
  return first !== null;
}

// Re-export LAYER_NAMES for convenience
export { LAYER_NAMES };
