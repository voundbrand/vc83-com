import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { type Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getUserContext, requireAuthenticatedUser } from "./rbacHelpers";
import {
  COMPLIANCE_EVIDENCE_OBJECT_TYPE,
  mapEvidenceObjectToRow,
  type ComplianceEvidenceVaultRow,
} from "./complianceEvidenceVault";
import { resolvePlatformOrgIdFromEnv } from "./lib/platformOrg";

export const COMPLIANCE_SECURITY_WORKFLOW_OBJECT_TYPE = "compliance_security_workflow";
export const COMPLIANCE_SECURITY_WORKFLOW_OBJECT_SUBTYPE = "r004_security_controls";
const SECURITY_REVALIDATION_ALERT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const SECURITY_REVALIDATION_SCHEDULER_CADENCE_MS = 24 * 60 * 60 * 1000;

type SecurityWorkflowState = "draft" | "ready_for_review" | "blocked";
type SecurityArtifactId =
  | "rbac_evidence"
  | "mfa_evidence"
  | "encryption_evidence"
  | "tenant_isolation_evidence"
  | "key_rotation_evidence";

type OrgAccessContext = {
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  isSuperAdmin: boolean;
  isOrgOwner: boolean;
  isPlatformOrg: boolean;
};

function hasSecurityWorkflowMutationAuthority(access: OrgAccessContext): boolean {
  return access.isOrgOwner || (access.isSuperAdmin && access.isPlatformOrg);
}

export type SecurityWorkflowArtifactStatus = {
  artifactId: SecurityArtifactId;
  label: string;
  provided: boolean;
  reference: string | null;
  blockerReason: string | null;
};

export type SecurityWorkflowCompleteness = {
  completenessScore: number;
  isComplete: boolean;
  missingArtifactIds: SecurityArtifactId[];
  blockers: string[];
  artifactStatus: SecurityWorkflowArtifactStatus[];
};

export type SecurityWorkflowRow = {
  workflowObjectId: Id<"objects">;
  organizationId: Id<"organizations">;
  actionId: string | null;
  rbacEvidenceRef: string | null;
  mfaEvidenceRef: string | null;
  encryptionEvidenceRef: string | null;
  tenantIsolationEvidenceRef: string | null;
  keyRotationEvidenceRef: string | null;
  notes: string | null;
  revalidationBlockingWarnings: string[];
  revalidationAdvisoryWarnings: string[];
  revalidationLastCheckedAt: number | null;
  revalidationNextCheckAt: number | null;
  state: SecurityWorkflowState;
  completeness: SecurityWorkflowCompleteness;
  updatedAt: number;
  createdAt: number;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const dedupe = new Set<string>();
  for (const entry of value) {
    const normalized = normalizeString(entry);
    if (!normalized) {
      continue;
    }
    dedupe.add(normalized);
  }
  return Array.from(dedupe).sort((left, right) => left.localeCompare(right));
}

function arrayEquals(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  const compacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== "undefined") {
      compacted[key] = value;
    }
  }
  return compacted;
}

async function getMembershipRoleName(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">,
): Promise<string | null> {
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q) => q.eq("userId", userId).eq("organizationId", organizationId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();
  if (!membership) {
    return null;
  }
  const role = await ctx.db.get(membership.role);
  return role?.name ?? null;
}

async function resolveOrgAccessContext(
  ctx: QueryCtx | MutationCtx,
  args: {
    sessionId: string;
    organizationId?: Id<"organizations">;
  },
): Promise<OrgAccessContext> {
  const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
  const organizationId = args.organizationId ?? authenticated.organizationId;
  const userContext = await getUserContext(ctx, authenticated.userId, organizationId);
  const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";
  const platformOrgId = resolvePlatformOrgIdFromEnv();
  const isPlatformOrg = Boolean(
    platformOrgId
    && String(platformOrgId) === String(organizationId),
  );
  if (!isSuperAdmin && authenticated.organizationId !== organizationId) {
    throw new Error("Cross-organization security workflow access is not allowed.");
  }
  const roleName = await getMembershipRoleName(ctx, authenticated.userId, organizationId);
  const isOrgOwner = roleName === "org_owner";
  if (!isOrgOwner && !isSuperAdmin) {
    throw new Error("Only organization owners or super admins can access security workflow.");
  }

  return {
    organizationId,
    userId: authenticated.userId,
    isSuperAdmin,
    isOrgOwner,
    isPlatformOrg,
  };
}

