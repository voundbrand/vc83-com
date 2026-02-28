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
    offers: Array<{
      tier: "pro" | "scale";
      durationDays: number;
      summary: string;
    }>;
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
      detail:
        "Monthly plans are charged once per month. This option gives you flexibility if your usage changes throughout the year.",
      source: "convex/stripe/platformCheckout.ts",
    },
    {
      key: "annual_cycle",
      title: "Annual billing",
      detail:
        "Annual plans are charged once per year and include discounted pricing compared with paying month-to-month.",
      source: "convex/stripe/stripePrices.ts",
    },
    {
      key: "proration",
      title: "Plan changes and proration",
      detail:
        "When you change plans mid-cycle, your invoice is automatically adjusted. Unused time is credited and the new plan is prorated for the rest of the billing period.",
      source: "convex/stripe/platformCheckout.ts",
    },
    {
      key: "vat_display",
      title: "VAT-inclusive display",
      detail:
        "All prices on this page are shown VAT-inclusive. Final tax treatment can vary by billing country and valid business tax IDs.",
      source: "docs/reference_docs/billing/tax-system.md",
    },
  ],
  trialPolicy: {
    offers: [
      {
        tier: "pro",
        durationDays: 14,
        summary: "New customers on Free can try Pro for 14 days before billing starts.",
      },
      {
        tier: "scale",
        durationDays: 14,
        summary: "New customers on Free can try Scale for 14 days before billing starts.",
      },
    ],
    source: "convex/stripe/platformCheckout.ts",
  },
  faq: [
    {
      key: "plan_switching",
      question: "Can I change plans later?",
      answer:
        "Yes. You can upgrade or downgrade at any time. Billing is automatically prorated when a change happens in the middle of a cycle.",
      source: "convex/licensing/tierConfigs.ts",
    },
    {
      key: "annual_discount",
      question: "What is the difference between monthly and annual billing?",
      answer:
        "Monthly billing renews each month, while annual billing renews once per year with discounted pricing.",
      source: "convex/stripe/stripePrices.ts",
    },
    {
      key: "vat_mode",
      question: "Do listed prices include VAT?",
      answer:
        "Yes. Prices shown in the store are VAT-inclusive. Your final invoice reflects the tax rules for your billing country.",
      source: "docs/reference_docs/billing/tax-system.md",
    },
    {
      key: "credits_usage",
      question: "How do credit top-ups work?",
      answer:
        "Credit top-ups are one-time purchases that add usage credits to your workspace. You can buy them whenever you need extra capacity.",
      source: "src/lib/credit-pricing.ts",
    },
    {
      key: "byok_availability",
      question: "Which plans include Bring Your Own Key (BYOK)?",
      answer:
        "BYOK is available on Scale and Enterprise. It is not included on Free or Pro.",
      source: "convex/stripe/byokCommercialPolicy.ts",
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
  const hasValidTrialOffers =
    Array.isArray(value.trialPolicy?.offers) &&
    value.trialPolicy.offers.every(
      (offer) =>
        (offer.tier === "pro" || offer.tier === "scale") &&
        Number.isFinite(offer.durationDays) &&
        typeof offer.summary === "string"
    );

  if (
    !hasValidTrialOffers ||
    value.activePublicTiers.length !== 4 ||
    value.activePublicTiers.some((tier) => !["free", "pro", "scale", "enterprise"].includes(tier))
  ) {
    return DEFAULT_STORE_PRICING_CONTRACT;
  }

  return value;
}
