import { internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { type Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  requireAuthenticatedUser,
  requireOrgOwnerOrSuperAdmin,
  requirePermission,
} from "./rbacHelpers";
import { registerComplianceEvidenceMedia } from "./organizationMedia";
import {
  insertComplianceEvidenceLifecycleAuditEvent,
  type ComplianceEvidenceLifecycleEventType,
} from "./compliance";

export const COMPLIANCE_EVIDENCE_OBJECT_TYPE = "compliance_evidence";
export const COMPLIANCE_EVIDENCE_CONTRACT_VERSION = "compliance_evidence_metadata_v1";
export const COMPLIANCE_EVIDENCE_ENCRYPTION_STATE = "encrypted_at_rest";

export const COMPLIANCE_RISK_ID_VALUES = ["R-002", "R-003", "R-004", "R-005"] as const;
export const COMPLIANCE_EVIDENCE_SUBTYPE_VALUES = [
  "avv_provider",
  "transfer_impact",
  "security_control",
  "incident_response",
  "governance_record",
] as const;
export const COMPLIANCE_EVIDENCE_SOURCE_TYPE_VALUES = [
  "org_uploaded",
  "platform_inherited",
  "provider_response",
  "system_generated",
] as const;
export const COMPLIANCE_EVIDENCE_SENSITIVITY_VALUES = [
  "public",
  "internal",
  "confidential",
  "strictly_confidential",
] as const;
export const COMPLIANCE_EVIDENCE_LIFECYCLE_STATUS_VALUES = [
  "draft",
  "active",
  "superseded",
  "deprecated",
  "revoked",
] as const;
export const COMPLIANCE_EVIDENCE_INHERITANCE_SCOPE_VALUES = [
  "none",
  "platform_shared",
  "org_inherited",
] as const;
export const COMPLIANCE_EVIDENCE_RETENTION_CLASS_VALUES = [
  "90_days",
  "1_year",
  "3_years",
  "7_years",
] as const;
export const COMPLIANCE_EVIDENCE_REVIEW_CADENCE_VALUES = [
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
] as const;
export const COMPLIANCE_PLATFORM_SHARE_SCOPE_VALUES = [
  "fleet_all_orgs",
  "org_allowlist",
  "org_denylist",
] as const;

const riskIdValidator = v.union(
  v.literal("R-002"),
  v.literal("R-003"),
  v.literal("R-004"),
  v.literal("R-005"),
);
const evidenceSubtypeValidator = v.union(
  v.literal("avv_provider"),
  v.literal("transfer_impact"),
  v.literal("security_control"),
  v.literal("incident_response"),
  v.literal("governance_record"),
);
const sourceTypeValidator = v.union(
  v.literal("org_uploaded"),
  v.literal("platform_inherited"),
  v.literal("provider_response"),
  v.literal("system_generated"),
);
const sensitivityValidator = v.union(
  v.literal("public"),
  v.literal("internal"),
  v.literal("confidential"),
  v.literal("strictly_confidential"),
);
const lifecycleStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("superseded"),
  v.literal("deprecated"),
  v.literal("revoked"),
);
const inheritanceScopeValidator = v.union(
  v.literal("none"),
  v.literal("platform_shared"),
  v.literal("org_inherited"),
);
const retentionClassValidator = v.union(
  v.literal("90_days"),
  v.literal("1_year"),
  v.literal("3_years"),
  v.literal("7_years"),
);
const reviewCadenceValidator = v.union(
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("semi_annual"),
  v.literal("annual"),
);
const platformShareScopeValidator = v.union(
  v.literal("fleet_all_orgs"),
  v.literal("org_allowlist"),
  v.literal("org_denylist"),
);

type EnumValue<TValues extends readonly string[]> = TValues[number];
export type ComplianceRiskId = EnumValue<typeof COMPLIANCE_RISK_ID_VALUES>;
export type ComplianceEvidenceSubtype = EnumValue<typeof COMPLIANCE_EVIDENCE_SUBTYPE_VALUES>;
export type ComplianceEvidenceSourceType = EnumValue<typeof COMPLIANCE_EVIDENCE_SOURCE_TYPE_VALUES>;
export type ComplianceEvidenceSensitivity = EnumValue<typeof COMPLIANCE_EVIDENCE_SENSITIVITY_VALUES>;
export type ComplianceEvidenceLifecycleStatus = EnumValue<typeof COMPLIANCE_EVIDENCE_LIFECYCLE_STATUS_VALUES>;
export type ComplianceEvidenceInheritanceScope = EnumValue<
  typeof COMPLIANCE_EVIDENCE_INHERITANCE_SCOPE_VALUES
>;
export type ComplianceEvidenceRetentionClass = EnumValue<
  typeof COMPLIANCE_EVIDENCE_RETENTION_CLASS_VALUES
>;
export type ComplianceEvidenceReviewCadence = EnumValue<
  typeof COMPLIANCE_EVIDENCE_REVIEW_CADENCE_VALUES
>;
export type CompliancePlatformShareScope = EnumValue<typeof COMPLIANCE_PLATFORM_SHARE_SCOPE_VALUES>;

export type ComplianceEvidenceRiskReference = {
  riskId: ComplianceRiskId;
  controlId?: string;
  note?: string;
};

export type ComplianceEvidenceIntegrityMetadata = {
  checksumSha256: string;
  storagePointer: string;
  storageProvider: string;
  encryptionState: typeof COMPLIANCE_EVIDENCE_ENCRYPTION_STATE;
  contentLengthBytes?: number;
  mediaId?: string;
};

type OrgAccessContext = {
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  isSuperAdmin: boolean;
  isOrgOwner: boolean;
};

type ComplianceEvidenceContractInput = {
  title: string;
  description?: string;
  subtype: ComplianceEvidenceSubtype;
  sourceType: ComplianceEvidenceSourceType;
  sensitivity: ComplianceEvidenceSensitivity;
  lifecycleStatus: ComplianceEvidenceLifecycleStatus;
  inheritanceScope: ComplianceEvidenceInheritanceScope;
  inheritanceEligible: boolean;
  inheritedFromOrganizationId?: Id<"organizations">;
  inheritedFromEvidenceObjectId?: Id<"objects">;
  riskReferences: ComplianceEvidenceRiskReference[];
  integrity: ComplianceEvidenceIntegrityMetadata;
  retentionClass: ComplianceEvidenceRetentionClass;
  retentionDeleteAt: number;
  reviewCadence: ComplianceEvidenceReviewCadence;
  nextReviewAt: number;
  providerName?: string;
  notes?: string;
  tags?: string[];
  platformShareScope?: CompliancePlatformShareScope;
  platformShareOrganizationIds?: Id<"organizations">[];
};

type ValidatedComplianceEvidenceContract = {
  title: string;
  description?: string;
  subtype: ComplianceEvidenceSubtype;
  sourceType: ComplianceEvidenceSourceType;
  sensitivity: ComplianceEvidenceSensitivity;
  lifecycleStatus: ComplianceEvidenceLifecycleStatus;
  inheritanceScope: ComplianceEvidenceInheritanceScope;
  inheritanceEligible: boolean;
  inheritedFromOrganizationId?: Id<"organizations">;
  inheritedFromEvidenceObjectId?: Id<"objects">;
  riskReferences: ComplianceEvidenceRiskReference[];
  integrity: ComplianceEvidenceIntegrityMetadata;
  retentionClass: ComplianceEvidenceRetentionClass;
  retentionDeleteAt: number;
  reviewCadence: ComplianceEvidenceReviewCadence;
  nextReviewAt: number;
  providerName?: string;
  notes?: string;
  tags: string[];
  platformShareScope?: CompliancePlatformShareScope;
  platformShareOrganizationIds: Id<"organizations">[];
};

