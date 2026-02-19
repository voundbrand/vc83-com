"use client";

import { Calculator, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateStorePricingEstimate } from "@/lib/store-pricing-calculator";
import type {
  StoreBillingCycle,
  StorePricingContractSnapshot,
  StorePublicTier,
  StoreTaxMode,
} from "@/lib/store-pricing-contract";

const PLAN_OPTIONS: Array<{ value: StorePublicTier; label: string }> = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "scale", label: "Scale" },
  { value: "enterprise", label: "Enterprise" },
];

const BILLING_OPTIONS: Array<{ value: StoreBillingCycle; label: string }> = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

const TAX_MODE_OPTIONS: Array<{ value: StoreTaxMode; label: string; description: string }> = [
  {
    value: "vat_included",
    label: "VAT included",
    description: "Store totals include VAT in displayed amounts.",
  },
  {
    value: "vat_reverse_charge_review",
    label: "VAT included (reverse-charge review)",
    description: "Still displays VAT-inclusive estimate; invoice review may adjust tax treatment.",
  },
];

function formatEuroFromCents(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function StorePricingCalculator({ contract }: { contract: StorePricingContractSnapshot }) {
  const [plan, setPlan] = useState<StorePublicTier>("pro");
  const [billingCycle, setBillingCycle] = useState<StoreBillingCycle>("annual");
  const [creditsPurchaseEur, setCreditsPurchaseEur] = useState(100);
  const [scaleSubOrgCount, setScaleSubOrgCount] = useState(0);
  const [seatUserCount, setSeatUserCount] = useState(3);
  const [taxMode, setTaxMode] = useState<StoreTaxMode>("vat_included");

  const estimate = useMemo(
    () =>
      calculateStorePricingEstimate(
        {
          plan,
          billingCycle,
          creditsPurchaseEur,
          scaleSubOrgCount,
          seatUserCount,
          taxMode,
        },
        contract
      ),
    [plan, billingCycle, creditsPurchaseEur, scaleSubOrgCount, seatUserCount, taxMode, contract]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div
          className="rounded p-1.5"
          style={{ background: "var(--desktop-shell-accent)", color: "var(--tone-accent-strong)" }}
        >
          <Calculator className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-pixel text-xs" style={{ color: "var(--window-document-text)" }}>
            Pricing calculator v1
          </h3>
          <p className="text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            VAT-inclusive estimates with source-attributed line items.
          </p>
        </div>
      </div>

      <div
        className="rounded-lg border p-4"
        style={{ background: "var(--window-document-bg)", borderColor: "var(--window-document-border)" }}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
            <span className="font-medium">Plan</span>
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value as StorePublicTier)}
              className="w-full rounded border px-2 py-1.5 text-xs"
              style={{ background: "var(--desktop-shell-accent)", borderColor: "var(--window-document-border)" }}
            >
              {PLAN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
            <span className="font-medium">Billing cycle</span>
            <select
              value={billingCycle}
              onChange={(event) => setBillingCycle(event.target.value as StoreBillingCycle)}
              className="w-full rounded border px-2 py-1.5 text-xs"
              style={{ background: "var(--desktop-shell-accent)", borderColor: "var(--window-document-border)" }}
            >
              {BILLING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
            <span className="font-medium">Credits (EUR)</span>
            <input
              type="number"
              min={0}
              max={10000}
              step={1}
              value={creditsPurchaseEur}
              onChange={(event) => setCreditsPurchaseEur(Number(event.target.value || 0))}
              className="w-full rounded border px-2 py-1.5 text-xs"
              style={{ background: "var(--desktop-shell-accent)", borderColor: "var(--window-document-border)" }}
            />
          </label>

          <label className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
            <span className="font-medium">Scale sub-org count</span>
            <input
              type="number"
              min={0}
              max={200}
              step={1}
              value={scaleSubOrgCount}
              onChange={(event) => setScaleSubOrgCount(Number(event.target.value || 0))}
              className="w-full rounded border px-2 py-1.5 text-xs"
              style={{ background: "var(--desktop-shell-accent)", borderColor: "var(--window-document-border)" }}
            />
          </label>

          <label className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
            <span className="font-medium">Seat/user count</span>
            <input
              type="number"
              min={1}
              max={5000}
              step={1}
              value={seatUserCount}
              onChange={(event) => setSeatUserCount(Number(event.target.value || 1))}
              className="w-full rounded border px-2 py-1.5 text-xs"
              style={{ background: "var(--desktop-shell-accent)", borderColor: "var(--window-document-border)" }}
            />
          </label>

          <label className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
            <span className="font-medium">Tax mode</span>
            <select
              value={taxMode}
              onChange={(event) => setTaxMode(event.target.value as StoreTaxMode)}
              className="w-full rounded border px-2 py-1.5 text-xs"
              style={{ background: "var(--desktop-shell-accent)", borderColor: "var(--window-document-border)" }}
            >
              {TAX_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              {TAX_MODE_OPTIONS.find((option) => option.value === taxMode)?.description}
            </p>
          </label>
        </div>

        <div className="mt-4 rounded border" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-2 border-b px-3 py-2 text-[10px] font-semibold" style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)", color: "var(--window-document-text)" }}>
            <span>Line item</span>
            <span className="text-right">Monthly equivalent</span>
            <span className="text-right">Annual + one-time</span>
          </div>

          {estimate.lineItems.map((lineItem) => (
            <div
              key={lineItem.key}
              className="grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-2 border-b px-3 py-2 text-[11px]"
              style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
            >
              <div>
                <p className="font-medium">{lineItem.label}</p>
                {lineItem.note && (
                  <p className="mt-0.5 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {lineItem.note}
                  </p>
                )}
                <p className="mt-0.5 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  Source: <code>{lineItem.source}</code>
                </p>
              </div>
              <p className="text-right">{formatEuroFromCents(lineItem.monthlyInCents)}</p>
              <p className="text-right">{formatEuroFromCents(lineItem.annualInCents + lineItem.oneTimeInCents)}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded border p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}>
            <p className="text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Recurring monthly estimate
            </p>
            <p className="font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
              {formatEuroFromCents(estimate.recurringMonthlyTotalInCents)}
            </p>
          </div>
          <div className="rounded border p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}>
            <p className="text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Annual recurring total
            </p>
            <p className="font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
              {formatEuroFromCents(estimate.recurringAnnualTotalInCents)}
            </p>
          </div>
          <div className="rounded border p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}>
            <p className="text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Annual total incl. credits
            </p>
            <p className="font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
              {formatEuroFromCents(estimate.annualGrandTotalInCents)}
            </p>
          </div>
          <div className="rounded border p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}>
            <p className="text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Included VAT estimate
            </p>
            <p className="font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
              {formatEuroFromCents(estimate.vatEstimatedComponentInCents)}
            </p>
            <p className="mt-1 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              VAT-inclusive display mode.
            </p>
          </div>
        </div>

        <div
          className="mt-4 rounded border p-3 text-[10px]"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
        >
          <p className="font-medium" style={{ color: "var(--window-document-text)" }}>
            Credit output: {estimate.credits.credits.toLocaleString("en-US")} credits total ({estimate.credits.bonus.toLocaleString("en-US")} bonus)
          </p>
          <p className="mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Sources: {estimate.sourceAttributions.map((source) => <code key={source} className="mr-2">{source}</code>)}
          </p>
          {(estimate.fallbackSignals.planPricingFallbackUsed || estimate.fallbackSignals.scaleAddOnFallbackUsed) && (
            <p className="mt-2 inline-flex items-center gap-1" style={{ color: "var(--warning, #d97706)" }}>
              <Info className="h-3 w-3" />
              Fallback pricing applied where live contract values were missing.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
