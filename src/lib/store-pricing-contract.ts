import { STORE_PRICING_SOURCE_HIERARCHY } from "@/lib/credit-pricing";

export type StorePublicTier = "free" | "pro" | "scale" | "enterprise";
export type StoreRuntimeTier = "free" | "pro" | "agency" | "enterprise";
export type StoreBillingCycle = "monthly" | "annual";
export type StoreTaxMode = "vat_included" | "vat_reverse_charge_review";

export interface StorePricingTierSnapshot {
  runtimeTier: StoreRuntimeTier;
  publicTier: StorePublicTier;
  displayTier: "Free" | "Pro" | "Scale" | "Enterprise";
  description: string;
  supportLevel: string;
  supportLabel: string;
  pricing: {
    currency: string;
    monthlyPriceInCents: number | null;
    annualPriceInCents: number | null;
    annualBillingMonths: number;
    vatDisplayMode: "vat_included";
    source: string;
    fallbackSource: string;
  };
  limits: {
    users: number;
    contacts: number;
    projects: number;
    monthlyCredits: number;
    monthlyEmails: number;
    subOrganizations: number;
    apiKeys: number;
    storageGb: number;
  };
  limitLabels: {
    users: string;
    contacts: string;
    projects: string;
    monthlyCredits: string;
    monthlyEmails: string;
    subOrganizations: string;
    apiKeys: string;
    storageGb: string;
  };
  source: string;
}

export interface StorePricingContractSnapshot {
  taxMode: "vat_included";
  activePublicTiers: StorePublicTier[];
  sourceHierarchy: Array<{
    order: number;
    key: string;
    source: string;
  }>;
  tiers: StorePricingTierSnapshot[];
  addOns: Array<{
    key: "scale_sub_org" | "credits_top_up";
    title: string;
    appliesToTier: "scale" | "all";
    monthlyPriceInCents: number | null;
    description: string;
    source: string;
  }>;
  billingSemantics: Array<{
    key: string;
    title: string;
    detail: string;
    source: string;
  }>;
  trialPolicy: {
    tier: "scale";
    runtimeTier: "agency";
    durationDays: number;
    summary: string;
    source: string;
  };
  faq: Array<{
    key: string;
    question: string;
    answer: string;
    source: string;
  }>;
}