export function buildSecurityWorkflowArtifactMatrix(args: {
  rbacEvidenceRef?: string | null;
  mfaEvidenceRef?: string | null;
  encryptionEvidenceRef?: string | null;
  tenantIsolationEvidenceRef?: string | null;
  keyRotationEvidenceRef?: string | null;
}): SecurityWorkflowArtifactStatus[] {
  const rbacEvidenceRef = normalizeString(args.rbacEvidenceRef);
  const mfaEvidenceRef = normalizeString(args.mfaEvidenceRef);
  const encryptionEvidenceRef = normalizeString(args.encryptionEvidenceRef);
  const tenantIsolationEvidenceRef = normalizeString(args.tenantIsolationEvidenceRef);
  const keyRotationEvidenceRef = normalizeString(args.keyRotationEvidenceRef);

  return [
    {
      artifactId: "rbac_evidence",
      label: "RBAC evidence",
      provided: rbacEvidenceRef !== null,
      reference: rbacEvidenceRef,
      blockerReason: rbacEvidenceRef ? null : "rbac_evidence_required",
    },
    {
      artifactId: "mfa_evidence",
      label: "MFA evidence",
      provided: mfaEvidenceRef !== null,
      reference: mfaEvidenceRef,
      blockerReason: mfaEvidenceRef ? null : "mfa_evidence_required",
    },
    {
      artifactId: "encryption_evidence",
      label: "Encryption evidence",
      provided: encryptionEvidenceRef !== null,
      reference: encryptionEvidenceRef,
      blockerReason: encryptionEvidenceRef ? null : "encryption_evidence_required",
    },
    {
      artifactId: "tenant_isolation_evidence",
      label: "Tenant isolation evidence",
      provided: tenantIsolationEvidenceRef !== null,
      reference: tenantIsolationEvidenceRef,
      blockerReason: tenantIsolationEvidenceRef ? null : "tenant_isolation_evidence_required",
    },
    {
      artifactId: "key_rotation_evidence",
      label: "Key rotation evidence",
      provided: keyRotationEvidenceRef !== null,
      reference: keyRotationEvidenceRef,
      blockerReason: keyRotationEvidenceRef ? null : "key_rotation_evidence_required",
    },
  ];
}

export function computeSecurityWorkflowCompleteness(args: {
  rbacEvidenceRef?: string | null;
  mfaEvidenceRef?: string | null;
  encryptionEvidenceRef?: string | null;
  tenantIsolationEvidenceRef?: string | null;
  keyRotationEvidenceRef?: string | null;
}): SecurityWorkflowCompleteness {
  const artifactStatus = buildSecurityWorkflowArtifactMatrix(args);
  const missingArtifactIds = artifactStatus
    .filter((artifact) => !artifact.provided)
    .map((artifact) => artifact.artifactId);
  const blockers = artifactStatus
    .map((artifact) => artifact.blockerReason)
    .filter((reason): reason is string => Boolean(reason));
  const providedCount = artifactStatus.filter((artifact) => artifact.provided).length;
  const completenessScore = Math.floor((providedCount / artifactStatus.length) * 100);
  const isComplete = blockers.length === 0;

  return {
    completenessScore,
    isComplete,
    missingArtifactIds,
    blockers,
    artifactStatus,
  };
}

