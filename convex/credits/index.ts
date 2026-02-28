/**
 * CREDIT SYSTEM v1.0
 *
 * Unified credit management for the platform.
 * All AI/agent/automation usage is metered through credits.
 *
 * Exports:
 * - getCreditBalance: Get current credit balance for an org
 * - checkCredits: Check if org has enough credits (throws if not)
 * - deductCredits: Deduct credits for an action
 * - grantDailyCredits: Grant daily login credits
 * - grantGiftedCredits: Grant gifted credits with scope metadata
 * - grantMonthlyCredits: Grant monthly billing cycle credits
 * - addPurchasedCredits: Add credits from a purchase
 *
 * See: docs/pricing-and-trials/NEW_PRICING_PLAN.md
 */

import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { AiBillingSource } from "../channels/types";
import { getLicenseInternal } from "../licensing/helpers";
import { getNextTierName, type TierName } from "../licensing/tierConfigs";
import { requireAuthenticatedUser } from "../rbacHelpers";
import {
  getCreditSharingConfig,
  getChildCreditUsageToday,
  getTotalSharedUsageToday,
  recordCreditSharingTransaction,
  resolveChildCap,
} from "./sharing";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

const aiBillingSourceArgValidator = v.union(
  v.literal("platform"),
  v.literal("byok"),
  v.literal("private")
);

const aiCreditRequestSourceArgValidator = v.union(
  v.literal("llm"),
  v.literal("platform_action")
);

const creditScopeTypeArgValidator = v.union(
  v.literal("organization"),
  v.literal("personal")
);

const giftedGrantReasonArgValidator = v.union(
  v.literal("gifted_referral_reward"),
  v.literal("gifted_redeem_code"),
  v.literal("gifted_admin_grant"),
  v.literal("gifted_migration_adjustment")
);

const monthlyGrantReasonArgValidator = v.union(
  v.literal("monthly_plan_allocation"),
  v.literal("monthly_manual_adjustment")
);

const purchaseGrantReasonArgValidator = v.union(
  v.literal("purchased_checkout_pack"),
  v.literal("purchased_manual_adjustment")
);

const creditRedemptionCodeStatusArgValidator = v.union(
  v.literal("active"),
  v.literal("revoked"),
  v.literal("expired"),
  v.literal("exhausted")
);

const creditTierNameArgValidator = v.union(
  v.literal("free"),
  v.literal("pro"),
  v.literal("starter"),
  v.literal("professional"),
  v.literal("agency"),
  v.literal("enterprise")
);

const referralAttributionSourceArgValidator = v.union(
  v.literal("email_signup"),
  v.literal("oauth_signup"),
  v.literal("manual_track")
);

const referralRewardTypeArgValidator = v.union(
  v.literal("signup"),
  v.literal("subscription")
);

const referralRoleArgValidator = v.union(
  v.literal("referrer"),
  v.literal("referred")
);

export type AiCreditRequestSource = "llm" | "platform_action";
export type AiBillingLedgerMode = "credits_ledger" | "legacy_tokens";
export type CreditScopeType = "organization" | "personal";
export type GiftedGrantReason =
  | "gifted_referral_reward"
  | "gifted_redeem_code"
  | "gifted_admin_grant"
  | "gifted_migration_adjustment";
export type MonthlyGrantReason =
  | "monthly_plan_allocation"
  | "monthly_manual_adjustment";
export type PurchaseGrantReason =
  | "purchased_checkout_pack"
  | "purchased_manual_adjustment";
export type CreditRedemptionCodeStatus =
  | "active"
  | "revoked"
  | "expired"
  | "exhausted";
export type CreditTierName =
  | "free"
  | "pro"
  | "starter"
  | "professional"
  | "agency"
  | "enterprise";
export type ReferralAttributionSource =
  | "email_signup"
  | "oauth_signup"
  | "manual_track";
export type ReferralRewardType = "signup" | "subscription";
export type ReferralRole = "referrer" | "referred";

type CreditBalanceSnapshot = {
  gifted: number;
  daily: number;
  monthly: number;
  purchased: number;
  total: number;
};

type CreditBalanceLike = {
  giftedCredits?: number | null;
  dailyCredits?: number | null;
  monthlyCredits?: number | null;
  purchasedCredits?: number | null;
};

type CreditHistoryBalanceAfterLike = {
  gifted?: number | null;
  daily?: number | null;
  monthly?: number | null;
  purchased?: number | null;
};

type CreditHistoryEntryLike = {
  organizationId: string;
  _id: string;
  createdAt: number;
  type: string;
  creditSource: string;
  amount: number;
  balanceAfter: CreditHistoryBalanceAfterLike;
  reason?: string;
  expiresAt?: number;
  expiryPolicy?: string;
  scopeType?: CreditScopeType;
  scopeOrganizationId?: string;
  scopeUserId?: string;
  action?: string;
  idempotencyKey?: string;
  deductedFromParentId?: string;
  childOrganizationId?: string;
};

type GiftedConsumptionPlan = {
  giftedUsed: number;
  giftedFromLegacyDailyUsed: number;
  giftedFromGiftedPoolUsed: number;
};

type CreditConsumptionPlan = GiftedConsumptionPlan & {
  monthlyUsed: number;
  purchasedUsed: number;
};

export const CREDITS_API_SCHEMA_VERSION = "2026-02-20" as const;
export const CREDIT_CONSUMPTION_ORDER = [
  "gifted",
  "monthly",
  "purchased",
] as const;

export type CreditsBucketBreakdown = {
  gifted: number;
  monthly: number;
  purchased: number;
  total: number;
};

export type CreditsBalanceEnvelope = {
  schemaVersion: typeof CREDITS_API_SCHEMA_VERSION;
  organizationId: Id<"organizations">;
  scopeType: "organization";
  consumptionOrder: typeof CREDIT_CONSUMPTION_ORDER;
  buckets: CreditsBucketBreakdown;
  parent?: {
    organizationId: Id<"organizations">;
    isUnlimited: boolean;
    buckets: CreditsBucketBreakdown;
    effectiveTotal: number;
  };
};

export type CreditsHistoryEntry = {
  id: string;
  createdAt: number;
  type: string;
  source: string;
  sourceLabel: string;
  reason: string | null;
  reasonLabel: string;
  amount: number;
  bucketsAfter: CreditsBucketBreakdown;
  expiryPolicy: string | null;
  expiresAt: number | null;
  scopeType: CreditScopeType;
  scopeOrganizationId: string;
  scopeUserId: string | null;
  action: string | null;
  idempotencyKey: string | null;
  deductedFromParentId: string | null;
  childOrganizationId: string | null;
};

export type CreditsHistoryEnvelope = {
  schemaVersion: typeof CREDITS_API_SCHEMA_VERSION;
  organizationId: Id<"organizations">;
  scopeType: "organization";
  consumptionOrder: typeof CREDIT_CONSUMPTION_ORDER;
  buckets: CreditsBucketBreakdown;
  entries: CreditsHistoryEntry[];
  limit: number;
};

type ReferralProgramConfig = {
  enabled: boolean;
  targetOrganizationId: Id<"organizations">;
  signupRewardCredits: number;
  subscriptionRewardCredits: number;
  monthlyRewardCapCredits: number;
  sharePathPrefix: string;
};

const PLATFORM_REFERRAL_PROGRAM_SETTING_KEY = "platform_referral_program" as const;
const DEFAULT_REFERRAL_SIGNUP_REWARD_CREDITS = 5;
const DEFAULT_REFERRAL_SUBSCRIPTION_REWARD_CREDITS = 20;
const DEFAULT_REFERRAL_MONTHLY_CAP_CREDITS = 200;
const DEFAULT_REFERRAL_SHARE_PREFIX = "/ref";
const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REFERRAL_CODE_LENGTH = 8;
export const REFERRAL_SIGNUP_VELOCITY_WINDOW_MS = 60 * 60 * 1000;
export const REFERRAL_SIGNUP_VELOCITY_LIMIT = 8;

export type ReferralAttributionAbuseReason =
  | "clear"
  | "self_referral"
  | "referred_organization_already_attributed"
  | "velocity_limited";

export type ReferralAttributionAbuseDecision = {
  allowed: boolean;
  reason: ReferralAttributionAbuseReason;
};

const CREDIT_REASON_LABELS: Record<string, string> = {
  gifted_referral_reward: "Referral reward",
  gifted_redeem_code: "Redeem code reward",
  gifted_admin_grant: "Admin credit grant",
  gifted_migration_adjustment: "Migration adjustment",
  monthly_plan_allocation: "Monthly plan allocation",
  monthly_manual_adjustment: "Monthly manual adjustment",
  purchased_checkout_pack: "Purchased credit pack",
  purchased_manual_adjustment: "Purchased credits adjustment",
  consumption_runtime_action: "Usage consumption",
  consumption_parent_fallback: "Parent fallback consumption",
  legacy_daily_grant: "Legacy daily grant",
};

const CREDIT_SOURCE_LABELS: Record<string, string> = {
  gifted: "Gifted bucket",
  daily: "Gifted bucket (legacy daily)",
  monthly: "Monthly bucket",
  purchased: "Purchased bucket",
};

export function getCreditReasonLabel(reason: string | null | undefined): string {
  if (!reason) {
    return "Unspecified reason";
  }

  const mapped = CREDIT_REASON_LABELS[reason];
  if (mapped) {
    return mapped;
  }

  return reason
    .split("_")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function getCreditSourceLabel(source: string | null | undefined): string {
  if (!source) {
    return "Unknown source";
  }

  return CREDIT_SOURCE_LABELS[source] ?? source;
}

function normalizeNonNegativeInt(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  return Math.floor(value);
}

function normalizeNonNegativeIntUnknown(value: unknown): number {
  return typeof value === "number" ? normalizeNonNegativeInt(value) : 0;
}

function normalizeSharePathPrefix(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_REFERRAL_SHARE_PREFIX;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_REFERRAL_SHARE_PREFIX;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function normalizeReferralCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!normalized) {
    return null;
  }
  return normalized;
}

export function toReferralMonthKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

export function evaluateReferralAttributionAbuse(args: {
  isSelfReferral: boolean;
  hasExistingReferredOrganizationAttribution: boolean;
  recentReferralsForReferrer: number;
  velocityLimit?: number;
}): ReferralAttributionAbuseDecision {
  if (args.isSelfReferral) {
    return {
      allowed: false,
      reason: "self_referral",
    };
  }

  if (args.hasExistingReferredOrganizationAttribution) {
    return {
      allowed: false,
      reason: "referred_organization_already_attributed",
    };
  }

  const velocityLimit = args.velocityLimit ?? REFERRAL_SIGNUP_VELOCITY_LIMIT;
  if (args.recentReferralsForReferrer >= velocityLimit) {
    return {
      allowed: false,
      reason: "velocity_limited",
    };
  }

  return {
    allowed: true,
    reason: "clear",
  };
}

function normalizeReferralProgramConfigValue(value: unknown): ReferralProgramConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const targetOrganizationId = candidate.targetOrganizationId;
  if (typeof targetOrganizationId !== "string" || targetOrganizationId.length === 0) {
    return null;
  }

  return {
    enabled: candidate.enabled === false ? false : true,
    targetOrganizationId: targetOrganizationId as Id<"organizations">,
    signupRewardCredits: normalizeNonNegativeIntUnknown(candidate.signupRewardCredits) ||
      DEFAULT_REFERRAL_SIGNUP_REWARD_CREDITS,
    subscriptionRewardCredits: normalizeNonNegativeIntUnknown(candidate.subscriptionRewardCredits) ||
      DEFAULT_REFERRAL_SUBSCRIPTION_REWARD_CREDITS,
    monthlyRewardCapCredits: Math.max(
      1,
      normalizeNonNegativeIntUnknown(candidate.monthlyRewardCapCredits) ||
        DEFAULT_REFERRAL_MONTHLY_CAP_CREDITS
    ),
    sharePathPrefix: normalizeSharePathPrefix(candidate.sharePathPrefix),
  };
}

async function resolveReferralProgramConfig(
  ctx: MutationCtx | QueryCtx,
  args: { requireEnabled: boolean }
): Promise<ReferralProgramConfig | null> {
  const setting = await (ctx.db as any)
    .query("platformSettings")
    .withIndex("by_key", (q: any) =>
      q.eq("key", PLATFORM_REFERRAL_PROGRAM_SETTING_KEY)
    )
    .first();

  if (!setting) {
    return null;
  }

  const config = normalizeReferralProgramConfigValue(setting.value);
  if (!config) {
    return null;
  }

  if (args.requireEnabled && !config.enabled) {
    return null;
  }

  const targetOrg = await ctx.db.get(config.targetOrganizationId);
  if (!targetOrg || !targetOrg.isActive) {
    return null;
  }

  return config;
}

async function requireReferralProgramConfig(
  ctx: MutationCtx | QueryCtx
): Promise<ReferralProgramConfig> {
  const config = await resolveReferralProgramConfig(ctx, { requireEnabled: true });
  if (!config) {
    throw new ConvexError({
      code: "REFERRAL_PROGRAM_NOT_CONFIGURED",
      message:
        "Platform referral program is not configured or target organization is inactive.",
    });
  }
  return config;
}

function generateReferralCodeCandidate(): string {
  const bytes = new Uint8Array(REFERRAL_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let index = 0; index < bytes.length; index += 1) {
    const offset = bytes[index] % REFERRAL_CODE_ALPHABET.length;
    code += REFERRAL_CODE_ALPHABET[offset];
  }
  return code;
}

