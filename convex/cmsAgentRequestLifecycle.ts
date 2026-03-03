import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  CMS_REQUEST_DEFAULT_APPROVAL_STATE,
  CMS_REQUEST_DEFAULT_STATUS,
  assertCmsRequestStatusTransition,
  assertCmsTerminalTransitionAuthority,
  normalizeCmsRequestApprovalState,
  type CmsRequestApprovalState,
  type CmsRequestApprovalStatus,
  type CmsRequestLineage,
  type CmsRequestLinkage,
  type CmsRequestChangeManifest,
  type CmsRequestRiskTier,
  type CmsRequestStatus,
  type CmsRequestStatusHistoryEntry,
  type CmsRequestTarget,
  validateCmsIdempotencyReplay,
} from "./cmsAgentRequestContracts";

type CmsLifecycleSource = "public" | "internal";
const CMS_REQUEST_IDEMPOTENCY_OBJECT_TYPE = "cms_request_idempotency";

type CmsRequestRecord = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: "cms_request";
  customProperties?: Record<string, unknown>;
};

function assertCmsRequestRecord(
  request: unknown
): asserts request is CmsRequestRecord {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("CMS request not found");
  }

  const candidate = request as Partial<CmsRequestRecord>;
  if (candidate.type !== "cms_request" || !candidate._id || !candidate.organizationId) {
    throw new Error("CMS request not found");
  }
}

function extractCurrentStatus(request: CmsRequestRecord): CmsRequestStatus {
  return (request.customProperties?.status ?? CMS_REQUEST_DEFAULT_STATUS) as CmsRequestStatus;
}

function extractApprovalState(request: CmsRequestRecord): CmsRequestApprovalState {
  return normalizeCmsRequestApprovalState(request.customProperties?.approvalState);
}

function normalizeCmsIdempotencyKey(idempotencyKey: string): string {
  const normalized = idempotencyKey.trim();
  if (!normalized) {
    throw new Error("idempotencyKey must be a non-empty string");
  }
  return normalized;
}

async function findCmsRequestByIdempotencyMarker(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  idempotencyKey: string;
}): Promise<CmsRequestRecord | null> {
  const marker = await args.ctx.db
    .query("objects")
    .withIndex("by_org_type_name", (q) =>
      q
        .eq("organizationId", args.organizationId)
        .eq("type", CMS_REQUEST_IDEMPOTENCY_OBJECT_TYPE)
        .eq("name", args.idempotencyKey)
    )
    .first();

  if (!marker) {
    return null;
  }

  const requestId = marker.customProperties?.requestId as Id<"objects"> | undefined;
  if (!requestId) {
    throw new Error("Invalid CMS idempotency marker: missing requestId");
  }

  const request = await args.ctx.db.get(requestId);
  assertCmsRequestRecord(request);
  if (request.organizationId !== args.organizationId) {
    throw new Error("Invalid CMS idempotency marker: organization mismatch");
  }

  return request;
}

function buildApprovalStateForTransition(args: {
  currentApprovalState: CmsRequestApprovalState;
  toStatus: CmsRequestStatus;
  actorUserId: Id<"users">;
  now: number;
}): CmsRequestApprovalState {
  if (args.toStatus !== "awaiting_approval") {
    return args.currentApprovalState;
  }

  if (args.currentApprovalState.status === "approved") {
    return args.currentApprovalState;
  }

  return {
    status: "pending",
    required: true,
    requestedAt: args.currentApprovalState.requestedAt ?? args.now,
    requestedBy: args.currentApprovalState.requestedBy ?? args.actorUserId,
    decidedAt: args.currentApprovalState.decidedAt,
    decidedBy: args.currentApprovalState.decidedBy,
    decisionReason: args.currentApprovalState.decisionReason,
  };
}

