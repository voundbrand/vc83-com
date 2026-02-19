/**
 * SOUL EVOLUTION — Backend
 *
 * Mutations and queries for managing soul update proposals.
 * Handles creation, approval, rejection, and application of proposals.
 */

import { action, mutation, query, internalMutation, internalQuery, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { requireAuthenticatedUser } from "../rbacHelpers";
import {
  CORE_MEMORY_SOURCE_VALUES,
  CORE_MEMORY_TYPE_VALUES,
} from "../schemas/aiSchemas";
import {
  TRUST_EVENT_NAMESPACE,
  TRUST_EVENT_TAXONOMY_VERSION,
  validateTrustEventPayload,
  type TrustEventActorType,
  type TrustEventName,
  type TrustEventPayload,
} from "./trustEvents";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

type CoreMemoryType = (typeof CORE_MEMORY_TYPE_VALUES)[number];
type CoreMemorySource = (typeof CORE_MEMORY_SOURCE_VALUES)[number];

export interface CoreMemory {
  memoryId: string;
  type: CoreMemoryType;
  title: string;
  narrative: string;
  source: CoreMemorySource;
  immutable: boolean;
  immutableReason?: string;
  tags?: string[];
  confidence?: number;
  createdAt: number;
  createdBy?: string;
  approvedAt?: number;
  approvedBy?: string;
  lastReferencedAt?: number;
  archivedAt?: number;
}

export interface CoreMemoryPolicy {
  immutableByDefault: boolean;
  requireOwnerApprovalForMutations: boolean;
  allowOwnerEdits: boolean;
  minCoreMemories: number;
  maxCoreMemories: number;
  requiredMemoryTypes: CoreMemoryType[];
}

export const SOUL_V2_OVERLAY_VERSION = 2;

export const SOUL_V2_IDENTITY_ANCHOR_FIELDS = [
  "name",
  "tagline",
  "traits",
  "coreValues",
  "neverDo",
  "escalationTriggers",
  "coreMemories",
] as const;

export const SOUL_V2_EXECUTION_PREFERENCE_FIELDS = [
  "alwaysDo",
  "communicationStyle",
  "toneGuidelines",
  "greetingStyle",
  "closingStyle",
  "emojiUsage",
] as const;

export type SoulV2IdentityAnchorField =
  (typeof SOUL_V2_IDENTITY_ANCHOR_FIELDS)[number];
export type SoulV2ExecutionPreferenceField =
  (typeof SOUL_V2_EXECUTION_PREFERENCE_FIELDS)[number];

export interface SoulIdentityAnchors {
  name?: string;
  tagline?: string;
  traits?: string[];
  coreValues?: string[];
  neverDo?: string[];
  escalationTriggers?: string[];
  coreMemories: CoreMemory[];
}

export interface SoulExecutionPreferences {
  alwaysDo?: string[];
  communicationStyle?: string;
  toneGuidelines?: string;
  greetingStyle?: string;
  closingStyle?: string;
  emojiUsage?: string;
}

export interface SoulV2Overlay {
  schemaVersion: number;
  identityAnchors: SoulIdentityAnchors;
  executionPreferences: SoulExecutionPreferences;
  requireOwnerApprovalForMutations: boolean;
}

type SoulModel = Record<string, unknown> & {
  soulV2?: SoulV2Overlay;
  coreMemories?: CoreMemory[];
  coreMemoryPolicy?: CoreMemoryPolicy;
  version?: number;
  lastUpdatedAt?: number;
  lastUpdatedBy?: string;
};

export type SoulProposalTriggerType =
  | "conversation"
  | "reflection"
  | "owner_directed"
  | "alignment";

export type SoulAlignmentMode = "monitor" | "remediate";

export interface SoulDriftScores {
  identity: number;
  scope: number;
  boundary: number;
  performance: number;
  overall: number;
}

export interface ProposalPolicySnapshot {
  pendingCount: number;
  proposalsLast24Hours: number;
  proposalsLast7Days: number;
  lastRejectedAgeMs?: number;
  lastProposalAgeMs?: number;
  conversationCount: number;
  sessionCount: number;
}

export interface ProposalPolicyDecision {
  allowed: boolean;
  reason?: string;
}

export interface OperatorReviewPayload {
  targetField: string;
  proposalType: "add" | "modify" | "remove" | "add_faq";
  triggerType: SoulProposalTriggerType;
  requiresOwnerApproval: true;
  overlayLayer: "identity_anchor" | "execution_preference" | "legacy";
  immutableByDefault: boolean;
  coreMemoryTarget: boolean;
  riskLevel: "low" | "medium" | "high";
  reviewChecklist: string[];
  summary: string;
  proposedValuePreview: string;
}

const CORE_MEMORY_TYPE_SET = new Set<string>(CORE_MEMORY_TYPE_VALUES);
const CORE_MEMORY_SOURCE_SET = new Set<string>(CORE_MEMORY_SOURCE_VALUES);
const SOUL_V2_IDENTITY_FIELD_SET = new Set<string>(SOUL_V2_IDENTITY_ANCHOR_FIELDS);
const SOUL_V2_EXECUTION_FIELD_SET = new Set<string>(SOUL_V2_EXECUTION_PREFERENCE_FIELDS);

export const DEFAULT_CORE_MEMORY_POLICY: CoreMemoryPolicy = {
  immutableByDefault: true,
  requireOwnerApprovalForMutations: true,
  allowOwnerEdits: true,
  minCoreMemories: 3,
  maxCoreMemories: 5,
  requiredMemoryTypes: ["identity", "boundary", "empathy"],
};

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeCoreMemoryType(value: unknown): CoreMemoryType {
  const normalized = toNonEmptyString(value)?.toLowerCase();
  if (normalized && CORE_MEMORY_TYPE_SET.has(normalized)) {
    return normalized as CoreMemoryType;
  }
  return "identity";
}

function normalizeCoreMemorySource(value: unknown): CoreMemorySource {
  const normalized = toNonEmptyString(value)?.toLowerCase();
  if (normalized && CORE_MEMORY_SOURCE_SET.has(normalized)) {
    return normalized as CoreMemorySource;
  }
  return "unknown";
}

function normalizeTagArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tags = value
    .map((tag) => toNonEmptyString(tag)?.toLowerCase())
    .filter((tag): tag is string => Boolean(tag));
  return tags.length > 0 ? Array.from(new Set(tags)) : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => toNonEmptyString(item))
    .filter((item): item is string => Boolean(item));
  if (normalized.length === 0) {
    return undefined;
  }
  return Array.from(new Set(normalized));
}

function normalizeCoreMemories(value: unknown): CoreMemory[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((memory, index) => normalizeCoreMemory(memory, index))
    .filter((memory): memory is CoreMemory => memory !== null);
}

export function normalizeCoreMemory(
  value: unknown,
  indexHint = 0,
): CoreMemory | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const narrative = toNonEmptyString(record.narrative ?? record.content ?? record.story);
  if (!narrative) {
    return null;
  }

  const createdAt = normalizeOptionalNumber(record.createdAt) ?? Date.now();
  const memoryId =
    toNonEmptyString(record.memoryId)
    ?? toNonEmptyString(record.id)
    ?? `core-memory-${createdAt}-${indexHint}`;

  return {
    memoryId,
    type: normalizeCoreMemoryType(record.type),
    title:
      toNonEmptyString(record.title)
      ?? toNonEmptyString(record.summary)
      ?? `Core Memory ${indexHint + 1}`,
    narrative,
    source: normalizeCoreMemorySource(record.source),
    immutable:
      typeof record.immutable === "boolean"
        ? record.immutable
        : DEFAULT_CORE_MEMORY_POLICY.immutableByDefault,
    immutableReason:
      toNonEmptyString(record.immutableReason)
      ?? (DEFAULT_CORE_MEMORY_POLICY.immutableByDefault ? "identity_anchor" : undefined),
    tags: normalizeTagArray(record.tags),
    confidence: normalizeOptionalNumber(record.confidence),
    createdAt,
    createdBy: toNonEmptyString(record.createdBy) ?? undefined,
    approvedAt: normalizeOptionalNumber(record.approvedAt),
    approvedBy: toNonEmptyString(record.approvedBy) ?? undefined,
    lastReferencedAt: normalizeOptionalNumber(record.lastReferencedAt),
    archivedAt: normalizeOptionalNumber(record.archivedAt),
  };
}

export function normalizeCoreMemoryPolicy(value: unknown): CoreMemoryPolicy {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_CORE_MEMORY_POLICY };
  }

  const policy = value as Record<string, unknown>;
  const min = normalizeOptionalNumber(policy.minCoreMemories) ?? DEFAULT_CORE_MEMORY_POLICY.minCoreMemories;
  const maxRaw = normalizeOptionalNumber(policy.maxCoreMemories) ?? DEFAULT_CORE_MEMORY_POLICY.maxCoreMemories;
  const max = Math.max(min, maxRaw);
  const requiredMemoryTypes = Array.isArray(policy.requiredMemoryTypes)
    ? policy.requiredMemoryTypes
        .map((memoryType) => normalizeCoreMemoryType(memoryType))
    : DEFAULT_CORE_MEMORY_POLICY.requiredMemoryTypes;

  return {
    immutableByDefault:
      typeof policy.immutableByDefault === "boolean"
        ? policy.immutableByDefault
        : DEFAULT_CORE_MEMORY_POLICY.immutableByDefault,
    requireOwnerApprovalForMutations:
      typeof policy.requireOwnerApprovalForMutations === "boolean"
        ? policy.requireOwnerApprovalForMutations
        : DEFAULT_CORE_MEMORY_POLICY.requireOwnerApprovalForMutations,
    allowOwnerEdits:
      typeof policy.allowOwnerEdits === "boolean"
        ? policy.allowOwnerEdits
        : DEFAULT_CORE_MEMORY_POLICY.allowOwnerEdits,
    minCoreMemories: min,
    maxCoreMemories: max,
    requiredMemoryTypes: Array.from(new Set(requiredMemoryTypes)),
  };
}