export type ComplianceEvidenceVaultRow = {
  evidenceObjectId: Id<"objects">;
  organizationId: Id<"organizations">;
  title: string;
  description?: string;
  subtype: ComplianceEvidenceSubtype | null;
  sourceType: ComplianceEvidenceSourceType | null;
  sensitivity: ComplianceEvidenceSensitivity | null;
  lifecycleStatus: ComplianceEvidenceLifecycleStatus | null;
  inheritanceScope: ComplianceEvidenceInheritanceScope | null;
  inheritanceEligible: boolean;
  inheritedFromOrganizationId?: string;
  inheritedFromEvidenceObjectId?: string;
  riskReferences: ComplianceEvidenceRiskReference[];
  integrity: ComplianceEvidenceIntegrityMetadata | null;
  retentionClass: ComplianceEvidenceRetentionClass | null;
  retentionDeleteAt: number | null;
  reviewCadence: ComplianceEvidenceReviewCadence | null;
  nextReviewAt: number | null;
  providerName?: string;
  notes?: string;
  tags: string[];
  platformShareScope?: CompliancePlatformShareScope;
  platformShareOrganizationIds: string[];
  supersedesEvidenceObjectId?: string;
  supersededByEvidenceObjectId?: string;
  uploaderUserId?: string;
  uploadedAt?: number;
  metadataVersion: number;
  contractVersion: string | null;
  contractValid: boolean;
  validationErrors: string[];
  updatedAt: number;
  createdAt: number;
};

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
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

function normalizeEnum<TValues extends readonly string[]>(
  values: TValues,
  value: unknown,
): EnumValue<TValues> | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  return (values as readonly string[]).includes(normalized)
    ? (normalized as EnumValue<TValues>)
    : null;
}

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

export function normalizeComplianceEvidenceTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  for (const entry of value) {
    const normalized = normalizeString(entry);
    if (!normalized) {
      continue;
    }
    unique.add(normalized.toLowerCase());
  }
  return Array.from(unique).sort((left, right) => left.localeCompare(right));
}

function normalizeOrganizationIdStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const unique = new Set<string>();
  for (const entry of value) {
    const normalized = normalizeString(entry);
    if (!normalized) {
      continue;
    }
    unique.add(normalized);
  }
  return Array.from(unique).sort((left, right) => left.localeCompare(right));
}

export function normalizeComplianceEvidenceIntegrityMetadata(
  value: unknown,
): ComplianceEvidenceIntegrityMetadata | null {
  const record = asRecord(value);
  const checksumSha256 = normalizeString(record.checksumSha256);
  const storagePointer = normalizeString(record.storagePointer);
  const storageProvider = normalizeString(record.storageProvider);
  const encryptionStateRaw = normalizeString(record.encryptionState) ?? COMPLIANCE_EVIDENCE_ENCRYPTION_STATE;
  const mediaId = normalizeString(record.mediaId);
  const contentLengthRaw = record.contentLengthBytes;
  const contentLengthBytes =
    typeof contentLengthRaw === "number" && Number.isFinite(contentLengthRaw) && contentLengthRaw >= 0
      ? contentLengthRaw
      : undefined;

  if (!checksumSha256 || !/^[a-fA-F0-9]{64}$/.test(checksumSha256)) {
    return null;
  }
  if (!storagePointer || storagePointer.length < 3) {
    return null;
  }
  if (!storageProvider) {
    return null;
  }
  if (encryptionStateRaw !== COMPLIANCE_EVIDENCE_ENCRYPTION_STATE) {
    return null;
  }

  return compactRecord({
    checksumSha256: checksumSha256.toLowerCase(),
    storagePointer,
    storageProvider,
    encryptionState: COMPLIANCE_EVIDENCE_ENCRYPTION_STATE,
    contentLengthBytes,
    mediaId,
  }) as ComplianceEvidenceIntegrityMetadata;
}

export function normalizeComplianceEvidenceRiskReferences(
  value: unknown,
): ComplianceEvidenceRiskReference[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const dedupe = new Map<string, ComplianceEvidenceRiskReference>();
  for (const entry of value) {
    const record = asRecord(entry);
    const riskId = normalizeEnum(COMPLIANCE_RISK_ID_VALUES, record.riskId);
    if (!riskId) {
      continue;
    }
    const controlId = normalizeString(record.controlId);
    const note = normalizeString(record.note);
    const dedupeKey = `${riskId}:${controlId ?? ""}`;
    dedupe.set(
      dedupeKey,
      compactRecord({
        riskId,
        controlId,
        note,
      }) as ComplianceEvidenceRiskReference,
    );
  }

  return Array.from(dedupe.values()).sort((left, right) => {
    const riskSort = left.riskId.localeCompare(right.riskId);
    if (riskSort !== 0) {
      return riskSort;
    }
    return (left.controlId ?? "").localeCompare(right.controlId ?? "");
  });
}

export function validateComplianceEvidenceMetadataContract(
  input: ComplianceEvidenceContractInput,
): { ok: true; normalized: ValidatedComplianceEvidenceContract } | { ok: false; error: string } {
  const title = normalizeString(input.title);
  if (!title) {
    return { ok: false, error: "Evidence title is required." };
  }

  const description = normalizeString(input.description);
  const providerName = normalizeString(input.providerName);
  const notes = normalizeString(input.notes);
  const tags = normalizeComplianceEvidenceTags(input.tags);
  const platformShareOrganizationIds = Array.from(
    new Set((input.platformShareOrganizationIds ?? []).map((entry) => String(entry))),
  ) as Id<"organizations">[];
  const riskReferences = normalizeComplianceEvidenceRiskReferences(input.riskReferences);
  if (riskReferences.length === 0) {
    return { ok: false, error: "At least one risk reference is required (R-002..R-005)." };
  }

  const integrity = normalizeComplianceEvidenceIntegrityMetadata(input.integrity);
  if (!integrity) {
    return { ok: false, error: "Integrity metadata is invalid (checksum/storage/encryption fields)." };
  }

  const retentionDeleteAt = normalizeTimestamp(input.retentionDeleteAt);
  const nextReviewAt = normalizeTimestamp(input.nextReviewAt);
  if (retentionDeleteAt === null || nextReviewAt === null) {
    return { ok: false, error: "Retention and review timestamps are required." };
  }
  if (retentionDeleteAt <= nextReviewAt) {
    return { ok: false, error: "Retention delete timestamp must be after next review timestamp." };
  }

  if (input.sourceType === "platform_inherited" && input.inheritanceScope !== "org_inherited") {
    return {
      ok: false,
      error: "sourceType=platform_inherited requires inheritanceScope=org_inherited.",
    };
  }

  if (input.inheritanceScope === "org_inherited") {
    if (!input.inheritedFromOrganizationId || !input.inheritedFromEvidenceObjectId) {
      return {
        ok: false,
        error: "Org-inherited evidence requires source organization and source evidence references.",
      };
    }
    if (input.inheritanceEligible) {
      return {
        ok: false,
        error: "Org-inherited evidence cannot be marked as inheritance-eligible.",
      };
    }
  }

  if (input.inheritanceScope === "none") {
    if (input.inheritedFromOrganizationId || input.inheritedFromEvidenceObjectId) {
      return {
        ok: false,
        error: "Non-inherited evidence cannot carry inherited source references.",
      };
    }
  }

  if (input.inheritanceScope === "platform_shared" && !input.inheritanceEligible) {
    return {
      ok: false,
      error: "Platform-shared evidence must be marked as inheritance-eligible.",
    };
  }
  if (input.inheritanceScope === "platform_shared") {
    if (!input.platformShareScope) {
      return {
        ok: false,
        error: "Platform-shared evidence requires an explicit platform share scope.",
      };
    }
    if (
      (input.platformShareScope === "org_allowlist" || input.platformShareScope === "org_denylist")
      && platformShareOrganizationIds.length === 0
    ) {
      return {
        ok: false,
        error: "Allowlist/denylist share scope requires at least one organization target.",
      };
    }
  }
  if (input.inheritanceScope !== "platform_shared" && input.platformShareScope) {
    return {
      ok: false,
      error: "Platform share scope is only valid for inheritanceScope=platform_shared.",
    };
  }

  return {
    ok: true,
    normalized: {
      title,
      description,
      subtype: input.subtype,
      sourceType: input.sourceType,
      sensitivity: input.sensitivity,
      lifecycleStatus: input.lifecycleStatus,
      inheritanceScope: input.inheritanceScope,
      inheritanceEligible: input.inheritanceEligible,
      inheritedFromOrganizationId: input.inheritedFromOrganizationId,
      inheritedFromEvidenceObjectId: input.inheritedFromEvidenceObjectId,
      riskReferences,
      integrity,
      retentionClass: input.retentionClass,
      retentionDeleteAt,
      reviewCadence: input.reviewCadence,
      nextReviewAt,
      providerName,
      notes,
      tags,
      platformShareScope: input.platformShareScope,
      platformShareOrganizationIds,
    },
  };
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

  const authority = await requireOrgOwnerOrSuperAdmin(
    ctx,
    authenticated.userId,
    organizationId,
    "Only organization owners or super admins can access compliance evidence.",
  );

  if (!authority.isSuperAdmin && authenticated.organizationId !== organizationId) {
    throw new Error("Cross-organization evidence access is not allowed.");
  }

  return {
    organizationId,
    userId: authenticated.userId,
    isSuperAdmin: authority.isSuperAdmin,
    isOrgOwner: authority.isOrgOwner,
  };
}