export type SecurityWorkflowRevalidationWarnings = {
  blockingWarnings: string[];
  advisoryWarnings: string[];
  missingReferenceIds: string[];
  evaluatedReferenceIds: string[];
};

export function computeSecurityWorkflowRevalidationWarnings(args: {
  now: number;
  rbacEvidenceRef?: string | null;
  mfaEvidenceRef?: string | null;
  encryptionEvidenceRef?: string | null;
  tenantIsolationEvidenceRef?: string | null;
  keyRotationEvidenceRef?: string | null;
  evidenceRows: ComplianceEvidenceVaultRow[];
  alertWindowMs?: number;
}): SecurityWorkflowRevalidationWarnings {
  const alertWindowMs =
    typeof args.alertWindowMs === "number" && Number.isFinite(args.alertWindowMs) && args.alertWindowMs > 0
      ? args.alertWindowMs
      : SECURITY_REVALIDATION_ALERT_WINDOW_MS;
  const referenceIds = [
    normalizeString(args.rbacEvidenceRef),
    normalizeString(args.mfaEvidenceRef),
    normalizeString(args.encryptionEvidenceRef),
    normalizeString(args.tenantIsolationEvidenceRef),
    normalizeString(args.keyRotationEvidenceRef),
  ]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((left, right) => left.localeCompare(right));

  const evidenceById = new Map<string, ComplianceEvidenceVaultRow>(
    args.evidenceRows.map((row) => [String(row.evidenceObjectId), row]),
  );
  const blockingWarnings = new Set<string>();
  const advisoryWarnings = new Set<string>();
  const missingReferenceIds: string[] = [];

  for (const referenceId of referenceIds) {
    const evidenceRow = evidenceById.get(referenceId);
    if (!evidenceRow) {
      missingReferenceIds.push(referenceId);
      continue;
    }
    if (!evidenceRow.contractValid || evidenceRow.lifecycleStatus !== "active") {
      blockingWarnings.add("security_revalidation_evidence_invalid");
      continue;
    }

    const nextReviewAt =
      typeof evidenceRow.nextReviewAt === "number" && Number.isFinite(evidenceRow.nextReviewAt)
        ? evidenceRow.nextReviewAt
        : null;
    const retentionDeleteAt =
      typeof evidenceRow.retentionDeleteAt === "number" && Number.isFinite(evidenceRow.retentionDeleteAt)
        ? evidenceRow.retentionDeleteAt
        : null;
    if (nextReviewAt === null || retentionDeleteAt === null) {
      blockingWarnings.add("security_revalidation_evidence_invalid");
      continue;
    }

    if (nextReviewAt <= args.now) {
      blockingWarnings.add("security_revalidation_review_overdue");
    } else if (nextReviewAt <= args.now + alertWindowMs) {
      advisoryWarnings.add("security_revalidation_review_due_soon");
    }

    if (retentionDeleteAt <= args.now) {
      blockingWarnings.add("security_revalidation_retention_expired");
    } else if (retentionDeleteAt <= args.now + alertWindowMs) {
      advisoryWarnings.add("security_revalidation_retention_expiring_soon");
    }
  }

  if (missingReferenceIds.length > 0) {
    blockingWarnings.add("security_revalidation_reference_missing");
  }

  return {
    blockingWarnings: Array.from(blockingWarnings).sort((left, right) => left.localeCompare(right)),
    advisoryWarnings: Array.from(advisoryWarnings).sort((left, right) => left.localeCompare(right)),
    missingReferenceIds,
    evaluatedReferenceIds: referenceIds,
  };
}

function resolveSecurityWorkflowState(completeness: SecurityWorkflowCompleteness): SecurityWorkflowState {
  if (completeness.isComplete) {
    return "ready_for_review";
  }
  if (completeness.completenessScore === 0) {
    return "draft";
  }
  return "blocked";
}