export function normalizeSoulModel(value: unknown): SoulModel {
  const soul = (value && typeof value === "object"
    ? { ...(value as Record<string, unknown>) }
    : {}) as SoulModel;
  const soulRecord = soul as Record<string, unknown>;
  const existingOverlay =
    soulRecord.soulV2 && typeof soulRecord.soulV2 === "object"
      ? (soulRecord.soulV2 as Record<string, unknown>)
      : null;
  const rawIdentityAnchors =
    existingOverlay?.identityAnchors && typeof existingOverlay.identityAnchors === "object"
      ? (existingOverlay.identityAnchors as Record<string, unknown>)
      : {};
  const rawExecutionPreferences =
    existingOverlay?.executionPreferences && typeof existingOverlay.executionPreferences === "object"
      ? (existingOverlay.executionPreferences as Record<string, unknown>)
      : {};

  const normalizedCoreMemoriesFromSoul = normalizeCoreMemories(soul.coreMemories);
  const normalizedCoreMemoriesFromOverlay = normalizeCoreMemories(rawIdentityAnchors.coreMemories);
  const normalizedCoreMemories =
    normalizedCoreMemoriesFromOverlay.length > 0
      ? normalizedCoreMemoriesFromOverlay
      : normalizedCoreMemoriesFromSoul;

  const coreMemoryPolicy = normalizeCoreMemoryPolicy(
    soul.coreMemoryPolicy ?? existingOverlay?.coreMemoryPolicy,
  );

  const normalizedOverlay: SoulV2Overlay = {
    schemaVersion: SOUL_V2_OVERLAY_VERSION,
    identityAnchors: {
      name: toNonEmptyString(rawIdentityAnchors.name ?? soulRecord.name) ?? undefined,
      tagline: toNonEmptyString(rawIdentityAnchors.tagline ?? soulRecord.tagline) ?? undefined,
      traits: normalizeStringArray(rawIdentityAnchors.traits ?? soulRecord.traits),
      coreValues: normalizeStringArray(rawIdentityAnchors.coreValues ?? soulRecord.coreValues),
      neverDo: normalizeStringArray(rawIdentityAnchors.neverDo ?? soulRecord.neverDo),
      escalationTriggers: normalizeStringArray(
        rawIdentityAnchors.escalationTriggers ?? soulRecord.escalationTriggers,
      ),
      coreMemories: normalizedCoreMemories,
    },
    executionPreferences: {
      alwaysDo: normalizeStringArray(rawExecutionPreferences.alwaysDo ?? soulRecord.alwaysDo),
      communicationStyle: toNonEmptyString(
        rawExecutionPreferences.communicationStyle ?? soulRecord.communicationStyle,
      ) ?? undefined,
      toneGuidelines: toNonEmptyString(
        rawExecutionPreferences.toneGuidelines ?? soulRecord.toneGuidelines,
      ) ?? undefined,
      greetingStyle: toNonEmptyString(
        rawExecutionPreferences.greetingStyle ?? soulRecord.greetingStyle,
      ) ?? undefined,
      closingStyle: toNonEmptyString(
        rawExecutionPreferences.closingStyle ?? soulRecord.closingStyle,
      ) ?? undefined,
      emojiUsage: toNonEmptyString(
        rawExecutionPreferences.emojiUsage ?? soulRecord.emojiUsage,
      ) ?? undefined,
    },
    requireOwnerApprovalForMutations:
      typeof existingOverlay?.requireOwnerApprovalForMutations === "boolean"
        ? existingOverlay.requireOwnerApprovalForMutations
        : coreMemoryPolicy.requireOwnerApprovalForMutations,
  };

  soul.soulV2 = normalizedOverlay;
  soul.coreMemories = normalizedOverlay.identityAnchors.coreMemories;
  soul.coreMemoryPolicy = coreMemoryPolicy;

  if (normalizedOverlay.identityAnchors.name) {
    soulRecord.name = normalizedOverlay.identityAnchors.name;
  }
  if (normalizedOverlay.identityAnchors.tagline) {
    soulRecord.tagline = normalizedOverlay.identityAnchors.tagline;
  }
  if (normalizedOverlay.identityAnchors.traits) {
    soulRecord.traits = [...normalizedOverlay.identityAnchors.traits];
  }
  if (normalizedOverlay.identityAnchors.coreValues) {
    soulRecord.coreValues = [...normalizedOverlay.identityAnchors.coreValues];
  }
  if (normalizedOverlay.identityAnchors.neverDo) {
    soulRecord.neverDo = [...normalizedOverlay.identityAnchors.neverDo];
  }
  if (normalizedOverlay.identityAnchors.escalationTriggers) {
    soulRecord.escalationTriggers = [...normalizedOverlay.identityAnchors.escalationTriggers];
  }
  if (normalizedOverlay.executionPreferences.alwaysDo) {
    soulRecord.alwaysDo = [...normalizedOverlay.executionPreferences.alwaysDo];
  }
  if (normalizedOverlay.executionPreferences.communicationStyle) {
    soulRecord.communicationStyle = normalizedOverlay.executionPreferences.communicationStyle;
  }
  if (normalizedOverlay.executionPreferences.toneGuidelines) {
    soulRecord.toneGuidelines = normalizedOverlay.executionPreferences.toneGuidelines;
  }
  if (normalizedOverlay.executionPreferences.greetingStyle) {
    soulRecord.greetingStyle = normalizedOverlay.executionPreferences.greetingStyle;
  }
  if (normalizedOverlay.executionPreferences.closingStyle) {
    soulRecord.closingStyle = normalizedOverlay.executionPreferences.closingStyle;
  }
  if (normalizedOverlay.executionPreferences.emojiUsage) {
    soulRecord.emojiUsage = normalizedOverlay.executionPreferences.emojiUsage;
  }

  return soul;
}

// ============================================================================
// SOUL EVOLUTION POLICY
// ============================================================================

export interface SoulEvolutionPolicy {
  maxProposalsPerDay: number;
  maxProposalsPerWeek: number;
  cooldownAfterRejection: number;
  cooldownBetweenProposals: number;
  requireMinConversations: number;
  requireMinSessions: number;
  maxPendingProposals: number;
  autoReflectionSchedule: "daily" | "weekly" | "off";
  protectedFields: string[];
}

export const DEFAULT_SOUL_EVOLUTION_POLICY: SoulEvolutionPolicy = {
  maxProposalsPerDay: 3,
  maxProposalsPerWeek: 10,
  cooldownAfterRejection: 24 * 60 * 60 * 1000, // 24h in ms
  cooldownBetweenProposals: 4 * 60 * 60 * 1000, // 4h in ms
  requireMinConversations: 20,
  requireMinSessions: 5,
  maxPendingProposals: 5,
  autoReflectionSchedule: "weekly",
  protectedFields: ["neverDo", "blockedTopics", "escalationTriggers"],
};

const SOUL_PROPOSAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "applied",
] as const;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function clampDriftScore(value: unknown): number {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return 0;
  if (numeric < 0) return 0;
  if (numeric > 1) return 1;
  return Number(numeric.toFixed(4));
}

function normalizeDriftScores(value: unknown): SoulDriftScores | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const identity = clampDriftScore(record.identity);
  const scope = clampDriftScore(record.scope);
  const boundary = clampDriftScore(record.boundary);
  const performance = clampDriftScore(record.performance);
  const overallRaw = toFiniteNumber(record.overall);
  const overall = clampDriftScore(
    overallRaw === null ? (identity + scope + boundary + performance) / 4 : overallRaw
  );

  return {
    identity,
    scope,
    boundary,
    performance,
    overall,
  };
}

function normalizeAlignmentMode(value: unknown): SoulAlignmentMode | undefined {
  if (value === "monitor" || value === "remediate") {
    return value;
  }
  return undefined;
}

function normalizeCooldownMs(value: unknown): number {
  const numeric = toFiniteNumber(value);
  if (numeric === null || numeric < 0) return 0;
  return Math.floor(numeric);
}

function normalizePositivePolicyInteger(
  value: unknown,
  fallback: number,
  minimum = 1,
): number {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return fallback;
  }
  const rounded = Math.floor(numeric);
  return rounded < minimum ? minimum : rounded;
}

function normalizeNonNegativePolicyInteger(
  value: unknown,
  fallback: number,
): number {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return fallback;
  }
  const rounded = Math.floor(numeric);
  return rounded < 0 ? 0 : rounded;
}

function normalizeProtectedFieldList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_SOUL_EVOLUTION_POLICY.protectedFields];
  }
  const fields = value
    .map((item) => toNonEmptyString(item))
    .filter((item): item is string => Boolean(item));
  if (fields.length === 0) {
    return [...DEFAULT_SOUL_EVOLUTION_POLICY.protectedFields];
  }
  return Array.from(new Set(fields));
}

export function normalizeSoulEvolutionPolicy(value: unknown): SoulEvolutionPolicy {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_SOUL_EVOLUTION_POLICY };
  }

  const policy = value as Record<string, unknown>;
  const maxProposalsPerDay = normalizePositivePolicyInteger(
    policy.maxProposalsPerDay,
    DEFAULT_SOUL_EVOLUTION_POLICY.maxProposalsPerDay,
    1,
  );
  const maxProposalsPerWeek = Math.max(
    maxProposalsPerDay,
    normalizePositivePolicyInteger(
      policy.maxProposalsPerWeek,
      DEFAULT_SOUL_EVOLUTION_POLICY.maxProposalsPerWeek,
      1,
    ),
  );
  const cooldownAfterRejection = normalizeNonNegativePolicyInteger(
    policy.cooldownAfterRejection,
    DEFAULT_SOUL_EVOLUTION_POLICY.cooldownAfterRejection,
  );
  const cooldownBetweenProposals = normalizeNonNegativePolicyInteger(
    policy.cooldownBetweenProposals,
    DEFAULT_SOUL_EVOLUTION_POLICY.cooldownBetweenProposals,
  );
  const requireMinConversations = normalizeNonNegativePolicyInteger(
    policy.requireMinConversations,
    DEFAULT_SOUL_EVOLUTION_POLICY.requireMinConversations,
  );
  const requireMinSessions = normalizeNonNegativePolicyInteger(
    policy.requireMinSessions,
    DEFAULT_SOUL_EVOLUTION_POLICY.requireMinSessions,
  );
  const maxPendingProposals = normalizePositivePolicyInteger(
    policy.maxPendingProposals,
    DEFAULT_SOUL_EVOLUTION_POLICY.maxPendingProposals,
    1,
  );
  const autoReflectionSchedule =
    policy.autoReflectionSchedule === "daily"
    || policy.autoReflectionSchedule === "weekly"
    || policy.autoReflectionSchedule === "off"
      ? policy.autoReflectionSchedule
      : DEFAULT_SOUL_EVOLUTION_POLICY.autoReflectionSchedule;

  return {
    maxProposalsPerDay,
    maxProposalsPerWeek,
    cooldownAfterRejection,
    cooldownBetweenProposals,
    requireMinConversations,
    requireMinSessions,
    maxPendingProposals,
    autoReflectionSchedule,
    protectedFields: normalizeProtectedFieldList(policy.protectedFields),
  };
}