export function getGiftedCreditsBalance(balance: CreditBalanceLike): number {
  return normalizeNonNegativeInt(balance.dailyCredits) + normalizeNonNegativeInt(balance.giftedCredits);
}

export function buildCreditsBucketBreakdown(balance: CreditBalanceLike): CreditsBucketBreakdown {
  const gifted = getGiftedCreditsBalance(balance);
  const monthlyRaw = balance.monthlyCredits;
  const purchased = normalizeNonNegativeInt(balance.purchasedCredits);

  if (monthlyRaw === -1) {
    return {
      gifted,
      monthly: -1,
      purchased,
      total: -1,
    };
  }

  const monthly = normalizeNonNegativeInt(monthlyRaw);
  return {
    gifted,
    monthly,
    purchased,
    total: gifted + monthly + purchased,
  };
}

export function sortCreditHistoryDeterministically<
  T extends { createdAt: number; _id: string }
>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (b.createdAt !== a.createdAt) {
      return b.createdAt - a.createdAt;
    }
    return b._id.localeCompare(a._id);
  });
}

export function toCreditsHistoryEntry(
  entry: CreditHistoryEntryLike
): CreditsHistoryEntry {
  const reason = entry.reason ?? null;
  const bucketsAfter = buildCreditsBucketBreakdown({
    giftedCredits: entry.balanceAfter.gifted ?? 0,
    dailyCredits: entry.balanceAfter.daily ?? 0,
    monthlyCredits: entry.balanceAfter.monthly ?? 0,
    purchasedCredits: entry.balanceAfter.purchased ?? 0,
  });

  return {
    id: entry._id,
    createdAt: entry.createdAt,
    type: entry.type,
    source: entry.creditSource,
    sourceLabel: getCreditSourceLabel(entry.creditSource),
    reason,
    reasonLabel: getCreditReasonLabel(reason),
    amount: entry.amount,
    bucketsAfter,
    expiryPolicy: entry.expiryPolicy ?? null,
    expiresAt: entry.expiresAt ?? null,
    scopeType: entry.scopeType ?? "organization",
    scopeOrganizationId: entry.scopeOrganizationId ?? entry.organizationId,
    scopeUserId: entry.scopeUserId ?? null,
    action: entry.action ?? null,
    idempotencyKey: entry.idempotencyKey ?? null,
    deductedFromParentId: entry.deductedFromParentId ?? null,
    childOrganizationId: entry.childOrganizationId ?? null,
  };
}

export function normalizeCreditIdempotencyKey(
  value: string | null | undefined
): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

const CREDIT_REDEMPTION_CODE_MIN_LENGTH = 6;
const CREDIT_REDEMPTION_CODE_MAX_LENGTH = 64;
const CREDIT_REDEMPTION_CODE_ALLOWED_PATTERN = /^[A-Z0-9-]+$/;
const CREDIT_REDEMPTION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type CreditRedemptionCodeDocumentLike = {
  _id: Id<"creditRedemptionCodes">;
  code: string;
  status: CreditRedemptionCodeStatus;
  creditsAmount: number;
  maxRedemptions: number;
  redemptionCount: number;
  expiresAt?: number;
  allowedTierNames?: CreditTierName[];
  allowedOrganizationIds?: Id<"organizations">[];
  allowedUserIds?: Id<"users">[];
  description?: string;
  createdByUserId: Id<"users">;
  revokedByUserId?: Id<"users">;
  revokeReason?: string;
  createdAt: number;
  updatedAt: number;
  revokedAt?: number;
  lastRedeemedAt?: number;
};

export type CreditRedemptionTargetingDecision = {
  eligible: boolean;
  reason:
    | "eligible"
    | "tier_restricted"
    | "organization_restricted"
    | "user_restricted"
    | "invalid_policy";
};

function normalizeCodeValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  return normalized.length > 0 ? normalized : null;
}

export function normalizeCreditRedemptionCode(rawCode: string): string {
  return normalizeCodeValue(rawCode) ?? "";
}

function assertValidCreditRedemptionCode(rawCode: string): string {
  const normalized = normalizeCodeValue(rawCode);
  if (!normalized) {
    throw new ConvexError({
      code: "INVALID_REDEMPTION_CODE",
      message: "Redemption code is required.",
    });
  }

  if (
    normalized.length < CREDIT_REDEMPTION_CODE_MIN_LENGTH ||
    normalized.length > CREDIT_REDEMPTION_CODE_MAX_LENGTH ||
    !CREDIT_REDEMPTION_CODE_ALLOWED_PATTERN.test(normalized)
  ) {
    throw new ConvexError({
      code: "INVALID_REDEMPTION_CODE",
      message: "Redemption code format is invalid.",
    });
  }

  const alphanumeric = normalized.replace(/-/g, "");
  if (alphanumeric.length < CREDIT_REDEMPTION_CODE_MIN_LENGTH) {
    throw new ConvexError({
      code: "INVALID_REDEMPTION_CODE",
      message: "Redemption code format is invalid.",
    });
  }

  return normalized;
}

function generateCreditRedemptionCodeSegment(length: number): string {
  let output = "";
  for (let index = 0; index < length; index += 1) {
    const random = Math.floor(Math.random() * CREDIT_REDEMPTION_CODE_ALPHABET.length);
    output += CREDIT_REDEMPTION_CODE_ALPHABET[random];
  }
  return output;
}

function generateCreditRedemptionCode(): string {
  return [
    "VC83",
    generateCreditRedemptionCodeSegment(4),
    generateCreditRedemptionCodeSegment(4),
  ].join("-");
}

function normalizeRedemptionCodeLimit(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    throw new ConvexError({
      code: "INVALID_REDEMPTION_POLICY",
      message: "maxRedemptions must be at least 1.",
    });
  }
  return Math.floor(value);
}

function normalizeRedemptionCodeAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ConvexError({
      code: "INVALID_REDEMPTION_POLICY",
      message: "creditsAmount must be a positive number.",
    });
  }
  return Math.floor(value);
}

function normalizeOptionalDescription(value?: string): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeCreditTierName(value: string): CreditTierName | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "business") {
    return "agency";
  }
  if (normalized === "personal") {
    return "starter";
  }
  if (
    normalized === "free" ||
    normalized === "pro" ||
    normalized === "starter" ||
    normalized === "professional" ||
    normalized === "agency" ||
    normalized === "enterprise"
  ) {
    return normalized;
  }
  return null;
}

function normalizeTierRestrictions(
  values?: readonly string[] | null
): CreditTierName[] | undefined {
  if (!Array.isArray(values) || values.length === 0) {
    return undefined;
  }

  const unique = new Set<CreditTierName>();
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const normalized = normalizeCreditTierName(value);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return [...unique];
}

function normalizeIdRestrictionList(
  values?: readonly string[] | null
): string[] | undefined {
  if (!Array.isArray(values) || values.length === 0) {
    return undefined;
  }
  const unique = new Set<string>();
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      unique.add(value);
    }
  }
  return unique.size > 0 ? [...unique] : undefined;
}

function normalizeOptionalFutureTimestamp(value?: number): number | undefined {
  if (typeof value !== "number") {
    return undefined;
  }
  if (!Number.isFinite(value)) {
    throw new ConvexError({
      code: "INVALID_REDEMPTION_POLICY",
      message: "expiresAt must be a valid timestamp.",
    });
  }
  if (value <= Date.now()) {
    throw new ConvexError({
      code: "INVALID_REDEMPTION_POLICY",
      message: "expiresAt must be in the future.",
    });
  }
  return Math.floor(value);
}

export function resolveCreditRedemptionCodeLifecycle(args: {
  status: CreditRedemptionCodeStatus;
  expiresAt?: number;
  redemptionCount: number;
  maxRedemptions: number;
  now?: number;
}): CreditRedemptionCodeStatus {
  if (args.status === "revoked") {
    return "revoked";
  }

  const now = args.now ?? Date.now();
  if (typeof args.expiresAt === "number" && args.expiresAt <= now) {
    return "expired";
  }

  if (args.redemptionCount >= args.maxRedemptions) {
    return "exhausted";
  }

  return "active";
}

export function evaluateCreditRedemptionTargeting(args: {
  organizationTier: string;
  organizationId: string;
  userId: string;
  allowedTierNames?: readonly string[] | null;
  allowedOrganizationIds?: readonly string[] | null;
  allowedUserIds?: readonly string[] | null;
}): CreditRedemptionTargetingDecision {
  const allowedTierNames = normalizeTierRestrictions(args.allowedTierNames);
  const allowedOrganizationIds = normalizeIdRestrictionList(args.allowedOrganizationIds);
  const allowedUserIds = normalizeIdRestrictionList(args.allowedUserIds);

  if (
    Array.isArray(args.allowedTierNames) &&
    args.allowedTierNames.length > 0 &&
    (!allowedTierNames || allowedTierNames.length === 0)
  ) {
    return { eligible: false, reason: "invalid_policy" };
  }

  if (
    Array.isArray(args.allowedOrganizationIds) &&
    args.allowedOrganizationIds.length > 0 &&
    (!allowedOrganizationIds || allowedOrganizationIds.length === 0)
  ) {
    return { eligible: false, reason: "invalid_policy" };
  }

  if (
    Array.isArray(args.allowedUserIds) &&
    args.allowedUserIds.length > 0 &&
    (!allowedUserIds || allowedUserIds.length === 0)
  ) {
    return { eligible: false, reason: "invalid_policy" };
  }

  if (allowedTierNames) {
    const normalizedTier = normalizeCreditTierName(args.organizationTier);
    if (!normalizedTier || !allowedTierNames.includes(normalizedTier)) {
      return { eligible: false, reason: "tier_restricted" };
    }
  }

  if (allowedOrganizationIds && !allowedOrganizationIds.includes(args.organizationId)) {
    return { eligible: false, reason: "organization_restricted" };
  }

  if (allowedUserIds && !allowedUserIds.includes(args.userId)) {
    return { eligible: false, reason: "user_restricted" };
  }

  return { eligible: true, reason: "eligible" };
}

async function requireSuperAdminSession(
  ctx: QueryCtx | MutationCtx,
  sessionId: string
): Promise<{ userId: Id<"users"> }> {
  const { userId } = await requireAuthenticatedUser(ctx, sessionId);
  const user = await ctx.db.get(userId);
  if (!user || !user.global_role_id) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only super admins can manage credit redemption codes.",
    });
  }

  const role = await ctx.db.get(user.global_role_id);
  if (!role || role.name !== "super_admin") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only super admins can manage credit redemption codes.",
    });
  }

  return { userId };
}

async function syncCreditRedemptionCodeLifecycle(
  ctx: MutationCtx,
  codeDoc: CreditRedemptionCodeDocumentLike,
  now = Date.now()
): Promise<CreditRedemptionCodeDocumentLike> {
  const resolvedStatus = resolveCreditRedemptionCodeLifecycle({
    status: codeDoc.status,
    expiresAt: codeDoc.expiresAt,
    redemptionCount: codeDoc.redemptionCount,
    maxRedemptions: codeDoc.maxRedemptions,
    now,
  });

  if (resolvedStatus === codeDoc.status) {
    return codeDoc;
  }

  if (codeDoc.status === "revoked") {
    return codeDoc;
  }

  await ctx.db.patch(codeDoc._id, {
    status: resolvedStatus,
    updatedAt: now,
  });

  return {
    ...codeDoc,
    status: resolvedStatus,
    updatedAt: now,
  };
}

export function buildCreditConsumptionPlan(args: {
  amount: number;
  giftedCredits: number;
  legacyDailyCredits: number;
  monthlyCredits: number;
  purchasedCredits: number;
}): CreditConsumptionPlan {
  let remaining = normalizeNonNegativeInt(args.amount);
  const legacyDailyCredits = normalizeNonNegativeInt(args.legacyDailyCredits);
  const giftedCredits = normalizeNonNegativeInt(args.giftedCredits);
  const monthlyCredits = normalizeNonNegativeInt(args.monthlyCredits);
  const purchasedCredits = normalizeNonNegativeInt(args.purchasedCredits);

  const giftedPool = legacyDailyCredits + giftedCredits;
  const giftedUsed = Math.min(remaining, giftedPool);
  remaining -= giftedUsed;

  const monthlyUsed = Math.min(remaining, monthlyCredits);
  remaining -= monthlyUsed;

  const purchasedUsed = Math.min(remaining, purchasedCredits);

  const giftedFromLegacyDailyUsed = Math.min(giftedUsed, legacyDailyCredits);
  const giftedFromGiftedPoolUsed = Math.max(0, giftedUsed - giftedFromLegacyDailyUsed);

  return {
    giftedUsed,
    giftedFromLegacyDailyUsed,
    giftedFromGiftedPoolUsed,
    monthlyUsed,
    purchasedUsed,
  };
}

function resolvePrimaryCreditSource(plan: CreditConsumptionPlan): "gifted" | "monthly" | "purchased" {
  if (plan.giftedUsed > 0) {
    return "gifted";
  }
  if (plan.monthlyUsed > 0) {
    return "monthly";
  }
  return "purchased";
}

function getBalanceSnapshot(balance: CreditBalanceLike): CreditBalanceSnapshot {
  const gifted = normalizeNonNegativeInt(balance.giftedCredits);
  const daily = normalizeNonNegativeInt(balance.dailyCredits);
  const monthly = balance.monthlyCredits === -1 ? -1 : normalizeNonNegativeInt(balance.monthlyCredits);
  const purchased = normalizeNonNegativeInt(balance.purchasedCredits);
  const total = monthly === -1 ? -1 : gifted + daily + monthly + purchased;

  return { gifted, daily, monthly, purchased, total };
}

