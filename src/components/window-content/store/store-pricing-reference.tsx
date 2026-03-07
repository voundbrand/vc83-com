"use client";

import type { StorePricingContractSnapshot, StorePublicTier } from "@/lib/store-pricing-contract";

const TIER_ORDER: StorePublicTier[] = ["free", "pro", "scale", "enterprise"];
type StoreTierSnapshot = StorePricingContractSnapshot["tiers"][number];
type ByokCommercialPolicyTableRow = {
  tier: "free" | "pro" | "agency" | "enterprise";
  displayTier: string;
  mode: "flat_platform_fee" | "optional_surcharge" | "tier_bundled";
  byokEligible: boolean;
  flatPlatformFeeCents: number;
  optionalSurchargeBps: number;
  bundledInTier: boolean;
  migrationDefault: boolean;
  summary: string;
};

export type StoreCommercialOfferSnapshot = {
  offerCode: string;
  label: string;
  motion: "checkout_now" | "inquiry_first" | "invoice_only";
  setupFeeCents: number | null;
  monthlyPlatformFeeCents: number | null;
  stripePriceId: string | null;
  checkoutConfigured?: boolean;
};

export type StoreCommercialOfferSelection = {
  offerCode: string;
  intentCode: string;
  routingHint: "samantha_lead_capture" | "founder_bridge" | "enterprise_sales";
  action: "checkout" | "chat_handoff";
};

const LIMIT_ROWS: Array<{
  key: keyof StorePricingContractSnapshot["tiers"][number]["limitLabels"];
  label: string;
}> = [
  { key: "users", label: "Users" },
  { key: "contacts", label: "Contacts" },
  { key: "projects", label: "Projects" },
  { key: "monthlyCredits", label: "Monthly credits" },
  { key: "monthlyEmails", label: "Monthly emails" },
  { key: "subOrganizations", label: "Sub-organizations" },
  { key: "apiKeys", label: "API keys" },
  { key: "storageGb", label: "Storage (GB)" },
];

export function formatEuroFromCents(value: number | null): string {
  if (value === null) {
    return "Custom";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function findTier(contract: StorePricingContractSnapshot, publicTier: StorePublicTier) {
  return contract.tiers.find((tier) => tier.publicTier === publicTier);
}

function SuperAdminOnlyBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{
        color: "var(--badge-super-admin-text)",
        background: "var(--badge-super-admin-bg)",
        borderColor: "var(--badge-super-admin-bg)",
      }}
    >
      Super admin only
    </span>
  );
}

function SourceLine({ source }: { source: string }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
      <SuperAdminOnlyBadge />
      <span>
        Source: <code>{source}</code>
      </span>
    </p>
  );
}

export function formatFee(value: number | null, suffix: "one_time" | "monthly"): string {
  if (value === null) {
    return suffix === "monthly" ? "Custom quote" : "Quote-based";
  }
  const formatted = formatEuroFromCents(value);
  return suffix === "monthly" ? `${formatted}/month` : `${formatted} one-time`;
}

export function resolveOfferVisual(offerCode: string): { glyph: string; hardware: string } {
  if (offerCode === "layer1_foundation") return { glyph: "CLOUD", hardware: "Shared cloud — great for getting started" };
  if (offerCode === "layer2_dream_team") return { glyph: "TEAM", hardware: "Dedicated cloud — reliable for growing teams" };
  if (offerCode === "layer3_sovereign") return { glyph: "APPLE", hardware: "On-premise Apple hardware (Mac Studio class)" };
  if (offerCode === "layer3_sovereign_pro") return { glyph: "HYBRID", hardware: "Hybrid setup: Apple + NVIDIA DGX Spark" };
  if (offerCode === "layer3_sovereign_max") return { glyph: "MAX", hardware: "High-performance local hardware (512 GB class)" };
  if (offerCode === "layer4_nvidia_private") return { glyph: "NVIDIA", hardware: "Private NVIDIA GPU stack (A100 / H100 / RTX)" };
  if (offerCode === "consult_done_with_you") return { glyph: "GUIDE", hardware: "Guided strategy — we advise, you execute" };
  if (offerCode === "consult_full_build_scoping") return { glyph: "SCOPE", hardware: "Full project scoping before any build work" };
  return { glyph: "OFFER", hardware: "Custom option" };
}

export function resolveMotionLabel(motion: StoreCommercialOfferSnapshot["motion"]): string {
  if (motion === "checkout_now") return "Buy online";
  if (motion === "invoice_only") return "Custom quote";
  return "Talk to us first";
}

export const COMMERCIAL_OFFER_ORDER = [
  "consult_done_with_you",
  "layer1_foundation",
  "layer2_dream_team",
  "layer3_sovereign",
  "layer3_sovereign_pro",
  "layer3_sovereign_max",
  "layer4_nvidia_private",
  "consult_full_build_scoping",
] as const;