function buildMetadataPayload(args: {
  normalized: ValidatedComplianceEvidenceContract;
  actorUserId: Id<"users">;
  now: number;
  uploaderUserId?: Id<"users">;
  uploadedAt?: number;
}): Record<string, unknown> {
  return compactRecord({
    contractVersion: COMPLIANCE_EVIDENCE_CONTRACT_VERSION,
    metadataVersion: 1,
    sourceType: args.normalized.sourceType,
    sensitivity: args.normalized.sensitivity,
    inheritanceScope: args.normalized.inheritanceScope,
    inheritanceEligible: args.normalized.inheritanceEligible,
    inheritedFromOrganizationId: args.normalized.inheritedFromOrganizationId
      ? String(args.normalized.inheritedFromOrganizationId)
      : undefined,
    inheritedFromEvidenceObjectId: args.normalized.inheritedFromEvidenceObjectId
      ? String(args.normalized.inheritedFromEvidenceObjectId)
      : undefined,
    riskReferences: args.normalized.riskReferences.map((reference) =>
      compactRecord({
        riskId: reference.riskId,
        controlId: reference.controlId,
        note: reference.note,
      }),
    ),
    integrity: compactRecord({
      checksumSha256: args.normalized.integrity.checksumSha256,
      storagePointer: args.normalized.integrity.storagePointer,
      storageProvider: args.normalized.integrity.storageProvider,
      encryptionState: args.normalized.integrity.encryptionState,
      contentLengthBytes: args.normalized.integrity.contentLengthBytes,
      mediaId: args.normalized.integrity.mediaId,
    }),
    retentionClass: args.normalized.retentionClass,
    retentionDeleteAt: args.normalized.retentionDeleteAt,
    reviewCadence: args.normalized.reviewCadence,
    nextReviewAt: args.normalized.nextReviewAt,
    providerName: args.normalized.providerName,
    notes: args.normalized.notes,
    tags: args.normalized.tags,
    platformShareScope: args.normalized.platformShareScope,
    platformShareOrganizationIds:
      args.normalized.platformShareOrganizationIds.length > 0
        ? args.normalized.platformShareOrganizationIds.map((entry) => String(entry))
        : undefined,
    uploaderUserId: args.uploaderUserId ? String(args.uploaderUserId) : undefined,
    uploadedAt: args.uploadedAt,
    lastUpdatedBy: String(args.actorUserId),
    lastUpdatedAt: args.now,
  });
}