function resolveScopeMetadata(args: {
  organizationId: Id<"organizations">;
  scopeType: CreditScopeType;
  scopeOrganizationId?: Id<"organizations">;
  scopeUserId?: Id<"users">;
}): { scopeOrganizationId: Id<"organizations">; scopeUserId?: Id<"users"> } {
  if (args.scopeType === "personal") {
    if (!args.scopeUserId) {
      throw new ConvexError({
        code: "MISSING_SCOPE_METADATA",
        message: "Personal gifted credits require scopeUserId.",
      });
    }
    return {
      scopeOrganizationId: args.scopeOrganizationId ?? args.organizationId,
      scopeUserId: args.scopeUserId,
    };
  }

  return {
    scopeOrganizationId: args.scopeOrganizationId ?? args.organizationId,
  };
}

async function findTransactionByIdempotencyKey(
  ctx: MutationCtx | QueryCtx,
  organizationId: Id<"organizations">,
  idempotencyKey?: string | null
) {
  const normalizedKey = normalizeCreditIdempotencyKey(idempotencyKey);
  if (!normalizedKey) {
    return null;
  }
  return await ctx.db
    .query("creditTransactions")
    .withIndex("by_organization_idempotency", (q) =>
      q.eq("organizationId", organizationId).eq("idempotencyKey", normalizedKey)
    )
    .first();
}

export interface AiCreditBillingPolicyDecision {
  requestSource: AiCreditRequestSource;
  requestedBillingSource: AiBillingSource;
  effectiveBillingSource: AiBillingSource;
  enforceCredits: boolean;
  reason:
    | "llm_platform_metered"
    | "llm_byok_unmetered"
    | "llm_private_unmetered"
    | "platform_action_metered"
    | "platform_action_forced_platform";
}

export interface AiLegacyTokenLedgerPolicyDecision {
  requestedLedgerMode: AiBillingLedgerMode;
  effectiveLedgerMode: "credits_ledger";
  allowLegacyTokenLedgerMutation: boolean;
  reason: "credits_ledger_authoritative" | "legacy_token_ledger_disabled";
}

function normalizeAiBillingSource(
  value: unknown
): AiBillingSource | null {
  if (value === "platform" || value === "byok" || value === "private") {
    return value;
  }
  return null;
}

function normalizeAiCreditRequestSource(
  value: unknown
): AiCreditRequestSource | null {
  if (value === "llm" || value === "platform_action") {
    return value;
  }
  return null;
}

function normalizeAiBillingLedgerMode(
  value: unknown
): AiBillingLedgerMode | null {
  if (value === "credits_ledger" || value === "legacy_tokens") {
    return value;
  }
  return null;
}

/**
 * Canonical billing policy for AI credit metering.
 * - LLM requests: platform is metered, BYOK/private token paths are unmetered.
 * - Platform actions (tools/orchestration): always metered via platform credits.
 */
export function resolveAiCreditBillingPolicy(args: {
  billingSource?: unknown;
  requestSource?: unknown;
}): AiCreditBillingPolicyDecision {
  const requestSource =
    normalizeAiCreditRequestSource(args.requestSource) ?? "platform_action";
  const requestedBillingSource =
    normalizeAiBillingSource(args.billingSource) ?? "platform";

  if (requestSource === "platform_action") {
    return {
      requestSource,
      requestedBillingSource,
      effectiveBillingSource: "platform",
      enforceCredits: true,
      reason:
        requestedBillingSource === "platform"
          ? "platform_action_metered"
          : "platform_action_forced_platform",
    };
  }

  if (requestedBillingSource === "byok") {
    return {
      requestSource,
      requestedBillingSource,
      effectiveBillingSource: "byok",
      enforceCredits: false,
      reason: "llm_byok_unmetered",
    };
  }

  if (requestedBillingSource === "private") {
    return {
      requestSource,
      requestedBillingSource,
      effectiveBillingSource: "private",
      enforceCredits: false,
      reason: "llm_private_unmetered",
    };
  }

  return {
    requestSource,
    requestedBillingSource,
    effectiveBillingSource: "platform",
    enforceCredits: true,
    reason: "llm_platform_metered",
  };
}

/**
 * Canonical ledger policy for AI usage accounting.
 * Credits ledger is the single authoritative charge ledger; legacy token ledger
 * mutations are disabled to prevent dual-billing overlap.
 */
export function resolveAiLegacyTokenLedgerPolicy(args: {
  ledgerMode?: unknown;
}): AiLegacyTokenLedgerPolicyDecision {
  const requestedLedgerMode =
    normalizeAiBillingLedgerMode(args.ledgerMode) ?? "credits_ledger";

  if (requestedLedgerMode === "legacy_tokens") {
    return {
      requestedLedgerMode,
      effectiveLedgerMode: "credits_ledger",
      allowLegacyTokenLedgerMutation: false,
      reason: "legacy_token_ledger_disabled",
    };
  }

  return {
    requestedLedgerMode,
    effectiveLedgerMode: "credits_ledger",
    allowLegacyTokenLedgerMutation: false,
    reason: "credits_ledger_authoritative",
  };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET CREDIT BALANCE (Public Query)
 *
 * Returns the current credit balance for an organization.
 * Used by the frontend to display credits remaining.
 */
export const getCreditBalance = query({
  args: {
    organizationId: v.id("organizations"),
    includeParent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await getCreditBalanceInternal(ctx, args.organizationId, {
      includeParent: args.includeParent,
    });
  },
});

/**
 * INTERNAL: Get Credit Balance
 *
 * Returns resolved credit balance, creating a default if none exists.
 */
type CreditBalance = {
  exists: boolean;
  giftedCredits: number;
  dailyCredits: number;
  monthlyCredits: number;
  monthlyCreditsTotal: number;
  purchasedCredits: number;
  totalCredits: number;
  dailyCreditsLastReset: number;
  monthlyPeriodStart: number;
  monthlyPeriodEnd: number;
  parentOrganizationId?: Id<"organizations">;
  parentBalance?: {
    giftedCredits: number;
    dailyCredits: number;
    monthlyCredits: number;
    purchasedCredits: number;
    totalCredits: number;
    monthlyCreditsTotal: number;
    isUnlimited: boolean;
  };
  effectiveCredits?: number;
};

export async function getCreditBalanceInternal(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  options?: { includeParent?: boolean }
): Promise<CreditBalance> {
  const balance = await ctx.db
    .query("creditBalances")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .first();

  const ownBalance = balance
    ? (() => {
        const snapshot = getBalanceSnapshot(balance);
        return {
          exists: true,
          giftedCredits: snapshot.gifted,
          dailyCredits: snapshot.daily,
          monthlyCredits: balance.monthlyCredits,
          monthlyCreditsTotal: balance.monthlyCreditsTotal,
          purchasedCredits: snapshot.purchased,
          totalCredits: snapshot.total,
          dailyCreditsLastReset: balance.dailyCreditsLastReset,
          monthlyPeriodStart: balance.monthlyPeriodStart,
          monthlyPeriodEnd: balance.monthlyPeriodEnd,
        };
      })()
    : {
        exists: false,
        giftedCredits: 0,
        dailyCredits: 0,
        monthlyCredits: 0,
        monthlyCreditsTotal: 0,
        purchasedCredits: 0,
        totalCredits: 0,
        dailyCreditsLastReset: 0,
        monthlyPeriodStart: 0,
        monthlyPeriodEnd: 0,
      };

  // Optionally include parent org balance for sub-orgs
  if (options?.includeParent) {
    const org = await ctx.db.get(organizationId);
    if (org?.parentOrganizationId) {
      const parentBalance = await getCreditBalanceInternal(ctx, org.parentOrganizationId);
      return {
        ...ownBalance,
        parentOrganizationId: org.parentOrganizationId,
        parentBalance: {
          giftedCredits: parentBalance.giftedCredits,
          dailyCredits: parentBalance.dailyCredits,
          monthlyCredits: parentBalance.monthlyCredits,
          purchasedCredits: parentBalance.purchasedCredits,
          totalCredits: parentBalance.totalCredits,
          monthlyCreditsTotal: parentBalance.monthlyCreditsTotal,
          isUnlimited: parentBalance.monthlyCreditsTotal === -1,
        },
        effectiveCredits: parentBalance.monthlyCreditsTotal === -1
          ? -1
          : ownBalance.totalCredits + parentBalance.totalCredits,
      };
    }
  }

  return ownBalance;
}

/**
 * GET CREDIT BALANCE (Internal Query)
 */
export const getCreditBalanceInternalQuery = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await getCreditBalanceInternal(ctx, args.organizationId);
  },
});

/**
 * GET CREDITS BALANCE ENVELOPE (Public Query)
 *
 * Canonical deterministic payload for HTTP/API consumers.
 */
export const getCreditsBalanceEnvelope = query({
  args: {
    organizationId: v.id("organizations"),
    includeParent: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<CreditsBalanceEnvelope> => {
    const balance = await getCreditBalanceInternal(ctx, args.organizationId, {
      includeParent: args.includeParent,
    });

    const envelope: CreditsBalanceEnvelope = {
      schemaVersion: CREDITS_API_SCHEMA_VERSION,
      organizationId: args.organizationId,
      scopeType: "organization",
      consumptionOrder: CREDIT_CONSUMPTION_ORDER,
      buckets: buildCreditsBucketBreakdown({
        giftedCredits: balance.giftedCredits,
        dailyCredits: balance.dailyCredits,
        monthlyCredits: balance.monthlyCredits,
        purchasedCredits: balance.purchasedCredits,
      }),
    };

    if (balance.parentOrganizationId && balance.parentBalance) {
      const parentBuckets = buildCreditsBucketBreakdown({
        giftedCredits: balance.parentBalance.giftedCredits,
        dailyCredits: balance.parentBalance.dailyCredits,
        monthlyCredits: balance.parentBalance.monthlyCredits,
        purchasedCredits: balance.parentBalance.purchasedCredits,
      });
      envelope.parent = {
        organizationId: balance.parentOrganizationId,
        isUnlimited: balance.parentBalance.isUnlimited,
        buckets: parentBuckets,
        effectiveTotal:
          parentBuckets.total === -1
            ? -1
            : envelope.buckets.total + parentBuckets.total,
      };
    }

    return envelope;
  },
});

/**
 * GET CREDITS HISTORY ENVELOPE (Public Query)
 *
 * Canonical deterministic history payload for HTTP/API consumers.
 */
export const getCreditsHistoryEnvelope = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<CreditsHistoryEnvelope> => {
    const limit = Math.max(1, Math.min(args.limit || 50, 200));

    const transactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_organization_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);

    const deterministicEntries = sortCreditHistoryDeterministically(
      transactions.map((transaction) => ({
        organizationId: transaction.organizationId,
        _id: String(transaction._id),
        createdAt: transaction.createdAt,
        type: transaction.type,
        creditSource: transaction.creditSource,
        amount: transaction.amount,
        balanceAfter: transaction.balanceAfter,
        reason: transaction.reason,
        expiresAt: transaction.expiresAt,
        expiryPolicy: transaction.expiryPolicy,
        scopeType: transaction.scopeType,
        scopeOrganizationId: transaction.scopeOrganizationId
          ? String(transaction.scopeOrganizationId)
          : undefined,
        scopeUserId: transaction.scopeUserId
          ? String(transaction.scopeUserId)
          : undefined,
        action: transaction.action,
        idempotencyKey: transaction.idempotencyKey,
        deductedFromParentId: transaction.deductedFromParentId
          ? String(transaction.deductedFromParentId)
          : undefined,
        childOrganizationId: transaction.childOrganizationId
          ? String(transaction.childOrganizationId)
          : undefined,
      }))
    ).slice(0, limit);

    const balance = await getCreditBalanceInternal(ctx, args.organizationId);

    return {
      schemaVersion: CREDITS_API_SCHEMA_VERSION,
      organizationId: args.organizationId,
      scopeType: "organization",
      consumptionOrder: CREDIT_CONSUMPTION_ORDER,
      buckets: buildCreditsBucketBreakdown({
        giftedCredits: balance.giftedCredits,
        dailyCredits: balance.dailyCredits,
        monthlyCredits: balance.monthlyCredits,
        purchasedCredits: balance.purchasedCredits,
      }),
      entries: deterministicEntries.map(toCreditsHistoryEntry),
      limit,
    };
  },
});

/**
 * GET CREDIT HISTORY (Public Query)
 *
 * Returns recent credit transactions for an organization.
 */
export const getCreditHistory = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const transactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_organization_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);

    return transactions;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * CHECK AND DEDUCT CREDITS
 *
 * Checks if org has enough credits, deducts them, and records the transaction.
 * Consumption order: Gifted -> Monthly -> Purchased
 * (legacy daily credits are treated as gifted-compatible)
 *
 * Throws CREDITS_EXHAUSTED error if insufficient credits.
 */
export const deductCredits = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    amount: v.number(),
    action: v.string(),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await deductCreditsInternal(ctx, args);
  },
});

/**
 * INTERNAL: Deduct Credits
 *
 * Core credit deduction logic. Used by agent execution pipeline.
 */
type DeductCreditsResult = {
  success: boolean;
  creditsRemaining: number;
  isUnlimited: boolean;
  skipped?: boolean;
  monthlyTotal?: number;
  breakdown?: {
    dailyUsed: number;
    giftedUsed: number;
    giftedFromLegacyDailyUsed: number;
    giftedFromGiftedPoolUsed: number;
    monthlyUsed: number;
    purchasedUsed: number;
  };
  deductedFromParent?: boolean;
  parentOrganizationId?: Id<"organizations">;
  billingPolicy?: AiCreditBillingPolicyDecision;
};