export function buildCommercialOfferSelection(offer: StoreCommercialOfferSnapshot): StoreCommercialOfferSelection {
  const isCheckoutReady = offer.motion === "checkout_now" && Boolean(offer.checkoutConfigured);

  if (offer.offerCode.startsWith("consult")) {
    return {
      offerCode: offer.offerCode,
      intentCode: offer.offerCode === "consult_done_with_you"
        ? "consulting_sprint_scope_only"
        : "diagnostic_scope_intake",
      routingHint: "samantha_lead_capture",
      action: isCheckoutReady ? "checkout" : "chat_handoff",
    };
  }

  return {
    offerCode: offer.offerCode,
    intentCode: offer.offerCode === "layer1_foundation"
      ? "implementation_start_layer1"
      : "implementation_layer_upgrade",
    routingHint: offer.offerCode === "layer1_foundation"
      ? "founder_bridge"
      : "enterprise_sales",
    action: isCheckoutReady ? "checkout" : "chat_handoff",
  };
}

export function sortCommercialOffers(offers: StoreCommercialOfferSnapshot[]): StoreCommercialOfferSnapshot[] {
  return [...offers].sort((left, right) => {
    const leftIndex = COMMERCIAL_OFFER_ORDER.indexOf(left.offerCode as (typeof COMMERCIAL_OFFER_ORDER)[number]);
    const rightIndex = COMMERCIAL_OFFER_ORDER.indexOf(right.offerCode as (typeof COMMERCIAL_OFFER_ORDER)[number]);
    return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
  });
}

export function resolvePaymentTerms(offerCode: string): string {
  switch (offerCode) {
    case "consult_done_with_you":
    case "consult_full_build_scoping":
    case "layer1_foundation":
      return "100% upfront";
    case "layer2_dream_team":
    case "layer3_sovereign":
    case "layer3_sovereign_pro":
    case "layer3_sovereign_max":
      return "50% upfront, 50% on delivery";
    case "layer4_nvidia_private":
      return "Custom terms";
    default:
      return "Contact us";
  }
}

export function resolveDeliveryTimeline(offerCode: string): string {
  switch (offerCode) {
    case "consult_done_with_you":
    case "consult_full_build_scoping":
    case "layer1_foundation":
      return "1\u20132 weeks";
    case "layer2_dream_team":
      return "3\u20134 weeks";
    case "layer3_sovereign":
    case "layer3_sovereign_pro":
    case "layer3_sovereign_max":
      return "4\u20136 weeks";
    case "layer4_nvidia_private":
      return "6\u20138 weeks";
    default:
      return "Custom timeline";
  }
}

export function isGuaranteeEligible(offerCode: string): boolean {
  return (
    offerCode === "layer1_foundation" ||
    offerCode === "layer2_dream_team" ||
    offerCode.startsWith("layer3_sovereign")
  );
}

export function StoreCreditsApplicabilityCard() {
  return (
    <div
      className="mt-4 rounded-lg border p-3"
      style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
    >
      <h3 className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
        What credits cover
      </h3>
      <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
        <li>Credits pay for AI interactions, automations, and platform usage.</li>
        <li>Credits cannot be applied to setup fees, consulting, or hardware.</li>
        <li>Monthly credits included in your plan renew each billing cycle.</li>
        <li>Purchased credits are added on top and never expire.</li>
      </ul>
    </div>
  );
}