export function evaluateProposalCreationPolicy(
  policy: SoulEvolutionPolicy,
  snapshot: ProposalPolicySnapshot,
): ProposalPolicyDecision {
  if (snapshot.pendingCount >= policy.maxPendingProposals) {
    return { allowed: false, reason: "Too many pending proposals" };
  }

  if (snapshot.proposalsLast24Hours >= policy.maxProposalsPerDay) {
    return { allowed: false, reason: "Daily limit reached" };
  }

  if (snapshot.proposalsLast7Days >= policy.maxProposalsPerWeek) {
    return { allowed: false, reason: "Weekly limit reached" };
  }

  const cooldownAfterRejection = normalizeCooldownMs(policy.cooldownAfterRejection);
  if (
    typeof snapshot.lastRejectedAgeMs === "number"
    && snapshot.lastRejectedAgeMs < cooldownAfterRejection
  ) {
    return { allowed: false, reason: "Cooling down after rejection" };
  }

  const cooldownBetweenProposals = normalizeCooldownMs(policy.cooldownBetweenProposals);
  if (
    typeof snapshot.lastProposalAgeMs === "number"
    && snapshot.lastProposalAgeMs < cooldownBetweenProposals
  ) {
    return { allowed: false, reason: "Cooling down between proposals" };
  }

  if (snapshot.conversationCount < policy.requireMinConversations) {
    return { allowed: false, reason: "Not enough conversations for proposal generation" };
  }

  if (snapshot.sessionCount < policy.requireMinSessions) {
    return { allowed: false, reason: "Not enough sessions for proposal generation" };
  }

  return { allowed: true };
}

async function collectProposalPolicySnapshot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  agentId: Id<"objects">,
): Promise<ProposalPolicySnapshot> {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const proposalBuckets = await Promise.all(
    SOUL_PROPOSAL_STATUSES.map((status) =>
      ctx.db
        .query("soulProposals")
        .withIndex("by_agent_status", (q: any) =>
          q.eq("agentId", agentId).eq("status", status)
        )
        .collect()
    )
  );
  const proposals = proposalBuckets.flat();

  let pendingCount = 0;
  let proposalsLast24Hours = 0;
  let proposalsLast7Days = 0;
  let latestCreatedAt = 0;
  let latestRejectedAt = 0;

  for (const proposal of proposals) {
    if (proposal.status === "pending") {
      pendingCount += 1;
    }
    if (proposal.createdAt >= dayAgo) {
      proposalsLast24Hours += 1;
    }
    if (proposal.createdAt >= weekAgo) {
      proposalsLast7Days += 1;
    }
    if (proposal.createdAt > latestCreatedAt) {
      latestCreatedAt = proposal.createdAt;
    }
    if (proposal.status === "rejected") {
      const rejectedAt = proposal.reviewedAt ?? proposal.createdAt;
      if (rejectedAt > latestRejectedAt) {
        latestRejectedAt = rejectedAt;
      }
    }
  }

  const sessions = await ctx.db
    .query("agentSessions")
    .withIndex("by_agent", (q: any) => q.eq("agentId", agentId))
    .collect();

  const conversationMetrics = await ctx.db
    .query("agentConversationMetrics")
    .withIndex("by_agent", (q: any) => q.eq("agentId", agentId))
    .collect();

  return {
    pendingCount,
    proposalsLast24Hours,
    proposalsLast7Days,
    lastRejectedAgeMs: latestRejectedAt > 0 ? now - latestRejectedAt : undefined,
    lastProposalAgeMs: latestCreatedAt > 0 ? now - latestCreatedAt : undefined,
    conversationCount: conversationMetrics.length,
    sessionCount: sessions.length,
  };
}

function formatDriftSummary(scores: SoulDriftScores): string {
  return [
    `identity=${scores.identity.toFixed(2)}`,
    `scope=${scores.scope.toFixed(2)}`,
    `boundary=${scores.boundary.toFixed(2)}`,
    `performance=${scores.performance.toFixed(2)}`,
    `overall=${scores.overall.toFixed(2)}`,
  ].join(", ");
}

function normalizeSoulProposalTargetField(targetField: string): string {
  const normalized = targetField.trim();
  const prefixedMappings = [
    "soulV2.executionPreferences.",
    "executionPreferences.",
    "soulV2.identityAnchors.",
    "identityAnchors.",
  ];

  for (const prefix of prefixedMappings) {
    if (normalized.startsWith(prefix)) {
      return normalized.slice(prefix.length);
    }
  }

  return normalized;
}

export function isSoulV2IdentityAnchorField(targetField: string): boolean {
  const normalized = normalizeSoulProposalTargetField(targetField);
  return normalized.startsWith("coreMemories.")
    || SOUL_V2_IDENTITY_FIELD_SET.has(normalized);
}

export function isSoulV2ExecutionPreferenceField(targetField: string): boolean {
  const normalized = normalizeSoulProposalTargetField(targetField);
  return SOUL_V2_EXECUTION_FIELD_SET.has(normalized);
}

function resolveSoulOverlayLayer(
  targetField: string,
): "identity_anchor" | "execution_preference" | "legacy" {
  if (isSoulV2IdentityAnchorField(targetField)) {
    return "identity_anchor";
  }
  if (isSoulV2ExecutionPreferenceField(targetField)) {
    return "execution_preference";
  }
  return "legacy";
}

function isCoreMemoryTargetField(targetField: string): boolean {
  const normalized = normalizeSoulProposalTargetField(targetField);
  return normalized === "coreMemories" || normalized.startsWith("coreMemories.");
}

function isCoreMemoryPolicyTargetField(targetField: string): boolean {
  const normalized = normalizeSoulProposalTargetField(targetField);
  return normalized === "coreMemoryPolicy" || normalized.startsWith("coreMemoryPolicy.");
}

function previewProposalValue(value: string): string {
  return value.length <= 220 ? value : `${value.slice(0, 217)}...`;
}

function proposedCoreMemoryExplicitlyMutable(proposedValue: string): boolean {
  try {
    const parsed = JSON.parse(proposedValue);
    if (Array.isArray(parsed)) {
      return parsed.some(
        (item) =>
          item && typeof item === "object" && (item as Record<string, unknown>).immutable === false
      );
    }
    if (parsed && typeof parsed === "object") {
      return (parsed as Record<string, unknown>).immutable === false;
    }
  } catch {
    // Non-JSON payloads are normalized later and inherit immutable-by-default policy.
  }

  return false;
}

function parseCoreMemoryProposalValue(proposedValue: string): unknown {
  try {
    return JSON.parse(proposedValue);
  } catch {
    return {
      narrative: proposedValue,
      title: "Proposed Core Memory",
      type: "identity",
      source: "operator_curated",
    };
  }
}

export function evaluateSoulV2ProposalGuard(args: {
  targetField: string;
  proposalType: "add" | "modify" | "remove" | "add_faq";
}): { allowed: boolean; reason?: string } {
  const targetField = normalizeSoulProposalTargetField(args.targetField);
  if (targetField === "coreMemories") {
    return { allowed: true };
  }
  if (isSoulV2IdentityAnchorField(targetField)) {
    return {
      allowed: false,
      reason:
        "Soul v2 identity anchors are immutable; propose execution preferences instead.",
    };
  }
  return { allowed: true };
}

export function hasExplicitOwnerApprovalCheckpoint(
  proposal: Record<string, unknown>,
): boolean {
  if (proposal.requiresOwnerApproval === false) {
    return true;
  }
  const reviewedAt = normalizeOptionalNumber(proposal.reviewedAt);
  const reviewedBy = toNonEmptyString(proposal.reviewedBy)?.toLowerCase();
  const approvalCheckpointId = toNonEmptyString(proposal.approvalCheckpointId);
  if (!reviewedAt || !reviewedBy) {
    return false;
  }

  const explicitOwnerReviewer =
    reviewedBy === "owner"
    || reviewedBy === "owner_web"
    || reviewedBy === "owner_telegram";
  if (!explicitOwnerReviewer) {
    return false;
  }

  return Boolean(approvalCheckpointId) || explicitOwnerReviewer;
}

function resolveTrustActorType(reviewer: string): TrustEventActorType {
  const normalized = reviewer.trim().toLowerCase();
  if (normalized.startsWith("owner") || normalized.startsWith("user")) {
    return "user";
  }
  if (normalized.startsWith("agent")) {
    return "agent";
  }
  return "system";
}