type SoftDeductCreditsFailure = {
  success: false;
  errorCode: "CREDITS_EXHAUSTED" | "CHILD_CREDIT_CAP_REACHED" | "SHARED_POOL_EXHAUSTED";
  message: string;
  creditsRequired?: number;
  creditsAvailable?: number;
};

type CreditExhaustionCode = SoftDeductCreditsFailure["errorCode"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toCreditExhaustionCode(value: unknown): CreditExhaustionCode | null {
  if (
    value === "CREDITS_EXHAUSTED" ||
    value === "CHILD_CREDIT_CAP_REACHED" ||
    value === "SHARED_POOL_EXHAUSTED"
  ) {
    return value;
  }
  return null;
}

function parseJsonPayloadFromMessage(message: string): Record<string, unknown> | null {
  const candidates: string[] = [];
  const trimmed = message.trim();

  if (trimmed.length > 0) {
    candidates.push(trimmed);
  }

  const convexErrorMarker = "ConvexError:";
  const markerIndex = trimmed.indexOf(convexErrorMarker);
  if (markerIndex >= 0) {
    const afterMarker = trimmed.slice(markerIndex + convexErrorMarker.length).trim();
    if (afterMarker.length > 0) {
      candidates.push(afterMarker);
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (isRecord(parsed)) {
        return parsed;
      }
    } catch {
      // Ignore parse errors and continue checking fallback message formats.
    }
  }

  return null;
}

export function parseCreditExhaustionError(
  error: unknown
): SoftDeductCreditsFailure | null {
  const sourceMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : undefined;

  const payloadCandidates: Array<Record<string, unknown>> = [];

  if (isRecord(error)) {
    payloadCandidates.push(error);

    if (isRecord(error.data)) {
      payloadCandidates.push(error.data);
    }

    if (isRecord(error.cause)) {
      payloadCandidates.push(error.cause);
    }

    if (typeof error.message === "string") {
      const parsedMessagePayload = parseJsonPayloadFromMessage(error.message);
      if (parsedMessagePayload) {
        payloadCandidates.push(parsedMessagePayload);
      }
    }
  }

  if (sourceMessage) {
    const parsedMessagePayload = parseJsonPayloadFromMessage(sourceMessage);
    if (parsedMessagePayload) {
      payloadCandidates.push(parsedMessagePayload);
    }
  }

  for (const payload of payloadCandidates) {
    const code = toCreditExhaustionCode(payload.code);
    if (!code) {
      continue;
    }

    return {
      success: false,
      errorCode: code,
      message:
        typeof payload.message === "string"
          ? payload.message
          : sourceMessage ?? "Credit deduction failed",
      creditsRequired:
        typeof payload.creditsRequired === "number" ? payload.creditsRequired : undefined,
      creditsAvailable:
        typeof payload.creditsAvailable === "number" ? payload.creditsAvailable : undefined,
    };
  }

  return null;
}

export async function deductCreditsInternal(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    userId?: Id<"users">;
    amount: number;
    action: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    /** When deducting from parent on behalf of a child sub-org */
    childOrganizationId?: Id<"organizations">;
  }
): Promise<DeductCreditsResult> {
  const { organizationId, amount, action } = args;

  // Get current license to check for unlimited credits
  const license = await getLicenseInternal(ctx, organizationId);
  const tierName = license.planTier as TierName;

  // Enterprise with unlimited credits - skip deduction
  if (license.limits.monthlyCredits === -1) {
    // Still record the transaction for auditing
    await ctx.db.insert("creditTransactions", {
      organizationId,
      userId: args.userId,
      type: "consumption",
      amount: -amount,
      creditSource: "monthly",
      balanceAfter: { gifted: 0, daily: -1, monthly: -1, purchased: 0, total: -1 },
      reason: "consumption_runtime_action",
      scopeType: "organization",
      scopeOrganizationId: organizationId,
      action,
      actionCredits: amount,
      relatedEntityType: args.relatedEntityType,
      relatedEntityId: args.relatedEntityId,
      createdAt: Date.now(),
    });
    return { success: true, creditsRemaining: -1, isUnlimited: true };
  }

  // Get or create balance record
  let balance = await ctx.db
    .query("creditBalances")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .first();

  if (!balance) {
    // Create initial balance
    const balanceId = await ctx.db.insert("creditBalances", {
      organizationId,
      dailyCredits: 0,
      dailyCreditsLastReset: 0,
      giftedCredits: 0,
      monthlyCredits: 0,
      monthlyCreditsTotal: 0,
      monthlyPeriodStart: 0,
      monthlyPeriodEnd: 0,
      purchasedCredits: 0,
      lastUpdated: Date.now(),
    });
    balance = await ctx.db.get(balanceId);
    if (!balance) throw new Error("Failed to create credit balance");
  }

  const currentSnapshot = getBalanceSnapshot(balance);
  const totalAvailable = currentSnapshot.total;

  // Check if enough credits — if not, try parent org's pool
  if (totalAvailable < amount) {
    // Look up parent organization for credit pool sharing
    const org = await ctx.db.get(organizationId);
    const parentId = org?.parentOrganizationId;

    if (parentId) {
      // Get parent's sharing config
      const parentOrg = await ctx.db.get(parentId);
      const sharingConfig = getCreditSharingConfig(
        parentOrg as { customProperties?: Record<string, unknown> } | null
      );

      if (!sharingConfig.enabled) {
        throw new ConvexError({
          code: "CREDIT_SHARING_DISABLED",
          message: "Credit sharing is disabled for this organization.",
        });
      }

      // Resolve per-child cap (check overrides)
      const childCap = resolveChildCap(sharingConfig, organizationId);
      const effectiveBlockAt = childCap * sharingConfig.blockAt;

      // Check per-child daily cap
      const childUsageToday = await getChildCreditUsageToday(ctx, parentId, organizationId);

      if (childUsageToday + amount > effectiveBlockAt) {
        throw new ConvexError({
          code: "CHILD_CREDIT_CAP_REACHED",
          message: `Child org has reached daily credit sharing limit (${childCap})`,
          childOrgId: organizationId,
          usage: childUsageToday,
          cap: childCap,
        });
      }

      // Notify if approaching per-child cap
      const effectiveNotifyAt = childCap * sharingConfig.notifyAt;
      if (childUsageToday + amount > effectiveNotifyAt) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (ctx as any).scheduler.runAfter(0, generatedApi.internal.credits.notifications.notifyChildCreditCapApproaching, {
            parentOrgId: parentId,
            childOrgId: organizationId,
            usage: childUsageToday + amount,
            cap: childCap,
          });
        } catch (e) {
          console.warn("[Credits] Failed to schedule child cap notification:", e);
        }
      }

      // Check total shared pool cap
      const totalSharedToday = await getTotalSharedUsageToday(ctx, parentId);
      const totalEffectiveBlock = sharingConfig.maxTotalShared * sharingConfig.blockAt;

      if (totalSharedToday + amount > totalEffectiveBlock) {
        throw new ConvexError({
          code: "SHARED_POOL_EXHAUSTED",
          message: "Total shared credit pool exhausted for today",
          totalShared: totalSharedToday,
          cap: sharingConfig.maxTotalShared,
        });
      }

      // Notify if approaching total shared cap
      if (totalSharedToday + amount > sharingConfig.maxTotalShared * sharingConfig.notifyAt) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (ctx as any).scheduler.runAfter(0, generatedApi.internal.credits.notifications.notifySharedPoolApproaching, {
            parentOrgId: parentId,
            totalShared: totalSharedToday + amount,
            cap: sharingConfig.maxTotalShared,
          });
        } catch (e) {
          console.warn("[Credits] Failed to schedule shared pool notification:", e);
        }
      }

      // Sub-org has insufficient credits — deduct from parent pool
      console.log(`[Credits] Sub-org ${organizationId} has ${totalAvailable} credits, need ${amount}. Falling back to parent ${parentId}`);

      const parentResult = await deductCreditsInternal(ctx, {
        organizationId: parentId,
        userId: args.userId,
        amount,
        action: args.action,
        relatedEntityType: args.relatedEntityType,
        relatedEntityId: args.relatedEntityId,
        childOrganizationId: organizationId,
      });

      // Record sharing ledger entry
      await recordCreditSharingTransaction(ctx, parentId, organizationId, amount, action);

      // Record a tracking transaction on the child org (zero-cost, audit only)
      await ctx.db.insert("creditTransactions", {
        organizationId,
        userId: args.userId,
        type: "consumption",
        amount: -amount,
        creditSource: "monthly",
        balanceAfter: {
          gifted: currentSnapshot.gifted,
          daily: balance.dailyCredits,
          monthly: balance.monthlyCredits,
          purchased: balance.purchasedCredits,
          total: totalAvailable,
        },
        reason: "consumption_parent_fallback",
        scopeType: "organization",
        scopeOrganizationId: organizationId,
        action,
        actionCredits: amount,
        relatedEntityType: args.relatedEntityType,
        relatedEntityId: args.relatedEntityId,
        deductedFromParentId: parentId,
        createdAt: Date.now(),
      });

      return {
        ...parentResult,
        deductedFromParent: true,
        parentOrganizationId: parentId,
      };
    }

    throw new ConvexError({
      code: "CREDITS_EXHAUSTED",
      message: `Not enough credits. Need ${amount}, have ${totalAvailable}. Upgrade to ${getNextTierName(tierName)} or purchase a credit pack.`,
      creditsRequired: amount,
      creditsAvailable: totalAvailable,
      currentTier: tierName,
      nextTier: getNextTierName(tierName),
    });
  }

  // Deduct in canonical order: gifted -> monthly -> purchased.
  // Legacy daily credits are consumed first inside the gifted bucket.
  const plan = buildCreditConsumptionPlan({
    amount,
    giftedCredits: balance.giftedCredits ?? 0,
    legacyDailyCredits: balance.dailyCredits,
    monthlyCredits: balance.monthlyCredits,
    purchasedCredits: balance.purchasedCredits,
  });

  const newDaily = normalizeNonNegativeInt(balance.dailyCredits) - plan.giftedFromLegacyDailyUsed;
  const newGifted = normalizeNonNegativeInt(balance.giftedCredits) - plan.giftedFromGiftedPoolUsed;
  const newMonthly = normalizeNonNegativeInt(balance.monthlyCredits) - plan.monthlyUsed;
  const newPurchased = normalizeNonNegativeInt(balance.purchasedCredits) - plan.purchasedUsed;
  const newTotal = newGifted + newDaily + newMonthly + newPurchased;

  await ctx.db.patch(balance._id, {
    giftedCredits: newGifted,
    dailyCredits: newDaily,
    monthlyCredits: newMonthly,
    purchasedCredits: newPurchased,
    lastUpdated: Date.now(),
  });

  // Canonical source selection follows bucket order.
  const creditSource = resolvePrimaryCreditSource(plan);

  // Record transaction
  await ctx.db.insert("creditTransactions", {
    organizationId,
    userId: args.userId,
    type: "consumption",
    amount: -amount,
    creditSource,
    balanceAfter: {
      gifted: newGifted,
      daily: newDaily,
      monthly: newMonthly,
      purchased: newPurchased,
      total: newTotal,
    },
    reason: "consumption_runtime_action",
    scopeType: "organization",
    scopeOrganizationId: organizationId,
    action,
    actionCredits: amount,
    relatedEntityType: args.relatedEntityType,
    relatedEntityId: args.relatedEntityId,
    childOrganizationId: args.childOrganizationId,
    createdAt: Date.now(),
  });

  // Schedule threshold check (fire-and-forget)
  if (typeof ctx.scheduler?.runAfter === "function") {
    const totalRemaining = newTotal;
    const monthlyTotal = balance.monthlyCreditsTotal || 0;
    if (monthlyTotal > 0) {
      (ctx.scheduler as any).runAfter(0, generatedApi.internal.credits.notifications.checkThresholds, {
        organizationId,
        currentBalance: totalRemaining,
        monthlyTotal,
      });
    }
  }

  return {
    success: true,
    creditsRemaining: newTotal,
    isUnlimited: false,
    monthlyTotal: balance.monthlyCreditsTotal || 0,
    breakdown: {
      dailyUsed: plan.giftedFromLegacyDailyUsed,
      giftedUsed: plan.giftedUsed,
      giftedFromLegacyDailyUsed: plan.giftedFromLegacyDailyUsed,
      giftedFromGiftedPoolUsed: plan.giftedFromGiftedPoolUsed,
      monthlyUsed: plan.monthlyUsed,
      purchasedUsed: plan.purchasedUsed,
    },
  };
}

/**
 * GRANT DAILY CREDITS
 *
 * Called on user login. Resets daily credits to tier maximum.
 * Only resets if last reset was on a different calendar day.
 */
export const grantDailyCredits = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await grantDailyCreditsInternal(ctx, args.organizationId);
  },
});

export const grantDailyCreditsInternalMutation = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await grantDailyCreditsInternal(ctx, args.organizationId);
  },
});