export async function validateCmsRequestReferences(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  lineage: CmsRequestLineage;
  target: CmsRequestTarget;
}): Promise<void> {
  if (args.lineage.sourceBuilderAppId) {
    const sourceBuilderApp = await args.ctx.db.get(args.lineage.sourceBuilderAppId);
    if (!sourceBuilderApp || sourceBuilderApp.type !== "builder_app") {
      throw new Error("sourceBuilderAppId must reference a valid builder_app object");
    }
    if (sourceBuilderApp.organizationId !== args.organizationId) {
      throw new Error("sourceBuilderAppId must belong to the same organization");
    }
  }

  if (args.target.targetAppId) {
    const targetApp = await args.ctx.db.get(args.target.targetAppId);
    if (!targetApp) {
      throw new Error("targetAppId not found");
    }
    if (targetApp.organizationId !== args.organizationId) {
      throw new Error("targetAppId must belong to the same organization");
    }
  }
}

export async function createCmsRequestRecord(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  actorUserId: Id<"users">;
  source: CmsLifecycleSource;
  target: CmsRequestTarget;
  intentPayload: unknown;
  riskTier: CmsRequestRiskTier;
  idempotencyKey: string;
  lineage: CmsRequestLineage;
}): Promise<{
  requestId: Id<"objects">;
  status: CmsRequestStatus;
  idempotentReplay: boolean;
}> {
  const normalizedIdempotencyKey = normalizeCmsIdempotencyKey(args.idempotencyKey);

  await validateCmsRequestReferences({
    ctx: args.ctx,
    organizationId: args.organizationId,
    lineage: args.lineage,
    target: args.target,
  });

  const existingByIdempotency = await findCmsRequestByIdempotencyMarker({
    ctx: args.ctx,
    organizationId: args.organizationId,
    idempotencyKey: normalizedIdempotencyKey,
  });

  if (existingByIdempotency) {
    validateCmsIdempotencyReplay(
      {
        idempotencyKey: existingByIdempotency.customProperties?.idempotencyKey as
          | string
          | undefined,
        intentPayload: existingByIdempotency.customProperties?.intentPayload,
        riskTier: existingByIdempotency.customProperties?.riskTier,
        lineage: existingByIdempotency.customProperties?.lineage as CmsRequestLineage,
        target: existingByIdempotency.customProperties?.target as CmsRequestTarget,
      },
      {
        idempotencyKey: normalizedIdempotencyKey,
        intentPayload: args.intentPayload,
        riskTier: args.riskTier,
        lineage: args.lineage,
        target: args.target,
      }
    );

    return {
      requestId: existingByIdempotency._id,
      status: (existingByIdempotency.customProperties?.status ??
        CMS_REQUEST_DEFAULT_STATUS) as CmsRequestStatus,
      idempotentReplay: true,
    };
  }

  const now = Date.now();
  const statusHistory: CmsRequestStatusHistoryEntry[] = [
    {
      from: null,
      to: CMS_REQUEST_DEFAULT_STATUS,
      at: now,
      actorUserId: args.actorUserId,
    },
  ];

  const approvalState: CmsRequestApprovalState = {
    ...CMS_REQUEST_DEFAULT_APPROVAL_STATE,
  };

  const requestId = await args.ctx.db.insert("objects", {
    organizationId: args.organizationId,
    type: "cms_request",
    subtype: "agentic_edit",
    name: `CMS Request ${args.lineage.targetAppPath}`,
    status: CMS_REQUEST_DEFAULT_STATUS,
    customProperties: {
      requester: {
        userId: args.actorUserId,
      },
      target: args.target,
      intentPayload: args.intentPayload,
      riskTier: args.riskTier,
      status: CMS_REQUEST_DEFAULT_STATUS,
      approvalState,
      idempotencyKey: normalizedIdempotencyKey,
      lineage: args.lineage,
      linkage: {},
      changeManifest: null,
      statusHistory,
      createdAt: now,
      updatedAt: now,
    },
    createdBy: args.actorUserId,
    createdAt: now,
    updatedAt: now,
  });

  await args.ctx.db.insert("objects", {
    organizationId: args.organizationId,
    type: CMS_REQUEST_IDEMPOTENCY_OBJECT_TYPE,
    subtype: "cms_request",
    name: normalizedIdempotencyKey,
    status: "active",
    customProperties: {
      idempotencyKey: normalizedIdempotencyKey,
      requestId,
    },
    createdBy: args.actorUserId,
    createdAt: now,
    updatedAt: now,
  });

  await args.ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: requestId,
    actionType: "cms_request_created",
    actionData: {
      transition: {
        from: null,
        to: CMS_REQUEST_DEFAULT_STATUS,
      },
      approvalState,
      riskTier: args.riskTier,
      idempotencyKey: normalizedIdempotencyKey,
      lineage: args.lineage,
      source: args.source,
    },
    performedBy: args.actorUserId,
    performedAt: now,
  });

  return {
    requestId,
    status: CMS_REQUEST_DEFAULT_STATUS,
    idempotentReplay: false,
  };
}

