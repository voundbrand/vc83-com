export type ByokCommercialTier =
  | "free"
  | "pro"
  | "starter"
  | "professional"
  | "community"
  | "agency"
  | "enterprise";

export type ByokCommercialNormalizedTier =
  | "free"
  | "pro"
  | "agency"
  | "enterprise";

export type ByokCommercialMode =
  | "flat_platform_fee"
  | "optional_surcharge"
  | "tier_bundled";

export interface ByokCommercialPolicy {
  tier: ByokCommercialTier;
  normalizedTier: ByokCommercialNormalizedTier;
  mode: ByokCommercialMode;
  byokEligible: boolean;
  flatPlatformFeeCents: number;
  optionalSurchargeBps: number;
  bundledInTier: boolean;
  migrationDefault: boolean;
  summary: string;
}

export interface ByokCommercialPolicyTableRow {
  tier: ByokCommercialNormalizedTier;
  displayTier: string;
  mode: ByokCommercialMode;
  byokEligible: boolean;
  flatPlatformFeeCents: number;
  optionalSurchargeBps: number;
  bundledInTier: boolean;
  migrationDefault: boolean;
  summary: string;
}

const MODE_VALUES = new Set<ByokCommercialMode>([
  "flat_platform_fee",
  "optional_surcharge",
  "tier_bundled",
]);

const TIER_VALUES = new Set<ByokCommercialTier>([
  "free",
  "pro",
  "starter",
  "professional",
  "community",
  "agency",
  "enterprise",
]);

const TIER_ALIAS: Record<string, ByokCommercialNormalizedTier> = {
  free: "free",
  pro: "pro",
  starter: "pro",
  professional: "pro",
  community: "pro",
  agency: "agency",
  enterprise: "enterprise",
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function parseNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

function normalizeByokCommercialTier(value: unknown): ByokCommercialTier | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  return TIER_VALUES.has(normalized as ByokCommercialTier)
    ? (normalized as ByokCommercialTier)
    : null;
}

function normalizeByokCommercialMode(value: unknown): ByokCommercialMode | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  return MODE_VALUES.has(normalized as ByokCommercialMode)
    ? (normalized as ByokCommercialMode)
    : null;
}

function normalizeTierForPolicy(
  tier?: string | null
): {
  resolvedTier: ByokCommercialTier;
  normalizedTier: ByokCommercialNormalizedTier;
} {
  const resolvedTier = normalizeByokCommercialTier(tier) ?? "free";
  const normalizedTier = TIER_ALIAS[resolvedTier] ?? "free";
  return { resolvedTier, normalizedTier };
}

const configuredFlatPlatformFeeCents = parseNonNegativeInt(
  process.env.STRIPE_BYOK_FLAT_PLATFORM_FEE_CENTS,
  0
);
const configuredEnterpriseSurchargeBps = parseNonNegativeInt(
  process.env.STRIPE_BYOK_ENTERPRISE_SURCHARGE_BPS,
  0
);

const BASE_POLICY_BY_TIER: Record<
  ByokCommercialNormalizedTier,
  Omit<ByokCommercialPolicy, "tier" | "normalizedTier">
> = {
  free: {
    mode: "flat_platform_fee",
    byokEligible: false,
    flatPlatformFeeCents: 0,
    optionalSurchargeBps: 0,
    bundledInTier: false,
    migrationDefault: true,
    summary: "Not BYOK-eligible by default.",
  },
  pro: {
    mode: "flat_platform_fee",
    byokEligible: true,
    flatPlatformFeeCents: configuredFlatPlatformFeeCents,
    optionalSurchargeBps: 0,
    bundledInTier: false,
    migrationDefault: true,
    summary: "BYOK enabled with flat platform orchestration fee.",
  },
  agency: {
    mode: "tier_bundled",
    byokEligible: true,
    flatPlatformFeeCents: 0,
    optionalSurchargeBps: 0,
    bundledInTier: true,
    migrationDefault: true,
    summary: "BYOK included in tier.",
  },
  enterprise: {
    mode: "optional_surcharge",
    byokEligible: true,
    flatPlatformFeeCents: 0,
    optionalSurchargeBps: configuredEnterpriseSurchargeBps,
    bundledInTier: false,
    migrationDefault: true,
    summary: "BYOK enabled; optional enterprise surcharge policy.",
  },
};