async function grantDailyCreditsInternal(
  ctx: MutationCtx,
  organizationId: Id<"organizations">
) {
  const license = await getLicenseInternal(ctx, organizationId);
  const dailyAllocation = license.limits.dailyCreditsOnLogin;

  if (dailyAllocation === 0 || dailyAllocation === -1) {
    return { granted: false, reason: "no_daily_credits" };
  }

  // Get or create balance
  let balance = await ctx.db
    .query("creditBalances")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .first();

  const now = Date.now();
  const today = new Date(now).toDateString();
  const lastReset = balance ? new Date(balance.dailyCreditsLastReset).toDateString() : "";

  // Already granted today
  if (today === lastReset) {
    return { granted: false, reason: "already_granted_today" };
  }

  if (!balance) {
    // Create initial balance with daily credits
    await ctx.db.insert("creditBalances", {
      organizationId,
      dailyCredits: dailyAllocation,
      dailyCreditsLastReset: now,
      giftedCredits: 0,
      monthlyCredits: 0,
      monthlyCreditsTotal: 0,
      monthlyPeriodStart: 0,
      monthlyPeriodEnd: 0,
      purchasedCredits: 0,
      lastUpdated: now,
    });
  } else {
    // Reset daily credits
    await ctx.db.patch(balance._id, {
      dailyCredits: dailyAllocation,
      dailyCreditsLastReset: now,
      lastUpdated: now,
    });
  }

  // Record transaction
  await ctx.db.insert("creditTransactions", {
    organizationId,
    type: "daily_grant",
    amount: dailyAllocation,
    creditSource: "daily",
    balanceAfter: {
      gifted: balance?.giftedCredits || 0,
      daily: dailyAllocation,
      monthly: balance?.monthlyCredits || 0,
      purchased: balance?.purchasedCredits || 0,
      total:
        (balance?.giftedCredits || 0) +
        dailyAllocation +
        (balance?.monthlyCredits || 0) +
        (balance?.purchasedCredits || 0),
    },
    reason: "legacy_daily_grant",
    expiryPolicy: "fixed_timestamp",
    scopeType: "organization",
    scopeOrganizationId: organizationId,
    createdAt: now,
  });

  return { granted: true, amount: dailyAllocation };
}

/**
 * GRANT GIFTED CREDITS
 *
 * Adds gifted credits with explicit scope metadata and immutable reason.
 * Supports idempotent writes for referral/redeem/admin flows.
 */
type GrantGiftedCreditsInput = {
  organizationId: Id<"organizations">;
  userId?: Id<"users">;
  amount: number;
  reason: GiftedGrantReason;
  scopeType?: CreditScopeType;
  scopeOrganizationId?: Id<"organizations">;
  scopeUserId?: Id<"users">;
  expiresAt?: number;
  idempotencyKey?: string;
};

async function grantGiftedCreditsInternal(
  ctx: MutationCtx,
  args: GrantGiftedCreditsInput
) {
  if (!Number.isFinite(args.amount) || args.amount <= 0) {
    throw new ConvexError({
      code: "INVALID_CREDIT_AMOUNT",
      message: "Gifted credit amount must be a positive number.",
    });
  }

  const normalizedIdempotencyKey = normalizeCreditIdempotencyKey(args.idempotencyKey);
  const existing = await findTransactionByIdempotencyKey(
    ctx,
    args.organizationId,
    normalizedIdempotencyKey
  );
  if (existing) {
    return {
      success: true,
      idempotent: true,
      transactionId: existing._id,
      newGiftedBalance: existing.balanceAfter.gifted ?? 0,
    };
  }

  const scopeType = args.scopeType ?? "organization";
  const scope = resolveScopeMetadata({
    organizationId: args.organizationId,
    scopeType,
    scopeOrganizationId: args.scopeOrganizationId,
    scopeUserId: args.scopeUserId,
  });

  const now = Date.now();
  const balance = await ctx.db
    .query("creditBalances")
    .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
    .first();

  const nextGifted = normalizeNonNegativeInt(balance?.giftedCredits) + Math.floor(args.amount);
  const dailyCredits = normalizeNonNegativeInt(balance?.dailyCredits);
  const monthlyCredits = normalizeNonNegativeInt(balance?.monthlyCredits);
  const purchasedCredits = normalizeNonNegativeInt(balance?.purchasedCredits);

  if (!balance) {
    await ctx.db.insert("creditBalances", {
      organizationId: args.organizationId,
      dailyCredits,
      dailyCreditsLastReset: 0,
      giftedCredits: nextGifted,
      monthlyCredits,
      monthlyCreditsTotal: 0,
      monthlyPeriodStart: 0,
      monthlyPeriodEnd: 0,
      purchasedCredits,
      lastUpdated: now,
    });
  } else {
    await ctx.db.patch(balance._id, {
      giftedCredits: nextGifted,
      lastUpdated: now,
    });
  }

  const total = nextGifted + dailyCredits + monthlyCredits + purchasedCredits;
  const transactionId = await ctx.db.insert("creditTransactions", {
    organizationId: args.organizationId,
    userId: args.userId,
    type: "gift_grant",
    amount: Math.floor(args.amount),
    creditSource: "gifted",
    reason: args.reason,
    idempotencyKey: normalizedIdempotencyKey ?? undefined,
    expiresAt: args.expiresAt,
    expiryPolicy: args.expiresAt ? "fixed_timestamp" : "none",
    scopeType,
    scopeOrganizationId: scope.scopeOrganizationId,
    scopeUserId: scope.scopeUserId,
    balanceAfter: {
      gifted: nextGifted,
      daily: dailyCredits,
      monthly: monthlyCredits,
      purchased: purchasedCredits,
      total,
    },
    createdAt: now,
  });

  return {
    success: true,
    idempotent: false,
    transactionId,
    newGiftedBalance: nextGifted,
  };
}

export const grantGiftedCredits = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    amount: v.number(),
    reason: giftedGrantReasonArgValidator,
    scopeType: v.optional(creditScopeTypeArgValidator),
    scopeOrganizationId: v.optional(v.id("organizations")),
    scopeUserId: v.optional(v.id("users")),
    expiresAt: v.optional(v.number()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await grantGiftedCreditsInternal(ctx, args);
  },
});

/**
 * GRANT MONTHLY CREDITS
 *
 * Called when a new billing cycle starts (via Stripe webhook or subscription creation).
 * Resets monthly credits to tier allocation.
 */
export const grantMonthlyCredits = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    monthlyCredits: v.number(),
    periodStart: v.number(),
    periodEnd: v.number(),
    reason: v.optional(monthlyGrantReasonArgValidator),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, monthlyCredits, periodStart, periodEnd } = args;

    if (!Number.isFinite(monthlyCredits) || monthlyCredits < 0) {
      throw new ConvexError({
        code: "INVALID_CREDIT_AMOUNT",
        message: "Monthly credit allocation must be a non-negative number.",
      });
    }

    const normalizedIdempotencyKey = normalizeCreditIdempotencyKey(args.idempotencyKey);
    const existing = await findTransactionByIdempotencyKey(
      ctx,
      organizationId,
      normalizedIdempotencyKey
    );
    if (existing) {
      return {
        success: true,
        idempotent: true,
        monthlyCredits: existing.amount,
      };
    }

    let balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .first();

    const now = Date.now();

    if (!balance) {
      await ctx.db.insert("creditBalances", {
        organizationId,
        dailyCredits: 0,
        dailyCreditsLastReset: 0,
        giftedCredits: 0,
        monthlyCredits,
        monthlyCreditsTotal: monthlyCredits,
        monthlyPeriodStart: periodStart,
        monthlyPeriodEnd: periodEnd,
        purchasedCredits: 0,
        lastUpdated: now,
      });
    } else {
      await ctx.db.patch(balance._id, {
        monthlyCredits,
        monthlyCreditsTotal: monthlyCredits,
        monthlyPeriodStart: periodStart,
        monthlyPeriodEnd: periodEnd,
        lastUpdated: now,
      });
    }

    // Record transaction
    balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .first();

    await ctx.db.insert("creditTransactions", {
      organizationId,
      type: "monthly_grant",
      amount: monthlyCredits,
      creditSource: "monthly",
      reason: args.reason ?? "monthly_plan_allocation",
      idempotencyKey: normalizedIdempotencyKey ?? undefined,
      expiresAt: periodEnd,
      expiryPolicy: "billing_period_end",
      scopeType: "organization",
      scopeOrganizationId: organizationId,
      balanceAfter: {
        gifted: balance?.giftedCredits || 0,
        daily: balance?.dailyCredits || 0,
        monthly: monthlyCredits,
        purchased: balance?.purchasedCredits || 0,
        total:
          (balance?.giftedCredits || 0) +
          (balance?.dailyCredits || 0) +
          monthlyCredits +
          (balance?.purchasedCredits || 0),
      },
      createdAt: now,
    });

    return { success: true, idempotent: false, monthlyCredits };
  },
});

/**
 * CREDIT REDEMPTION CODE MANAGEMENT
 */

function toCreditRedemptionCodeView(
  codeDoc: CreditRedemptionCodeDocumentLike,
  now = Date.now()
) {
  const resolvedStatus = resolveCreditRedemptionCodeLifecycle({
    status: codeDoc.status,
    expiresAt: codeDoc.expiresAt,
    redemptionCount: codeDoc.redemptionCount,
    maxRedemptions: codeDoc.maxRedemptions,
    now,
  });

  return {
    _id: codeDoc._id,
    code: codeDoc.code,
    status: resolvedStatus,
    creditsAmount: codeDoc.creditsAmount,
    maxRedemptions: codeDoc.maxRedemptions,
    redemptionCount: codeDoc.redemptionCount,
    remainingRedemptions: Math.max(0, codeDoc.maxRedemptions - codeDoc.redemptionCount),
    expiresAt: codeDoc.expiresAt ?? null,
    allowedTierNames: codeDoc.allowedTierNames ?? [],
    allowedOrganizationIds: codeDoc.allowedOrganizationIds ?? [],
    allowedUserIds: codeDoc.allowedUserIds ?? [],
    description: codeDoc.description ?? null,
    createdByUserId: codeDoc.createdByUserId,
    revokedByUserId: codeDoc.revokedByUserId ?? null,
    revokeReason: codeDoc.revokeReason ?? null,
    createdAt: codeDoc.createdAt,
    updatedAt: codeDoc.updatedAt,
    revokedAt: codeDoc.revokedAt ?? null,
    lastRedeemedAt: codeDoc.lastRedeemedAt ?? null,
  };
}

async function findCreditRedemptionCodeByCode(
  ctx: QueryCtx | MutationCtx,
  code: string
): Promise<CreditRedemptionCodeDocumentLike | null> {
  const codeDoc = await ctx.db
    .query("creditRedemptionCodes")
    .withIndex("by_code", (q) => q.eq("code", code))
    .first();

  return (codeDoc as CreditRedemptionCodeDocumentLike | null) ?? null;
}