export async function transitionCmsRequestRecord(args: {
  ctx: MutationCtx;
  requestId: Id<"objects">;
  actorUserId: Id<"users">;
  toStatus: CmsRequestStatus;
  reason?: string;
  source: CmsLifecycleSource;
  canPublishTerminalTransition: boolean;
}): Promise<{
  requestId: Id<"objects">;
  previousStatus: CmsRequestStatus;
  status: CmsRequestStatus;
  noOp: boolean;
}> {
  const request = await args.ctx.db.get(args.requestId);
  assertCmsRequestRecord(request);

  const currentStatus = extractCurrentStatus(request);
  if (currentStatus === args.toStatus) {
    return {
      requestId: request._id,
      previousStatus: currentStatus,
      status: currentStatus,
      noOp: true,
    };
  }

  assertCmsRequestStatusTransition(currentStatus, args.toStatus);

  const currentApprovalState = extractApprovalState(request);
  assertCmsTerminalTransitionAuthority({
    toStatus: args.toStatus,
    canPublishTerminalTransition: args.canPublishTerminalTransition,
    approvalState: currentApprovalState,
  });

  const now = Date.now();
  const nextApprovalState = buildApprovalStateForTransition({
    currentApprovalState,
    toStatus: args.toStatus,
    actorUserId: args.actorUserId,
    now,
  });

  const previousHistory =
    (request.customProperties?.statusHistory as CmsRequestStatusHistoryEntry[] | undefined) || [];
  const nextEntry: CmsRequestStatusHistoryEntry = {
    from: currentStatus,
    to: args.toStatus,
    at: now,
    reason: args.reason,
    actorUserId: args.actorUserId,
  };

  await args.ctx.db.patch(args.requestId, {
    status: args.toStatus,
    customProperties: {
      ...(request.customProperties || {}),
      status: args.toStatus,
      approvalState: nextApprovalState,
      statusHistory: [...previousHistory, nextEntry],
      lastTransitionAt: now,
      lastTransitionBy: args.actorUserId,
      lastTransitionReason: args.reason,
      updatedAt: now,
    },
    updatedAt: now,
  });

  await args.ctx.db.insert("objectActions", {
    organizationId: request.organizationId,
    objectId: args.requestId,
    actionType: "cms_request_status_transition",
    actionData: {
      from: currentStatus,
      to: args.toStatus,
      reason: args.reason,
      approvalState: nextApprovalState,
      source: args.source,
    },
    performedBy: args.actorUserId,
    performedAt: now,
  });

  return {
    requestId: request._id,
    previousStatus: currentStatus,
    status: args.toStatus,
    noOp: false,
  };
}

export async function attachCmsRequestLinkageRecord(args: {
  ctx: MutationCtx;
  requestId: Id<"objects">;
  actorUserId: Id<"users">;
  source: CmsLifecycleSource;
  linkage: CmsRequestLinkage;
}): Promise<{
  requestId: Id<"objects">;
  linkage: Record<string, unknown>;
}> {
  const request = await args.ctx.db.get(args.requestId);
  assertCmsRequestRecord(request);

  const linkageEntries = Object.entries(args.linkage).filter(([, value]) => value !== undefined);
  if (linkageEntries.length === 0) {
    throw new Error("At least one linkage field is required");
  }

  const now = Date.now();
  const existingLinkage = (request.customProperties?.linkage || {}) as Record<string, unknown>;
  const nextLinkage = {
    ...existingLinkage,
    ...args.linkage,
  };

  await args.ctx.db.patch(args.requestId, {
    customProperties: {
      ...(request.customProperties || {}),
      linkage: nextLinkage,
      updatedAt: now,
    },
    updatedAt: now,
  });

  await args.ctx.db.insert("objectActions", {
    organizationId: request.organizationId,
    objectId: args.requestId,
    actionType: "cms_request_linkage_attached",
    actionData: {
      updatedFields: linkageEntries.map(([key]) => key),
      source: args.source,
    },
    performedBy: args.actorUserId,
    performedAt: now,
  });

  return {
    requestId: request._id,
    linkage: nextLinkage,
  };
}