export const DEFAULT_STORE_PRICING_CONTRACT: StorePricingContractSnapshot = {
  taxMode: "vat_included",
  activePublicTiers: ["free", "pro", "scale", "enterprise"],
  sourceHierarchy: STORE_PRICING_SOURCE_HIERARCHY.map((entry) => ({
    order: entry.order,
    key: entry.key,
    source: entry.source,
  })),
  tiers: [
    {
      runtimeTier: "free",
      publicTier: "free",
      displayTier: "Free",
      description: "EUR0 - Lead capture, template users",
      supportLevel: "docs",
      supportLabel: "Community docs",
      pricing: {
        currency: "EUR",
        monthlyPriceInCents: 0,
        annualPriceInCents: 0,
        annualBillingMonths: 10,
        vatDisplayMode: "vat_included",
        source: "convex/stripe/stripePrices.ts",
        fallbackSource: "convex/licensing/tierConfigs.ts",
      },
      limits: {
        users: 1,
        contacts: 100,
        projects: 3,
        monthlyCredits: 0,
        monthlyEmails: 0,
        subOrganizations: 0,
        apiKeys: 1,
        storageGb: 0.25,
      },
      limitLabels: {
        users: "1",
        contacts: "100",
        projects: "3",
        monthlyCredits: "0",
        monthlyEmails: "0",
        subOrganizations: "0",
        apiKeys: "1",
        storageGb: "0.25",
      },
      source: "convex/licensing/tierConfigs.ts",
    },
    {
      runtimeTier: "pro",
      publicTier: "pro",
      displayTier: "Pro",
      description: "EUR29/month - Freelancers and small businesses",
      supportLevel: "email_48h",
      supportLabel: "Email support (48h)",
      pricing: {
        currency: "EUR",
        monthlyPriceInCents: 2900,
        annualPriceInCents: 29000,
        annualBillingMonths: 10,
        vatDisplayMode: "vat_included",
        source: "convex/stripe/stripePrices.ts",
        fallbackSource: "convex/licensing/tierConfigs.ts",
      },
      limits: {
        users: 3,
        contacts: 2000,
        projects: 20,
        monthlyCredits: 200,
        monthlyEmails: 500,
        subOrganizations: 0,
        apiKeys: 1,
        storageGb: 5,
      },
      limitLabels: {
        users: "3",
        contacts: "2,000",
        projects: "20",
        monthlyCredits: "200",
        monthlyEmails: "500",
        subOrganizations: "0",
        apiKeys: "1",
        storageGb: "5",
      },
      source: "convex/licensing/tierConfigs.ts",
    },
    {
      runtimeTier: "agency",
      publicTier: "scale",
      displayTier: "Scale",
      description: "EUR299/month + EUR79/sub-org - Multi-client operators",
      supportLevel: "priority_12h",
      supportLabel: "Priority support (12h)",
      pricing: {
        currency: "EUR",
        monthlyPriceInCents: 29900,
        annualPriceInCents: 299000,
        annualBillingMonths: 10,
        vatDisplayMode: "vat_included",
        source: "convex/stripe/stripePrices.ts",
        fallbackSource: "convex/licensing/tierConfigs.ts",
      },
      limits: {
        users: 15,
        contacts: 10000,
        projects: -1,
        monthlyCredits: 2000,
        monthlyEmails: 10000,
        subOrganizations: 2,
        apiKeys: 5,
        storageGb: 50,
      },
      limitLabels: {
        users: "15",
        contacts: "10,000",
        projects: "Unlimited",
        monthlyCredits: "2,000",
        monthlyEmails: "10,000",
        subOrganizations: "2",
        apiKeys: "5",
        storageGb: "50",
      },
      source: "convex/licensing/tierConfigs.ts",
    },
    {
      runtimeTier: "enterprise",
      publicTier: "enterprise",
      displayTier: "Enterprise",
      description: "EUR1,500+/month - White-label resellers, compliance",
      supportLevel: "dedicated",
      supportLabel: "Dedicated support",
      pricing: {
        currency: "EUR",
        monthlyPriceInCents: null,
        annualPriceInCents: null,
        annualBillingMonths: 10,
        vatDisplayMode: "vat_included",
        source: "convex/stripe/stripePrices.ts",
        fallbackSource: "convex/licensing/tierConfigs.ts",
      },
      limits: {
        users: -1,
        contacts: -1,
        projects: -1,
        monthlyCredits: 5000,
        monthlyEmails: -1,
        subOrganizations: -1,
        apiKeys: -1,
        storageGb: -1,
      },
      limitLabels: {
        users: "Unlimited",
        contacts: "Unlimited",
        projects: "Unlimited",
        monthlyCredits: "5,000",
        monthlyEmails: "Unlimited",
        subOrganizations: "Unlimited",
        apiKeys: "Unlimited",
        storageGb: "Unlimited",
      },
      source: "convex/licensing/tierConfigs.ts",
    },
  ],
  addOns: [
    {
      key: "scale_sub_org",
      title: "Scale sub-organization",
      appliesToTier: "scale",
      monthlyPriceInCents: 7900,
      description: "2 included sub-orgs; add more as needed.",
      source: "convex/stripe/stripePrices.ts",
    },
    {
      key: "credits_top_up",
      title: "Credit top-ups",
      appliesToTier: "all",
      monthlyPriceInCents: null,
      description: "One-time credit packs use transparent volume tiers and bonuses.",
      source: "src/lib/credit-pricing.ts",
    },
  ],
  billingSemantics: [
    {
      key: "monthly_cycle",
      title: "Monthly billing",
      detail: "Monthly plan prices bill every month and are shown VAT-inclusive.",
      source: "convex/stripe/platformCheckout.ts",
    },
    {
      key: "annual_cycle",
      title: "Annual billing",
      detail: "Annual estimates model 10 billed months for 12 months of access.",
      source: "convex/stripe/stripePrices.ts",
    },
    {
      key: "proration",
      title: "Plan changes and proration",
      detail: "Upgrades and downgrades are managed through Stripe subscription workflows.",
      source: "convex/stripe/platformCheckout.ts",
    },
    {
      key: "vat_display",
      title: "VAT-inclusive display",
      detail: "Store plan and calculator totals are presented VAT-inclusive.",
      source: "docs/reference_docs/billing/tax-system.md",
    },
  ],
  trialPolicy: {
    tier: "scale",
    runtimeTier: "agency",
    durationDays: 14,
    summary: "Scale starts with a real 14-day trial enforced by the store checkout path.",
    source: "convex/stripe/trialCheckout.ts",
  },
  faq: [
    {
      key: "active_tiers_only",
      question: "Why are only Free, Pro, Scale, and Enterprise shown?",
      answer: "These are the active store tiers. Legacy tiers remain runtime-compatible but are hidden from pricing UX.",
      source: "convex/licensing/tierConfigs.ts",
    },
    {
      key: "scale_runtime_name",
      question: "Why does Scale map to agency in backend metadata?",
      answer: "Scale is customer-facing naming while runtime contracts keep agency for migration compatibility.",
      source: "convex/licensing/tierConfigs.ts",
    },
    {
      key: "vat_mode",
      question: "Do displayed prices include VAT?",
      answer: "Yes. Store-facing plans and calculator totals are VAT-inclusive.",
      source: "docs/reference_docs/billing/tax-system.md",
    },
    {
      key: "credits_source",
      question: "How are credits calculated?",
      answer: "Credits use deterministic volume tiers and shared frontend/backend credit math.",
      source: "src/lib/credit-pricing.ts",
    },
  ],
};

export function getStoreTierByPublicTier(
  contract: StorePricingContractSnapshot,
  publicTier: StorePublicTier
): StorePricingTierSnapshot | undefined {
  return contract.tiers.find((tier) => tier.publicTier === publicTier);
}

export function normalizeStorePricingContract(
  value: StorePricingContractSnapshot | undefined | null
): StorePricingContractSnapshot {
  if (!value) {
    return DEFAULT_STORE_PRICING_CONTRACT;
  }

  if (
    value.activePublicTiers.length !== 4 ||
    value.activePublicTiers.some((tier) => !["free", "pro", "scale", "enterprise"].includes(tier))
  ) {
    return DEFAULT_STORE_PRICING_CONTRACT;
  }

  return value;
}
