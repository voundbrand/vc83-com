"use client";

import { Shield } from "lucide-react";
import {
  type StoreCommercialOfferSnapshot,
  type StoreCommercialOfferSelection,
  buildCommercialOfferSelection,
  sortCommercialOffers,
  resolveOfferVisual,
  resolveMotionLabel,
  resolvePaymentTerms,
  resolveDeliveryTimeline,
  isGuaranteeEligible,
  formatFee,
} from "./store-pricing-reference";

interface StoreHeroOffersProps {
  offers: StoreCommercialOfferSnapshot[];
  onSelectOffer: (selection: StoreCommercialOfferSelection) => void;
}

const LADDER_DESCRIPTIONS: Record<string, { tagline: string; body: string }> = {
  consult_done_with_you: {
    tagline: "Strategy sprint",
    body: "A focused engagement to map your highest-leverage AI opportunities. You get a written scope document with what to automate, what to build, and estimated ROI. Yours to keep regardless of next steps.",
  },
  layer1_foundation: {
    tagline: "Your first AI operator",
    body: "A fully custom AI operator on webchat and WhatsApp. Handles conversations, books appointments, follows up with leads. Built from a deep conversation about your business \u2014 no templates.",
  },
  layer2_dream_team: {
    tagline: "Multi-agent deployment",
    body: "Everything in Foundation plus custom specialist capabilities, CRM integrations, multi-channel deployment, and monthly strategy calls. One operator to your customers, dedicated agents under the hood.",
  },
  layer3_sovereign: {
    tagline: "On-premise sovereign AI",
    body: "Dream Team operator plus private Apple Silicon compute cluster installed at your office. Your data never leaves your building.",
  },
  layer3_sovereign_pro: {
    tagline: "Hybrid sovereign AI",
    body: "Apple Silicon plus NVIDIA DGX Spark for maximum local inference throughput. Best of both architectures.",
  },
  layer3_sovereign_max: {
    tagline: "Full sovereign stack",
    body: "The everything bundle \u2014 high-performance 512 GB class hardware, on-site installation, team training, and Year 1 managed support. One check, fully operational.",
  },
  layer4_nvidia_private: {
    tagline: "Enterprise GPU infrastructure",
    body: "Dedicated NVIDIA GPU stack (A100/H100) for organizations with 100\u2013500 employees. Department routing, SSO, compliance, managed support.",
  },
};

export function StoreHeroOffers({ offers, onSelectOffer }: StoreHeroOffersProps) {
  const sorted = sortCommercialOffers(offers);

  // Show all offers in the ladder except consult_full_build_scoping (secondary consulting option)
  const ladderOffers = sorted.filter(
    (o) => o.offerCode !== "consult_full_build_scoping"
  );

  return (
    <div className="space-y-3">
      {ladderOffers.map((offer) => (
        <LadderTierCard
          key={offer.offerCode}
          offer={offer}
          onSelect={onSelectOffer}
        />
      ))}
    </div>
  );
}

function LadderTierCard({
  offer,
  onSelect,
}: {
  offer: StoreCommercialOfferSnapshot;
  onSelect: (selection: StoreCommercialOfferSelection) => void;
}) {
  const visual = resolveOfferVisual(offer.offerCode);
  const selection = buildCommercialOfferSelection(offer);
  const desc = LADDER_DESCRIPTIONS[offer.offerCode];
  const paymentTerms = resolvePaymentTerms(offer.offerCode);
  const deliveryTimeline = resolveDeliveryTimeline(offer.offerCode);
  const hasGuarantee = isGuaranteeEligible(offer.offerCode);

  return (
    <article
      className="rounded-xl border p-4"
      style={{
        borderColor: "var(--window-document-border)",
        background: "var(--window-document-bg)",
      }}
    >
      {/* Header: glyph + name + motion badge */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: "var(--desktop-shell-accent)",
              color: "var(--window-document-text)",
            }}
            aria-hidden="true"
          >
            {visual.glyph.slice(0, 4)}
          </div>
          <div>
            <h4
              className="text-xs font-semibold"
              style={{ color: "var(--window-document-text)" }}
            >
              {offer.label}
            </h4>
            <p
              className="mt-0.5 text-xs"
              style={{ color: "var(--window-document-text-muted)" }}
            >
              {desc?.tagline ?? visual.hardware}
            </p>
          </div>
        </div>

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

      {/* Description */}
      {desc?.body && (
        <p
          className="mt-2 text-xs leading-relaxed"
          style={{ color: "var(--window-document-text-muted)" }}
        >
          {desc.body}
        </p>
      )}

      {/* Pricing + metadata grid */}
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div
          className="rounded border px-2 py-1.5"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <dt style={{ color: "var(--window-document-text-muted)" }}>Setup</dt>
          <dd
            className="font-semibold"
            style={{ color: "var(--window-document-text)" }}
          >
            {formatFee(offer.setupFeeCents, "one_time")}
          </dd>
        </div>
        {offer.monthlyPlatformFeeCents !== null && (
          <div
            className="rounded border px-2 py-1.5"
            style={{ borderColor: "var(--window-document-border)" }}
          >
            <dt style={{ color: "var(--window-document-text-muted)" }}>
              Monthly
            </dt>
            <dd
              className="font-semibold"
              style={{ color: "var(--window-document-text)" }}
            >
              {formatFee(offer.monthlyPlatformFeeCents, "monthly")}
            </dd>
          </div>
        )}
        <div
          className="rounded border px-2 py-1.5"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <dt style={{ color: "var(--window-document-text-muted)" }}>Terms</dt>
          <dd
            className="font-semibold"
            style={{ color: "var(--window-document-text)" }}
          >
            {paymentTerms}
          </dd>
        </div>
        <div
          className="rounded border px-2 py-1.5"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <dt style={{ color: "var(--window-document-text-muted)" }}>
            Delivery
          </dt>
          <dd
            className="font-semibold"
            style={{ color: "var(--window-document-text)" }}
          >
            {deliveryTimeline}
          </dd>
        </div>
      </dl>

      {/* Footer: guarantee badge + CTA */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {hasGuarantee ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
            style={{
              borderColor: "var(--success)",
              color: "var(--success)",
              background: "rgba(34, 197, 94, 0.08)",
            }}
          >
            <Shield className="h-3 w-3" />
            30-day guarantee
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => onSelect(selection)}
          className="rounded-md border px-4 py-2 text-xs font-semibold transition-colors hover:opacity-80"
          style={{
            borderColor: "var(--store-cta-border)",
            background: "var(--store-cta-bg)",
            color: "var(--store-cta-text)",
          }}
        >
          {selection.action === "checkout" ? "Buy now" : "Get started"}
        </button>
      </div>
    </article>
  );
}
