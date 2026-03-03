/**
 * DATA QUERY INTERNAL
 *
 * Internal queries for the data query tool.
 * Separated to keep the tool file focused on definition + execution logic.
 *
 * SECURITY: All queries scoped by organizationId via index.
 */

import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

export interface OrgDataQueryScopeContract {
  contractVersion: "aoh_org_data_scope_v1";
  scopeType: "org";
  scopeOrganizationId: Id<"organizations">;
  objectType: string;
  enforcedBy: "objects.by_org_type";
}

export function buildOrgDataQueryScopeContract(args: {
  organizationId: Id<"organizations">;
  objectType: string;
}): OrgDataQueryScopeContract {
  return {
    contractVersion: "aoh_org_data_scope_v1",
    scopeType: "org",
    scopeOrganizationId: args.organizationId,
    objectType: args.objectType,
    enforcedBy: "objects.by_org_type",
  };
}

/**
 * Query objects by org + type
 * Returns all matching objects (filtering happens in the action layer)
 */
export const queryObjects = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    objectType: v.string(),
  },
  handler: async (ctx, args) => {
    const scopeContract = buildOrgDataQueryScopeContract({
      organizationId: args.organizationId,
      objectType: args.objectType,
    });
    const results = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", scopeContract.scopeOrganizationId)
          .eq("type", scopeContract.objectType)
      )
      .collect();

    return results;
  },
});