function mapSecurityWorkflowObjectToRow(workflowObject: Doc<"objects">): SecurityWorkflowRow {
  const props = asRecord(workflowObject.customProperties);
  const rbacEvidenceRef = normalizeString(props.rbacEvidenceRef);
  const mfaEvidenceRef = normalizeString(props.mfaEvidenceRef);
  const encryptionEvidenceRef = normalizeString(props.encryptionEvidenceRef);
  const tenantIsolationEvidenceRef = normalizeString(props.tenantIsolationEvidenceRef);
  const keyRotationEvidenceRef = normalizeString(props.keyRotationEvidenceRef);
  const notes = normalizeString(props.notes);
  const completeness = computeSecurityWorkflowCompleteness({
    rbacEvidenceRef,
    mfaEvidenceRef,
    encryptionEvidenceRef,
    tenantIsolationEvidenceRef,
    keyRotationEvidenceRef,
  });
  const stateRaw = normalizeString(workflowObject.status);
  const state: SecurityWorkflowState =
    stateRaw === "ready_for_review" || stateRaw === "blocked" || stateRaw === "draft"
      ? stateRaw
      : resolveSecurityWorkflowState(completeness);

  return {
    workflowObjectId: workflowObject._id,
    organizationId: workflowObject.organizationId,
    actionId: normalizeString(props.actionId),
    rbacEvidenceRef,
    mfaEvidenceRef,
    encryptionEvidenceRef,
    tenantIsolationEvidenceRef,
    keyRotationEvidenceRef,
    notes,
    revalidationBlockingWarnings: normalizeStringList(props.revalidationBlockingWarnings),
    revalidationAdvisoryWarnings: normalizeStringList(props.revalidationAdvisoryWarnings),
    revalidationLastCheckedAt: normalizeTimestamp(props.revalidationLastCheckedAt),
    revalidationNextCheckAt: normalizeTimestamp(props.revalidationNextCheckAt),
    state,
    completeness,
    updatedAt: workflowObject.updatedAt,
    createdAt: workflowObject.createdAt,
  };
}

async function findSecurityWorkflowObject(args: {
  ctx: QueryCtx | MutationCtx;
  organizationId: Id<"organizations">;
  workflowObjectId?: Id<"objects">;
  actionId?: string;
}): Promise<Doc<"objects"> | null> {
  if (args.workflowObjectId) {
    const direct = await args.ctx.db.get(args.workflowObjectId);
    if (
      direct
      && direct.type === COMPLIANCE_SECURITY_WORKFLOW_OBJECT_TYPE
      && direct.subtype === COMPLIANCE_SECURITY_WORKFLOW_OBJECT_SUBTYPE
      && String(direct.organizationId) === String(args.organizationId)
    ) {
      return direct;
    }
    return null;
  }

  const candidates = await args.ctx.db
    .query("objects")
    .withIndex("by_org_type_subtype", (q) =>
      q.eq("organizationId", args.organizationId)
        .eq("type", COMPLIANCE_SECURITY_WORKFLOW_OBJECT_TYPE)
        .eq("subtype", COMPLIANCE_SECURITY_WORKFLOW_OBJECT_SUBTYPE),
    )
    .collect();
  const normalizedActionId = normalizeString(args.actionId);
  if (!normalizedActionId) {
    return candidates.sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null;
  }
  const matched = candidates
    .filter((candidate) => normalizeString(asRecord(candidate.customProperties).actionId) === normalizedActionId)
    .sort((left, right) => right.updatedAt - left.updatedAt);
  return matched[0] ?? null;
}

