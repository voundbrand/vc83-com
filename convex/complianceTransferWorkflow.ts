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

export const COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_TYPE = "compliance_transfer_workflow";
export const COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_SUBTYPE = "r003_transfer_impact";
const TRANSFER_REVALIDATION_ALERT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const TRANSFER_REVALIDATION_SCHEDULER_CADENCE_MS = 24 * 60 * 60 * 1000;

type TransferWorkflowState = "draft" | "ready_for_review" | "blocked";
type TransferArtifactId = "transfer_map" | "scc_tia_package" | "supplementary_controls";

type OrgAccessContext = {
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  isSuperAdmin: boolean;
  isOrgOwner: boolean;
  isPlatformOrg: boolean;
};

function hasTransferWorkflowMutationAuthority(access: OrgAccessContext): boolean {
  return access.isOrgOwner || (access.isSuperAdmin && access.isPlatformOrg);
}

export type TransferWorkflowArtifactStatus = {
  artifactId: TransferArtifactId;
  label: string;
  provided: boolean;
  reference: string | null;
  blockerReason: string | null;
};

export type TransferWorkflowCompleteness = {
  completenessScore: number;
  isComplete: boolean;
  missingArtifactIds: TransferArtifactId[];
  blockers: string[];
  artifactStatus: TransferWorkflowArtifactStatus[];
};

export type TransferWorkflowRow = {
  workflowObjectId: Id<"objects">;
  organizationId: Id<"organizations">;
  actionId: string | null;
  exporterRegion: string | null;
  importerRegion: string | null;
  transferMapRef: string | null;
  sccReference: string | null;
  tiaReference: string | null;
  supplementaryControls: string | null;
  notes: string | null;
  revalidationBlockingWarnings: string[];
  revalidationAdvisoryWarnings: string[];
  revalidationLastCheckedAt: number | null;
  revalidationNextCheckAt: number | null;
  state: TransferWorkflowState;
  completeness: TransferWorkflowCompleteness;
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
    throw new Error("Cross-organization transfer workflow access is not allowed.");
  }
  const roleName = await getMembershipRoleName(ctx, authenticated.userId, organizationId);
  const isOrgOwner = roleName === "org_owner";
  if (!isOrgOwner && !isSuperAdmin) {
    throw new Error("Only organization owners or super admins can access transfer workflow.");
  }

  return {
    organizationId,
    userId: authenticated.userId,
    isSuperAdmin,
    isOrgOwner,
    isPlatformOrg,
  };
}

export function buildTransferImpactArtifactMatrix(args: {
  transferMapRef?: string | null;
  sccReference?: string | null;
  tiaReference?: string | null;
  supplementaryControls?: string | null;
}): TransferWorkflowArtifactStatus[] {
  const transferMapRef = normalizeString(args.transferMapRef);
  const sccReference = normalizeString(args.sccReference);
  const tiaReference = normalizeString(args.tiaReference);
  const supplementaryControls = normalizeString(args.supplementaryControls);

  return [
    {
      artifactId: "transfer_map",
      label: "Transfer map",
      provided: transferMapRef !== null,
      reference: transferMapRef,
      blockerReason: transferMapRef ? null : "transfer_map_required",
    },
    {
      artifactId: "scc_tia_package",
      label: "SCC/TIA package",
      provided: sccReference !== null && tiaReference !== null,
      reference: sccReference && tiaReference ? `${sccReference} + ${tiaReference}` : null,
      blockerReason:
        sccReference !== null && tiaReference !== null ? null : "scc_and_tia_required",
    },
    {
      artifactId: "supplementary_controls",
      label: "Supplementary controls",
      provided: supplementaryControls !== null,
      reference: supplementaryControls,
      blockerReason: supplementaryControls ? null : "supplementary_controls_required",
    },
  ];
}

