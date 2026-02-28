"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  LifeBuoy,
  Sparkles,
} from "lucide-react";
import { useCurrentOrganization, useOrganizations } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { serializeShellUrlState } from "@/lib/shell/url-state";

interface SupportIntakeViewProps {
  initialContext?: string;
}

const SALES_EMAIL = "sales@sevenlayers.io";

const PRODUCT_OPTIONS = [
  { id: "ai-assistant", labelKey: "ui.tickets.support_intake.product.ai_assistant", fallback: "AI Assistant" },
  { id: "store", labelKey: "ui.tickets.support_intake.product.store_credits", fallback: "Store & Credits" },
  { id: "integrations", labelKey: "ui.tickets.support_intake.product.integrations", fallback: "Integrations" },
  { id: "billing", labelKey: "ui.tickets.support_intake.product.billing", fallback: "Billing" },
  { id: "builder", labelKey: "ui.tickets.support_intake.product.builder", fallback: "Builder" },
  { id: "other", labelKey: "ui.tickets.support_intake.product.other", fallback: "Other" },
] as const;

function routeToShell(state: {
  app: string;
  panel?: string;
  context?: string;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = serializeShellUrlState(state, "/");
  window.location.assign(nextUrl);
}

function buildSupportContext(args: {
  channel: "community" | "support";
  product: string;
  account: string;
  source: string;
}) {
  return [args.channel, args.product, args.account, args.source].join(":");
}

export function SupportIntakeView({ initialContext }: SupportIntakeViewProps) {
  const { tWithFallback } = useNamespaceTranslations("ui.tickets");
  const currentOrganization = useCurrentOrganization();
  const organizations = useOrganizations().filter((organization) => organization.isActive);

  const [selectedProduct, setSelectedProduct] = useState<string>(PRODUCT_OPTIONS[0].id);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(currentOrganization?.id || "");

  useEffect(() => {
    if (!selectedAccountId && organizations.length > 0) {
      setSelectedAccountId(currentOrganization?.id || organizations[0].id);
    }
  }, [selectedAccountId, organizations, currentOrganization?.id]);

  const selectedAccountName = useMemo(() => {
    if (!selectedAccountId) {
      return tWithFallback("ui.tickets.support_intake.account_current", "Current account");
    }

    return organizations.find((organization) => organization.id === selectedAccountId)?.name
      || tWithFallback("ui.tickets.support_intake.account_current", "Current account");
  }, [organizations, selectedAccountId, tWithFallback]);

  const selectedProductLabel = useMemo(() => {
    const selected = PRODUCT_OPTIONS.find((option) => option.id === selectedProduct);
    if (!selected) {
      return selectedProduct;
    }
    return tWithFallback(selected.labelKey, selected.fallback);
  }, [selectedProduct, tWithFallback]);

  const sourceContext = initialContext || "support_intake";

  const openCommunityPath = () => {
    routeToShell({
      app: "ai-assistant",
      panel: "support-intake",
      context: buildSupportContext({
        channel: "community",
        product: selectedProduct,
        account: selectedAccountId || "unknown",
        source: sourceContext,
      }),
    });
  };

  const openSupportPath = () => {
    routeToShell({
      app: "ai-assistant",
      panel: "support-intake",
      context: buildSupportContext({
        channel: "support",
        product: selectedProduct,
        account: selectedAccountId || "unknown",
        source: sourceContext,
      }),
    });
  };

  const openSalesPath = () => {
    if (typeof window === "undefined") {
      return;
    }

    const subject = encodeURIComponent(
      tWithFallback(
        "ui.tickets.support_intake.sales_subject",
        "[Enterprise] {product} inquiry",
        { product: selectedProductLabel },
      ),
    );
    const body = encodeURIComponent(
      tWithFallback(
        "ui.tickets.support_intake.sales_body",
        "Account: {account}\nProduct: {product}\nSource: {source}\n\nPlease share enterprise pricing and rollout options.",
        {
          account: selectedAccountName,
          product: selectedProductLabel,
          source: sourceContext,
        },
      ),
    );

    window.location.href = `mailto:${SALES_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="p-4 space-y-4">
      <div
        className="rounded border-2 px-3 py-2 flex items-center justify-between gap-3"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <div className="flex items-center gap-2">
          <Activity size={14} style={{ color: "var(--success)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
            {tWithFallback("ui.tickets.support_intake.system_status", "System Status")}
          </span>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded"
          style={{ background: "var(--color-success-subtle)", color: "var(--success)" }}
        >
          {tWithFallback("ui.tickets.support_intake.system_operational", "Operational")}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
            {tWithFallback("ui.tickets.support_intake.product_label", "Product")}
          </label>
          <select
            value={selectedProduct}
            onChange={(event) => setSelectedProduct(event.target.value)}
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          >
            {PRODUCT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {tWithFallback(option.labelKey, option.fallback)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
            {tWithFallback("ui.tickets.support_intake.account_label", "Account")}
          </label>
          <select
            value={selectedAccountId}
            onChange={(event) => setSelectedAccountId(event.target.value)}
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          >
            {organizations.length === 0 ? (
              <option value="">{tWithFallback("ui.tickets.support_intake.account_current", "Current account")}</option>
            ) : (
              organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <article
          className="rounded border-2 p-3"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                <LifeBuoy size={16} />
                {tWithFallback("ui.tickets.support_intake.card.support.title", "Contact Support")}
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {tWithFallback(
                  "ui.tickets.support_intake.card.support.description",
                  "General-purpose path for bug reports, incidents, and billing/product questions.",
                )}
              </p>
            </div>
            <Sparkles size={14} style={{ color: "var(--win95-highlight)" }} />
          </div>
          <button
            onClick={openSupportPath}
            className="mt-3 px-3 py-2 text-xs font-semibold border-2 inline-flex items-center gap-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            {tWithFallback("ui.tickets.support_intake.card.support.action", "Open AI Support Intake")}
            <ArrowRight size={14} />
          </button>
        </article>

        <article
          className="rounded border-2 p-3"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <BookOpen size={16} />
            {tWithFallback("ui.tickets.support_intake.card.community.title", "Community Help")}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {tWithFallback(
              "ui.tickets.support_intake.card.community.description",
              "Best for how-to guidance, setup patterns, and peer-driven answers.",
            )}
          </p>
          <button
            onClick={openCommunityPath}
            className="mt-3 px-3 py-2 text-xs font-semibold border-2 inline-flex items-center gap-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            {tWithFallback("ui.tickets.support_intake.card.community.action", "Open Community Assistant")}
            <ArrowRight size={14} />
          </button>
        </article>

        <article
          className="rounded border-2 p-3"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                <BriefcaseBusiness size={16} />
                {tWithFallback("ui.tickets.support_intake.card.sales.title", "Enterprise Sales")}
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {tWithFallback(
                  "ui.tickets.support_intake.card.sales.description",
                  "Enterprise-only path for procurement, volume pricing, and rollout planning.",
                )}
              </p>
            </div>
            <span
              className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded"
              style={{ background: "var(--color-accent-subtle)", color: "var(--win95-highlight)" }}
            >
              {tWithFallback("ui.tickets.support_intake.card.sales.badge", "Enterprise")}
            </span>
          </div>
          <button
            onClick={openSalesPath}
            className="mt-3 px-3 py-2 text-xs font-semibold border-2 inline-flex items-center gap-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            {tWithFallback("ui.tickets.support_intake.card.sales.action", "Contact Sales")}
            <ArrowRight size={14} />
          </button>
          <p className="mt-2 text-[11px]" style={{ color: "var(--neutral-gray)" }}>
            {tWithFallback(
              "ui.tickets.support_intake.card.sales.note",
              "Product issues, bugs, and account incidents should use the support path above.",
            )}
          </p>
        </article>
      </div>

      <div
        className="rounded border p-3 text-xs flex items-start gap-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)", color: "var(--neutral-gray)" }}
      >
        <Building2 size={14} className="mt-0.5" />
        <p>
          {tWithFallback(
            "ui.tickets.support_intake.routing_context",
            "Current routing context: product {product}, account {account}.",
            {
              product: selectedProductLabel,
              account: selectedAccountName,
            },
          )}
        </p>
      </div>
    </div>
  );
}
