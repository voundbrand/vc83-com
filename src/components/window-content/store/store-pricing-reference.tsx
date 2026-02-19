"use client";

import type { StorePricingContractSnapshot, StorePublicTier } from "@/lib/store-pricing-contract";

const TIER_ORDER: StorePublicTier[] = ["free", "pro", "scale", "enterprise"];

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

function formatEuroFromCents(value: number | null): string {
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

export function StoreLimitsMatrix({ contract }: { contract: StorePricingContractSnapshot }) {
  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--window-document-border)" }}>
      <table className="w-full min-w-[720px] text-left text-[11px]">
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

export function StoreAddOnsList({ contract }: { contract: StorePricingContractSnapshot }) {
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
          <p className="mt-1 text-[11px]" style={{ color: "var(--window-document-text-muted)" }}>
            {addOn.description}
          </p>
          <p className="mt-1 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Source: <code>{addOn.source}</code>
          </p>
        </div>
      ))}
    </div>
  );
}

export function StoreBillingSemanticsList({ contract }: { contract: StorePricingContractSnapshot }) {
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
          <p className="mt-1 text-[11px]" style={{ color: "var(--window-document-text-muted)" }}>
            {item.detail}
          </p>
          <p className="mt-1 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Source: <code>{item.source}</code>
          </p>
        </li>
      ))}
    </ul>
  );
}

export function StoreTrialPolicyCard({ contract }: { contract: StorePricingContractSnapshot }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}>
      <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
        {contract.trialPolicy.tier.toUpperCase()} trial policy
      </p>
      <p className="mt-1 text-[11px]" style={{ color: "var(--window-document-text-muted)" }}>
        {contract.trialPolicy.summary}
      </p>
      <p className="mt-1 text-[11px]" style={{ color: "var(--window-document-text-muted)" }}>
        Duration: {contract.trialPolicy.durationDays} days. Runtime tier key: <code>{contract.trialPolicy.runtimeTier}</code>.
      </p>
      <p className="mt-1 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
        Source: <code>{contract.trialPolicy.source}</code>
      </p>
    </div>
  );
}

export function StoreFaqList({ contract }: { contract: StorePricingContractSnapshot }) {
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
          <p className="mt-1 text-[11px]" style={{ color: "var(--window-document-text-muted)" }}>
            {item.answer}
          </p>
          <p className="mt-1 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Source: <code>{item.source}</code>
          </p>
        </li>
      ))}
    </ul>
  );
}

export function StoreSourceAttribution({ contract }: { contract: StorePricingContractSnapshot }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
    >
      <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
        Source hierarchy
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
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