async function emitSoulTrustEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    eventName: TrustEventName;
    organizationId: Id<"organizations">;
    agentId: Id<"objects">;
    actorType: TrustEventActorType;
    actorId: string;
    sessionId?: Id<"agentSessions">;
    proposalId?: string;
    proposalVersion?: string;
    riskLevel?: string;
    reviewDecision?: string;
    rollbackTarget?: string;
    channel?: string;
    occurredAt?: number;
  },
): Promise<void> {
  const occurredAt = args.occurredAt ?? Date.now();
  const payload: TrustEventPayload = {
    event_id: `${args.eventName}:${args.proposalId || String(args.agentId)}:${occurredAt}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: occurredAt,
    org_id: args.organizationId,
    mode: "agents",
    channel: args.channel || "soul_evolution",
    session_id: args.sessionId ? String(args.sessionId) : `soul:${String(args.agentId)}`,
    actor_type: args.actorType,
    actor_id: args.actorId,
    proposal_id: args.proposalId || "none",
    proposal_version: args.proposalVersion || `overlay-v${SOUL_V2_OVERLAY_VERSION}`,
    risk_level: args.riskLevel || "unknown",
    review_decision: args.reviewDecision || "pending",
    rollback_target: args.rollbackTarget || "none",
  };

  const validation = validateTrustEventPayload(args.eventName, payload);
  await ctx.db.insert("aiTrustEvents", {
    event_name: args.eventName,
    payload,
    schema_validation_status: validation.ok ? "passed" : "failed",
    schema_errors: validation.ok ? undefined : validation.errors,
    created_at: occurredAt,
  });
}

interface OutcomeTelemetrySummary {
  scannedMetrics: number;
  ownerCorrectionRate: number;
  toolFailureRate: number;
  escalationRate: number;
  negativeSentimentRate: number;
  unresolvedQuestionRate: number;
}

function summarizeOutcomeTelemetry(
  metrics: Array<Record<string, unknown>>,
): OutcomeTelemetrySummary {
  const scannedMetrics = metrics.length;
  if (scannedMetrics === 0) {
    return {
      scannedMetrics: 0,
      ownerCorrectionRate: 0,
      toolFailureRate: 0,
      escalationRate: 0,
      negativeSentimentRate: 0,
      unresolvedQuestionRate: 0,
    };
  }

  let ownerCorrections = 0;
  let toolCalls = 0;
  let toolFailures = 0;
  let escalations = 0;
  let negativeSentiments = 0;
  let unresolvedQuestionSessions = 0;

  for (const metric of metrics) {
    if (metric.ownerCorrected === true) {
      ownerCorrections += 1;
    }
    const currentToolCalls = normalizeOptionalNumber(metric.toolCallCount) ?? 0;
    const currentToolFailures = normalizeOptionalNumber(metric.toolFailureCount) ?? 0;
    toolCalls += currentToolCalls;
    toolFailures += currentToolFailures;

    if (metric.escalated === true) {
      escalations += 1;
    }
    if (metric.customerSentiment === "negative") {
      negativeSentiments += 1;
    }
    if (Array.isArray(metric.unansweredQuestions) && metric.unansweredQuestions.length > 0) {
      unresolvedQuestionSessions += 1;
    }
  }

  return {
    scannedMetrics,
    ownerCorrectionRate: Number((ownerCorrections / scannedMetrics).toFixed(4)),
    toolFailureRate:
      toolCalls > 0 ? Number((toolFailures / toolCalls).toFixed(4)) : 0,
    escalationRate: Number((escalations / scannedMetrics).toFixed(4)),
    negativeSentimentRate: Number((negativeSentiments / scannedMetrics).toFixed(4)),
    unresolvedQuestionRate: Number((unresolvedQuestionSessions / scannedMetrics).toFixed(4)),
  };
}

function formatOutcomeTelemetrySummary(summary: OutcomeTelemetrySummary): string {
  if (summary.scannedMetrics === 0) {
    return "No recent outcome telemetry available.";
  }
  return [
    `metrics=${summary.scannedMetrics}`,
    `owner_correction_rate=${summary.ownerCorrectionRate.toFixed(2)}`,
    `tool_failure_rate=${summary.toolFailureRate.toFixed(2)}`,
    `escalation_rate=${summary.escalationRate.toFixed(2)}`,
    `negative_sentiment_rate=${summary.negativeSentimentRate.toFixed(2)}`,
    `unresolved_question_rate=${summary.unresolvedQuestionRate.toFixed(2)}`,
  ].join(", ");
}

export function evaluateCoreMemoryProposalGuard(args: {
  targetField: string;
  proposalType: "add" | "modify" | "remove" | "add_faq";
  proposedValue: string;
  policy: CoreMemoryPolicy;
}): { allowed: boolean; reason?: string } {
  if (isCoreMemoryPolicyTargetField(args.targetField)) {
    return {
      allowed: false,
      reason: "Core memory policy is operator-managed and cannot be changed by agent proposals.",
    };
  }

  if (!isCoreMemoryTargetField(args.targetField)) {
    return { allowed: true };
  }

  if (args.proposalType !== "add") {
    return {
      allowed: false,
      reason: "Core memories are immutable-by-default; only additive proposals are allowed.",
    };
  }

  if (
    args.policy.immutableByDefault
    && proposedCoreMemoryExplicitlyMutable(args.proposedValue)
  ) {
    return {
      allowed: false,
      reason: "Core memory proposal cannot set immutable=false while immutable-by-default is enabled.",
    };
  }

  return { allowed: true };
}

export function buildOperatorReviewPayload(args: {
  targetField: string;
  proposalType: "add" | "modify" | "remove" | "add_faq";
  triggerType: SoulProposalTriggerType;
  reason: string;
  proposedValue: string;
  policy: CoreMemoryPolicy;
  driftSummary?: string;
}): OperatorReviewPayload {
  const coreMemoryTarget = isCoreMemoryTargetField(args.targetField);
  const overlayLayer = resolveSoulOverlayLayer(args.targetField);
  const immutableByDefault = args.policy.immutableByDefault;
  const guard = evaluateCoreMemoryProposalGuard({
    targetField: args.targetField,
    proposalType: args.proposalType,
    proposedValue: args.proposedValue,
    policy: args.policy,
  });
  const soulV2Guard = evaluateSoulV2ProposalGuard({
    targetField: args.targetField,
    proposalType: args.proposalType,
  });

  const reviewChecklist = [
    "Confirm proposal intent matches recent conversation evidence.",
    "Confirm no policy-protected fields are being bypassed.",
  ];

  if (coreMemoryTarget) {
    reviewChecklist.push(
      immutableByDefault
        ? "Confirm core-memory immutability is preserved (no mutable override)."
        : "Confirm mutable core-memory exception is explicitly justified."
    );
  }

  if (args.driftSummary) {
    reviewChecklist.push(`Review drift context: ${args.driftSummary}`);
  }

  if (!guard.allowed && guard.reason) {
    reviewChecklist.push(`Guardrail block reason: ${guard.reason}`);
  }
  if (!soulV2Guard.allowed && soulV2Guard.reason) {
    reviewChecklist.push(`Soul v2 guardrail block reason: ${soulV2Guard.reason}`);
  }

  const riskLevel: OperatorReviewPayload["riskLevel"] = !guard.allowed || !soulV2Guard.allowed
    ? "high"
    : coreMemoryTarget
      ? "high"
      : overlayLayer === "identity_anchor"
        ? "high"
      : args.triggerType === "alignment"
        ? "medium"
        : "low";

  return {
    targetField: args.targetField,
    proposalType: args.proposalType,
    triggerType: args.triggerType,
    requiresOwnerApproval: true,
    overlayLayer,
    immutableByDefault,
    coreMemoryTarget,
    riskLevel,
    reviewChecklist,
    summary: args.reason,
    proposedValuePreview: previewProposalValue(args.proposedValue),
  };
}

// ============================================================================
// RATE LIMITING & VALIDATION
// ============================================================================

/**
 * Check whether a new proposal can be created for this agent.
 * Enforces policy guards for pending/day/week/cooldown + conversation/session gates.
 */
export const canCreateProposalQuery = internalQuery({
  args: {
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) return { allowed: false, reason: "Agent not found" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (agent.customProperties || {}) as Record<string, any>;
    if (config.protected) return { allowed: false, reason: "Protected agent" };

    const policy = normalizeSoulEvolutionPolicy(config.soulEvolutionPolicy);
    const snapshot = await collectProposalPolicySnapshot(ctx, args.agentId);
    return evaluateProposalCreationPolicy(policy, snapshot);
  },
});

/**
 * Validate that a proposal doesn't target a protected field.
 */
function validateProposalTarget(
  targetField: string,
  policy: SoulEvolutionPolicy,
): { valid: boolean; reason?: string } {
  if (policy.protectedFields.includes(targetField)) {
    return { valid: false, reason: `"${targetField}" is protected` };
  }
  return { valid: true };
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new soul proposal (called by the tool).
 * Now enforces rate limits and protected field validation.
 */
export const createProposal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    sessionId: v.optional(v.id("agentSessions")),
    proposalType: v.union(
      v.literal("add"),
      v.literal("modify"),
      v.literal("remove"),
      v.literal("add_faq"),
    ),
    targetField: v.string(),
    currentValue: v.optional(v.string()),
    proposedValue: v.string(),
    reason: v.string(),
    triggerType: v.union(
      v.literal("conversation"),
      v.literal("reflection"),
      v.literal("owner_directed"),
      v.literal("alignment"),
    ),
    evidenceMessages: v.optional(v.array(v.string())),
    alignmentMode: v.optional(v.union(v.literal("monitor"), v.literal("remediate"))),
    driftScores: v.optional(v.object({
      identity: v.number(),
      scope: v.number(),
      boundary: v.number(),
      performance: v.number(),
      overall: v.number(),
    })),
    driftSummary: v.optional(v.string()),
    driftSignalSource: v.optional(v.string()),
    telemetrySummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (agent.customProperties || {}) as Record<string, any>;
    if (config.protected) {
      console.log("[SoulEvolution] Proposal blocked: protected agent");
      return null;
    }

    const policy = normalizeSoulEvolutionPolicy(config.soulEvolutionPolicy);
    const soul = normalizeSoulModel(config.soul);
    const coreMemoryPolicy = soul.coreMemoryPolicy ?? DEFAULT_CORE_MEMORY_POLICY;

    // Protected field check
    const validation = validateProposalTarget(args.targetField, policy);
    if (!validation.valid) {
      console.log(`[SoulEvolution] Proposal invalid: ${validation.reason}`);
      return null;
    }

    const coreMemoryGuard = evaluateCoreMemoryProposalGuard({
      targetField: args.targetField,
      proposalType: args.proposalType,
      proposedValue: args.proposedValue,
      policy: coreMemoryPolicy,
    });
    if (!coreMemoryGuard.allowed) {
      console.log(`[SoulEvolution] Proposal blocked: ${coreMemoryGuard.reason}`);
      return null;
    }

    const soulV2Guard = evaluateSoulV2ProposalGuard({
      targetField: args.targetField,
      proposalType: args.proposalType,
    });
    if (!soulV2Guard.allowed) {
      console.log(`[SoulEvolution] Proposal blocked: ${soulV2Guard.reason}`);
      return null;
    }

    // Skip rate limits for owner-directed proposals
    if (args.triggerType !== "owner_directed") {
      const snapshot = await collectProposalPolicySnapshot(ctx, args.agentId);
      const decision = evaluateProposalCreationPolicy(policy, snapshot);
      if (!decision.allowed) {
        console.log(`[SoulEvolution] Proposal blocked: ${decision.reason}`);
        return null;
      }
    }

    const driftScores = normalizeDriftScores(args.driftScores);
    const alignmentMode =
      args.triggerType === "alignment"
        ? normalizeAlignmentMode(args.alignmentMode) ?? "monitor"
        : undefined;

    if (args.triggerType === "alignment" && !driftScores) {
      console.log("[SoulEvolution] Alignment proposal blocked: missing driftScores");
      return null;
    }

    const driftSummary = toNonEmptyString(args.driftSummary)
      ?? (driftScores ? formatDriftSummary(driftScores) : undefined);
    const driftSignalSource = toNonEmptyString(args.driftSignalSource) ?? undefined;
    const telemetrySummary = toNonEmptyString(args.telemetrySummary) ?? undefined;
    const createdAt = Date.now();

    const reviewPayload = buildOperatorReviewPayload({
      targetField: args.targetField,
      proposalType: args.proposalType,
      triggerType: args.triggerType,
      reason: args.reason,
      proposedValue: args.proposedValue,
      policy: coreMemoryPolicy,
      driftSummary,
    });

    const proposalId = await ctx.db.insert("soulProposals", {
      ...args,
      alignmentMode,
      driftScores,
      driftSummary,
      driftSignalSource,
      telemetrySummary,
      requiresOwnerApproval: true,
      status: "pending",
      createdAt,
    } as any);

    let channel = "soul_evolution";
    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId);
      channel =
        toNonEmptyString(session?.channel)
        || channel;
    }

    await emitSoulTrustEvent(ctx, {
      eventName: "trust.soul.proposal_created.v1",
      organizationId: args.organizationId,
      agentId: args.agentId,
      actorType: args.triggerType === "owner_directed" ? "user" : "agent",
      actorId: args.triggerType === "owner_directed" ? "owner" : String(args.agentId),
      sessionId: args.sessionId,
      proposalId: String(proposalId),
      proposalVersion: `overlay-v${SOUL_V2_OVERLAY_VERSION}`,
      riskLevel: reviewPayload.riskLevel,
      reviewDecision: "pending",
      rollbackTarget: "none",
      channel,
    });

    return proposalId;
  },
});

/**
 * Approve a proposal — called when owner taps [Approve] in Telegram
 */
export const approveProposal = internalMutation({
  args: {
    proposalId: v.id("soulProposals"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.status !== "pending") {
      return { error: "Proposal not found or already processed" };
    }

    const agent = await ctx.db.get(proposal.agentId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (agent?.customProperties || {}) as Record<string, any>;
    const soul = normalizeSoulModel(config.soul);
    const coreMemoryPolicy = soul.coreMemoryPolicy ?? DEFAULT_CORE_MEMORY_POLICY;
    const reviewPayload = buildOperatorReviewPayload({
      targetField: proposal.targetField,
      proposalType: proposal.proposalType,
      triggerType: proposal.triggerType,
      reason: proposal.reason,
      proposedValue: proposal.proposedValue,
      policy: coreMemoryPolicy,
      driftSummary: proposal.driftSummary ?? undefined,
    });
    const reviewedAt = Date.now();
    const approvalCheckpointId = `owner_approval:${String(args.proposalId)}:${reviewedAt}`;

    // Mark as approved
    await ctx.db.patch(args.proposalId, {
      status: "approved",
      reviewedAt,
      reviewedBy: "owner_telegram",
      approvalCheckpointId,
    } as any);

    // Record feedback for learning loop (Step 10)
    await ctx.db.insert("proposalFeedback", {
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      proposalId: args.proposalId,
      outcome: "approved",
      proposalSummary: `${proposal.proposalType} ${proposal.targetField}: ${proposal.proposedValue}`,
      createdAt: reviewedAt,
    });

    await emitSoulTrustEvent(ctx, {
      eventName: "trust.soul.proposal_reviewed.v1",
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      actorType: "user",
      actorId: "owner_telegram",
      sessionId: proposal.sessionId ?? undefined,
      proposalId: String(args.proposalId),
      proposalVersion: `overlay-v${SOUL_V2_OVERLAY_VERSION}`,
      riskLevel: reviewPayload.riskLevel,
      reviewDecision: "approved",
      rollbackTarget: "none",
    });

    return { success: true, proposal };
  },
});

/**
 * Reject a proposal — called when owner taps [Reject]
 */
export const rejectProposal = internalMutation({
  args: {
    proposalId: v.id("soulProposals"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.status !== "pending") {
      return { error: "Proposal not found or already processed" };
    }

    const agent = await ctx.db.get(proposal.agentId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (agent?.customProperties || {}) as Record<string, any>;
    const soul = normalizeSoulModel(config.soul);
    const coreMemoryPolicy = soul.coreMemoryPolicy ?? DEFAULT_CORE_MEMORY_POLICY;
    const reviewPayload = buildOperatorReviewPayload({
      targetField: proposal.targetField,
      proposalType: proposal.proposalType,
      triggerType: proposal.triggerType,
      reason: proposal.reason,
      proposedValue: proposal.proposedValue,
      policy: coreMemoryPolicy,
      driftSummary: proposal.driftSummary ?? undefined,
    });
    const reviewedAt = Date.now();
    const approvalCheckpointId = `owner_review:${String(args.proposalId)}:${reviewedAt}`;

    await ctx.db.patch(args.proposalId, {
      status: "rejected",
      reviewedAt,
      reviewedBy: "owner_telegram",
      approvalCheckpointId,
    } as any);

    // Record feedback for learning loop (Step 10)
    await ctx.db.insert("proposalFeedback", {
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      proposalId: args.proposalId,
      outcome: "rejected",
      proposalSummary: `${proposal.proposalType} ${proposal.targetField}: ${proposal.proposedValue}`,
      createdAt: reviewedAt,
    });

    await emitSoulTrustEvent(ctx, {
      eventName: "trust.soul.proposal_reviewed.v1",
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      actorType: "user",
      actorId: "owner_telegram",
      sessionId: proposal.sessionId ?? undefined,
      proposalId: String(args.proposalId),
      proposalVersion: `overlay-v${SOUL_V2_OVERLAY_VERSION}`,
      riskLevel: reviewPayload.riskLevel,
      reviewDecision: "rejected",
      rollbackTarget: "none",
    });

    return { success: true };
  },
});

/**
 * Apply an approved proposal to the agent's soul
 */
export const applyProposal = internalMutation({
  args: {
    proposalId: v.id("soulProposals"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.status !== "approved") {
      return { error: "Proposal not approved" };
    }
    if (!hasExplicitOwnerApprovalCheckpoint(proposal as Record<string, unknown>)) {
      return {
        error: "Explicit owner approval checkpoint is required before applying soul updates.",
      };
    }

    // Load agent
    const agent = await ctx.db.get(proposal.agentId);
    if (!agent) return { error: "Agent not found" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (agent.customProperties || {}) as Record<string, any>;
    const soul = normalizeSoulModel(config.soul);
    const soulRecord = soul as Record<string, unknown>;

    // Snapshot the soul before modification (for version history)
    const previousSoulSnapshot = JSON.stringify(soul);

    // Apply the change based on proposal type
    const field = normalizeSoulProposalTargetField(proposal.targetField);
    const coreMemoryPolicy = soul.coreMemoryPolicy ?? DEFAULT_CORE_MEMORY_POLICY;
    const coreMemoryGuard = evaluateCoreMemoryProposalGuard({
      targetField: field,
      proposalType: proposal.proposalType,
      proposedValue: proposal.proposedValue,
      policy: coreMemoryPolicy,
    });
    if (!coreMemoryGuard.allowed) {
      return { error: coreMemoryGuard.reason ?? "Core memory proposal blocked by policy." };
    }
    const soulV2Guard = evaluateSoulV2ProposalGuard({
      targetField: field,
      proposalType: proposal.proposalType,
    });
    if (!soulV2Guard.allowed) {
      return { error: soulV2Guard.reason ?? "Soul v2 proposal blocked by policy." };
    }

    if (!soul.soulV2) {
      soul.soulV2 = {
        schemaVersion: SOUL_V2_OVERLAY_VERSION,
        identityAnchors: { coreMemories: soul.coreMemories ?? [] },
        executionPreferences: {},
        requireOwnerApprovalForMutations: true,
      };
    }
    const executionPreferences = soul.soulV2.executionPreferences;
    const identityAnchors = soul.soulV2.identityAnchors;
    const reviewedBy = toNonEmptyString(proposal.reviewedBy) ?? "owner";
    const approvedAt = normalizeOptionalNumber(proposal.reviewedAt) ?? Date.now();

    switch (proposal.proposalType) {
      case "add": {
        if (field === "coreMemories") {
          const currentCoreMemories = Array.isArray(soul.coreMemories)
            ? [...soul.coreMemories]
            : [];
          const normalizedCandidate = normalizeCoreMemory(
            parseCoreMemoryProposalValue(proposal.proposedValue),
            currentCoreMemories.length,
          );
          if (!normalizedCandidate) {
            return { error: "Invalid core memory proposal payload." };
          }

          if (coreMemoryPolicy.immutableByDefault) {
            normalizedCandidate.immutable = true;
            normalizedCandidate.immutableReason =
              normalizedCandidate.immutableReason ?? "identity_anchor";
          }

          if (normalizedCandidate.source === "unknown") {
            normalizedCandidate.source = "operator_curated";
          }
          normalizedCandidate.approvedAt = approvedAt;
          normalizedCandidate.approvedBy = reviewedBy;
          soul.coreMemories = [...currentCoreMemories, normalizedCandidate];
          identityAnchors.coreMemories = [...currentCoreMemories, normalizedCandidate];
          break;
        }

        if (isSoulV2ExecutionPreferenceField(field)) {
          if (field === "alwaysDo") {
            const currentAlwaysDo = Array.isArray(executionPreferences.alwaysDo)
              ? executionPreferences.alwaysDo
              : [];
            executionPreferences.alwaysDo = [...currentAlwaysDo, proposal.proposedValue];
            break;
          }
          return { error: `Field "${field}" does not support additive proposals.` };
        }

        const current = soulRecord[field];
        if (Array.isArray(current)) {
          soulRecord[field] = [...current, proposal.proposedValue];
        }
        break;
      }
      case "modify": {
        if (isCoreMemoryTargetField(field) || isCoreMemoryPolicyTargetField(field)) {
          return { error: "Core memory records are immutable in proposal apply path." };
        }
        if (isSoulV2IdentityAnchorField(field)) {
          return { error: "Soul v2 identity anchors are immutable in proposal apply path." };
        }
        if (isSoulV2ExecutionPreferenceField(field)) {
          if (field === "alwaysDo") {
            const currentAlwaysDo = Array.isArray(executionPreferences.alwaysDo)
              ? [...executionPreferences.alwaysDo]
              : [];
            if (proposal.currentValue) {
              const index = currentAlwaysDo.findIndex(
                (entry) => entry === proposal.currentValue,
              );
              if (index >= 0) {
                currentAlwaysDo[index] = proposal.proposedValue;
              } else {
                currentAlwaysDo.push(proposal.proposedValue);
              }
            } else {
              currentAlwaysDo.push(proposal.proposedValue);
            }
            executionPreferences.alwaysDo = currentAlwaysDo;
            break;
          }

          if (
            field === "communicationStyle"
            || field === "toneGuidelines"
            || field === "greetingStyle"
            || field === "closingStyle"
            || field === "emojiUsage"
          ) {
            executionPreferences[field] = proposal.proposedValue;
          }
          break;
        }
        soulRecord[field] = proposal.proposedValue;
        break;
      }
      case "remove": {
        if (isCoreMemoryTargetField(field) || isCoreMemoryPolicyTargetField(field)) {
          return { error: "Core memory records are immutable in proposal apply path." };
        }
        if (isSoulV2IdentityAnchorField(field)) {
          return { error: "Soul v2 identity anchors are immutable in proposal apply path." };
        }
        if (isSoulV2ExecutionPreferenceField(field)) {
          if (field === "alwaysDo") {
            const currentAlwaysDo = Array.isArray(executionPreferences.alwaysDo)
              ? executionPreferences.alwaysDo
              : [];
            executionPreferences.alwaysDo = currentAlwaysDo.filter(
              (entry) => entry !== proposal.currentValue,
            );
            break;
          }
          if (
            field === "communicationStyle"
            || field === "toneGuidelines"
            || field === "greetingStyle"
            || field === "closingStyle"
            || field === "emojiUsage"
          ) {
            executionPreferences[field] = undefined;
          }
          break;
        }
        const arr = soulRecord[field];
        if (Array.isArray(arr)) {
          soulRecord[field] = arr.filter((item: string) => item !== proposal.currentValue);
        }
        break;
      }
      case "add_faq": {
        const match = proposal.proposedValue.match(/Q:\s*(.+?)\s*\|\s*A:\s*(.+)/);
        if (match) {
          const faqEntries = config.faqEntries || [];
          faqEntries.push({ q: match[1].trim(), a: match[2].trim() });
          config.faqEntries = faqEntries;
        }
        break;
      }
    }

    const projectedSoul = normalizeSoulModel(soul);
    const changedAt = Date.now();

    // Bump soul version
    projectedSoul.version = (projectedSoul.version || 1) + 1;
    projectedSoul.lastUpdatedAt = changedAt;
    projectedSoul.lastUpdatedBy = "agent_self_after_owner_approval";
    if (projectedSoul.soulV2) {
      projectedSoul.soulV2.schemaVersion = SOUL_V2_OVERLAY_VERSION;
    }

    // Save back to agent
    config.soul = projectedSoul;
    await ctx.db.patch(proposal.agentId, {
      customProperties: config,
    });

    // Mark proposal as applied
    await ctx.db.patch(args.proposalId, {
      status: "applied",
      appliedAt: changedAt,
      appliedBy: "system_after_owner_approval",
    } as any);

    // Record version history (Step 10)
    await ctx.db.insert("soulVersionHistory", {
      agentId: proposal.agentId,
      organizationId: proposal.organizationId,
      version: projectedSoul.version,
      previousSoul: previousSoulSnapshot,
      newSoul: JSON.stringify(projectedSoul),
      changeType: "soul_proposal_applied",
      proposalId: args.proposalId,
      soulSchemaVersion: SOUL_V2_OVERLAY_VERSION,
      soulOverlayVersion: projectedSoul.soulV2?.schemaVersion ?? SOUL_V2_OVERLAY_VERSION,
      changedBy: "system_after_owner_approval",
      changedAt,
    } as any);

    await emitSoulTrustEvent(ctx, {
      eventName: "trust.soul.proposal_reviewed.v1",
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      actorType: resolveTrustActorType("system_after_owner_approval"),
      actorId: "system_after_owner_approval",
      sessionId: proposal.sessionId ?? undefined,
      proposalId: String(args.proposalId),
      proposalVersion: `overlay-v${SOUL_V2_OVERLAY_VERSION}`,
      riskLevel: "medium",
      reviewDecision: "applied",
      rollbackTarget: "none",
    });

    return { success: true, newSoulVersion: projectedSoul.version };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

export const getProposalOperatorReviewPayload = internalQuery({
  args: {
    proposalId: v.id("soulProposals"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) {
      return null;
    }

    const agent = await ctx.db.get(proposal.agentId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (agent?.customProperties || {}) as Record<string, any>;
    const soul = normalizeSoulModel(config.soul);
    const policy = soul.coreMemoryPolicy ?? DEFAULT_CORE_MEMORY_POLICY;

    return buildOperatorReviewPayload({
      targetField: proposal.targetField,
      proposalType: proposal.proposalType,
      triggerType: proposal.triggerType,
      reason: proposal.reason,
      proposedValue: proposal.proposedValue,
      policy,
      driftSummary: proposal.driftSummary ?? undefined,
    });
  },
});

/**
 * Get pending proposals for an agent
 */
export const getPendingProposals = internalQuery({
  args: {
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("soulProposals")
      .withIndex("by_agent_status", (q) =>
        q.eq("agentId", args.agentId).eq("status", "pending")
      )
      .collect();
  },
});

/**
 * Get proposal history for an org (for dashboard/review)
 */
export const getProposalHistory = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("soulProposals")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(args.limit || 20);
  },
});

export const getProposalById = internalQuery({
  args: { proposalId: v.id("soulProposals") },
  handler: async (ctx, args) => ctx.db.get(args.proposalId),
});

export const updateProposalTelegram = internalMutation({
  args: {
    proposalId: v.id("soulProposals"),
    telegramMessageId: v.number(),
    telegramChatId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.proposalId, {
      telegramMessageId: args.telegramMessageId,
      telegramChatId: args.telegramChatId,
    });
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Notify owner via Telegram inline buttons when a proposal is created
 */
export const notifyOwnerOfProposal = internalAction({
  args: {
    proposalId: v.id("soulProposals"),
    telegramChatId: v.string(),
  },
  handler: async (ctx, args) => {
    const proposal = await (ctx as any).runQuery(
      generatedApi.internal.ai.soulEvolution.getProposalById,
      { proposalId: args.proposalId }
    );

    if (!proposal) return { error: "Proposal not found" };

    // Load agent name
    const agent = await (ctx as any).runQuery(
      generatedApi.internal.agentOntology.getAgentInternal,
      { agentId: proposal.agentId }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentName = (agent?.customProperties as any)?.soul?.name
      || (agent?.customProperties as any)?.displayName
      || "Your agent";
    const reviewPayload = await (ctx as any).runQuery(
      generatedApi.internal.ai.soulEvolution.getProposalOperatorReviewPayload,
      { proposalId: args.proposalId }
    );

    // Format proposal message
    const typeLabels: Record<string, string> = {
      add: "ADD to",
      modify: "CHANGE",
      remove: "REMOVE from",
      add_faq: "ADD FAQ to",
    };

    const lines = [
      `*${agentName}* wants to update its personality:\n`,
      `*${typeLabels[proposal.proposalType] || proposal.proposalType}* \`${proposal.targetField}\`:`,
      `"${proposal.proposedValue}"\n`,
      `*Reason:* ${proposal.reason}`,
    ];

    if (reviewPayload?.riskLevel) {
      lines.push(`*Operator risk:* ${String(reviewPayload.riskLevel).toUpperCase()}`);
    }
    if (Array.isArray(reviewPayload?.reviewChecklist) && reviewPayload.reviewChecklist.length > 0) {
      lines.push(`*Review checklist:* ${reviewPayload.reviewChecklist.slice(0, 2).join(" | ")}`);
    }

    if (proposal.currentValue) {
      lines.splice(2, 0, `*Currently:* "${proposal.currentValue}"`);
    }

    const text = lines.join("\n");

    // Send with inline keyboard
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return { error: "No Telegram bot token" };

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: args.telegramChatId,
        text,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Approve", callback_data: `soul_approve:${args.proposalId}` },
              { text: "Reject", callback_data: `soul_reject:${args.proposalId}` },
            ],
          ],
        },
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as any;

    // Store the Telegram message ID for later reference
    if (data.ok && data.result?.message_id) {
      await (ctx as any).runMutation(
        generatedApi.internal.ai.soulEvolution.updateProposalTelegram,
        {
          proposalId: args.proposalId,
          telegramMessageId: data.result.message_id,
          telegramChatId: args.telegramChatId,
        }
      );
    }

    return { success: true };
  },
});