async function persistEvidenceMetadata(args: {
  ctx: MutationCtx;
  accessContext: OrgAccessContext;
  evidenceObjectId?: Id<"objects">;
  normalized: ValidatedComplianceEvidenceContract;
  uploaderUserId?: Id<"users">;
  uploadedAt?: number;
  actionType: string;
}) {
  const { ctx, accessContext } = args;
  const now = Date.now();
  const metadataPayload = buildMetadataPayload({
    normalized: args.normalized,
    actorUserId: accessContext.userId,
    now,
    uploaderUserId: args.uploaderUserId,
    uploadedAt: args.uploadedAt,
  });

  let evidenceObjectId: Id<"objects">;
  if (args.evidenceObjectId) {
    const existing = await ctx.db.get(args.evidenceObjectId);
    if (!existing || existing.type !== COMPLIANCE_EVIDENCE_OBJECT_TYPE) {
      throw new Error("Evidence metadata record not found.");
    }
    if (
      String(existing.organizationId) !== String(accessContext.organizationId)
      && !accessContext.isSuperAdmin
    ) {
      throw new Error("Cross-organization evidence mutation is not allowed.");
    }

    await ctx.db.patch(existing._id, {
      subtype: args.normalized.subtype,
      name: args.normalized.title,
      description: args.normalized.description,
      status: args.normalized.lifecycleStatus,
      customProperties: compactRecord({
        ...asRecord(existing.customProperties),
        ...metadataPayload,
      }),
      updatedAt: now,
    });
    evidenceObjectId = existing._id;
  } else {
    evidenceObjectId = await ctx.db.insert("objects", {
      organizationId: accessContext.organizationId,
      type: COMPLIANCE_EVIDENCE_OBJECT_TYPE,
      subtype: args.normalized.subtype,
      name: args.normalized.title,
      description: args.normalized.description,
      status: args.normalized.lifecycleStatus,
      customProperties: metadataPayload,
      createdBy: accessContext.userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  await ctx.db.insert("objectActions", {
    organizationId: accessContext.organizationId,
    objectId: evidenceObjectId,
    actionType: args.actionType,
    actionData: compactRecord({
      subtype: args.normalized.subtype,
      sourceType: args.normalized.sourceType,
      lifecycleStatus: args.normalized.lifecycleStatus,
      inheritanceScope: args.normalized.inheritanceScope,
      riskIds: args.normalized.riskReferences.map((entry) => entry.riskId),
      uploaderUserId: args.uploaderUserId ? String(args.uploaderUserId) : undefined,
      uploadedAt: args.uploadedAt,
    }),
    performedBy: accessContext.userId,
    performedAt: now,
  });

  return {
    evidenceObjectId,
    now,
  };
}

function buildContractInputFromRow(
  row: ComplianceEvidenceVaultRow,
): ComplianceEvidenceContractInput | null {
  if (
    !row.subtype
    || !row.sourceType
    || !row.sensitivity
    || !row.lifecycleStatus
    || !row.inheritanceScope
    || !row.integrity
    || !row.retentionClass
    || row.retentionDeleteAt === null
    || !row.reviewCadence
    || row.nextReviewAt === null
  ) {
    return null;
  }

  return {
    title: row.title,
    description: row.description,
    subtype: row.subtype,
    sourceType: row.sourceType,
    sensitivity: row.sensitivity,
    lifecycleStatus: row.lifecycleStatus,
    inheritanceScope: row.inheritanceScope,
    inheritanceEligible: row.inheritanceEligible,
    inheritedFromOrganizationId: row.inheritedFromOrganizationId as Id<"organizations"> | undefined,
    inheritedFromEvidenceObjectId: row.inheritedFromEvidenceObjectId as Id<"objects"> | undefined,
    riskReferences: row.riskReferences,
    integrity: row.integrity,
    retentionClass: row.retentionClass,
    retentionDeleteAt: row.retentionDeleteAt,
    reviewCadence: row.reviewCadence,
    nextReviewAt: row.nextReviewAt,
    providerName: row.providerName,
    notes: row.notes,
    tags: row.tags,
    platformShareScope: row.platformShareScope,
    platformShareOrganizationIds: row.platformShareOrganizationIds as Id<"organizations">[],
  };
}

function requireMutableContractInput(row: ComplianceEvidenceVaultRow): ComplianceEvidenceContractInput {
  if (!row.contractValid) {
    throw new Error(
      `Evidence metadata contract is invalid (${row.validationErrors.join(", ")}); transition blocked.`,
    );
  }
  const input = buildContractInputFromRow(row);
  if (!input) {
    throw new Error("Evidence metadata contract is incomplete; transition blocked.");
  }
  return input;
}

async function recordEvidenceLifecycleTransition(args: {
  ctx: MutationCtx;
  accessContext: OrgAccessContext;
  evidenceObjectId: Id<"objects">;
  eventType: ComplianceEvidenceLifecycleEventType;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const now = Date.now();
  await args.ctx.db.insert("objectActions", {
    organizationId: args.accessContext.organizationId,
    objectId: args.evidenceObjectId,
    actionType: `compliance_evidence_${args.eventType}`,
    actionData: compactRecord({
      contractVersion: COMPLIANCE_EVIDENCE_CONTRACT_VERSION,
      eventType: args.eventType,
      ...(args.metadata ?? {}),
    }),
    performedBy: args.accessContext.userId,
    performedAt: now,
  });

  await insertComplianceEvidenceLifecycleAuditEvent(args.ctx, {
    organizationId: args.accessContext.organizationId,
    userId: args.accessContext.userId,
    evidenceObjectId: args.evidenceObjectId,
    eventType: args.eventType,
    occurredAt: now,
    metadata: args.metadata,
  });
}

export function mapEvidenceObjectToRow(evidenceObject: Doc<"objects">): ComplianceEvidenceVaultRow {
  const props = asRecord(evidenceObject.customProperties);
  const subtype = normalizeEnum(COMPLIANCE_EVIDENCE_SUBTYPE_VALUES, evidenceObject.subtype);
  const sourceType = normalizeEnum(COMPLIANCE_EVIDENCE_SOURCE_TYPE_VALUES, props.sourceType);
  const sensitivity = normalizeEnum(COMPLIANCE_EVIDENCE_SENSITIVITY_VALUES, props.sensitivity);
  const lifecycleStatus = normalizeEnum(
    COMPLIANCE_EVIDENCE_LIFECYCLE_STATUS_VALUES,
    evidenceObject.status,
  );
  const inheritanceScope = normalizeEnum(
    COMPLIANCE_EVIDENCE_INHERITANCE_SCOPE_VALUES,
    props.inheritanceScope,
  );
  const retentionClass = normalizeEnum(
    COMPLIANCE_EVIDENCE_RETENTION_CLASS_VALUES,
    props.retentionClass,
  );
  const reviewCadence = normalizeEnum(
    COMPLIANCE_EVIDENCE_REVIEW_CADENCE_VALUES,
    props.reviewCadence,
  );
  const platformShareScope = normalizeEnum(
    COMPLIANCE_PLATFORM_SHARE_SCOPE_VALUES,
    props.platformShareScope,
  );
  const platformShareOrganizationIds = normalizeOrganizationIdStringList(
    props.platformShareOrganizationIds,
  );
  const riskReferences = normalizeComplianceEvidenceRiskReferences(props.riskReferences);
  const integrity = normalizeComplianceEvidenceIntegrityMetadata(props.integrity);
  const retentionDeleteAt = normalizeTimestamp(props.retentionDeleteAt);
  const nextReviewAt = normalizeTimestamp(props.nextReviewAt);
  const contractVersion = normalizeString(props.contractVersion) ?? null;
  const uploaderUserId = normalizeString(props.uploaderUserId);
  const uploadedAt = normalizeTimestamp(props.uploadedAt) ?? undefined;
  const metadataVersionRaw = props.metadataVersion;
  const metadataVersion =
    typeof metadataVersionRaw === "number" && Number.isFinite(metadataVersionRaw)
      ? metadataVersionRaw
      : 0;
  const validationErrors: string[] = [];

  if (subtype === null) {
    validationErrors.push("invalid_subtype");
  }
  if (sourceType === null) {
    validationErrors.push("invalid_source_type");
  }
  if (sensitivity === null) {
    validationErrors.push("invalid_sensitivity");
  }
  if (lifecycleStatus === null) {
    validationErrors.push("invalid_lifecycle_status");
  }
  if (inheritanceScope === null) {
    validationErrors.push("invalid_inheritance_scope");
  }
  if (retentionClass === null) {
    validationErrors.push("invalid_retention_class");
  }
  if (reviewCadence === null) {
    validationErrors.push("invalid_review_cadence");
  }
  if (retentionDeleteAt === null) {
    validationErrors.push("invalid_retention_delete_at");
  }
  if (nextReviewAt === null) {
    validationErrors.push("invalid_next_review_at");
  }
  if (!integrity) {
    validationErrors.push("invalid_integrity_metadata");
  }
  if (riskReferences.length === 0) {
    validationErrors.push("missing_risk_references");
  }
  if (contractVersion !== COMPLIANCE_EVIDENCE_CONTRACT_VERSION) {
    validationErrors.push("invalid_contract_version");
  }
  if (inheritanceScope === "platform_shared" && platformShareScope === null) {
    validationErrors.push("missing_platform_share_scope");
  }

  return {
    evidenceObjectId: evidenceObject._id,
    organizationId: evidenceObject.organizationId,
    title: evidenceObject.name,
    description: normalizeString(evidenceObject.description),
    subtype,
    sourceType,
    sensitivity,
    lifecycleStatus,
    inheritanceScope,
    inheritanceEligible: props.inheritanceEligible === true,
    inheritedFromOrganizationId: normalizeString(props.inheritedFromOrganizationId),
    inheritedFromEvidenceObjectId: normalizeString(props.inheritedFromEvidenceObjectId),
    riskReferences,
    integrity,
    retentionClass,
    retentionDeleteAt,
    reviewCadence,
    nextReviewAt,
    providerName: normalizeString(props.providerName),
    notes: normalizeString(props.notes),
    tags: normalizeComplianceEvidenceTags(props.tags),
    platformShareScope: platformShareScope ?? undefined,
    platformShareOrganizationIds,
    supersedesEvidenceObjectId: normalizeString(props.supersedesEvidenceObjectId),
    supersededByEvidenceObjectId: normalizeString(props.supersededByEvidenceObjectId),
    uploaderUserId,
    uploadedAt,
    metadataVersion,
    contractVersion,
    contractValid: validationErrors.length === 0,
    validationErrors,
    updatedAt: evidenceObject.updatedAt,
    createdAt: evidenceObject.createdAt,
  };
}

async function requireEvidenceObjectForMutation(
  ctx: MutationCtx,
  accessContext: OrgAccessContext,
  evidenceObjectId: Id<"objects">,
): Promise<Doc<"objects">> {
  const evidenceObject = await ctx.db.get(evidenceObjectId);
  if (!evidenceObject || evidenceObject.type !== COMPLIANCE_EVIDENCE_OBJECT_TYPE) {
    throw new Error("Evidence metadata record not found.");
  }
  if (
    String(evidenceObject.organizationId) !== String(accessContext.organizationId)
    && !accessContext.isSuperAdmin
  ) {
    throw new Error("Cross-organization evidence mutation is not allowed.");
  }
  return evidenceObject;
}

export function isPlatformSharedEvidenceVisibleForOrganization(
  row: ComplianceEvidenceVaultRow,
  organizationId: Id<"organizations">,
): boolean {
  if (!row.contractValid) {
    return false;
  }
  if (row.inheritanceScope !== "platform_shared") {
    return false;
  }
  if (!row.inheritanceEligible) {
    return false;
  }
  if (row.lifecycleStatus !== "active") {
    return false;
  }

  const scope = row.platformShareScope ?? "fleet_all_orgs";
  const orgKey = String(organizationId);
  const scopeSet = new Set(row.platformShareOrganizationIds);
  if (scope === "fleet_all_orgs") {
    return true;
  }
  if (scope === "org_allowlist") {
    return scopeSet.has(orgKey);
  }
  return !scopeSet.has(orgKey);
}

export type ResolvedComplianceEvidenceRow = ComplianceEvidenceVaultRow & {
  sourceMarker: "platform_shared" | "org_inherited" | "org_local";
  precedenceRank: 1 | 2 | 3;
  mergeKey: string;
};

function buildEvidenceMergeKey(row: ComplianceEvidenceVaultRow): string {
  const inheritedOrigin = row.inheritedFromEvidenceObjectId;
  if (inheritedOrigin) {
    return `origin:${inheritedOrigin}`;
  }
  if (row.inheritanceScope === "platform_shared") {
    return `origin:${String(row.evidenceObjectId)}`;
  }
  if (row.supersedesEvidenceObjectId) {
    return `origin:${row.supersedesEvidenceObjectId}`;
  }

  const subtype = row.subtype ?? "unknown_subtype";
  const riskSignature = row.riskReferences
    .map((entry) => `${entry.riskId}:${entry.controlId ?? ""}`)
    .sort((left, right) => left.localeCompare(right))
    .join("|");
  const provider = (row.providerName ?? "").trim().toLowerCase();
  return `local:${subtype}:${riskSignature}:${provider}`;
}

function classifyResolvedSource(row: ComplianceEvidenceVaultRow): {
  sourceMarker: ResolvedComplianceEvidenceRow["sourceMarker"];
  precedenceRank: ResolvedComplianceEvidenceRow["precedenceRank"];
} {
  if (row.inheritanceScope === "platform_shared") {
    return { sourceMarker: "platform_shared", precedenceRank: 1 };
  }
  if (row.sourceType === "platform_inherited" || row.inheritanceScope === "org_inherited") {
    return { sourceMarker: "org_inherited", precedenceRank: 2 };
  }
  return { sourceMarker: "org_local", precedenceRank: 3 };
}

export function resolveEffectiveEvidenceRows(args: {
  organizationRows: ComplianceEvidenceVaultRow[];
  platformSharedRows: ComplianceEvidenceVaultRow[];
}): {
  rows: ResolvedComplianceEvidenceRow[];
  hiddenRows: number;
} {
  const resolvedByKey = new Map<string, ResolvedComplianceEvidenceRow>();
  let hiddenRows = 0;

  const candidates = [...args.platformSharedRows, ...args.organizationRows];
  for (const candidate of candidates) {
    if (!candidate.contractValid) {
      continue;
    }
    if (candidate.lifecycleStatus === "superseded" || candidate.lifecycleStatus === "deprecated") {
      continue;
    }
    if (candidate.supersededByEvidenceObjectId) {
      continue;
    }

    const { sourceMarker, precedenceRank } = classifyResolvedSource(candidate);
    const mergeKey = buildEvidenceMergeKey(candidate);
    const next: ResolvedComplianceEvidenceRow = {
      ...candidate,
      sourceMarker,
      precedenceRank,
      mergeKey,
    };

    const existing = resolvedByKey.get(mergeKey);
    if (!existing) {
      resolvedByKey.set(mergeKey, next);
      continue;
    }

    const shouldReplace =
      next.precedenceRank > existing.precedenceRank
      || (next.precedenceRank === existing.precedenceRank && next.updatedAt > existing.updatedAt);
    if (shouldReplace) {
      resolvedByKey.set(mergeKey, next);
      hiddenRows += 1;
    } else {
      hiddenRows += 1;
    }
  }

  const rows = Array.from(resolvedByKey.values()).sort((left, right) => {
    if (left.precedenceRank !== right.precedenceRank) {
      return right.precedenceRank - left.precedenceRank;
    }
    return right.updatedAt - left.updatedAt;
  });

  return {
    rows,
    hiddenRows,
  };
}

export const listEvidenceMetadata = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    subtype: v.optional(evidenceSubtypeValidator),
    sourceType: v.optional(sourceTypeValidator),
    lifecycleStatus: v.optional(lifecycleStatusValidator),
    riskId: v.optional(riskIdValidator),
    includeInherited: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);

    const evidenceObjects = args.subtype
      ? await ctx.db
          .query("objects")
          .withIndex("by_org_type_subtype", (q) =>
            q.eq("organizationId", accessContext.organizationId)
              .eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE)
              .eq("subtype", args.subtype),
          )
          .collect()
      : await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q.eq("organizationId", accessContext.organizationId).eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE),
          )
          .collect();

    const includeInherited = args.includeInherited ?? true;
    const rows = evidenceObjects
      .map(mapEvidenceObjectToRow)
      .filter((row) => {
        if (!includeInherited && row.inheritanceScope === "org_inherited") {
          return false;
        }
        if (args.sourceType && row.sourceType !== args.sourceType) {
          return false;
        }
        if (args.lifecycleStatus && row.lifecycleStatus !== args.lifecycleStatus) {
          return false;
        }
        if (args.riskId && !row.riskReferences.some((entry) => entry.riskId === args.riskId)) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        const leftReview = left.nextReviewAt ?? Number.MAX_SAFE_INTEGER;
        const rightReview = right.nextReviewAt ?? Number.MAX_SAFE_INTEGER;
        if (leftReview !== rightReview) {
          return leftReview - rightReview;
        }
        return right.updatedAt - left.updatedAt;
      });

    return {
      organizationId: accessContext.organizationId,
      rows,
      invalidCount: rows.filter((row) => !row.contractValid).length,
    };
  },
});