export function resolveByokCommercialPolicyForTier(
  tier?: string | null
): ByokCommercialPolicy {
  const { resolvedTier, normalizedTier } = normalizeTierForPolicy(tier);
  const base = BASE_POLICY_BY_TIER[normalizedTier];

  return {
    tier: resolvedTier,
    normalizedTier,
    ...base,
  };
}

export function buildByokCommercialPolicyMetadata(
  policy: ByokCommercialPolicy
): Record<string, string> {
  return {
    byokPolicyTier: policy.tier,
    byokPolicyNormalizedTier: policy.normalizedTier,
    byokCommercialModel: policy.mode,
    byokEligible: policy.byokEligible ? "true" : "false",
    byokFlatPlatformFeeCents: String(policy.flatPlatformFeeCents),
    byokOptionalSurchargeBps: String(policy.optionalSurchargeBps),
    byokBundledInTier: policy.bundledInTier ? "true" : "false",
    byokMigrationDefault: policy.migrationDefault ? "true" : "false",
  };
}

export function resolveByokCommercialPolicyFromMetadata(args: {
  metadata?: Record<string, string | undefined> | null;
  fallbackTier?: string | null;
}): ByokCommercialPolicy {
  const fallbackPolicy = resolveByokCommercialPolicyForTier(args.fallbackTier);
  const metadata = args.metadata;

  if (!metadata) {
    return fallbackPolicy;
  }

  const metadataTier = normalizeByokCommercialTier(metadata.byokPolicyTier);
  const tierSeed = metadataTier ?? fallbackPolicy.tier;
  const seededPolicy = resolveByokCommercialPolicyForTier(tierSeed);

  const explicitMode = normalizeByokCommercialMode(metadata.byokCommercialModel);
  const explicitByokEligible = parseBoolean(metadata.byokEligible);
  const explicitBundled = parseBoolean(metadata.byokBundledInTier);
  const explicitMigrationDefault = parseBoolean(metadata.byokMigrationDefault);

  return {
    ...seededPolicy,
    mode: explicitMode ?? seededPolicy.mode,
    byokEligible: explicitByokEligible ?? seededPolicy.byokEligible,
    flatPlatformFeeCents: parseNonNegativeInt(
      metadata.byokFlatPlatformFeeCents,
      seededPolicy.flatPlatformFeeCents
    ),
    optionalSurchargeBps: parseNonNegativeInt(
      metadata.byokOptionalSurchargeBps,
      seededPolicy.optionalSurchargeBps
    ),
    bundledInTier: explicitBundled ?? seededPolicy.bundledInTier,
    migrationDefault:
      explicitMigrationDefault ?? seededPolicy.migrationDefault,
  };
}

export function getByokCommercialPolicyRuleTable(): ByokCommercialPolicyTableRow[] {
  const tierRows: Array<{
    tier: ByokCommercialNormalizedTier;
    displayTier: string;
  }> = [
    { tier: "free", displayTier: "Free" },
    { tier: "pro", displayTier: "Pro" },
    { tier: "agency", displayTier: "Scale" },
    { tier: "enterprise", displayTier: "Enterprise" },
  ];

  return tierRows.map((tierRow) => {
    const policy = resolveByokCommercialPolicyForTier(tierRow.tier);
    return {
      tier: tierRow.tier,
      displayTier: tierRow.displayTier,
      mode: policy.mode,
      byokEligible: policy.byokEligible,
      flatPlatformFeeCents: policy.flatPlatformFeeCents,
      optionalSurchargeBps: policy.optionalSurchargeBps,
      bundledInTier: policy.bundledInTier,
      migrationDefault: policy.migrationDefault,
      summary: policy.summary,
    };
  });
}