async function persistSecurityWorkflowRecord(args: {
  ctx: MutationCtx;
  access: OrgAccessContext;
  workflowObjectId?: Id<"objects">;
  actionId?: string;
  rbacEvidenceRef?: string | null;
  mfaEvidenceRef?: string | null;
  encryptionEvidenceRef?: string | null;
  tenantIsolationEvidenceRef?: string | null;
  keyRotationEvidenceRef?: string | null;
  notes?: string | null;
  actionType: string;
}): Promise<SecurityWorkflowRow> {
  const now = Date.now();
  const completeness = computeSecurityWorkflowCompleteness({
    rbacEvidenceRef: args.rbacEvidenceRef,
    mfaEvidenceRef: args.mfaEvidenceRef,
    encryptionEvidenceRef: args.encryptionEvidenceRef,
    tenantIsolationEvidenceRef: args.tenantIsolationEvidenceRef,
    keyRotationEvidenceRef: args.keyRotationEvidenceRef,
  });
  const state = resolveSecurityWorkflowState(completeness);
  const customProperties = compactRecord({
    actionId: normalizeString(args.actionId) ?? undefined,
    rbacEvidenceRef: normalizeString(args.rbacEvidenceRef) ?? undefined,
    mfaEvidenceRef: normalizeString(args.mfaEvidenceRef) ?? undefined,
    encryptionEvidenceRef: normalizeString(args.encryptionEvidenceRef) ?? undefined,
    tenantIsolationEvidenceRef: normalizeString(args.tenantIsolationEvidenceRef) ?? undefined,
    keyRotationEvidenceRef: normalizeString(args.keyRotationEvidenceRef) ?? undefined,
    notes: normalizeString(args.notes) ?? undefined,
    completenessScore: completeness.completenessScore,
    missingArtifactIds: completeness.missingArtifactIds,
    blockers: completeness.blockers,
    updatedBy: String(args.access.userId),
    updatedAt: now,
  });

  const existing = await findSecurityWorkflowObject({
    ctx: args.ctx,
    organizationId: args.access.organizationId,
    workflowObjectId: args.workflowObjectId,
    actionId: args.actionId,
  });

  let workflowObjectId: Id<"objects">;
  if (existing) {
    await args.ctx.db.patch(existing._id, {
      status: state,
      customProperties: compactRecord({
        ...asRecord(existing.customProperties),
        ...customProperties,
      }),
      updatedAt: now,
    });
    workflowObjectId = existing._id;
  } else {
    workflowObjectId = await args.ctx.db.insert("objects", {
      organizationId: args.access.organizationId,
      type: COMPLIANCE_SECURITY_WORKFLOW_OBJECT_TYPE,
      subtype: COMPLIANCE_SECURITY_WORKFLOW_OBJECT_SUBTYPE,
      name: "Security completeness workflow",
      description: "R-004 security controls workflow draft",
      status: state,
      customProperties: compactRecord({
        ...customProperties,
        createdBy: String(args.access.userId),
        createdAt: now,
      }),
      createdBy: args.access.userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  await args.ctx.db.insert("objectActions", {
    organizationId: args.access.organizationId,
    objectId: workflowObjectId,
    actionType: args.actionType,
    actionData: compactRecord({
      actionId: normalizeString(args.actionId) ?? undefined,
      completenessScore: completeness.completenessScore,
      missingArtifactIds: completeness.missingArtifactIds,
      blockers: completeness.blockers,
      state,
    }),
    performedBy: args.access.userId,
    performedAt: now,
  });

  const workflowObject = await args.ctx.db.get(workflowObjectId);
  if (!workflowObject) {
    throw new Error("Security workflow write failed.");
  }
  return mapSecurityWorkflowObjectToRow(workflowObject);
}

export const getSecurityWorkflowDraft = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    workflowObjectId: v.optional(v.id("objects")),
    actionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveOrgAccessContext(ctx, args);
    const workflowObject = await findSecurityWorkflowObject({
      ctx,
      organizationId: access.organizationId,
      workflowObjectId: args.workflowObjectId,
      actionId: args.actionId,
    });
    if (!workflowObject) {
      return null;
    }
    return mapSecurityWorkflowObjectToRow(workflowObject);
  },
});