export const getEvidenceMetadata = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    evidenceObjectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);

    const evidenceObject = await ctx.db.get(args.evidenceObjectId);
    if (!evidenceObject || evidenceObject.type !== COMPLIANCE_EVIDENCE_OBJECT_TYPE) {
      throw new Error("Evidence metadata record not found.");
    }
    if (
      String(evidenceObject.organizationId) !== String(accessContext.organizationId)
      && !accessContext.isSuperAdmin
    ) {
      throw new Error("Cross-organization evidence read is not allowed.");
    }

    return mapEvidenceObjectToRow(evidenceObject);
  },
});

export const listPlatformSharedEvidence = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    subtype: v.optional(evidenceSubtypeValidator),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    const evidenceObjects = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE))
      .collect();

    const rows = evidenceObjects
      .filter((entry) => !args.subtype || entry.subtype === args.subtype)
      .map(mapEvidenceObjectToRow)
      .filter((row) =>
        isPlatformSharedEvidenceVisibleForOrganization(row, accessContext.organizationId),
      )
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .map((row) => ({
        ...row,
        sourceOrganizationId: row.organizationId,
      }));

    return {
      organizationId: accessContext.organizationId,
      rows,
      total: rows.length,
    };
  },
});

export const resolveEvidenceObjectsByMediaIdsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    mediaIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedMediaIdSet = new Set(
      args.mediaIds
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    );
    if (normalizedMediaIdSet.size === 0) {
      return [];
    }

    const evidenceObjects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE),
      )
      .collect();

    const matches: Array<{
      mediaId: string;
      evidenceObjectId: string;
      evidenceTitle: string;
      subtype: ComplianceEvidenceSubtype | null;
      sourceType: ComplianceEvidenceSourceType | null;
      lifecycleStatus: ComplianceEvidenceLifecycleStatus | null;
      riskIds: ComplianceRiskId[];
      updatedAt: number;
    }> = [];

    for (const evidenceObject of evidenceObjects) {
      const row = mapEvidenceObjectToRow(evidenceObject);
      if (!row.contractValid || row.lifecycleStatus !== "active") {
        continue;
      }
      const mediaId = normalizeString(row.integrity?.mediaId);
      if (!mediaId || !normalizedMediaIdSet.has(mediaId)) {
        continue;
      }
      matches.push({
        mediaId,
        evidenceObjectId: String(row.evidenceObjectId),
        evidenceTitle: row.title,
        subtype: row.subtype,
        sourceType: row.sourceType,
        lifecycleStatus: row.lifecycleStatus,
        riskIds: row.riskReferences.map((reference) => reference.riskId),
        updatedAt: row.updatedAt,
      });
    }

    return matches.sort((left, right) => {
      if (right.updatedAt !== left.updatedAt) {
        return right.updatedAt - left.updatedAt;
      }
      return left.evidenceObjectId.localeCompare(right.evidenceObjectId);
    });
  },
});