export function StoreLimitsMatrix({ contract }: { contract: StorePricingContractSnapshot }) {
  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--window-document-border)" }}>
      <table className="w-full min-w-[45rem] text-left text-xs">
        <thead style={{ background: "var(--desktop-shell-accent)" }}>
          <tr>
            <th className="px-3 py-2 font-semibold">Capability</th>
            {TIER_ORDER.map((tierName) => (
              <th key={tierName} className="px-3 py-2 font-semibold" style={{ color: "var(--window-document-text)" }}>
                {findTier(contract, tierName)?.displayTier ?? tierName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LIMIT_ROWS.map((row) => (
            <tr key={row.key} className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
              <td className="px-3 py-2 font-medium" style={{ color: "var(--window-document-text)" }}>
                {row.label}
              </td>
              {TIER_ORDER.map((tierName) => (
                <td key={`${row.key}-${tierName}`} className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                  {findTier(contract, tierName)?.limitLabels[row.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StoreAddOnsList({
  contract,
  showInternalDetails = false,
}: {
  contract: StorePricingContractSnapshot;
  showInternalDetails?: boolean;
}) {
  return (
    <div className="space-y-2">
      {contract.addOns.map((addOn) => (
        <div
          key={addOn.key}
          className="rounded-lg border p-3"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              {addOn.title}
            </p>
            <p className="text-xs" style={{ color: "var(--window-document-text)" }}>
              {addOn.monthlyPriceInCents === null
                ? "Variable"
                : `${formatEuroFromCents(addOn.monthlyPriceInCents)}/month`}
            </p>
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
            {addOn.description}
          </p>
          {showInternalDetails && <SourceLine source={addOn.source} />}
        </div>
      ))}
    </div>
  );
}

export function StoreBillingSemanticsList({
  contract,
  showInternalDetails = false,
}: {
  contract: StorePricingContractSnapshot;
  showInternalDetails?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {contract.billingSemantics.map((item) => (
        <li
          key={item.key}
          className="rounded-lg border p-3"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
            {item.title}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
            {item.detail}
          </p>
          {showInternalDetails && <SourceLine source={item.source} />}
        </li>
      ))}
    </ul>
  );
}

export function StoreTrialPolicyCard({
  contract,
  showInternalDetails = false,
}: {
  contract: StorePricingContractSnapshot;
  showInternalDetails?: boolean;
}) {
  const trialOffers = Array.isArray(contract.trialPolicy.offers) ? contract.trialPolicy.offers : [];

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}>
      <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
        Free trial availability
      </p>
      <ul className="mt-2 space-y-2">
        {trialOffers.map((offer) => (
          <li key={offer.tier} className="rounded border px-3 py-2" style={{ borderColor: "var(--window-document-border)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              {offer.tier === "pro" ? "Pro (legacy)" : "Scale (legacy)"}: {offer.durationDays}-day trial
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
              {offer.summary}
            </p>
          </li>
        ))}
      </ul>
      {showInternalDetails && <SourceLine source={contract.trialPolicy.source} />}
    </div>
  );
}

export function StoreFaqList({
  contract,
  showInternalDetails = false,
}: {
  contract: StorePricingContractSnapshot;
  showInternalDetails?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {contract.faq.map((item) => (
        <li
          key={item.key}
          className="rounded-lg border p-3"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
            {item.question}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
            {item.answer}
          </p>
          {showInternalDetails && <SourceLine source={item.source} />}
        </li>
      ))}
    </ul>
  );
}

export function StorePricingTransparencyTable({
  contract,
  byokCommercialPolicyTable,
}: {
  contract: StorePricingContractSnapshot;
  byokCommercialPolicyTable?: ByokCommercialPolicyTableRow[];
}) {
  const tierSnapshots = TIER_ORDER.map((tierName) => findTier(contract, tierName)).filter(
    (tier): tier is StoreTierSnapshot => Boolean(tier)
  );
  const trialOffers = Array.isArray(contract.trialPolicy.offers) ? contract.trialPolicy.offers : [];
  const byokEligibilityByTier = new Map<StorePublicTier, boolean>();
  byokCommercialPolicyTable?.forEach((row) => {
    const publicTier: StorePublicTier = row.tier === "agency" ? "scale" : row.tier;
    byokEligibilityByTier.set(publicTier, row.byokEligible);
  });
  const trialByTier = new Map(trialOffers.map((offer) => [offer.tier, offer]));
  const scaleSubOrgAddOn = contract.addOns.find((addOn) => addOn.key === "scale_sub_org");

  const formatMonthlyPrice = (tier: StoreTierSnapshot) => {
    if (tier.pricing.monthlyPriceInCents === null) {
      return "Custom";
    }
    return `${formatEuroFromCents(tier.pricing.monthlyPriceInCents)}/month`;
  };

  const formatAnnualPrice = (tier: StoreTierSnapshot) => {
    if (tier.pricing.annualPriceInCents === null) {
      return "Custom";
    }
    return `${formatEuroFromCents(tier.pricing.annualPriceInCents)}/year`;
  };

  const formatAnnualMonthlyEquivalent = (tier: StoreTierSnapshot) => {
    if (tier.pricing.annualPriceInCents === null) {
      return "Custom";
    }
    return `${formatEuroFromCents(Math.round(tier.pricing.annualPriceInCents / 12))}/month`;
  };

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--window-document-border)" }}>
      <table className="w-full min-w-[52.5rem] text-left text-xs">
        <thead style={{ background: "var(--desktop-shell-accent)" }}>
          <tr>
            <th className="px-3 py-2 font-semibold">Plan details</th>
            {tierSnapshots.map((tier) => (
              <th key={tier.publicTier} className="px-3 py-2 font-semibold" style={{ color: "var(--window-document-text)" }}>
                {tier.displayTier}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
            <td className="px-3 py-2 font-medium" style={{ color: "var(--window-document-text)" }}>
              Monthly subscription
            </td>
            {tierSnapshots.map((tier) => (
              <td key={`monthly-${tier.publicTier}`} className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                {formatMonthlyPrice(tier)}
              </td>
            ))}
          </tr>
          <tr className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
            <td className="px-3 py-2 font-medium" style={{ color: "var(--window-document-text)" }}>
              Annual billing
            </td>
            {tierSnapshots.map((tier) => (
              <td key={`annual-${tier.publicTier}`} className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                {formatAnnualPrice(tier)}
              </td>
            ))}
          </tr>
          <tr className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
            <td className="px-3 py-2 font-medium" style={{ color: "var(--window-document-text)" }}>
              Annual effective monthly
            </td>
            {tierSnapshots.map((tier) => (
              <td key={`annual-monthly-${tier.publicTier}`} className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                {formatAnnualMonthlyEquivalent(tier)}
              </td>
            ))}
          </tr>
          <tr className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
            <td className="px-3 py-2 font-medium" style={{ color: "var(--window-document-text)" }}>
              Free trial
            </td>
            {tierSnapshots.map((tier) => {
              const trial =
                tier.publicTier === "pro" || tier.publicTier === "scale"
                  ? trialByTier.get(tier.publicTier)
                  : undefined;
              const trialLabel = trial
                ? `${trial.durationDays}-day trial`
                : tier.publicTier === "enterprise"
                  ? "Custom onboarding"
                  : "No trial";
              return (
                <td key={`trial-${tier.publicTier}`} className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                  {trialLabel}
                </td>
              );
            })}
          </tr>
          <tr className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
            <td className="px-3 py-2 font-medium" style={{ color: "var(--window-document-text)" }}>
              Bring your own API key
            </td>
            {tierSnapshots.map((tier) => {
              const explicitEligibility = byokEligibilityByTier.get(tier.publicTier);
              const eligible = explicitEligibility ?? tier.publicTier !== "free";
              const label = eligible
                ? "Available"
                : tier.publicTier === "free"
                  ? "Not included (legacy Free)"
                  : "Not included";
              return (
                <td key={`byok-${tier.publicTier}`} className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                  {label}
                </td>
              );
            })}
          </tr>
          <tr className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
            <td className="px-3 py-2 font-medium" style={{ color: "var(--window-document-text)" }}>
              Support
            </td>
            {tierSnapshots.map((tier) => (
              <td key={`support-${tier.publicTier}`} className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                {tier.supportLabel}
              </td>
            ))}
          </tr>
          {LIMIT_ROWS.map((row) => (
            <tr key={row.key} className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
              <td className="px-3 py-2 font-medium" style={{ color: "var(--window-document-text)" }}>
                {row.label}
              </td>
              {tierSnapshots.map((tier) => (
                <td key={`${row.key}-${tier.publicTier}`} className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                  {tier.limitLabels[row.key]}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
            <td className="px-3 py-2 font-medium" style={{ color: "var(--window-document-text)" }}>
              Sub-organization add-on
            </td>
            {tierSnapshots.map((tier) => (
              <td key={`addon-scale-sub-org-${tier.publicTier}`} className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                {tier.publicTier === "scale"
                  ? scaleSubOrgAddOn?.monthlyPriceInCents === null
                    ? "Variable"
                    : `${formatEuroFromCents(scaleSubOrgAddOn?.monthlyPriceInCents ?? 0)}/month each`
                  : tier.publicTier === "enterprise"
                    ? "Custom"
                    : "Not available"}
              </td>
            ))}
          </tr>
          <tr className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
            <td className="px-3 py-2 font-medium" style={{ color: "var(--window-document-text)" }}>
              Credit top-ups
            </td>
            {tierSnapshots.map((tier) => (
              <td key={`addon-credits-${tier.publicTier}`} className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                {tier.publicTier === "enterprise" ? "Available by quote" : "Available"}
              </td>
            ))}
          </tr>
          <tr className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
            <td className="px-3 py-2 font-medium" style={{ color: "var(--window-document-text)" }}>
              VAT display
            </td>
            {tierSnapshots.map((tier) => (
              <td key={`vat-${tier.publicTier}`} className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                VAT included
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function StoreSourceAttribution({
  contract,
  showInternalDetails = false,
}: {
  contract: StorePricingContractSnapshot;
  showInternalDetails?: boolean;
}) {
  if (!showInternalDetails) {
    return null;
  }

  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
    >
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
          Internal source hierarchy
        </p>
        <SuperAdminOnlyBadge />
      </div>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
        {contract.sourceHierarchy.map((entry) => (
          <li key={entry.key}>
            <span className="font-medium" style={{ color: "var(--window-document-text)" }}>
              {entry.key}
            </span>{" "}
            <code>{entry.source}</code>
          </li>
        ))}
      </ol>
    </div>
  );
}
