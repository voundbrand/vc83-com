"use client";

import {
  type StoreCommercialOfferSnapshot,
  type StoreCommercialOfferSelection,
  buildCommercialOfferSelection,
  sortCommercialOffers,
  resolveOfferVisual,
  resolveMotionLabel,
  formatFee,
} from "./store-pricing-reference";

const HARDWARE_OFFER_CODES = new Set([
  "layer3_sovereign",
  "layer3_sovereign_pro",
  "layer3_sovereign_max",
  "layer4_nvidia_private",
]);

interface StoreHardwarePackagesProps {
  offers: StoreCommercialOfferSnapshot[];
  onSelectOffer: (selection: StoreCommercialOfferSelection) => void;
}

export function StoreHardwarePackages({ offers, onSelectOffer }: StoreHardwarePackagesProps) {
  const hardwareOffers = sortCommercialOffers(
    offers.filter((o) => HARDWARE_OFFER_CODES.has(o.offerCode))
  );

  if (hardwareOffers.length === 0) return null;

  return (
    <div>
      <div className="mb-4">
        <h2
          className="font-pixel text-sm"
          style={{ color: "var(--window-document-text)" }}
        >
          Private infrastructure
        </h2>
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--window-document-text-muted)" }}
        >
          Your data, your environment, no shared infrastructure. Private inference
          hardware and dedicated deployment packages for teams that need full
          control.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {hardwareOffers.map((offer) => (
          <HardwareOfferCard
            key={offer.offerCode}
            offer={offer}
            onSelect={onSelectOffer}
          />
        ))}
      </div>
    </div>
  );
}

function HardwareOfferCard({
  offer,
  onSelect,
}: {
  offer: StoreCommercialOfferSnapshot;
  onSelect: (selection: StoreCommercialOfferSelection) => void;
}) {
  const visual = resolveOfferVisual(offer.offerCode);
  const selection = buildCommercialOfferSelection(offer);

  return (
    <article
      className="rounded-xl border p-3"
      style={{
        borderColor: "var(--window-document-border)",
        background: "var(--window-document-bg)",
      }}
    >
      <div
        className="mb-3 rounded-lg border px-3 py-2"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--desktop-shell-accent)",
          color: "var(--window-document-text)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide">
          {visual.glyph}
        </p>
        <p className="mt-0.5 text-xs">{visual.hardware}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4
          className="text-xs font-semibold"
          style={{ color: "var(--window-document-text)" }}
        >
          {offer.label}
        </h4>
        <span
          className="inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
          style={{
            borderColor: "var(--window-document-border)",
            color: "var(--window-document-text-muted)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          {resolveMotionLabel(offer.motion)}
        </span>
      </div>

      <dl className="mt-2 grid grid-cols-1 gap-2 text-xs">
        <div
          className="rounded border px-2 py-1.5"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <dt style={{ color: "var(--window-document-text-muted)" }}>
            One-time setup
          </dt>
          <dd
            className="font-semibold"
            style={{ color: "var(--window-document-text)" }}
          >
            {formatFee(offer.setupFeeCents, "one_time")}
          </dd>
        </div>
        <div
          className="rounded border px-2 py-1.5"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <dt style={{ color: "var(--window-document-text-muted)" }}>
            Monthly fee
          </dt>
          <dd
            className="font-semibold"
            style={{ color: "var(--window-document-text)" }}
          >
            {formatFee(offer.monthlyPlatformFeeCents, "monthly")}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => onSelect(selection)}
        className="mt-3 w-full rounded-md border px-2 py-2 text-xs font-semibold transition-colors hover:opacity-80"
        style={{
          borderColor: "var(--store-cta-border)",
          background: "var(--store-cta-bg)",
          color: "var(--store-cta-text)",
        }}
      >
        {selection.action === "checkout" ? "Buy now" : "Get started"}
      </button>
    </article>
  );
}