export const resolveEvidenceInheritanceView = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    subtype: v.optional(evidenceSubtypeValidator),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);

    const organizationEvidenceObjects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", accessContext.organizationId).eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE),
      )
      .collect();

    const platformEvidenceObjects = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE))
      .collect();

    const organizationRows = organizationEvidenceObjects
      .filter((entry) => !args.subtype || entry.subtype === args.subtype)
      .map(mapEvidenceObjectToRow);
    const platformSharedRows = platformEvidenceObjects
      .filter((entry) => !args.subtype || entry.subtype === args.subtype)
      .map(mapEvidenceObjectToRow)
      .filter((row) =>
        isPlatformSharedEvidenceVisibleForOrganization(row, accessContext.organizationId),
      );

    const resolved = resolveEffectiveEvidenceRows({
      organizationRows,
      platformSharedRows,
    });

    return {
      organizationId: accessContext.organizationId,
      rows: resolved.rows,
      hiddenRows: resolved.hiddenRows,
      totals: {
        resolved: resolved.rows.length,
        orgLocal: resolved.rows.filter((row) => row.sourceMarker === "org_local").length,
        orgInherited: resolved.rows.filter((row) => row.sourceMarker === "org_inherited").length,
        platformShared: resolved.rows.filter((row) => row.sourceMarker === "platform_shared").length,
      },
    };
  },
});

export const generateEvidenceUploadUrl = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    estimatedSizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (args.estimatedSizeBytes <= 0) {
      throw new Error("estimatedSizeBytes must be greater than zero.");
    }

    await requirePermission(ctx, accessContext.userId, "media_library.upload", {
      organizationId: accessContext.organizationId,
    });

    const uploadUrl = await ctx.storage.generateUploadUrl();
    return {
      uploadUrl,
      organizationId: accessContext.organizationId,
      issuedAt: Date.now(),
      encryptionState: COMPLIANCE_EVIDENCE_ENCRYPTION_STATE,
    };
  },
});

export const saveEvidenceMetadata = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    evidenceObjectId: v.optional(v.id("objects")),
    title: v.string(),
    description: v.optional(v.string()),
    subtype: evidenceSubtypeValidator,
    sourceType: sourceTypeValidator,
    sensitivity: sensitivityValidator,
    lifecycleStatus: lifecycleStatusValidator,
    inheritanceScope: inheritanceScopeValidator,
    inheritanceEligible: v.boolean(),
    inheritedFromOrganizationId: v.optional(v.id("organizations")),
    inheritedFromEvidenceObjectId: v.optional(v.id("objects")),
    riskReferences: v.array(
      v.object({
        riskId: riskIdValidator,
        controlId: v.optional(v.string()),
        note: v.optional(v.string()),
      }),
    ),
    integrity: v.object({
      checksumSha256: v.string(),
      storagePointer: v.string(),
      storageProvider: v.string(),
      encryptionState: v.optional(v.literal(COMPLIANCE_EVIDENCE_ENCRYPTION_STATE)),
      contentLengthBytes: v.optional(v.number()),
      mediaId: v.optional(v.string()),
    }),
    retentionClass: retentionClassValidator,
    retentionDeleteAt: v.number(),
    reviewCadence: reviewCadenceValidator,
    nextReviewAt: v.number(),
    providerName: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    platformShareScope: v.optional(platformShareScopeValidator),
    platformShareOrganizationIds: v.optional(v.array(v.id("organizations"))),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (args.inheritanceScope === "platform_shared" && !accessContext.isSuperAdmin) {
      throw new Error("Only super admins can publish platform-shared evidence.");
    }

    const validationResult = validateComplianceEvidenceMetadataContract({
      title: args.title,
      description: args.description,
      subtype: args.subtype,
      sourceType: args.sourceType,
      sensitivity: args.sensitivity,
      lifecycleStatus: args.lifecycleStatus,
      inheritanceScope: args.inheritanceScope,
      inheritanceEligible: args.inheritanceEligible,
      inheritedFromOrganizationId: args.inheritedFromOrganizationId,
      inheritedFromEvidenceObjectId: args.inheritedFromEvidenceObjectId,
      riskReferences: args.riskReferences,
      integrity: {
        ...args.integrity,
        encryptionState: COMPLIANCE_EVIDENCE_ENCRYPTION_STATE,
      },
      retentionClass: args.retentionClass,
      retentionDeleteAt: args.retentionDeleteAt,
      reviewCadence: args.reviewCadence,
      nextReviewAt: args.nextReviewAt,
      providerName: args.providerName,
      notes: args.notes,
      tags: args.tags,
      platformShareScope: args.platformShareScope,
      platformShareOrganizationIds: args.platformShareOrganizationIds,
    });
    if (!validationResult.ok) {
      throw new Error(validationResult.error);
    }

    const persisted = await persistEvidenceMetadata({
      ctx,
      accessContext,
      evidenceObjectId: args.evidenceObjectId,
      normalized: validationResult.normalized,
      actionType: args.evidenceObjectId
        ? "compliance_evidence_metadata_updated"
        : "compliance_evidence_metadata_created",
    });

    return {
      success: true,
      evidenceObjectId: persisted.evidenceObjectId,
      lifecycleStatus: validationResult.normalized.lifecycleStatus,
      updatedAt: persisted.now,
    };
  },
});