export const saveSecurityWorkflowDraft = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    workflowObjectId: v.optional(v.id("objects")),
    actionId: v.optional(v.string()),
    rbacEvidenceRef: v.optional(v.string()),
    mfaEvidenceRef: v.optional(v.string()),
    encryptionEvidenceRef: v.optional(v.string()),
    tenantIsolationEvidenceRef: v.optional(v.string()),
    keyRotationEvidenceRef: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveOrgAccessContext(ctx, args);
    if (!hasSecurityWorkflowMutationAuthority(access)) {
      throw new Error(
        "Only organization owners, or super-admin on the configured platform org, can save security workflow drafts.",
      );
    }

    return await persistSecurityWorkflowRecord({
      ctx,
      access,
      workflowObjectId: args.workflowObjectId,
      actionId: args.actionId,
      rbacEvidenceRef: args.rbacEvidenceRef,
      mfaEvidenceRef: args.mfaEvidenceRef,
      encryptionEvidenceRef: args.encryptionEvidenceRef,
      tenantIsolationEvidenceRef: args.tenantIsolationEvidenceRef,
      keyRotationEvidenceRef: args.keyRotationEvidenceRef,
      notes: args.notes,
      actionType: "compliance_security_workflow_saved",
    });
  },
});

export const completeSecurityWorkflowChecklist = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    workflowObjectId: v.optional(v.id("objects")),
    actionId: v.optional(v.string()),
    rbacEvidenceRef: v.string(),
    mfaEvidenceRef: v.string(),
    encryptionEvidenceRef: v.string(),
    tenantIsolationEvidenceRef: v.string(),
    keyRotationEvidenceRef: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveOrgAccessContext(ctx, args);
    if (!hasSecurityWorkflowMutationAuthority(access)) {
      throw new Error(
        "Only organization owners, or super-admin on the configured platform org, can complete security workflow checklists.",
      );
    }
    const result = await persistSecurityWorkflowRecord({
      ctx,
      access,
      workflowObjectId: args.workflowObjectId,
      actionId: args.actionId,
      rbacEvidenceRef: args.rbacEvidenceRef,
      mfaEvidenceRef: args.mfaEvidenceRef,
      encryptionEvidenceRef: args.encryptionEvidenceRef,
      tenantIsolationEvidenceRef: args.tenantIsolationEvidenceRef,
      keyRotationEvidenceRef: args.keyRotationEvidenceRef,
      notes: args.notes,
      actionType: "compliance_security_workflow_saved",
    });

    const now = Date.now();
    await ctx.db.insert("objectActions", {
      organizationId: access.organizationId,
      objectId: result.workflowObjectId,
      actionType: "compliance_security_workflow_completed",
      actionData: compactRecord({
        actionId: normalizeString(args.actionId) ?? undefined,
        completenessScore: result.completeness.completenessScore,
        blockers: result.completeness.blockers,
        failClosed: !result.completeness.isComplete,
      }),
      performedBy: access.userId,
      performedAt: now,
    });

    return {
      ...result,
      failClosed: !result.completeness.isComplete,
      completedAt: now,
    };
  },
});