/**
 * Handle Telegram callback (approve/reject button tap)
 * Called from the Telegram webhook/bridge when callback_data starts with "soul_"
 */
export const handleTelegramCallback = action({
  args: {
    callbackData: v.string(),
    telegramChatId: v.string(),
    callbackQueryId: v.string(),
  },
  handler: async (ctx, args) => {
    const [actionType, rawProposalId] = args.callbackData.split(":");

    if (!rawProposalId) return { error: "Invalid callback data" };
    const proposalId = rawProposalId as Id<"soulProposals">;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (actionType === "soul_approve") {
      // Approve + apply in sequence
      await (ctx as any).runMutation(
        generatedApi.internal.ai.soulEvolution.approveProposal,
        { proposalId }
      );
      const result = await (ctx as any).runMutation(
        generatedApi.internal.ai.soulEvolution.applyProposal,
        { proposalId }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any;

      // Answer callback + send confirmation
      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: args.callbackQueryId,
            text: "Soul updated!",
          }),
        });
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: args.telegramChatId,
            text: `Soul updated (v${result?.newSoulVersion || "?"}).`,
          }),
        });
      }
    } else if (actionType === "soul_reject") {
      await (ctx as any).runMutation(
        generatedApi.internal.ai.soulEvolution.rejectProposal,
        { proposalId }
      );

      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: args.callbackQueryId,
            text: "Proposal rejected.",
          }),
        });
      }
    }

    return { success: true };
  },
});

