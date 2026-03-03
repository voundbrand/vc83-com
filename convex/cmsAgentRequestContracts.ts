import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const cmsRequestRiskTierValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical")
);

export const cmsRequestStatusValidator = v.union(
  v.literal("queued"),
  v.literal("planning"),
  v.literal("awaiting_approval"),
  v.literal("applying"),
  v.literal("preview_ready"),
  v.literal("merged"),
  v.literal("failed"),
  v.literal("rolled_back")
);

export const cmsRequestApprovalStatusValidator = v.union(
  v.literal("not_requested"),
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
);

export const cmsRequestLineageValidator = v.object({
  sourceBuilderAppId: v.optional(v.id("objects")),
  targetAppPath: v.string(),
  targetRepo: v.optional(v.string()),
  targetBranch: v.optional(v.string()),
});

export const cmsRequestLinkageValidator = v.object({
  prNumber: v.optional(v.number()),
  prUrl: v.optional(v.string()),
  previewDeploymentId: v.optional(v.string()),
  previewUrl: v.optional(v.string()),
  productionDeploymentId: v.optional(v.string()),
  productionUrl: v.optional(v.string()),
});

export const cmsRequestChangePatchOperationValidator = v.object({
  op: v.union(v.literal("replace"), v.literal("remove")),
  path: v.string(),
  value: v.optional(v.any()),
});

export const cmsRequestChangePatchFileValidator = v.object({
  filePath: v.string(),
  operations: v.array(cmsRequestChangePatchOperationValidator),
});

export const cmsRequestSemanticDiffEntryValidator = v.object({
  filePath: v.string(),
  path: v.string(),
  op: v.union(v.literal("replace"), v.literal("remove")),
  before: v.any(),
  after: v.any(),
});

export const cmsRequestDiffUxContractValidator = v.object({
  canonicalKeyOrderingApplied: v.boolean(),
  keyReorderingIsCosmetic: v.boolean(),
  semanticChanges: v.array(cmsRequestSemanticDiffEntryValidator),
  semanticChangeCount: v.number(),
});

export const cmsRequestChangeManifestValidator = v.object({
  contractVersion: v.string(),
  targetAppPath: v.string(),
  operationClass: v.string(),
  riskTier: cmsRequestRiskTierValidator,
  touchedFiles: v.array(v.string()),
  requiredVerifyProfiles: v.array(v.string()),
  patches: v.array(cmsRequestChangePatchFileValidator),
  diffUx: cmsRequestDiffUxContractValidator,
});

export const cmsRequestTargetValidator = v.object({
  targetAppId: v.optional(v.id("objects")),
  targetSite: v.optional(v.string()),
});

export const cmsRequestApprovalStateValidator = v.object({
  status: cmsRequestApprovalStatusValidator,
  required: v.boolean(),
  requestedAt: v.optional(v.number()),
  requestedBy: v.optional(v.id("users")),
  decidedAt: v.optional(v.number()),
  decidedBy: v.optional(v.id("users")),
  decisionReason: v.optional(v.string()),
});

export type CmsRequestRiskTier = "low" | "medium" | "high" | "critical";

export type CmsRequestStatus =
  | "queued"
  | "planning"
  | "awaiting_approval"
  | "applying"
  | "preview_ready"
  | "merged"
  | "failed"
  | "rolled_back";

export type CmsRequestApprovalStatus =
  | "not_requested"
  | "pending"
  | "approved"
  | "rejected";

export type CmsRequestLineage = {
  sourceBuilderAppId?: Id<"objects">;
  targetAppPath: string;
  targetRepo?: string;
  targetBranch?: string;
};

export type CmsRequestLinkage = {
  prNumber?: number;
  prUrl?: string;
  previewDeploymentId?: string;
  previewUrl?: string;
  productionDeploymentId?: string;
  productionUrl?: string;
};

export type CmsRequestChangePatchOperation = {
  op: "replace" | "remove";
  path: string;
  value?: unknown;
};

export type CmsRequestChangePatchFile = {
  filePath: string;
  operations: CmsRequestChangePatchOperation[];
};

export type CmsRequestSemanticDiffEntry = {
  filePath: string;
  path: string;
  op: "replace" | "remove";
  before: unknown;
  after: unknown;
};

export type CmsRequestDiffUxContract = {
  canonicalKeyOrderingApplied: boolean;
  keyReorderingIsCosmetic: boolean;
  semanticChanges: CmsRequestSemanticDiffEntry[];
  semanticChangeCount: number;
};

export type CmsRequestChangeManifest = {
  contractVersion: string;
  targetAppPath: string;
  operationClass: string;
  riskTier: CmsRequestRiskTier;
  touchedFiles: string[];
  requiredVerifyProfiles: string[];
  patches: CmsRequestChangePatchFile[];
  diffUx: CmsRequestDiffUxContract;
};

export type CmsRequestTarget = {
  targetAppId?: Id<"objects">;
  targetSite?: string;
};