export async function attachCmsRequestChangeManifestRecord(args: {
  ctx: MutationCtx;
  requestId: Id<"objects">;
  actorUserId: Id<"users">;
  source: CmsLifecycleSource;
  changeManifest: CmsRequestChangeManifest;
}): Promise<{
  requestId: Id<"objects">;
  changeManifest: CmsRequestChangeManifest;
}> {
  const request = await args.ctx.db.get(args.requestId);
  assertCmsRequestRecord(request);

  if (!args.changeManifest.touchedFiles.length) {
    throw new Error("changeManifest must include at least one touched file");
  }

  const now = Date.now();

  await args.ctx.db.patch(args.requestId, {
    customProperties: {
      ...(request.customProperties || {}),
      changeManifest: args.changeManifest,
      updatedAt: now,
    },
    updatedAt: now,
  });

  await args.ctx.db.insert("objectActions", {
    organizationId: request.organizationId,
    objectId: args.requestId,
    actionType: "cms_request_change_manifest_attached",
    actionData: {
      touchedFiles: args.changeManifest.touchedFiles,
      semanticChangeCount: args.changeManifest.diffUx.semanticChangeCount,
      source: args.source,
    },
    performedBy: args.actorUserId,
    performedAt: now,
  });

  return {
    requestId: request._id,
    changeManifest: args.changeManifest,
  };
}

function buildApprovalStateUpdate(args: {
  previous: CmsRequestApprovalState;
  status: CmsRequestApprovalStatus;
  reason?: string;
  actorUserId: Id<"users">;
  now: number;
}): CmsRequestApprovalState {
  if (args.status === "not_requested") {
    return {
      status: "not_requested",
      required: false,
    };
  }

  if (args.status === "pending") {
    return {
      status: "pending",
      required: true,
      requestedAt: args.previous.requestedAt ?? args.now,
      requestedBy: args.previous.requestedBy ?? args.actorUserId,
      decidedAt: undefined,
      decidedBy: undefined,
      decisionReason: args.reason,
    };
  }

  return {
    status: args.status,
    required: true,
    requestedAt: args.previous.requestedAt ?? args.now,
    requestedBy: args.previous.requestedBy ?? args.actorUserId,
    decidedAt: args.now,
    decidedBy: args.actorUserId,
    decisionReason: args.reason,
  };
}

export async function updateCmsRequestApprovalRecord(args: {
  ctx: MutationCtx;
  requestId: Id<"objects">;
  actorUserId: Id<"users">;
  source: CmsLifecycleSource;
  status: CmsRequestApprovalStatus;
  reason?: string;
}): Promise<{
  requestId: Id<"objects">;
  approvalState: CmsRequestApprovalState;
}> {
  const request = await args.ctx.db.get(args.requestId);
  assertCmsRequestRecord(request);

  const now = Date.now();
  const previousApprovalState = extractApprovalState(request);
  const nextApprovalState = buildApprovalStateUpdate({
    previous: previousApprovalState,
    status: args.status,
    reason: args.reason,
    actorUserId: args.actorUserId,
    now,
  });

  await args.ctx.db.patch(args.requestId, {
    customProperties: {
      ...(request.customProperties || {}),
      approvalState: nextApprovalState,
      updatedAt: now,
    },
    updatedAt: now,
  });

  await args.ctx.db.insert("objectActions", {
    organizationId: request.organizationId,
    objectId: args.requestId,
    actionType: "cms_request_approval_updated",
    actionData: {
      fromStatus: previousApprovalState.status,
      toStatus: nextApprovalState.status,
      required: nextApprovalState.required,
      reason: args.reason,
      source: args.source,
    },
    performedBy: args.actorUserId,
    performedAt: now,
  });

  return {
    requestId: request._id,
    approvalState: nextApprovalState,
  };
}