export const publishPlatformSharedEvidence = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    evidenceObjectId: v.optional(v.id("objects")),
    title: v.string(),
    description: v.optional(v.string()),
    subtype: evidenceSubtypeValidator,
    sourceType: sourceTypeValidator,
    sensitivity: sensitivityValidator,
    lifecycleStatus: lifecycleStatusValidator,
    riskReferences: v.array(
      v.object({
        riskId: riskIdValidator,
        controlId: v.optional(v.string()),
        note: v.optional(v.string()),
      }),
    ),
    integrity: v.object({
      checksumSha256: v.string(),
      storagePointer: v.string(),
      storageProvider: v.string(),
      encryptionState: v.optional(v.literal(COMPLIANCE_EVIDENCE_ENCRYPTION_STATE)),
      contentLengthBytes: v.optional(v.number()),
      mediaId: v.optional(v.string()),
    }),
    retentionClass: retentionClassValidator,
    retentionDeleteAt: v.number(),
    reviewCadence: reviewCadenceValidator,
    nextReviewAt: v.number(),
    providerName: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    platformShareScope: platformShareScopeValidator,
    platformShareOrganizationIds: v.optional(v.array(v.id("organizations"))),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (!accessContext.isSuperAdmin) {
      throw new Error("Only super admins can publish platform-shared evidence.");
    }
    if (args.sourceType === "platform_inherited") {
      throw new Error("Platform-shared evidence cannot use sourceType=platform_inherited.");
    }

    const validationResult = validateComplianceEvidenceMetadataContract({
      title: args.title,
      description: args.description,
      subtype: args.subtype,
      sourceType: args.sourceType,
      sensitivity: args.sensitivity,
      lifecycleStatus: args.lifecycleStatus,
      inheritanceScope: "platform_shared",
      inheritanceEligible: true,
      riskReferences: args.riskReferences,
      integrity: {
        ...args.integrity,
        encryptionState: COMPLIANCE_EVIDENCE_ENCRYPTION_STATE,
      },
      retentionClass: args.retentionClass,
      retentionDeleteAt: args.retentionDeleteAt,
      reviewCadence: args.reviewCadence,
      nextReviewAt: args.nextReviewAt,
      providerName: args.providerName,
      notes: args.notes,
      tags: args.tags,
      platformShareScope: args.platformShareScope,
      platformShareOrganizationIds: args.platformShareOrganizationIds,
    });
    if (!validationResult.ok) {
      throw new Error(validationResult.error);
    }

    const persisted = await persistEvidenceMetadata({
      ctx,
      accessContext,
      evidenceObjectId: args.evidenceObjectId,
      normalized: validationResult.normalized,
      actionType: args.evidenceObjectId
        ? "compliance_platform_shared_evidence_updated"
        : "compliance_platform_shared_evidence_published",
    });

    return {
      success: true,
      evidenceObjectId: persisted.evidenceObjectId,
      inheritanceScope: "platform_shared" as const,
      platformShareScope: validationResult.normalized.platformShareScope,
      updatedAt: persisted.now,
    };
  },
});

export const completeEvidenceUpload = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    evidenceObjectId: v.optional(v.id("objects")),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    checksumSha256: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    subtype: evidenceSubtypeValidator,
    sourceType: sourceTypeValidator,
    sensitivity: sensitivityValidator,
    lifecycleStatus: lifecycleStatusValidator,
    inheritanceScope: inheritanceScopeValidator,
    inheritanceEligible: v.boolean(),
    inheritedFromOrganizationId: v.optional(v.id("organizations")),
    inheritedFromEvidenceObjectId: v.optional(v.id("objects")),
    riskReferences: v.array(
      v.object({
        riskId: riskIdValidator,
        controlId: v.optional(v.string()),
        note: v.optional(v.string()),
      }),
    ),
    retentionClass: retentionClassValidator,
    retentionDeleteAt: v.number(),
    reviewCadence: reviewCadenceValidator,
    nextReviewAt: v.number(),
    providerName: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    platformShareScope: v.optional(platformShareScopeValidator),
    platformShareOrganizationIds: v.optional(v.array(v.id("organizations"))),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    const filename = normalizeString(args.filename);
    if (!filename) {
      throw new Error("Uploaded evidence filename is required.");
    }
    const mimeType = normalizeString(args.mimeType);
    if (!mimeType) {
      throw new Error("Uploaded evidence mimeType is required.");
    }
    if (!Number.isFinite(args.sizeBytes) || args.sizeBytes <= 0) {
      throw new Error("Uploaded evidence sizeBytes must be greater than zero.");
    }
    if (!normalizeString(args.checksumSha256)) {
      throw new Error("Uploaded evidence checksumSha256 is required.");
    }

    await requirePermission(ctx, accessContext.userId, "media_library.upload", {
      organizationId: accessContext.organizationId,
    });

    if (args.sourceType === "platform_inherited") {
      throw new Error("Uploaded evidence cannot use sourceType=platform_inherited.");
    }
    if (args.inheritanceScope === "platform_shared" && !accessContext.isSuperAdmin) {
      throw new Error("Only super admins can publish platform-shared uploaded evidence.");
    }

    const savedMedia = await registerComplianceEvidenceMedia(ctx, {
      organizationId: accessContext.organizationId,
      uploadedBy: accessContext.userId,
      storageId: args.storageId,
      filename,
      mimeType,
      sizeBytes: args.sizeBytes,
      checksumSha256: args.checksumSha256,
      tags: args.tags,
      description: args.description,
    });

    const validationResult = validateComplianceEvidenceMetadataContract({
      title: args.title,
      description: args.description,
      subtype: args.subtype,
      sourceType: args.sourceType,
      sensitivity: args.sensitivity,
      lifecycleStatus: args.lifecycleStatus,
      inheritanceScope: args.inheritanceScope,
      inheritanceEligible: args.inheritanceEligible,
      inheritedFromOrganizationId: args.inheritedFromOrganizationId,
      inheritedFromEvidenceObjectId: args.inheritedFromEvidenceObjectId,
      riskReferences: args.riskReferences,
      integrity: {
        checksumSha256: savedMedia.checksumSha256,
        storagePointer: savedMedia.storagePointer,
        storageProvider: "convex_storage_encrypted",
        encryptionState: COMPLIANCE_EVIDENCE_ENCRYPTION_STATE,
        contentLengthBytes: args.sizeBytes,
        mediaId: String(savedMedia.mediaId),
      },
      retentionClass: args.retentionClass,
      retentionDeleteAt: args.retentionDeleteAt,
      reviewCadence: args.reviewCadence,
      nextReviewAt: args.nextReviewAt,
      providerName: args.providerName,
      notes: args.notes,
      tags: args.tags,
      platformShareScope: args.platformShareScope,
      platformShareOrganizationIds: args.platformShareOrganizationIds,
    });
    if (!validationResult.ok) {
      throw new Error(validationResult.error);
    }

    const persisted = await persistEvidenceMetadata({
      ctx,
      accessContext,
      evidenceObjectId: args.evidenceObjectId,
      normalized: validationResult.normalized,
      uploaderUserId: accessContext.userId,
      uploadedAt: savedMedia.uploadedAt,
      actionType: args.evidenceObjectId
        ? "compliance_evidence_upload_replaced"
        : "compliance_evidence_upload_registered",
    });

    await recordEvidenceLifecycleTransition({
      ctx,
      accessContext,
      evidenceObjectId: persisted.evidenceObjectId,
      eventType: "upload",
      metadata: {
        mediaId: String(savedMedia.mediaId),
        checksumSha256: savedMedia.checksumSha256,
      },
    });

    return {
      success: true,
      evidenceObjectId: persisted.evidenceObjectId,
      mediaId: savedMedia.mediaId,
      checksumSha256: savedMedia.checksumSha256,
      uploadedAt: savedMedia.uploadedAt,
      updatedAt: persisted.now,
    };
  },
});

export const linkEvidenceToRisk = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    evidenceObjectId: v.id("objects"),
    riskId: riskIdValidator,
    controlId: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    const evidenceObject = await requireEvidenceObjectForMutation(
      ctx,
      accessContext,
      args.evidenceObjectId,
    );
    const row = mapEvidenceObjectToRow(evidenceObject);
    const baseInput = requireMutableContractInput(row);

    const mergedRiskReferences = normalizeComplianceEvidenceRiskReferences([
      ...baseInput.riskReferences,
      {
        riskId: args.riskId,
        controlId: normalizeString(args.controlId),
        note: normalizeString(args.note),
      },
    ]);

    const validationResult = validateComplianceEvidenceMetadataContract({
      ...baseInput,
      riskReferences: mergedRiskReferences,
    });
    if (!validationResult.ok) {
      throw new Error(validationResult.error);
    }

    const persisted = await persistEvidenceMetadata({
      ctx,
      accessContext,
      evidenceObjectId: args.evidenceObjectId,
      normalized: validationResult.normalized,
      actionType: "compliance_evidence_linked_to_risk",
    });

    await recordEvidenceLifecycleTransition({
      ctx,
      accessContext,
      evidenceObjectId: persisted.evidenceObjectId,
      eventType: "link",
      metadata: compactRecord({
        riskId: args.riskId,
        controlId: normalizeString(args.controlId),
      }),
    });

    return {
      success: true,
      evidenceObjectId: persisted.evidenceObjectId,
      riskReferenceCount: mergedRiskReferences.length,
      updatedAt: persisted.now,
    };
  },
});