export const createCreditRedemptionCode = mutation({
  args: {
    sessionId: v.string(),
    code: v.optional(v.string()),
    creditsAmount: v.number(),
    maxRedemptions: v.number(),
    expiresAt: v.optional(v.number()),
    allowedTierNames: v.optional(v.array(creditTierNameArgValidator)),
    allowedOrganizationIds: v.optional(v.array(v.id("organizations"))),
    allowedUserIds: v.optional(v.array(v.id("users"))),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdminSession(ctx, args.sessionId);

    const creditsAmount = normalizeRedemptionCodeAmount(args.creditsAmount);
    const maxRedemptions = normalizeRedemptionCodeLimit(args.maxRedemptions);
    const expiresAt = normalizeOptionalFutureTimestamp(args.expiresAt);
    const description = normalizeOptionalDescription(args.description);

    const allowedTierNames = normalizeTierRestrictions(args.allowedTierNames);
    if (Array.isArray(args.allowedTierNames) && args.allowedTierNames.length > 0 && (!allowedTierNames || allowedTierNames.length === 0)) {
      throw new ConvexError({
        code: "INVALID_REDEMPTION_POLICY",
        message: "allowedTierNames must include at least one supported tier.",
      });
    }

    const allowedOrganizationIds = normalizeIdRestrictionList(args.allowedOrganizationIds);
    if (
      Array.isArray(args.allowedOrganizationIds) &&
      args.allowedOrganizationIds.length > 0 &&
      (!allowedOrganizationIds || allowedOrganizationIds.length === 0)
    ) {
      throw new ConvexError({
        code: "INVALID_REDEMPTION_POLICY",
        message: "allowedOrganizationIds must include at least one organization.",
      });
    }

    const allowedUserIds = normalizeIdRestrictionList(args.allowedUserIds);
    if (
      Array.isArray(args.allowedUserIds) &&
      args.allowedUserIds.length > 0 &&
      (!allowedUserIds || allowedUserIds.length === 0)
    ) {
      throw new ConvexError({
        code: "INVALID_REDEMPTION_POLICY",
        message: "allowedUserIds must include at least one user.",
      });
    }

    let code = args.code
      ? assertValidCreditRedemptionCode(args.code)
      : generateCreditRedemptionCode();

    let attempts = 0;
    while (attempts < 8) {
      const existing = await findCreditRedemptionCodeByCode(ctx, code);
      if (!existing) {
        break;
      }
      if (args.code) {
        throw new ConvexError({
          code: "REDEMPTION_CODE_ALREADY_EXISTS",
          message: "Redemption code already exists.",
        });
      }
      code = generateCreditRedemptionCode();
      attempts += 1;
    }

    if (attempts >= 8) {
      throw new ConvexError({
        code: "REDEMPTION_CODE_GENERATION_FAILED",
        message: "Failed to generate a unique redemption code.",
      });
    }

    const now = Date.now();
    const codeId = await ctx.db.insert("creditRedemptionCodes", {
      code,
      status: "active",
      creditsAmount,
      maxRedemptions,
      redemptionCount: 0,
      expiresAt,
      allowedTierNames,
      allowedOrganizationIds: allowedOrganizationIds as Id<"organizations">[] | undefined,
      allowedUserIds: allowedUserIds as Id<"users">[] | undefined,
      description,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      codeId,
      code,
      status: "active" as const,
      creditsAmount,
      maxRedemptions,
      expiresAt: expiresAt ?? null,
      allowedTierNames: allowedTierNames ?? [],
      allowedOrganizationIds: (allowedOrganizationIds ?? []) as Id<"organizations">[],
      allowedUserIds: (allowedUserIds ?? []) as Id<"users">[],
      description: description ?? null,
    };
  },
});

export const revokeCreditRedemptionCode = mutation({
  args: {
    sessionId: v.string(),
    codeId: v.id("creditRedemptionCodes"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdminSession(ctx, args.sessionId);
    const codeDocRaw = await ctx.db.get(args.codeId);
    const codeDoc = codeDocRaw as CreditRedemptionCodeDocumentLike | null;

    if (!codeDoc) {
      throw new ConvexError({
        code: "REDEMPTION_CODE_NOT_FOUND",
        message: "Redemption code not found.",
      });
    }

    if (codeDoc.status === "revoked") {
      return {
        success: true,
        alreadyRevoked: true,
        codeId: codeDoc._id,
        status: "revoked" as const,
      };
    }

    const now = Date.now();
    const reason = normalizeOptionalDescription(args.reason);
    await ctx.db.patch(codeDoc._id, {
      status: "revoked",
      revokedByUserId: userId,
      revokeReason: reason,
      revokedAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      alreadyRevoked: false,
      codeId: codeDoc._id,
      status: "revoked" as const,
      revokedAt: now,
    };
  },
});

export const listCreditRedemptionCodes = query({
  args: {
    sessionId: v.string(),
    status: v.optional(creditRedemptionCodeStatusArgValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const limit = Math.max(1, Math.min(args.limit || 100, 300));
    const now = Date.now();

    const candidates = await ctx.db
      .query("creditRedemptionCodes")
      .withIndex("by_created_at", (q) => q.gte("createdAt", 0))
      .order("desc")
      .take(Math.max(limit * 4, 120));

    const projected = candidates
      .map((doc) => toCreditRedemptionCodeView(doc as CreditRedemptionCodeDocumentLike, now))
      .filter((doc) => !args.status || doc.status === args.status)
      .slice(0, limit);

    return {
      success: true,
      items: projected,
      limit,
    };
  },
});

export const listCreditCodeRedemptions = query({
  args: {
    sessionId: v.string(),
    codeId: v.optional(v.id("creditRedemptionCodes")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const limit = Math.max(1, Math.min(args.limit || 100, 300));

    const redemptions = args.codeId
      ? await ctx.db
          .query("creditCodeRedemptions")
          .withIndex("by_code_id", (q) => q.eq("codeId", args.codeId!))
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("creditCodeRedemptions")
          .withIndex("by_redeemed_at", (q) => q.gte("redeemedAt", 0))
          .order("desc")
          .take(limit);

    return {
      success: true,
      items: redemptions.map((entry) => ({
        _id: entry._id,
        codeId: entry.codeId,
        code: entry.code,
        redeemedByUserId: entry.redeemedByUserId,
        redeemedByOrganizationId: entry.redeemedByOrganizationId,
        creditsGranted: entry.creditsGranted,
        creditTransactionId: entry.creditTransactionId,
        idempotencyKey: entry.idempotencyKey,
        redeemedAt: entry.redeemedAt,
      })),
      limit,
    };
  },
});

export const getCreditRedemptionCodeAnalytics = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const now = Date.now();

    const codesRaw = await ctx.db
      .query("creditRedemptionCodes")
      .withIndex("by_created_at", (q) => q.gte("createdAt", 0))
      .order("desc")
      .collect();
    const codes = codesRaw.map((doc) =>
      toCreditRedemptionCodeView(doc as CreditRedemptionCodeDocumentLike, now)
    );

    const summary = {
      totalCodes: codes.length,
      activeCodes: 0,
      revokedCodes: 0,
      expiredCodes: 0,
      exhaustedCodes: 0,
      totalPotentialCredits: 0,
      totalRedeemedCredits: 0,
      totalRedemptions: 0,
    };

    for (const code of codes) {
      summary.totalPotentialCredits += code.creditsAmount * code.maxRedemptions;
      summary.totalRedeemedCredits += code.creditsAmount * code.redemptionCount;
      summary.totalRedemptions += code.redemptionCount;

      if (code.status === "active") summary.activeCodes += 1;
      if (code.status === "revoked") summary.revokedCodes += 1;
      if (code.status === "expired") summary.expiredCodes += 1;
      if (code.status === "exhausted") summary.exhaustedCodes += 1;
    }

    const recentRedemptions = await ctx.db
      .query("creditCodeRedemptions")
      .withIndex("by_redeemed_at", (q) => q.gte("redeemedAt", 0))
      .order("desc")
      .take(10);

    return {
      success: true,
      summary,
      recentRedemptions: recentRedemptions.map((entry) => ({
        _id: entry._id,
        codeId: entry.codeId,
        code: entry.code,
        redeemedByUserId: entry.redeemedByUserId,
        redeemedByOrganizationId: entry.redeemedByOrganizationId,
        creditsGranted: entry.creditsGranted,
        redeemedAt: entry.redeemedAt,
      })),
    };
  },
});

export const redeemCreditCode = mutation({
  args: {
    sessionId: v.string(),
    code: v.string(),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const normalizedIdempotencyKey =
      normalizeCreditIdempotencyKey(args.idempotencyKey) ?? undefined;

    return await (ctx as any).runMutation(
      generatedApi.internal.credits.index.redeemCreditCodeInternal,
      {
        code: args.code,
        organizationId: auth.organizationId,
        userId: auth.userId,
        idempotencyKey: normalizedIdempotencyKey,
      }
    );
  },
});

export const redeemCreditCodeInternal = internalMutation({
  args: {
    code: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedCode = assertValidCreditRedemptionCode(args.code);
    const now = Date.now();

    const user = await ctx.db.get(args.userId);
    const organization = await ctx.db.get(args.organizationId);
    if (!user || !organization) {
      throw new ConvexError({
        code: "REDEEM_AMBIGUOUS_IDENTITY",
        message: "Redemption claim could not be validated.",
      });
    }

    const existingCodeDoc = await findCreditRedemptionCodeByCode(ctx, normalizedCode);
    if (!existingCodeDoc) {
      throw new ConvexError({
        code: "REDEEM_CODE_INVALID",
        message: "Redemption claim could not be validated.",
      });
    }

    const codeDoc = await syncCreditRedemptionCodeLifecycle(ctx, existingCodeDoc, now);
    if (codeDoc.status !== "active") {
      const errorCode =
        codeDoc.status === "revoked"
          ? "REDEEM_CODE_REVOKED"
          : codeDoc.status === "expired"
            ? "REDEEM_CODE_EXPIRED"
            : "REDEEM_CODE_EXHAUSTED";
      throw new ConvexError({
        code: errorCode,
        message: "Redemption claim could not be validated.",
      });
    }

    const license = await getLicenseInternal(ctx, args.organizationId);
    const targetingDecision = evaluateCreditRedemptionTargeting({
      organizationTier: String(license.planTier),
      organizationId: args.organizationId,
      userId: args.userId,
      allowedTierNames: codeDoc.allowedTierNames,
      allowedOrganizationIds: codeDoc.allowedOrganizationIds,
      allowedUserIds: codeDoc.allowedUserIds,
    });

    if (!targetingDecision.eligible) {
      throw new ConvexError({
        code:
          targetingDecision.reason === "invalid_policy"
            ? "REDEEM_CODE_INVALID_POLICY"
            : "REDEEM_CODE_NOT_ELIGIBLE",
        message: "Redemption claim could not be validated.",
      });
    }

    const existingRedemption = await ctx.db
      .query("creditCodeRedemptions")
      .withIndex("by_code_id_user", (q) =>
        q.eq("codeId", codeDoc._id).eq("redeemedByUserId", args.userId)
      )
      .first();
    if (existingRedemption) {
      throw new ConvexError({
        code: "REDEEM_CODE_ALREADY_REDEEMED_BY_USER",
        message: "Code already redeemed by this user.",
      });
    }

    const nextRedemptionCount = codeDoc.redemptionCount + 1;
    if (nextRedemptionCount > codeDoc.maxRedemptions) {
      throw new ConvexError({
        code: "REDEEM_CODE_EXHAUSTED",
        message: "Redemption claim could not be validated.",
      });
    }

    const nextStatus: CreditRedemptionCodeStatus =
      nextRedemptionCount >= codeDoc.maxRedemptions ? "exhausted" : "active";
    await ctx.db.patch(codeDoc._id, {
      redemptionCount: nextRedemptionCount,
      status: nextStatus,
      lastRedeemedAt: now,
      updatedAt: now,
    });

    const idempotencyKey =
      normalizeCreditIdempotencyKey(args.idempotencyKey) ??
      `redeem_code:${codeDoc._id}:${args.userId}`;

    const grantResult = await (ctx as any).runMutation(
      generatedApi.internal.credits.index.grantGiftedCredits,
      {
        organizationId: args.organizationId,
        userId: args.userId,
        amount: codeDoc.creditsAmount,
        reason: "gifted_redeem_code",
        scopeType: "organization",
        idempotencyKey,
      }
    );

    const transactionId = grantResult?.transactionId as Id<"creditTransactions">;
    if (!transactionId) {
      throw new ConvexError({
        code: "REDEEM_CODE_GRANT_FAILED",
        message: "Failed to apply redeemed credits.",
      });
    }

    const redemptionId = await ctx.db.insert("creditCodeRedemptions", {
      codeId: codeDoc._id,
      code: codeDoc.code,
      redeemedByUserId: args.userId,
      redeemedByOrganizationId: args.organizationId,
      creditsGranted: codeDoc.creditsAmount,
      creditTransactionId: transactionId,
      idempotencyKey,
      redeemedAt: now,
    });

    return {
      success: true,
      redemptionId,
      codeId: codeDoc._id,
      code: codeDoc.code,
      creditsGranted: codeDoc.creditsAmount,
      creditTransactionId: transactionId,
      status: nextStatus,
      remainingRedemptions: Math.max(0, codeDoc.maxRedemptions - nextRedemptionCount),
      redeemedAt: now,
    };
  },
});

// ============================================================================
// PLATFORM REFERRALS
// ============================================================================

type ReferralProfileRow = {
  _id: string;
  programOrganizationId: Id<"organizations">;
  userId: Id<"users">;
  referralCode: string;
  createdAt: number;
  updatedAt: number;
};

type ReferralAttributionRow = {
  _id: string;
  programOrganizationId: Id<"organizations">;
  referralCode: string;
  referrerUserId: Id<"users">;
  referredUserId: Id<"users">;
  referredOrganizationId: Id<"organizations">;
  source: ReferralAttributionSource;
  signupRewardStatus: "pending" | "granted" | "capped" | "skipped";
  signupRewardProcessedAt?: number;
  subscriptionRewardStatus: "pending_payment" | "granted" | "capped" | "skipped";
  subscriptionRewardProcessedAt?: number;
  subscriptionRewardConfirmedAt?: number;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  blockedReason?: string;
  createdAt: number;
  updatedAt: number;
};

type ReferralRewardEventRow = {
  _id: string;
  attributionId: string;
  rewardType: ReferralRewardType;
  referralRole: ReferralRole;
  rewardedUserId: Id<"users">;
  amount: number;
  monthKey: string;
  status: "granted" | "capped" | "skipped";
  creditTransactionId?: Id<"creditTransactions">;
  idempotencyKey: string;
  createdAt: number;
};

type ReferralStatsSnapshot = {
  monthKey: string;
  monthlyEarnedCredits: number;
  monthlyRemainingCredits: number;
  lifetimeEarnedCredits: number;
  referralSignups: number;
  referralSubscriptions: number;
};

function buildReferralSharePath(prefix: string, code: string): string {
  const normalizedPrefix = normalizeSharePathPrefix(prefix).replace(/\/+$/, "");
  return `${normalizedPrefix}/${code}`;
}

async function findReferralProfileByUserId(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">
): Promise<ReferralProfileRow | null> {
  const row = await (ctx.db as any)
    .query("referralProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  return (row as ReferralProfileRow | null) ?? null;
}

async function findReferralProfileByCode(
  ctx: MutationCtx | QueryCtx,
  referralCode: string
): Promise<ReferralProfileRow | null> {
  const row = await (ctx.db as any)
    .query("referralProfiles")
    .withIndex("by_code", (q: any) => q.eq("referralCode", referralCode))
    .first();
  return (row as ReferralProfileRow | null) ?? null;
}

async function ensureReferralProfileForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    programOrganizationId: Id<"organizations">;
  }
): Promise<ReferralProfileRow> {
  const existing = await findReferralProfileByUserId(ctx, args.userId);
  if (existing) {
    if (existing.programOrganizationId !== args.programOrganizationId) {
      await ctx.db.patch(existing._id as any, {
        programOrganizationId: args.programOrganizationId,
        updatedAt: Date.now(),
      });
      return {
        ...existing,
        programOrganizationId: args.programOrganizationId,
        updatedAt: Date.now(),
      };
    }
    return existing;
  }

  const now = Date.now();
  let attempt = 0;
  while (attempt < 16) {
    const referralCode = generateReferralCodeCandidate();
    const collision = await findReferralProfileByCode(ctx, referralCode);
    if (!collision) {
      const profileId = await (ctx.db as any).insert("referralProfiles", {
        programOrganizationId: args.programOrganizationId,
        userId: args.userId,
        referralCode,
        createdAt: now,
        updatedAt: now,
      });
      return {
        _id: String(profileId),
        programOrganizationId: args.programOrganizationId,
        userId: args.userId,
        referralCode,
        createdAt: now,
        updatedAt: now,
      };
    }
    attempt += 1;
  }

  throw new ConvexError({
    code: "REFERRAL_CODE_GENERATION_FAILED",
    message: "Failed to generate a unique referral code.",
  });
}

async function findReferralAttributionByReferredUser(
  ctx: MutationCtx | QueryCtx,
  referredUserId: Id<"users">
): Promise<ReferralAttributionRow | null> {
  const row = await (ctx.db as any)
    .query("referralAttributions")
    .withIndex("by_referred_user", (q: any) => q.eq("referredUserId", referredUserId))
    .first();
  return (row as ReferralAttributionRow | null) ?? null;
}

async function findReferralAttributionByReferredOrganization(
  ctx: MutationCtx | QueryCtx,
  referredOrganizationId: Id<"organizations">
): Promise<ReferralAttributionRow | null> {
  const row = await (ctx.db as any)
    .query("referralAttributions")
    .withIndex("by_referred_org", (q: any) =>
      q.eq("referredOrganizationId", referredOrganizationId)
    )
    .first();
  return (row as ReferralAttributionRow | null) ?? null;
}

async function countRecentReferralAttributionsForReferrer(
  ctx: MutationCtx | QueryCtx,
  args: {
    referrerUserId: Id<"users">;
    sinceTimestamp: number;
  }
): Promise<number> {
  const rows = await (ctx.db as any)
    .query("referralAttributions")
    .withIndex("by_referrer_user_created", (q: any) =>
      q.eq("referrerUserId", args.referrerUserId).gte("createdAt", args.sinceTimestamp)
    )
    .collect();
  return (rows as ReferralAttributionRow[]).length;
}

async function findReferralRewardEventByIdempotency(
  ctx: MutationCtx | QueryCtx,
  idempotencyKey: string
): Promise<ReferralRewardEventRow | null> {
  const row = await (ctx.db as any)
    .query("referralRewardEvents")
    .withIndex("by_idempotency", (q: any) => q.eq("idempotencyKey", idempotencyKey))
    .first();
  return (row as ReferralRewardEventRow | null) ?? null;
}

async function resolveRewardOrganizationForUser(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<Id<"organizations"> | null> {
  const user = await ctx.db.get(userId);
  if (user?.defaultOrgId) {
    return user.defaultOrgId;
  }

  const memberships = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const activeMembership = memberships.find((membership) => membership.isActive);
  return activeMembership?.organizationId ?? null;
}

async function getGrantedReferralRewardsForMonth(
  ctx: MutationCtx | QueryCtx,
  args: {
    userId: Id<"users">;
    monthKey: string;
  }
): Promise<number> {
  const rows = await (ctx.db as any)
    .query("referralRewardEvents")
    .withIndex("by_rewarded_user_month", (q: any) =>
      q.eq("rewardedUserId", args.userId).eq("monthKey", args.monthKey)
    )
    .collect();

  return (rows as ReferralRewardEventRow[])
    .filter((row) => row.status === "granted")
    .reduce((sum, row) => sum + normalizeNonNegativeInt(row.amount), 0);
}

async function getLifetimeGrantedReferralRewards(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">
): Promise<number> {
  const rows = await (ctx.db as any)
    .query("referralRewardEvents")
    .withIndex("by_rewarded_user_created", (q: any) => q.eq("rewardedUserId", userId))
    .collect();
  return (rows as ReferralRewardEventRow[])
    .filter((row) => row.status === "granted")
    .reduce((sum, row) => sum + normalizeNonNegativeInt(row.amount), 0);
}

async function computeReferralStats(
  ctx: MutationCtx | QueryCtx,
  args: {
    userId: Id<"users">;
    monthlyCapCredits: number;
  }
): Promise<ReferralStatsSnapshot> {
  const monthKey = toReferralMonthKey(Date.now());
  const monthlyEarnedCredits = await getGrantedReferralRewardsForMonth(ctx, {
    userId: args.userId,
    monthKey,
  });
  const lifetimeEarnedCredits = await getLifetimeGrantedReferralRewards(
    ctx,
    args.userId
  );

  const attributions = await (ctx.db as any)
    .query("referralAttributions")
    .withIndex("by_referrer_user_created", (q: any) =>
      q.eq("referrerUserId", args.userId)
    )
    .collect();

  const referralRows = attributions as ReferralAttributionRow[];
  const referralSignups = referralRows.length;
  const referralSubscriptions = referralRows.filter(
    (row) => row.subscriptionRewardStatus === "granted"
  ).length;

  return {
    monthKey,
    monthlyEarnedCredits,
    monthlyRemainingCredits: Math.max(
      0,
      args.monthlyCapCredits - monthlyEarnedCredits
    ),
    lifetimeEarnedCredits,
    referralSignups,
    referralSubscriptions,
  };
}

async function grantReferralRewardForUser(
  ctx: MutationCtx,
  args: {
    attributionId: string;
    programOrganizationId: Id<"organizations">;
    rewardType: ReferralRewardType;
    referralRole: ReferralRole;
    rewardedUserId: Id<"users">;
    counterpartyUserId: Id<"users">;
    amount: number;
    monthKey: string;
    monthlyCapCredits: number;
  }
): Promise<{
  status: "granted" | "capped" | "skipped";
  amount: number;
  creditTransactionId?: Id<"creditTransactions">;
}> {
  const idempotencyKey = `referral:${args.rewardType}:${args.attributionId}:${args.referralRole}:${args.rewardedUserId}`;
  const existingEvent = await findReferralRewardEventByIdempotency(ctx, idempotencyKey);
  if (existingEvent) {
    return {
      status: existingEvent.status,
      amount: existingEvent.amount,
      creditTransactionId: existingEvent.creditTransactionId,
    };
  }

  const rewardOrganizationId = await resolveRewardOrganizationForUser(
    ctx,
    args.rewardedUserId
  );
  const fallbackOrganizationId = rewardOrganizationId ?? args.programOrganizationId;

  if (!rewardOrganizationId) {
    await (ctx.db as any).insert("referralRewardEvents", {
      attributionId: args.attributionId,
      programOrganizationId: args.programOrganizationId,
      rewardType: args.rewardType,
      referralRole: args.referralRole,
      rewardedUserId: args.rewardedUserId,
      rewardedOrganizationId: fallbackOrganizationId,
      counterpartyUserId: args.counterpartyUserId,
      amount: args.amount,
      monthKey: args.monthKey,
      status: "skipped",
      idempotencyKey,
      notes: "missing_reward_organization",
      createdAt: Date.now(),
    });
    return { status: "skipped", amount: args.amount };
  }

  const monthlyGranted = await getGrantedReferralRewardsForMonth(ctx, {
    userId: args.rewardedUserId,
    monthKey: args.monthKey,
  });
  if (monthlyGranted + args.amount > args.monthlyCapCredits) {
    await (ctx.db as any).insert("referralRewardEvents", {
      attributionId: args.attributionId,
      programOrganizationId: args.programOrganizationId,
      rewardType: args.rewardType,
      referralRole: args.referralRole,
      rewardedUserId: args.rewardedUserId,
      rewardedOrganizationId: rewardOrganizationId,
      counterpartyUserId: args.counterpartyUserId,
      amount: args.amount,
      monthKey: args.monthKey,
      status: "capped",
      idempotencyKey,
      notes: "monthly_cap_reached",
      createdAt: Date.now(),
    });
    return { status: "capped", amount: args.amount };
  }

  const grantResult = await grantGiftedCreditsInternal(ctx, {
    organizationId: rewardOrganizationId,
    userId: args.rewardedUserId,
    amount: args.amount,
    reason: "gifted_referral_reward",
    scopeType: "personal",
    scopeOrganizationId: rewardOrganizationId,
    scopeUserId: args.rewardedUserId,
    idempotencyKey,
  });

  const creditTransactionId = grantResult.transactionId as Id<"creditTransactions">;
  await (ctx.db as any).insert("referralRewardEvents", {
    attributionId: args.attributionId,
    programOrganizationId: args.programOrganizationId,
    rewardType: args.rewardType,
    referralRole: args.referralRole,
    rewardedUserId: args.rewardedUserId,
    rewardedOrganizationId: rewardOrganizationId,
    counterpartyUserId: args.counterpartyUserId,
    amount: args.amount,
    monthKey: args.monthKey,
    status: "granted",
    creditTransactionId,
    idempotencyKey,
    createdAt: Date.now(),
  });

  return {
    status: "granted",
    amount: args.amount,
    creditTransactionId,
  };
}

export const ensureReferralProfileInternal = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const config = await requireReferralProgramConfig(ctx);
    const profile = await ensureReferralProfileForUser(ctx, {
      userId: args.userId,
      programOrganizationId: config.targetOrganizationId,
    });

    return {
      success: true,
      code: profile.referralCode,
      sharePath: buildReferralSharePath(config.sharePathPrefix, profile.referralCode),
      config,
    };
  },
});