/**
 * Periodic self-reflection — run by a scheduled job
 * Reviews recent conversations and generates soul proposals
 */
export const runSelfReflection = internalAction({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // 1. Load agent + soul
    const agent = await (ctx as any).runQuery(
      generatedApi.internal.agentOntology.getAgentInternal,
      { agentId: args.agentId }
    );
    if (!agent) return { error: "Agent not found" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const soul = (agent.customProperties as any)?.soul;
    const telemetrySince = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentMetrics = await (ctx as any).runQuery(
      generatedApi.internal.ai.selfImprovement.getMetricsSince,
      {
        agentId: args.agentId,
        since: telemetrySince,
      },
    );
    const telemetrySummary = formatOutcomeTelemetrySummary(
      summarizeOutcomeTelemetry(
        Array.isArray(recentMetrics)
          ? (recentMetrics as Array<Record<string, unknown>>)
          : [],
      ),
    );

    // 2. Load recent sessions
    const recentSessions = await (ctx as any).runQuery(
      generatedApi.internal.ai.agentSessions.getRecentSessionsForAgent,
      { agentId: args.agentId, limit: 20 }
    );

    if (!recentSessions?.length) return { message: "No recent conversations to reflect on" };

    // 3. Collect conversation summaries
    const summaries: string[] = [];
    for (const session of recentSessions.slice(0, 10)) {
      const messages = await (ctx as any).runQuery(
        generatedApi.internal.ai.agentSessions.getSessionMessages,
        { sessionId: session._id, limit: 20 }
      );
      if (messages?.length) {
        const summary = messages
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((m: any) => `[${m.role}]: ${m.content?.slice(0, 100)}`)
          .join("\n");
        summaries.push(`--- Session (${session.channel}) ---\n${summary}`);
      }
    }

    // 4. Call LLM for self-reflection
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { error: "No API key" };

    const { OpenRouterClient } = await import("./openrouter");
    const client = new OpenRouterClient(apiKey);

    const reflectionPrompt = `You are reviewing your own recent conversations to find ways to improve.

=== YOUR CURRENT SOUL ===
${JSON.stringify(soul, null, 2)}
=== END SOUL ===

=== RECENT CONVERSATIONS ===
${summaries.join("\n\n")}
=== END CONVERSATIONS ===

=== OUTCOME TELEMETRY (LAST 7 DAYS) ===
${telemetrySummary}
=== END TELEMETRY ===

Based on these conversations, suggest 0-3 specific improvements to your soul/personality.
For each suggestion, output a JSON object:
{
  "proposals": [
    {
      "proposalType": "add|modify|remove|add_faq",
      "targetField": "alwaysDo|neverDo|communicationStyle|etc.",
      "currentValue": "only for modify/remove",
      "proposedValue": "the new value",
      "reason": "specific evidence from conversations"
    }
  ]
}

Rules:
- Only suggest changes backed by evidence from multiple conversations
- Don't suggest changes that duplicate existing rules
- If nothing needs changing, return {"proposals": []}
- Be conservative — fewer high-quality proposals beat many low-quality ones
- Output ONLY valid JSON`;

    const response = await client.chatCompletion({
      model: "anthropic/claude-sonnet-4.5",
      messages: [
        { role: "system", content: "You are a self-reflective AI agent. Analyze your own behavior and suggest improvements. Output only valid JSON." },
        { role: "user", content: reflectionPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1500,
    });

    const content = response.choices?.[0]?.message?.content || "{}";

    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : content);
      let proposalCount = 0;
      let blockedProposalCount = 0;

      // Create proposals
      for (const p of (parsed.proposals || [])) {
        const proposalId = await (ctx as any).runMutation(
          generatedApi.internal.ai.soulEvolution.createProposal,
          {
            organizationId: args.organizationId,
            agentId: args.agentId,
            proposalType: p.proposalType,
            targetField: p.targetField,
            currentValue: p.currentValue || undefined,
            proposedValue: p.proposedValue,
            reason: p.reason,
            triggerType: "reflection" as const,
            evidenceMessages: [],
            telemetrySummary,
          }
        );
        if (proposalId) {
          proposalCount += 1;
        } else {
          blockedProposalCount += 1;
        }
      }

      return {
        success: true,
        proposalCount,
        blockedProposalCount,
        telemetrySummary,
      };
    } catch {
      return { error: "Failed to parse reflection output" };
    }
  },
});