export const refreshSecurityWorkflowRevalidationWarningsInternal = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit =
      typeof args.limit === "number" && Number.isFinite(args.limit) && args.limit > 0
        ? Math.floor(args.limit)
        : 500;

    const workflowObjects = await ctx.db
      .query("objects")
      .withIndex("by_type_subtype", (q) =>
        q.eq("type", COMPLIANCE_SECURITY_WORKFLOW_OBJECT_TYPE)
          .eq("subtype", COMPLIANCE_SECURITY_WORKFLOW_OBJECT_SUBTYPE),
      )
      .collect();
    const targetWorkflowObjects = [...workflowObjects]
      .sort((left, right) => {
        if (left.updatedAt !== right.updatedAt) {
          return left.updatedAt - right.updatedAt;
        }
        return String(left._id).localeCompare(String(right._id));
      })
      .slice(0, limit);

    const evidenceObjects = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE))
      .collect();
    const evidenceRowsByOrg = new Map<string, ComplianceEvidenceVaultRow[]>();
    for (const evidenceObject of evidenceObjects) {
      const mappedRow = mapEvidenceObjectToRow(evidenceObject);
      const orgKey = String(mappedRow.organizationId);
      const existing = evidenceRowsByOrg.get(orgKey) ?? [];
      existing.push(mappedRow);
      evidenceRowsByOrg.set(orgKey, existing);
    }

    let updatedCount = 0;
    let warningChangedCount = 0;
    let skippedNotDueCount = 0;
    let blockingWorkflowCount = 0;

    for (const workflowObject of targetWorkflowObjects) {
      const props = asRecord(workflowObject.customProperties);
      const nextCheckAt = normalizeTimestamp(props.revalidationNextCheckAt);
      if (nextCheckAt !== null && nextCheckAt > now) {
        skippedNotDueCount += 1;
        continue;
      }

      const workflowRow = mapSecurityWorkflowObjectToRow(workflowObject);
      const warnings = computeSecurityWorkflowRevalidationWarnings({
        now,
        rbacEvidenceRef: workflowRow.rbacEvidenceRef,
        mfaEvidenceRef: workflowRow.mfaEvidenceRef,
        encryptionEvidenceRef: workflowRow.encryptionEvidenceRef,
        tenantIsolationEvidenceRef: workflowRow.tenantIsolationEvidenceRef,
        keyRotationEvidenceRef: workflowRow.keyRotationEvidenceRef,
        evidenceRows: evidenceRowsByOrg.get(String(workflowObject.organizationId)) ?? [],
      });
      if (warnings.blockingWarnings.length > 0) {
        blockingWorkflowCount += 1;
      }

      const previousBlockingWarnings = normalizeStringList(props.revalidationBlockingWarnings);
      const previousAdvisoryWarnings = normalizeStringList(props.revalidationAdvisoryWarnings);
      const warningChanged =
        !arrayEquals(previousBlockingWarnings, warnings.blockingWarnings)
        || !arrayEquals(previousAdvisoryWarnings, warnings.advisoryWarnings);

      await ctx.db.patch(workflowObject._id, {
        customProperties: compactRecord({
          ...props,
          revalidationBlockingWarnings:
            warnings.blockingWarnings.length > 0 ? warnings.blockingWarnings : undefined,
          revalidationAdvisoryWarnings:
            warnings.advisoryWarnings.length > 0 ? warnings.advisoryWarnings : undefined,
          revalidationMissingReferenceIds:
            warnings.missingReferenceIds.length > 0 ? warnings.missingReferenceIds : undefined,
          revalidationEvaluatedReferenceIds:
            warnings.evaluatedReferenceIds.length > 0 ? warnings.evaluatedReferenceIds : undefined,
          revalidationLastCheckedAt: now,
          revalidationNextCheckAt: now + SECURITY_REVALIDATION_SCHEDULER_CADENCE_MS,
        }),
        updatedAt: now,
      });
      updatedCount += 1;

      if (warningChanged) {
        warningChangedCount += 1;
        await ctx.db.insert("objectActions", {
          organizationId: workflowObject.organizationId,
          objectId: workflowObject._id,
          actionType: "compliance_security_revalidation_warnings_updated",
          actionData: compactRecord({
            blockingWarnings: warnings.blockingWarnings,
            advisoryWarnings: warnings.advisoryWarnings,
            missingReferenceIds: warnings.missingReferenceIds,
            evaluatedReferenceIds: warnings.evaluatedReferenceIds,
          }),
          performedAt: now,
        });
      }
    }

    return {
      success: true,
      scannedCount: targetWorkflowObjects.length,
      updatedCount,
      warningChangedCount,
      skippedNotDueCount,
      blockingWorkflowCount,
      processedAt: now,
    };
  },
});