export const ensureReferralProfile = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    return await (ctx as any).runMutation(
      generatedApi.internal.credits.index.ensureReferralProfileInternal,
      { userId: auth.userId }
    );
  },
});

export const getReferralProgramDashboard = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const config = await resolveReferralProgramConfig(ctx, { requireEnabled: false });
    if (!config) {
      return {
        configured: false,
        enabled: false,
      };
    }

    const profile = await findReferralProfileByUserId(ctx, auth.userId);
    const stats = await computeReferralStats(ctx, {
      userId: auth.userId,
      monthlyCapCredits: config.monthlyRewardCapCredits,
    });

    return {
      configured: true,
      enabled: config.enabled,
      programOrganizationId: config.targetOrganizationId,
      sharePathPrefix: config.sharePathPrefix,
      code: profile?.referralCode ?? null,
      sharePath: profile
        ? buildReferralSharePath(config.sharePathPrefix, profile.referralCode)
        : null,
      signupRewardCredits: config.signupRewardCredits,
      subscriptionRewardCredits: config.subscriptionRewardCredits,
      monthlyCapCredits: config.monthlyRewardCapCredits,
      stats,
    };
  },
});

export const getReferralStatsInternal = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const config = await resolveReferralProgramConfig(ctx, { requireEnabled: false });
    if (!config) {
      return {
        configured: false,
        enabled: false,
      };
    }

    const stats = await computeReferralStats(ctx, {
      userId: args.userId,
      monthlyCapCredits: config.monthlyRewardCapCredits,
    });
    const profile = await findReferralProfileByUserId(ctx, args.userId);

    return {
      configured: true,
      enabled: config.enabled,
      sharePathPrefix: config.sharePathPrefix,
      code: profile?.referralCode ?? null,
      sharePath: profile
        ? buildReferralSharePath(config.sharePathPrefix, profile.referralCode)
        : null,
      signupRewardCredits: config.signupRewardCredits,
      subscriptionRewardCredits: config.subscriptionRewardCredits,
      monthlyCapCredits: config.monthlyRewardCapCredits,
      stats,
    };
  },
});