export function computeTransferWorkflowCompleteness(args: {
  exporterRegion?: string | null;
  importerRegion?: string | null;
  transferMapRef?: string | null;
  sccReference?: string | null;
  tiaReference?: string | null;
  supplementaryControls?: string | null;
}): TransferWorkflowCompleteness {
  const exporterRegion = normalizeString(args.exporterRegion);
  const importerRegion = normalizeString(args.importerRegion);
  const artifactStatus = buildTransferImpactArtifactMatrix({
    transferMapRef: args.transferMapRef,
    sccReference: args.sccReference,
    tiaReference: args.tiaReference,
    supplementaryControls: args.supplementaryControls,
  });
  const missingArtifactIds = artifactStatus
    .filter((artifact) => !artifact.provided)
    .map((artifact) => artifact.artifactId);
  const blockers: string[] = [];
  if (!exporterRegion || !importerRegion) {
    blockers.push("transfer_regions_required");
  }
  for (const artifact of artifactStatus) {
    if (artifact.blockerReason) {
      blockers.push(artifact.blockerReason);
    }
  }

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

export type TransferWorkflowRevalidationWarnings = {
  blockingWarnings: string[];
  advisoryWarnings: string[];
  missingReferenceIds: string[];
  evaluatedReferenceIds: string[];
};

export function computeTransferWorkflowRevalidationWarnings(args: {
  now: number;
  transferMapRef?: string | null;
  sccReference?: string | null;
  tiaReference?: string | null;
  supplementaryControls?: string | null;
  evidenceRows: ComplianceEvidenceVaultRow[];
  alertWindowMs?: number;
}): TransferWorkflowRevalidationWarnings {
  const alertWindowMs =
    typeof args.alertWindowMs === "number" && Number.isFinite(args.alertWindowMs) && args.alertWindowMs > 0
      ? args.alertWindowMs
      : TRANSFER_REVALIDATION_ALERT_WINDOW_MS;
  const referenceIds = [
    normalizeString(args.transferMapRef),
    normalizeString(args.sccReference),
    normalizeString(args.tiaReference),
    normalizeString(args.supplementaryControls),
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
      blockingWarnings.add("transfer_revalidation_evidence_invalid");
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
      blockingWarnings.add("transfer_revalidation_evidence_invalid");
      continue;
    }

    if (nextReviewAt <= args.now) {
      blockingWarnings.add("transfer_revalidation_review_overdue");
    } else if (nextReviewAt <= args.now + alertWindowMs) {
      advisoryWarnings.add("transfer_revalidation_review_due_soon");
    }

    if (retentionDeleteAt <= args.now) {
      blockingWarnings.add("transfer_revalidation_retention_expired");
    } else if (retentionDeleteAt <= args.now + alertWindowMs) {
      advisoryWarnings.add("transfer_revalidation_retention_expiring_soon");
    }
  }

  if (missingReferenceIds.length > 0) {
    blockingWarnings.add("transfer_revalidation_reference_missing");
  }

  return {
    blockingWarnings: Array.from(blockingWarnings).sort((left, right) => left.localeCompare(right)),
    advisoryWarnings: Array.from(advisoryWarnings).sort((left, right) => left.localeCompare(right)),
    missingReferenceIds,
    evaluatedReferenceIds: referenceIds,
  };
}

function resolveTransferWorkflowState(completeness: TransferWorkflowCompleteness): TransferWorkflowState {
  if (completeness.isComplete) {
    return "ready_for_review";
  }
  if (completeness.completenessScore === 0) {
    return "draft";
  }
  return "blocked";
}

function mapTransferWorkflowObjectToRow(workflowObject: Doc<"objects">): TransferWorkflowRow {
  const props = asRecord(workflowObject.customProperties);
  const exporterRegion = normalizeString(props.exporterRegion);
  const importerRegion = normalizeString(props.importerRegion);
  const transferMapRef = normalizeString(props.transferMapRef);
  const sccReference = normalizeString(props.sccReference);
  const tiaReference = normalizeString(props.tiaReference);
  const supplementaryControls = normalizeString(props.supplementaryControls);
  const notes = normalizeString(props.notes);
  const completeness = computeTransferWorkflowCompleteness({
    exporterRegion,
    importerRegion,
    transferMapRef,
    sccReference,
    tiaReference,
    supplementaryControls,
  });
  const stateRaw = normalizeString(workflowObject.status);
  const state: TransferWorkflowState =
    stateRaw === "ready_for_review" || stateRaw === "blocked" || stateRaw === "draft"
      ? stateRaw
      : resolveTransferWorkflowState(completeness);

  return {
    workflowObjectId: workflowObject._id,
    organizationId: workflowObject.organizationId,
    actionId: normalizeString(props.actionId),
    exporterRegion,
    importerRegion,
    transferMapRef,
    sccReference,
    tiaReference,
    supplementaryControls,
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

async function findTransferWorkflowObject(args: {
  ctx: QueryCtx | MutationCtx;
  organizationId: Id<"organizations">;
  workflowObjectId?: Id<"objects">;
  actionId?: string;
}): Promise<Doc<"objects"> | null> {
  if (args.workflowObjectId) {
    const direct = await args.ctx.db.get(args.workflowObjectId);
    if (
      direct
      && direct.type === COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_TYPE
      && direct.subtype === COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_SUBTYPE
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
        .eq("type", COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_TYPE)
        .eq("subtype", COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_SUBTYPE),
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

async function persistTransferWorkflowRecord(args: {
  ctx: MutationCtx;
  access: OrgAccessContext;
  workflowObjectId?: Id<"objects">;
  actionId?: string;
  exporterRegion?: string | null;
  importerRegion?: string | null;
  transferMapRef?: string | null;
  sccReference?: string | null;
  tiaReference?: string | null;
  supplementaryControls?: string | null;
  notes?: string | null;
  actionType: string;
}): Promise<TransferWorkflowRow> {
  const now = Date.now();
  const completeness = computeTransferWorkflowCompleteness({
    exporterRegion: args.exporterRegion,
    importerRegion: args.importerRegion,
    transferMapRef: args.transferMapRef,
    sccReference: args.sccReference,
    tiaReference: args.tiaReference,
    supplementaryControls: args.supplementaryControls,
  });
  const state = resolveTransferWorkflowState(completeness);
  const customProperties = compactRecord({
    actionId: normalizeString(args.actionId) ?? undefined,
    exporterRegion: normalizeString(args.exporterRegion) ?? undefined,
    importerRegion: normalizeString(args.importerRegion) ?? undefined,
    transferMapRef: normalizeString(args.transferMapRef) ?? undefined,
    sccReference: normalizeString(args.sccReference) ?? undefined,
    tiaReference: normalizeString(args.tiaReference) ?? undefined,
    supplementaryControls: normalizeString(args.supplementaryControls) ?? undefined,
    notes: normalizeString(args.notes) ?? undefined,
    completenessScore: completeness.completenessScore,
    missingArtifactIds: completeness.missingArtifactIds,
    blockers: completeness.blockers,
    updatedBy: String(args.access.userId),
    updatedAt: now,
  });

  const existing = await findTransferWorkflowObject({
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
      type: COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_TYPE,
      subtype: COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_SUBTYPE,
      name: "Transfer impact workflow",
      description: "R-003 transfer impact workflow draft",
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
    throw new Error("Transfer workflow write failed.");
  }
  return mapTransferWorkflowObjectToRow(workflowObject);
}

export const getTransferImpactWorkflowDraft = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    workflowObjectId: v.optional(v.id("objects")),
    actionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveOrgAccessContext(ctx, args);
    const workflowObject = await findTransferWorkflowObject({
      ctx,
      organizationId: access.organizationId,
      workflowObjectId: args.workflowObjectId,
      actionId: args.actionId,
    });
    if (!workflowObject) {
      return null;
    }
    return mapTransferWorkflowObjectToRow(workflowObject);
  },
});

export const saveTransferImpactWorkflowDraft = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    workflowObjectId: v.optional(v.id("objects")),
    actionId: v.optional(v.string()),
    exporterRegion: v.optional(v.string()),
    importerRegion: v.optional(v.string()),
    transferMapRef: v.optional(v.string()),
    sccReference: v.optional(v.string()),
    tiaReference: v.optional(v.string()),
    supplementaryControls: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveOrgAccessContext(ctx, args);
    if (!hasTransferWorkflowMutationAuthority(access)) {
      throw new Error(
        "Only organization owners, or super-admin on the configured platform org, can save transfer workflow drafts.",
      );
    }

    return await persistTransferWorkflowRecord({
      ctx,
      access,
      workflowObjectId: args.workflowObjectId,
      actionId: args.actionId,
      exporterRegion: args.exporterRegion,
      importerRegion: args.importerRegion,
      transferMapRef: args.transferMapRef,
      sccReference: args.sccReference,
      tiaReference: args.tiaReference,
      supplementaryControls: args.supplementaryControls,
      notes: args.notes,
      actionType: "compliance_transfer_workflow_saved",
    });
  },
});