export const markEvidenceInherited = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    evidenceObjectId: v.id("objects"),
    sourceOrganizationId: v.id("organizations"),
    sourceEvidenceObjectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    const evidenceObject = await requireEvidenceObjectForMutation(
      ctx,
      accessContext,
      args.evidenceObjectId,
    );
    const row = mapEvidenceObjectToRow(evidenceObject);
    const baseInput = requireMutableContractInput(row);

    const validationResult = validateComplianceEvidenceMetadataContract({
      ...baseInput,
      sourceType: "platform_inherited",
      inheritanceScope: "org_inherited",
      inheritanceEligible: false,
      inheritedFromOrganizationId: args.sourceOrganizationId,
      inheritedFromEvidenceObjectId: args.sourceEvidenceObjectId,
    });
    if (!validationResult.ok) {
      throw new Error(validationResult.error);
    }

    const persisted = await persistEvidenceMetadata({
      ctx,
      accessContext,
      evidenceObjectId: args.evidenceObjectId,
      normalized: validationResult.normalized,
      actionType: "compliance_evidence_marked_inherited",
    });

    await recordEvidenceLifecycleTransition({
      ctx,
      accessContext,
      evidenceObjectId: persisted.evidenceObjectId,
      eventType: "inherit",
      metadata: {
        sourceOrganizationId: String(args.sourceOrganizationId),
        sourceEvidenceObjectId: String(args.sourceEvidenceObjectId),
      },
    });

    return {
      success: true,
      evidenceObjectId: persisted.evidenceObjectId,
      inheritanceScope: "org_inherited" as const,
      updatedAt: persisted.now,
    };
  },
});

export const supersedeEvidence = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    evidenceObjectId: v.id("objects"),
    supersededByEvidenceObjectId: v.id("objects"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    const currentObject = await requireEvidenceObjectForMutation(
      ctx,
      accessContext,
      args.evidenceObjectId,
    );
    await requireEvidenceObjectForMutation(ctx, accessContext, args.supersededByEvidenceObjectId);

    const currentRow = mapEvidenceObjectToRow(currentObject);
    const baseInput = requireMutableContractInput(currentRow);
    const reason = normalizeString(args.reason);
    const notes = reason
      ? `${baseInput.notes ? `${baseInput.notes}\\n` : ""}Superseded: ${reason}`
      : baseInput.notes;

    const validationResult = validateComplianceEvidenceMetadataContract({
      ...baseInput,
      lifecycleStatus: "superseded",
      notes,
    });
    if (!validationResult.ok) {
      throw new Error(validationResult.error);
    }

    const persisted = await persistEvidenceMetadata({
      ctx,
      accessContext,
      evidenceObjectId: args.evidenceObjectId,
      normalized: validationResult.normalized,
      actionType: "compliance_evidence_superseded",
    });

    const refreshedCurrent = await ctx.db.get(persisted.evidenceObjectId);
    if (refreshedCurrent) {
      await ctx.db.patch(persisted.evidenceObjectId, {
        customProperties: compactRecord({
          ...asRecord(refreshedCurrent.customProperties),
          supersededByEvidenceObjectId: String(args.supersededByEvidenceObjectId),
        }),
        updatedAt: Date.now(),
      });
    }

    const replacement = await ctx.db.get(args.supersededByEvidenceObjectId);
    if (replacement) {
      await ctx.db.patch(args.supersededByEvidenceObjectId, {
        customProperties: compactRecord({
          ...asRecord(replacement.customProperties),
          supersedesEvidenceObjectId: String(args.evidenceObjectId),
        }),
        updatedAt: Date.now(),
      });
    }

    await recordEvidenceLifecycleTransition({
      ctx,
      accessContext,
      evidenceObjectId: persisted.evidenceObjectId,
      eventType: "supersede",
      metadata: compactRecord({
        supersededByEvidenceObjectId: String(args.supersededByEvidenceObjectId),
        reason,
      }),
    });

    return {
      success: true,
      evidenceObjectId: persisted.evidenceObjectId,
      lifecycleStatus: "superseded" as const,
      updatedAt: persisted.now,
    };
  },
});

export const deprecateEvidence = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    evidenceObjectId: v.id("objects"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    const evidenceObject = await requireEvidenceObjectForMutation(
      ctx,
      accessContext,
      args.evidenceObjectId,
    );
    const row = mapEvidenceObjectToRow(evidenceObject);
    const baseInput = requireMutableContractInput(row);
    const reason = normalizeString(args.reason);
    if (!reason) {
      throw new Error("Deprecation reason is required.");
    }

    const notes = `${baseInput.notes ? `${baseInput.notes}\\n` : ""}Deprecated: ${reason}`;
    const validationResult = validateComplianceEvidenceMetadataContract({
      ...baseInput,
      lifecycleStatus: "deprecated",
      notes,
    });
    if (!validationResult.ok) {
      throw new Error(validationResult.error);
    }

    const persisted = await persistEvidenceMetadata({
      ctx,
      accessContext,
      evidenceObjectId: args.evidenceObjectId,
      normalized: validationResult.normalized,
      actionType: "compliance_evidence_deprecated",
    });

    await recordEvidenceLifecycleTransition({
      ctx,
      accessContext,
      evidenceObjectId: persisted.evidenceObjectId,
      eventType: "deprecate",
      metadata: {
        reason,
      },
    });

    return {
      success: true,
      evidenceObjectId: persisted.evidenceObjectId,
      lifecycleStatus: "deprecated" as const,
      updatedAt: persisted.now,
    };
  },
});

export const getEvidenceDownloadUrl = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    evidenceObjectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);

    const evidenceObject = await ctx.db.get(args.evidenceObjectId);
    if (!evidenceObject || evidenceObject.type !== COMPLIANCE_EVIDENCE_OBJECT_TYPE) {
      throw new Error("Evidence metadata record not found.");
    }
    if (
      String(evidenceObject.organizationId) !== String(accessContext.organizationId)
      && !accessContext.isSuperAdmin
    ) {
      throw new Error("Cross-organization evidence read is not allowed.");
    }

    const row = mapEvidenceObjectToRow(evidenceObject);
    if (!row.contractValid || !row.integrity?.mediaId) {
      throw new Error("Evidence metadata contract is incomplete; download is blocked.");
    }

    const mediaId = row.integrity.mediaId as Id<"organizationMedia">;
    const media = await ctx.db.get(mediaId);
    if (!media) {
      throw new Error("Evidence media record not found.");
    }
    if (
      String(media.organizationId) !== String(accessContext.organizationId)
      && !accessContext.isSuperAdmin
    ) {
      throw new Error("Cross-organization media read is not allowed.");
    }
    if (!media.storageId) {
      throw new Error("Evidence media storage is unavailable.");
    }

    const url = await ctx.storage.getUrl(media.storageId);
    if (!url) {
      throw new Error("Evidence media URL generation failed.");
    }

    return {
      evidenceObjectId: row.evidenceObjectId,
      mediaId,
      url,
      checksumSha256: row.integrity.checksumSha256,
      encryptionState: row.integrity.encryptionState,
      issuedAt: Date.now(),
    };
  },
});