export const trackReferralSignupConversionInternal = internalMutation({
  args: {
    referralCode: v.string(),
    referredUserId: v.id("users"),
    referredOrganizationId: v.id("organizations"),
    source: referralAttributionSourceArgValidator,
  },
  handler: async (ctx, args) => {
    const config = await resolveReferralProgramConfig(ctx, { requireEnabled: true });
    if (!config) {
      return {
        success: false,
        reason: "program_not_configured",
      };
    }

    const normalizedCode = normalizeReferralCode(args.referralCode);
    if (!normalizedCode) {
      return {
        success: false,
        reason: "invalid_referral_code",
      };
    }

    const profile = await findReferralProfileByCode(ctx, normalizedCode);
    if (!profile) {
      return {
        success: false,
        reason: "referral_code_not_found",
      };
    }

    const existingAttribution = await findReferralAttributionByReferredUser(
      ctx,
      args.referredUserId
    );
    if (existingAttribution) {
      return {
        success: true,
        idempotent: true,
        attributionId: existingAttribution._id,
        signupRewardStatus: existingAttribution.signupRewardStatus,
      };
    }

    const now = Date.now();
    const isSelfReferral = profile.userId === args.referredUserId;
    const existingOrganizationAttribution =
      await findReferralAttributionByReferredOrganization(
        ctx,
        args.referredOrganizationId
      );
    const recentReferralsForReferrer =
      await countRecentReferralAttributionsForReferrer(ctx, {
        referrerUserId: profile.userId,
        sinceTimestamp: now - REFERRAL_SIGNUP_VELOCITY_WINDOW_MS,
      });
    const abuseDecision = evaluateReferralAttributionAbuse({
      isSelfReferral,
      hasExistingReferredOrganizationAttribution:
        Boolean(existingOrganizationAttribution),
      recentReferralsForReferrer,
    });

    if (!abuseDecision.allowed) {
      if (
        abuseDecision.reason ===
          "referred_organization_already_attributed" &&
        existingOrganizationAttribution
      ) {
        return {
          success: false,
          reason: abuseDecision.reason,
          attributionId: existingOrganizationAttribution._id,
        };
      }

      const blockedAttributionId = await (ctx.db as any).insert(
        "referralAttributions",
        {
          programOrganizationId: config.targetOrganizationId,
          referralCode: normalizedCode,
          referrerUserId: profile.userId,
          referredUserId: args.referredUserId,
          referredOrganizationId: args.referredOrganizationId,
          source: args.source,
          signupRewardStatus: "skipped",
          subscriptionRewardStatus: "skipped",
          blockedReason: abuseDecision.reason,
          createdAt: now,
          updatedAt: now,
        }
      );

      return {
        success: false,
        reason: abuseDecision.reason,
        attributionId: blockedAttributionId,
      };
    }

    const attributionId = await (ctx.db as any).insert("referralAttributions", {
      programOrganizationId: config.targetOrganizationId,
      referralCode: normalizedCode,
      referrerUserId: profile.userId,
      referredUserId: args.referredUserId,
      referredOrganizationId: args.referredOrganizationId,
      source: args.source,
      signupRewardStatus: "pending",
      subscriptionRewardStatus: "pending_payment",
      createdAt: now,
      updatedAt: now,
    });

    const monthKey = toReferralMonthKey(now);
    const referrerReward = await grantReferralRewardForUser(ctx, {
      attributionId: String(attributionId),
      programOrganizationId: config.targetOrganizationId,
      rewardType: "signup",
      referralRole: "referrer",
      rewardedUserId: profile.userId,
      counterpartyUserId: args.referredUserId,
      amount: config.signupRewardCredits,
      monthKey,
      monthlyCapCredits: config.monthlyRewardCapCredits,
    });
    const referredReward = await grantReferralRewardForUser(ctx, {
      attributionId: String(attributionId),
      programOrganizationId: config.targetOrganizationId,
      rewardType: "signup",
      referralRole: "referred",
      rewardedUserId: args.referredUserId,
      counterpartyUserId: profile.userId,
      amount: config.signupRewardCredits,
      monthKey,
      monthlyCapCredits: config.monthlyRewardCapCredits,
    });

    const signupRewardStatus =
      referrerReward.status === "granted" && referredReward.status === "granted"
        ? "granted"
        : referrerReward.status === "capped" || referredReward.status === "capped"
          ? "capped"
          : "skipped";

    await ctx.db.patch(attributionId as any, {
      signupRewardStatus,
      signupRewardProcessedAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      idempotent: false,
      attributionId,
      signupRewardStatus,
      referrerReward,
      referredReward,
    };
  },
});

export const processReferralSubscriptionRewardInternal = internalMutation({
  args: {
    referredOrganizationId: v.id("organizations"),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    paymentConfirmedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const config = await resolveReferralProgramConfig(ctx, { requireEnabled: true });
    if (!config) {
      return {
        success: false,
        reason: "program_not_configured",
      };
    }

    const attribution = await findReferralAttributionByReferredOrganization(
      ctx,
      args.referredOrganizationId
    );
    if (!attribution) {
      return {
        success: false,
        reason: "attribution_not_found",
      };
    }

    if (attribution.subscriptionRewardStatus !== "pending_payment") {
      return {
        success: true,
        idempotent: true,
        attributionId: attribution._id,
        subscriptionRewardStatus: attribution.subscriptionRewardStatus,
      };
    }

    const now = args.paymentConfirmedAt ?? Date.now();
    const monthKey = toReferralMonthKey(now);
    const referrerReward = await grantReferralRewardForUser(ctx, {
      attributionId: attribution._id,
      programOrganizationId: config.targetOrganizationId,
      rewardType: "subscription",
      referralRole: "referrer",
      rewardedUserId: attribution.referrerUserId,
      counterpartyUserId: attribution.referredUserId,
      amount: config.subscriptionRewardCredits,
      monthKey,
      monthlyCapCredits: config.monthlyRewardCapCredits,
    });
    const referredReward = await grantReferralRewardForUser(ctx, {
      attributionId: attribution._id,
      programOrganizationId: config.targetOrganizationId,
      rewardType: "subscription",
      referralRole: "referred",
      rewardedUserId: attribution.referredUserId,
      counterpartyUserId: attribution.referrerUserId,
      amount: config.subscriptionRewardCredits,
      monthKey,
      monthlyCapCredits: config.monthlyRewardCapCredits,
    });

    const subscriptionRewardStatus =
      referrerReward.status === "granted" && referredReward.status === "granted"
        ? "granted"
        : referrerReward.status === "capped" || referredReward.status === "capped"
          ? "capped"
          : "skipped";

    await ctx.db.patch(attribution._id as any, {
      subscriptionRewardStatus,
      subscriptionRewardProcessedAt: now,
      subscriptionRewardConfirmedAt: now,
      stripeSubscriptionId: args.stripeSubscriptionId ?? attribution.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId ?? attribution.stripeCustomerId,
      updatedAt: now,
    });

    return {
      success: true,
      idempotent: false,
      attributionId: attribution._id,
      subscriptionRewardStatus,
      referrerReward,
      referredReward,
    };
  },
});

/**
 * ADD PURCHASED CREDITS
 *
 * Called after a successful credit pack purchase (via Stripe webhook).
 * Adds credits to the purchased pool.
 */
// ============================================================================
// CREDIT COSTS REGISTRY
// ============================================================================

/**
 * Credit costs for different agent/automation actions.
 * Used by the execution pipeline to determine deduction amounts.
 */
export const CREDIT_COSTS: Record<string, number> = {
  // Agent messages
  agent_message_simple: 1,     // Small model call (Llama/Mistral)
  agent_message_complex: 3,    // Large model call (Claude/GPT-4o)
  agent_message_default: 2,    // Default for unknown model complexity

  // Tool executions
  tool_query_org_data: 0,      // Read-only queries are free
  tool_search_contacts: 0,     // Read-only
  tool_create_contact: 1,      // CRM write
  tool_update_contact: 1,      // CRM write
  tool_send_email: 1,          // Send + track
  tool_send_ai_email: 2,       // AI writes + sends
  tool_create_workflow: 1,     // Automation setup
  tool_trigger_workflow: 1,    // Automation step
  tool_create_checkout: 1,     // Commerce setup
  tool_create_booking: 1,      // Booking action
  tool_default: 1,             // Default tool cost

  // Layers composition tools
  tool_create_layers_workflow: 2, // Visual workflow creation (nodes/edges)
  tool_link_objects: 0,           // Free — structural linking, not creation

  // Workflow/sequence steps
  workflow_trigger: 1,         // Automation step
  sequence_step_email: 1,      // Send + track
  sequence_step_ai: 2,         // AI writes + sends

  // SMS (platform-owned Infobip)
  sms_outbound: 2,             // Outbound SMS via platform account
  sms_inbound_processing: 1,   // Inbound SMS agent processing

  // Free actions
  form_submission: 0,          // Platform compute, no AI
  builder_generation: 0,       // BYOK - user's V0 credits
};

/**
 * Get the credit cost for an action.
 * Falls back to default costs for unknown actions.
 */
export function getCreditCost(action: string): number {
  return CREDIT_COSTS[action] ?? CREDIT_COSTS.tool_default ?? 1;
}

/**
 * Estimate credit cost for an agent message based on model.
 * Complex models (Claude, GPT-4o) cost more than simple ones.
 */
export function getAgentMessageCost(model: string): number {
  const complexModels = [
    "anthropic/claude-sonnet-4-20250514",
    "anthropic/claude-3-5-sonnet",
    "openai/gpt-4o",
    "google/gemini-pro-1.5",
  ];
  const simpleModels = [
    "openai/gpt-4o-mini",
    "meta-llama/llama-3.1-70b-instruct",
    "mistralai/mistral-large-latest",
  ];

  if (complexModels.some((m) => model.includes(m))) {
    return CREDIT_COSTS.agent_message_complex;
  }
  if (simpleModels.some((m) => model.includes(m))) {
    return CREDIT_COSTS.agent_message_simple;
  }
  return CREDIT_COSTS.agent_message_default;
}

/**
 * Get the credit cost for a tool execution.
 */
export function getToolCreditCost(toolName: string): number {
  const key = `tool_${toolName}`;
  return CREDIT_COSTS[key] ?? CREDIT_COSTS.tool_default ?? 1;
}

// ============================================================================
// INTERNAL MUTATIONS (for use by actions like agent execution)
// ============================================================================

/**
 * INTERNAL: Deduct Credits (for actions/internal pipeline)
 *
 * Same as deductCredits but accessible from internal actions.
 */
export const deductCreditsInternalMutation = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    amount: v.number(),
    action: v.string(),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
    billingSource: v.optional(aiBillingSourceArgValidator),
    requestSource: v.optional(aiCreditRequestSourceArgValidator),
    softFailOnExhausted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const {
      softFailOnExhausted,
      billingSource,
      requestSource,
      ...deductArgs
    } = args;
    const billingPolicy = resolveAiCreditBillingPolicy({
      billingSource,
      requestSource,
    });

    if (!billingPolicy.enforceCredits) {
      return {
        success: true,
        skipped: true,
        creditsRemaining: -1,
        isUnlimited: false,
        billingPolicy,
      } satisfies DeductCreditsResult;
    }

    try {
      const result = await deductCreditsInternal(ctx, deductArgs);
      return {
        ...result,
        billingPolicy,
      } satisfies DeductCreditsResult;
    } catch (error) {
      if (softFailOnExhausted) {
        const parsed = parseCreditExhaustionError(error);
        if (parsed) {
          return parsed;
        }
      }
      throw error;
    }
  },
});

/**
 * INTERNAL: Check credit balance (for pre-flight checks in actions)
 */
export const checkCreditsInternalQuery = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    requiredAmount: v.number(),
    billingSource: v.optional(aiBillingSourceArgValidator),
    requestSource: v.optional(aiCreditRequestSourceArgValidator),
  },
  handler: async (ctx, args) => {
    const billingPolicy = resolveAiCreditBillingPolicy({
      billingSource: args.billingSource,
      requestSource: args.requestSource,
    });

    if (!billingPolicy.enforceCredits) {
      return {
        hasCredits: true,
        isUnlimited: false,
        totalCredits: -1,
        shortfall: 0,
        skipped: true,
        billingPolicy,
      };
    }

    const balance = await getCreditBalanceInternal(ctx, args.organizationId);

    // Check for unlimited (enterprise)
    if (balance.monthlyCreditsTotal === -1) {
      return {
        hasCredits: true,
        isUnlimited: true,
        totalCredits: -1,
        billingPolicy,
      };
    }

    // Child org has enough credits on its own
    if (balance.totalCredits >= args.requiredAmount) {
      return {
        hasCredits: true,
        isUnlimited: false,
        totalCredits: balance.totalCredits,
        shortfall: 0,
        billingPolicy,
      };
    }

    // Check parent org's pool as fallback (sub-org credit sharing)
    const org = await ctx.db.get(args.organizationId);
    if (org?.parentOrganizationId) {
      const parentBalance = await getCreditBalanceInternal(ctx, org.parentOrganizationId);

      // Parent has unlimited credits
      if (parentBalance.monthlyCreditsTotal === -1) {
        return {
          hasCredits: true,
          isUnlimited: true,
          totalCredits: -1,
          fromParent: true,
          billingPolicy,
        };
      }

      // Parent has enough credits
      if (parentBalance.totalCredits >= args.requiredAmount) {
        return {
          hasCredits: true,
          isUnlimited: false,
          totalCredits: parentBalance.totalCredits,
          shortfall: 0,
          fromParent: true,
          billingPolicy,
        };
      }
    }

    return {
      hasCredits: false,
      isUnlimited: false,
      totalCredits: balance.totalCredits,
      shortfall: Math.max(0, args.requiredAmount - balance.totalCredits),
      billingPolicy,
    };
  },
});

export const addPurchasedCredits = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    credits: v.number(),
    packId: v.string(),
    stripePaymentIntentId: v.string(),
    reason: v.optional(purchaseGrantReasonArgValidator),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, credits, packId, stripePaymentIntentId } = args;

    if (!Number.isFinite(credits) || credits <= 0) {
      throw new ConvexError({
        code: "INVALID_CREDIT_AMOUNT",
        message: "Purchased credits must be a positive number.",
      });
    }

    const normalizedIdempotencyKey = normalizeCreditIdempotencyKey(args.idempotencyKey);
    const existing = await findTransactionByIdempotencyKey(
      ctx,
      organizationId,
      normalizedIdempotencyKey
    );
    if (existing) {
      return {
        success: true,
        idempotent: true,
        newBalance: existing.balanceAfter.purchased,
      };
    }

    let balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .first();

    const now = Date.now();
    const newPurchased = normalizeNonNegativeInt(balance?.purchasedCredits) + Math.floor(credits);

    if (!balance) {
      await ctx.db.insert("creditBalances", {
        organizationId,
        dailyCredits: 0,
        dailyCreditsLastReset: 0,
        giftedCredits: 0,
        monthlyCredits: 0,
        monthlyCreditsTotal: 0,
        monthlyPeriodStart: 0,
        monthlyPeriodEnd: 0,
        purchasedCredits: newPurchased,
        lastUpdated: now,
      });
    } else {
      await ctx.db.patch(balance._id, {
        purchasedCredits: newPurchased,
        lastUpdated: now,
      });
    }

    // Record transaction
    balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .first();

    await ctx.db.insert("creditTransactions", {
      organizationId,
      userId: args.userId,
      type: "purchase",
      amount: Math.floor(credits),
      creditSource: "purchased",
      reason: args.reason ?? "purchased_checkout_pack",
      idempotencyKey: normalizedIdempotencyKey ?? undefined,
      expiryPolicy: "none",
      scopeType: "organization",
      scopeOrganizationId: organizationId,
      balanceAfter: {
        gifted: balance?.giftedCredits || 0,
        daily: balance?.dailyCredits || 0,
        monthly: balance?.monthlyCredits || 0,
        purchased: newPurchased,
        total:
          (balance?.giftedCredits || 0) +
          (balance?.dailyCredits || 0) +
          (balance?.monthlyCredits || 0) +
          newPurchased,
      },
      packId,
      stripePaymentIntentId,
      createdAt: now,
    });

    return { success: true, idempotent: false, newBalance: newPurchased };
  },
});