export const completeTransferImpactWorkflowChecklist = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    workflowObjectId: v.optional(v.id("objects")),
    actionId: v.optional(v.string()),
    exporterRegion: v.string(),
    importerRegion: v.string(),
    transferMapRef: v.string(),
    sccReference: v.string(),
    tiaReference: v.string(),
    supplementaryControls: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveOrgAccessContext(ctx, args);
    if (!hasTransferWorkflowMutationAuthority(access)) {
      throw new Error(
        "Only organization owners, or super-admin on the configured platform org, can complete transfer workflow checklists.",
      );
    }
    const result = await persistTransferWorkflowRecord({
      ctx,
      access,
      workflowObjectId: args.workflowObjectId,
      actionId: args.actionId,
      exporterRegion: args.exporterRegion,
      importerRegion: args.importerRegion,
      transferMapRef: args.transferMapRef,
      sccReference: args.sccReference,
      tiaReference: args.tiaReference,
      supplementaryControls: args.supplementaryControls,
      notes: args.notes,
      actionType: "compliance_transfer_workflow_saved",
    });
    const now = Date.now();
    await ctx.db.insert("objectActions", {
      organizationId: access.organizationId,
      objectId: result.workflowObjectId,
      actionType: "compliance_transfer_workflow_completed",
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

export const refreshTransferWorkflowRevalidationWarningsInternal = internalMutation({
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
        q.eq("type", COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_TYPE)
          .eq("subtype", COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_SUBTYPE),
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

      const workflowRow = mapTransferWorkflowObjectToRow(workflowObject);
      const warnings = computeTransferWorkflowRevalidationWarnings({
        now,
        transferMapRef: workflowRow.transferMapRef,
        sccReference: workflowRow.sccReference,
        tiaReference: workflowRow.tiaReference,
        supplementaryControls: workflowRow.supplementaryControls,
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
          revalidationNextCheckAt: now + TRANSFER_REVALIDATION_SCHEDULER_CADENCE_MS,
        }),
        updatedAt: now,
      });
      updatedCount += 1;

      if (warningChanged) {
        warningChangedCount += 1;
        await ctx.db.insert("objectActions", {
          organizationId: workflowObject.organizationId,
          objectId: workflowObject._id,
          actionType: "compliance_transfer_revalidation_warnings_updated",
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
