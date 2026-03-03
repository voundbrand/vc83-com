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

export interface ScopedOrgTargetInput {
  viewerOrganizationId: Id<"organizations">;
  requestedScope?: Scope;
  requestedScopeOrganizationId?: Id<"organizations">;
  allowCrossOrg: boolean;
}

export interface ScopedOrgTarget {
  scope: Scope;
  scopeOrganizationId: Id<"organizations">;
}

type TenantBoundaryOrganization = {
  _id: Id<"organizations">;
  parentOrganizationId?: Id<"organizations"> | null;
  customProperties?: Record<string, unknown> | null;
};

export type CrossOrgEnrichmentRequestReasonCode =
  | "allowed"
  | "workspace_not_personal"
  | "operator_identity_missing"
  | "viewer_membership_missing"
  | "opt_in_required";

export type CrossOrgEnrichmentCandidateReasonCode =
  | "allowed"
  | "same_org_excluded"
  | "candidate_inactive"
  | "candidate_personal_workspace"
  | "candidate_tenant_mismatch";

export interface CrossOrgEnrichmentRequestDecision {
  requested: boolean;
  allowed: boolean;
  reasonCode: CrossOrgEnrichmentRequestReasonCode;
}

export interface CrossOrgEnrichmentCandidateDecision {
  allowed: boolean;
  reasonCode: CrossOrgEnrichmentCandidateReasonCode;
}

export interface CrossOrgEnrichmentTelemetryLabels {
  contractVersion: "aoh_cross_org_enrichment_policy_v1";
  requested: boolean;
  allowed: boolean;
  denied: boolean;
  denialReasonCode?:
    | Exclude<CrossOrgEnrichmentRequestReasonCode, "allowed">
    | Exclude<CrossOrgEnrichmentCandidateReasonCode, "allowed">;
  candidateDecisionCodes: CrossOrgEnrichmentCandidateReasonCode[];
  scopeLabels: {
    viewerScopeOrg: "viewer_org";
    policyScopeOrg: "viewer_org";
  };
  orgLabels: {
    viewerOrg: "viewer_org";
    candidateOrgs: string[];
    viewerTenant: "viewer_tenant";
    candidateTenants: Array<"viewer_tenant" | "external_tenant">;
  };
}

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

export function resolveScopedOrgTarget(
  args: ScopedOrgTargetInput
): ScopedOrgTarget {
  const scopeOrganizationId =
    args.requestedScopeOrganizationId ?? args.viewerOrganizationId;

  if (
    !args.allowCrossOrg
    && scopeOrganizationId !== args.viewerOrganizationId
  ) {
    throw new Error(
      "Unauthorized: cross-org scope requires a super-admin session."
    );
  }

  return {
    scope: args.allowCrossOrg ? args.requestedScope ?? "org" : "org",
    scopeOrganizationId,
  };
}

export function resolveTenantBoundaryKey(
  organization: TenantBoundaryOrganization
): string {
  const tenantId = organization.customProperties?.tenantId;
  if (typeof tenantId === "string" && tenantId.trim().length > 0) {
    return `tenant:${tenantId.trim().toLowerCase()}`;
  }
  if (organization.parentOrganizationId) {
    return `parent:${String(organization.parentOrganizationId)}`;
  }
  return `org:${String(organization._id)}`;
}

export function resolveCrossOrgEnrichmentRequestDecision(args: {
  workspaceType: "personal" | "business";
  operatorUserIdResolved: boolean;
  hasActiveViewerMembership: boolean;
  optInEnabled: boolean;
}): CrossOrgEnrichmentRequestDecision {
  const requested = args.workspaceType === "personal";
  if (!requested) {
    return { requested, allowed: false, reasonCode: "workspace_not_personal" };
  }
  if (!args.operatorUserIdResolved) {
    return { requested, allowed: false, reasonCode: "operator_identity_missing" };
  }
  if (!args.hasActiveViewerMembership) {
    return { requested, allowed: false, reasonCode: "viewer_membership_missing" };
  }
  if (!args.optInEnabled) {
    return { requested, allowed: false, reasonCode: "opt_in_required" };
  }
  return { requested, allowed: true, reasonCode: "allowed" };
}

export function resolveCrossOrgEnrichmentCandidateDecision(args: {
  viewerOrganization: TenantBoundaryOrganization;
  candidateOrganization: TenantBoundaryOrganization;
  candidateIsActive: boolean;
  candidateIsPersonalWorkspace?: boolean;
}): CrossOrgEnrichmentCandidateDecision {
  if (args.candidateOrganization._id === args.viewerOrganization._id) {
    return { allowed: false, reasonCode: "same_org_excluded" };
  }
  if (!args.candidateIsActive) {
    return { allowed: false, reasonCode: "candidate_inactive" };
  }
  if (args.candidateIsPersonalWorkspace === true) {
    return { allowed: false, reasonCode: "candidate_personal_workspace" };
  }
  const viewerTenant = resolveTenantBoundaryKey(args.viewerOrganization);
  const candidateTenant = resolveTenantBoundaryKey(args.candidateOrganization);
  if (viewerTenant !== candidateTenant) {
    return { allowed: false, reasonCode: "candidate_tenant_mismatch" };
  }
  return { allowed: true, reasonCode: "allowed" };
}

export function buildCrossOrgEnrichmentTelemetryLabels(args: {
  requestDecision: CrossOrgEnrichmentRequestDecision;
  viewerOrganization: TenantBoundaryOrganization;
  candidateOrganizations: TenantBoundaryOrganization[];
  candidateDecisions?: CrossOrgEnrichmentCandidateDecision[];
}): CrossOrgEnrichmentTelemetryLabels {
  const viewerTenant = resolveTenantBoundaryKey(args.viewerOrganization);
  const candidateOrganizations = [...args.candidateOrganizations].sort((left, right) =>
    String(left._id).localeCompare(String(right._id))
  );
  const candidateOrgs = candidateOrganizations.map((_, index) => `candidate_org_${index + 1}`);
  const candidateTenants = candidateOrganizations.map((candidate) =>
    resolveTenantBoundaryKey(candidate) === viewerTenant ? "viewer_tenant" : "external_tenant"
  );
  const candidateDecisionCodes = args.candidateDecisions
    ? args.candidateDecisions.map((decision) => decision.reasonCode).sort((left, right) =>
        left.localeCompare(right)
      )
    : [];
  const hasAllowedCandidate = args.candidateDecisions
    ? args.candidateDecisions.some((decision) => decision.allowed)
    : false;
  const requestDenied =
    args.requestDecision.reasonCode === "allowed"
      ? undefined
      : args.requestDecision.reasonCode;
  const candidateDenied = args.requestDecision.allowed && args.candidateDecisions
    ? candidateDecisionCodes.find((reasonCode) => reasonCode !== "allowed")
    : undefined;
  const allowed = args.requestDecision.allowed && (
    args.candidateDecisions ? hasAllowedCandidate : true
  );

  return {
    contractVersion: "aoh_cross_org_enrichment_policy_v1",
    requested: args.requestDecision.requested,
    allowed,
    denied: !allowed,
    denialReasonCode: requestDenied ?? candidateDenied,
    candidateDecisionCodes,
    scopeLabels: {
      viewerScopeOrg: "viewer_org",
      policyScopeOrg: "viewer_org",
    },
    orgLabels: {
      viewerOrg: "viewer_org",
      candidateOrgs,
      viewerTenant: "viewer_tenant",
      candidateTenants,
    },
  };
}

// Re-export LAYER_NAMES for convenience
export { LAYER_NAMES };