export type CmsRequestApprovalState = {
  status: CmsRequestApprovalStatus;
  required: boolean;
  requestedAt?: number;
  requestedBy?: Id<"users">;
  decidedAt?: number;
  decidedBy?: Id<"users">;
  decisionReason?: string;
};

export type CmsRequestStatusHistoryEntry = {
  from: CmsRequestStatus | null;
  to: CmsRequestStatus;
  at: number;
  reason?: string;
  actorUserId?: Id<"users">;
};

export const CMS_REQUEST_DEFAULT_STATUS: CmsRequestStatus = "queued";
export const CMS_REQUEST_DEFAULT_APPROVAL_STATE: CmsRequestApprovalState = {
  status: "not_requested",
  required: false,
};

const CMS_REQUEST_TRANSITIONS: Record<CmsRequestStatus, readonly CmsRequestStatus[]> = {
  queued: ["planning", "failed"],
  planning: ["awaiting_approval", "applying", "failed"],
  awaiting_approval: ["applying", "failed"],
  applying: ["preview_ready", "merged", "failed"],
  preview_ready: ["applying", "merged", "failed", "rolled_back"],
  merged: ["rolled_back"],
  failed: [],
  rolled_back: [],
};

export function getAllowedCmsRequestTransitions(
  currentStatus: CmsRequestStatus
): readonly CmsRequestStatus[] {
  return CMS_REQUEST_TRANSITIONS[currentStatus];
}

export function canTransitionCmsRequestStatus(
  currentStatus: CmsRequestStatus,
  nextStatus: CmsRequestStatus
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }
  return getAllowedCmsRequestTransitions(currentStatus).includes(nextStatus);
}

export function assertCmsRequestStatusTransition(
  currentStatus: CmsRequestStatus,
  nextStatus: CmsRequestStatus
): void {
  if (!canTransitionCmsRequestStatus(currentStatus, nextStatus)) {
    throw new Error(
      `Invalid CMS request status transition: ${currentStatus} -> ${nextStatus}`
    );
  }
}

export function isCmsRequestTerminalStatus(status: CmsRequestStatus): boolean {
  return status === "merged" || status === "rolled_back";
}

export function normalizeCmsRequestApprovalState(
  value: unknown
): CmsRequestApprovalState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...CMS_REQUEST_DEFAULT_APPROVAL_STATE };
  }

  const candidate = value as Partial<CmsRequestApprovalState>;
  if (
    candidate.status !== "not_requested" &&
    candidate.status !== "pending" &&
    candidate.status !== "approved" &&
    candidate.status !== "rejected"
  ) {
    return { ...CMS_REQUEST_DEFAULT_APPROVAL_STATE };
  }

  return {
    status: candidate.status,
    required: Boolean(candidate.required),
    requestedAt:
      typeof candidate.requestedAt === "number" ? candidate.requestedAt : undefined,
    requestedBy: candidate.requestedBy,
    decidedAt: typeof candidate.decidedAt === "number" ? candidate.decidedAt : undefined,
    decidedBy: candidate.decidedBy,
    decisionReason:
      typeof candidate.decisionReason === "string"
        ? candidate.decisionReason
        : undefined,
  };
}

export function assertCmsTerminalTransitionAuthority(args: {
  toStatus: CmsRequestStatus;
  canPublishTerminalTransition: boolean;
  approvalState: CmsRequestApprovalState;
}): void {
  if (!isCmsRequestTerminalStatus(args.toStatus)) {
    return;
  }

  if (!args.canPublishTerminalTransition) {
    throw new Error(
      "Permission denied: publish_pages required for terminal CMS request transitions"
    );
  }

  if (
    args.toStatus === "merged" &&
    args.approvalState.required &&
    args.approvalState.status !== "approved"
  ) {
    throw new Error(
      "Cannot transition CMS request to merged without approved approval state"
    );
  }
}

export function validateCmsIdempotencyReplay(
  existing: {
    idempotencyKey?: string;
    intentPayload?: unknown;
    riskTier?: unknown;
    lineage?: CmsRequestLineage;
    target?: CmsRequestTarget;
  },
  incoming: {
    idempotencyKey: string;
    intentPayload: unknown;
    riskTier: CmsRequestRiskTier;
    lineage: CmsRequestLineage;
    target: CmsRequestTarget;
  }
): void {
  if (existing.idempotencyKey !== incoming.idempotencyKey) {
    throw new Error("Idempotency key mismatch for existing CMS request");
  }

  const existingIntent = JSON.stringify(existing.intentPayload ?? null);
  const incomingIntent = JSON.stringify(incoming.intentPayload ?? null);
  const existingRiskTier = existing.riskTier ?? null;
  const existingLineage = JSON.stringify(existing.lineage ?? null);
  const existingTarget = JSON.stringify(existing.target ?? null);
  const incomingLineage = JSON.stringify(incoming.lineage);
  const incomingTarget = JSON.stringify(incoming.target);

  if (
    existingIntent !== incomingIntent ||
    existingRiskTier !== incoming.riskTier ||
    existingLineage !== incomingLineage ||
    existingTarget !== incomingTarget
  ) {
    throw new Error(
      "Idempotency key already used with different CMS request payload"
    );
  }
}