// ============================================================================
// AUTHENTICATED QUERIES & MUTATIONS (for frontend UI)
// ============================================================================

/**
 * Get soul proposals for the UI — supports filtering by agent and/or status.
 */
export const getSoulProposals = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    if (args.agentId && args.status) {
      return await ctx.db
        .query("soulProposals")
        .withIndex("by_agent_status", (q) =>
          q.eq("agentId", args.agentId!).eq("status", args.status as "pending" | "approved" | "rejected" | "applied")
        )
        .collect();
    }

    if (args.agentId) {
      // All statuses for this agent
      return await ctx.db
        .query("soulProposals")
        .filter((q) => q.eq(q.field("agentId"), args.agentId))
        .order("desc")
        .take(50);
    }

    // All proposals for the org
    return await ctx.db
      .query("soulProposals")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(50);
  },
});

/**
 * Approve a soul proposal from the web UI.
 * Marks as approved, records feedback, and schedules application.
 */
export const approveSoulProposalAuth = mutation({
  args: {
    sessionId: v.string(),
    proposalId: v.id("soulProposals"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.status !== "pending") {
      throw new Error("Proposal not found or already processed");
    }
    const agent = await ctx.db.get(proposal.agentId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (agent?.customProperties || {}) as Record<string, any>;
    const soul = normalizeSoulModel(config.soul);
    const coreMemoryPolicy = soul.coreMemoryPolicy ?? DEFAULT_CORE_MEMORY_POLICY;
    const reviewPayload = buildOperatorReviewPayload({
      targetField: proposal.targetField,
      proposalType: proposal.proposalType,
      triggerType: proposal.triggerType,
      reason: proposal.reason,
      proposedValue: proposal.proposedValue,
      policy: coreMemoryPolicy,
      driftSummary: proposal.driftSummary ?? undefined,
    });
    const reviewedAt = Date.now();
    const approvalCheckpointId = `owner_approval:${String(args.proposalId)}:${reviewedAt}`;

    await ctx.db.patch(args.proposalId, {
      status: "approved",
      reviewedAt,
      reviewedBy: "owner_web",
      approvalCheckpointId,
    } as any);

    await ctx.db.insert("proposalFeedback", {
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      proposalId: args.proposalId,
      outcome: "approved",
      proposalSummary: `${proposal.proposalType} ${proposal.targetField}: ${proposal.proposedValue}`,
      createdAt: reviewedAt,
    });

    await emitSoulTrustEvent(ctx, {
      eventName: "trust.soul.proposal_reviewed.v1",
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      actorType: "user",
      actorId: "owner_web",
      sessionId: proposal.sessionId ?? undefined,
      proposalId: String(args.proposalId),
      proposalVersion: `overlay-v${SOUL_V2_OVERLAY_VERSION}`,
      riskLevel: reviewPayload.riskLevel,
      reviewDecision: "approved",
      rollbackTarget: "none",
    });

    // Schedule apply
    await ctx.scheduler.runAfter(
      0,
      generatedApi.internal.ai.soulEvolution.applyProposal,
      { proposalId: args.proposalId }
    );

    return { success: true };
  },
});

/**
 * Reject a soul proposal from the web UI.
 */
export const rejectSoulProposalAuth = mutation({
  args: {
    sessionId: v.string(),
    proposalId: v.id("soulProposals"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.status !== "pending") {
      throw new Error("Proposal not found or already processed");
    }

    const agent = await ctx.db.get(proposal.agentId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (agent?.customProperties || {}) as Record<string, any>;
    const soul = normalizeSoulModel(config.soul);
    const coreMemoryPolicy = soul.coreMemoryPolicy ?? DEFAULT_CORE_MEMORY_POLICY;
    const reviewPayload = buildOperatorReviewPayload({
      targetField: proposal.targetField,
      proposalType: proposal.proposalType,
      triggerType: proposal.triggerType,
      reason: proposal.reason,
      proposedValue: proposal.proposedValue,
      policy: coreMemoryPolicy,
      driftSummary: proposal.driftSummary ?? undefined,
    });
    const reviewedAt = Date.now();
    const approvalCheckpointId = `owner_review:${String(args.proposalId)}:${reviewedAt}`;

    await ctx.db.patch(args.proposalId, {
      status: "rejected",
      reviewedAt,
      reviewedBy: "owner_web",
      approvalCheckpointId,
    } as any);

    await ctx.db.insert("proposalFeedback", {
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      proposalId: args.proposalId,
      outcome: "rejected",
      ownerFeedback: args.reason,
      proposalSummary: `${proposal.proposalType} ${proposal.targetField}: ${proposal.proposedValue}`,
      createdAt: reviewedAt,
    });

    await emitSoulTrustEvent(ctx, {
      eventName: "trust.soul.proposal_reviewed.v1",
      organizationId: proposal.organizationId,
      agentId: proposal.agentId,
      actorType: "user",
      actorId: "owner_web",
      sessionId: proposal.sessionId ?? undefined,
      proposalId: String(args.proposalId),
      proposalVersion: `overlay-v${SOUL_V2_OVERLAY_VERSION}`,
      riskLevel: reviewPayload.riskLevel,
      reviewDecision: "rejected",
      rollbackTarget: "none",
    });

    return { success: true };
  },
});

// ============================================================================
// ROLLBACK
// ============================================================================

/**
 * Rollback soul to a previous version.
 * Creates a new version entry to maintain audit trail.
 */
export const rollbackSoul = internalMutation({
  args: {
    agentId: v.id("objects"),
    targetVersion: v.number(),
    requestedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (agent.customProperties || {}) as Record<string, any>;
    if (config.protected) {
      throw new Error("Cannot modify protected system agent");
    }

    // Find target version in history
    const targetHistory = await ctx.db
      .query("soulVersionHistory")
      .withIndex("by_agent_version", (q) =>
        q.eq("agentId", args.agentId).eq("version", args.targetVersion)
      )
      .first();

    if (!targetHistory) {
      throw new Error(`Version ${args.targetVersion} not found`);
    }

    const targetSoul = normalizeSoulModel(JSON.parse(targetHistory.newSoul));
    const currentSoul = normalizeSoulModel(config.soul);
    const currentVersion = currentSoul.version ?? 1;
    const newVersion = currentVersion + 1;
    const changedAt = Date.now();
    const rollbackCheckpointId = `rollback:${String(args.agentId)}:${args.targetVersion}:${changedAt}`;

    // Apply rollback — restore target soul with new version number
    const rolledBackSoul = normalizeSoulModel({
      ...targetSoul,
      version: newVersion,
      lastUpdatedAt: changedAt,
      lastUpdatedBy: args.requestedBy,
    });

    await ctx.db.patch(args.agentId, {
      customProperties: {
        ...config,
        soul: rolledBackSoul,
      },
    });

    // Record in version history
    await ctx.db.insert("soulVersionHistory", {
      agentId: args.agentId,
      organizationId: agent.organizationId,
      version: newVersion,
      previousSoul: JSON.stringify(currentSoul),
      newSoul: JSON.stringify(rolledBackSoul),
      changeType: "rollback",
      fromVersion: currentVersion,
      toVersion: args.targetVersion,
      soulSchemaVersion: SOUL_V2_OVERLAY_VERSION,
      soulOverlayVersion: rolledBackSoul.soulV2?.schemaVersion ?? SOUL_V2_OVERLAY_VERSION,
      rollbackCheckpointId,
      changedBy: args.requestedBy,
      changedAt,
    } as any);

    await emitSoulTrustEvent(ctx, {
      eventName: "trust.soul.rollback_executed.v1",
      organizationId: agent.organizationId,
      agentId: args.agentId,
      actorType: resolveTrustActorType(args.requestedBy),
      actorId: args.requestedBy,
      proposalVersion: `overlay-v${SOUL_V2_OVERLAY_VERSION}`,
      riskLevel: "medium",
      reviewDecision: "rollback_executed",
      rollbackTarget: `v${args.targetVersion}`,
      channel: `${TRUST_EVENT_NAMESPACE}.rollback`,
      occurredAt: changedAt,
    });

    return { success: true, newVersion };
  },
});

// ============================================================================
// VERSION HISTORY QUERIES
// ============================================================================

/**
 * Get soul version history for an agent (internal — used by Telegram handler).
 */
export const getSoulVersionHistory = internalQuery({
  args: {
    agentId: v.id("objects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("soulVersionHistory")
      .withIndex("by_agent_version", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(args.limit || 5);
  },
});

/**
 * Get soul version history for the web UI (authenticated).
 */
export const getSoulVersionHistoryAuth = query({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    return await ctx.db
      .query("soulVersionHistory")
      .withIndex("by_agent_version", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(args.limit || 10);
  },
});

/**
 * Rollback soul from the web UI (authenticated).
 */
export const rollbackSoulAuth = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    targetVersion: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (agent.customProperties || {}) as Record<string, any>;
    if (config.protected) {
      throw new Error("Cannot modify protected system agent");
    }

    const targetHistory = await ctx.db
      .query("soulVersionHistory")
      .withIndex("by_agent_version", (q) =>
        q.eq("agentId", args.agentId).eq("version", args.targetVersion)
      )
      .first();

    if (!targetHistory) {
      throw new Error(`Version ${args.targetVersion} not found`);
    }

    const targetSoul = normalizeSoulModel(JSON.parse(targetHistory.newSoul));
    const currentSoul = normalizeSoulModel(config.soul);
    const currentVersion = currentSoul.version ?? 1;
    const newVersion = currentVersion + 1;
    const changedAt = Date.now();
    const rollbackCheckpointId = `rollback:${String(args.agentId)}:${args.targetVersion}:${changedAt}`;

    const rolledBackSoul = normalizeSoulModel({
      ...targetSoul,
      version: newVersion,
      lastUpdatedAt: changedAt,
      lastUpdatedBy: "owner_web",
    });

    await ctx.db.patch(args.agentId, {
      customProperties: {
        ...config,
        soul: rolledBackSoul,
      },
    });

    await ctx.db.insert("soulVersionHistory", {
      agentId: args.agentId,
      organizationId: agent.organizationId,
      version: newVersion,
      previousSoul: JSON.stringify(currentSoul),
      newSoul: JSON.stringify(rolledBackSoul),
      changeType: "rollback",
      fromVersion: currentVersion,
      toVersion: args.targetVersion,
      soulSchemaVersion: SOUL_V2_OVERLAY_VERSION,
      soulOverlayVersion: rolledBackSoul.soulV2?.schemaVersion ?? SOUL_V2_OVERLAY_VERSION,
      rollbackCheckpointId,
      changedBy: "owner_web",
      changedAt,
    } as any);

    await emitSoulTrustEvent(ctx, {
      eventName: "trust.soul.rollback_executed.v1",
      organizationId: agent.organizationId,
      agentId: args.agentId,
      actorType: "user",
      actorId: "owner_web",
      proposalVersion: `overlay-v${SOUL_V2_OVERLAY_VERSION}`,
      riskLevel: "medium",
      reviewDecision: "rollback_executed",
      rollbackTarget: `v${args.targetVersion}`,
      channel: `${TRUST_EVENT_NAMESPACE}.rollback`,
      occurredAt: changedAt,
    });

    return { success: true, newVersion };
  },
});

// ============================================================================
// SCHEDULED REFLECTION (Weekly Cron)
// ============================================================================

/**
 * Weekly auto-reflection cron handler.
 * Iterates active agents, checks rate limits, and schedules staggered reflections.
 */
export const scheduledReflection = internalAction({
  handler: async (ctx) => {
    const orgs = await (ctx as any).runQuery(
      generatedApi.internal.ai.selfImprovement.getOrgsWithActiveAgents
    );

    let scheduled = 0;
    for (const org of (orgs || [])) {
      // Check if agent is eligible
      const agent = await (ctx as any).runQuery(
        generatedApi.internal.agentOntology.getAgentInternal,
        { agentId: org.agentId }
      );
      if (!agent) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = (agent.customProperties || {}) as Record<string, any>;
      if (config.protected) continue;

      const policy = normalizeSoulEvolutionPolicy(config.soulEvolutionPolicy);
      if (policy.autoReflectionSchedule === "off") continue;

      // Check rate limits
      const check = await (ctx as any).runQuery(
        generatedApi.internal.ai.soulEvolution.canCreateProposalQuery,
        { agentId: org.agentId }
      );
      if (!check.allowed) continue;

      // Stagger reflections over 60 minutes to avoid spike
      const delay = Math.floor(Math.random() * 60 * 60 * 1000);
      await ctx.scheduler.runAfter(
        delay,
        generatedApi.internal.ai.soulEvolution.runSelfReflection,
        {
          agentId: org.agentId,
          organizationId: org.organizationId,
        }
      );
      scheduled++;
    }

    console.log(`[SoulEvolution] Scheduled ${scheduled} weekly reflections`);
  },
});

// ============================================================================
// TELEGRAM SOUL HISTORY & ROLLBACK CALLBACKS
// ============================================================================

/**
 * Handle Telegram callback for soul version history and rollback.
 * Extends the existing callback handler for soul_history and soul_rollback_ prefixes.
 */
export const handleSoulHistoryCallback = internalAction({
  args: {
    callbackData: v.string(),
    telegramChatId: v.string(),
    callbackQueryId: v.string(),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return { error: "No Telegram bot token" };

    if (args.callbackData === "soul_history") {
      // Show version history with rollback buttons
      const history = await (ctx as any).runQuery(
        generatedApi.internal.ai.soulEvolution.getSoulVersionHistory,
        { agentId: args.agentId, limit: 5 }
      );

      if (!history?.length) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: args.callbackQueryId,
            text: "No version history yet.",
          }),
        });
        return { success: true };
      }

      const lines = history.map((h: { changedAt: number; changeType: string; changedBy?: string; version: number }) => {
        const date = new Date(h.changedAt).toLocaleDateString();
        const type = h.changeType === "rollback" ? "ROLLBACK" : h.changeType.replace(/_/g, " ").toUpperCase();
        const by = h.changedBy ? ` by ${h.changedBy}` : "";
        return `v${h.version} — ${type}${by} (${date})`;
      });

      const text = `*Soul Version History*\n\n${lines.join("\n")}`;

      // Build rollback buttons (skip current version)
      const buttons = history
        .slice(1) // skip the latest (current) version
        .map((h: { version: number }) => [{
          text: `Rollback to v${h.version}`,
          callback_data: `soul_rollback_${args.agentId}:${h.version}`,
        }]);

      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: args.callbackQueryId,
          text: "Loading history...",
        }),
      });

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: args.telegramChatId,
          text,
          parse_mode: "Markdown",
          reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
        }),
      });

      return { success: true };
    }

    if (args.callbackData.startsWith("soul_rollback_")) {
      // Parse: soul_rollback_{agentId}:{version}
      const payload = args.callbackData.replace("soul_rollback_", "");
      const colonIdx = payload.lastIndexOf(":");
      const targetVersion = parseInt(payload.slice(colonIdx + 1), 10);

      if (isNaN(targetVersion)) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: args.callbackQueryId,
            text: "Invalid version number.",
          }),
        });
        return { error: "Invalid version" };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ctx as any).runMutation(
        generatedApi.internal.ai.soulEvolution.rollbackSoul,
        {
          agentId: args.agentId,
          targetVersion,
          requestedBy: "owner_telegram",
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any;

      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: args.callbackQueryId,
          text: `Rolled back to v${targetVersion}!`,
        }),
      });

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: args.telegramChatId,
          text: `Soul rolled back to version ${targetVersion}. New version: v${result?.newVersion || "?"}`,
        }),
      });

      return { success: true };
    }

    return { error: "Unknown callback" };
  },
});
