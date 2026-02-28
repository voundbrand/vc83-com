/**
 * TEMPLATE DETAIL PANEL
 *
 * Comprehensive view of template information, usage, and relationships.
 * Displays:
 * - Basic info (name, code, version, status)
 * - Usage analysis (renders, success rate, performance)
 * - Where used (template sets, products, checkouts)
 * - Schema information
 * - Change history
 *
 * Design: Win95-style modal with bordered sections
 */

"use client";

import { useQuery } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../../convex/_generated/api") as { api: any };
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  X,
  FileText,
  Mail,
  FileImage,
  Star,
  Code,
  Calendar,
  Activity,
  Package,
  ShoppingCart,
  Globe,
  ChevronDown,
  ChevronUp,
  Layers,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import {
  getTemplateTypeIcon,
  isValidEmailTemplateType,
  isValidPdfTemplateType,
} from "@/templates/template-types";

interface TemplateDetailPanelProps {
  templateId: Id<"objects">;
  onClose: () => void;
}

export function TemplateDetailPanel({
  templateId,
  onClose,
}: TemplateDetailPanelProps) {
  const { sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.templates");
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basicInfo: true,
    usage: true,
    whereUsed: true,
    schema: false,
    history: false,
  });

  // Fetch template details
  const template = useQuery(
    apiAny.templateOntology.getTemplateById,
    sessionId ? { sessionId, templateId } : "skip"
  );

  // Fetch template usage data
  const usageData = useQuery(
    apiAny.templateSetOntology.getTemplateUsage,
    sessionId ? { sessionId, templateId } : "skip"
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!template || !usageData) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-[9000] p-4"
        style={{ backgroundColor: "var(--modal-overlay-bg)" }}
      >
        <div
          className="w-full max-w-3xl max-h-[90vh] overflow-hidden border rounded-xl"
          style={{
            background: "var(--window-document-bg)",
            borderColor: "var(--window-document-border)",
            boxShadow: "var(--modal-shadow)",
          }}
        >
          <div className="flex items-center justify-center p-8">
            <Loader2 className="animate-spin" size={32} style={{ color: "var(--desktop-menu-text-muted)" }} />
            <span className="ml-3 text-sm" style={{ color: "var(--window-document-text)" }}>
              {tx("ui.templates.detail.loading", "Loading template details...")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const getTemplateIcon = () => {
    const subtype = template.subtype || "";

    if (subtype === "email" || isValidEmailTemplateType(subtype)) {
      if (subtype === "email") return <Mail size={20} />;
      const icon = getTemplateTypeIcon("email", subtype);
      return <span className="text-xl">{icon}</span>;
    }

    if (subtype === "pdf" || subtype === "pdf_ticket" || isValidPdfTemplateType(subtype)) {
      if (subtype === "pdf" || subtype === "pdf_ticket") return <FileImage size={20} />;
      const icon = getTemplateTypeIcon("pdf", subtype);
      return <span className="text-xl">{icon}</span>;
    }

    return <FileText size={20} />;
  };

  const isDefault = template.customProperties?.isDefault === true;
  const isActive = template.status === "published";
  const category = template.customProperties?.category;
  const version = template.customProperties?.version;
  const code = template.customProperties?.code;
  const hasSchema = !!(template.customProperties?.templateSchema || template.customProperties?.emailTemplateSchema);

  // Extract usage data from nested structure
  const usage = usageData.usage;

  // Section component for collapsible sections
  const Section = ({
    id,
    title,
    icon: Icon,
    children,
  }: {
    id: string;
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections[id];

    return (
      <div
        className="border rounded-lg mb-3"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--desktop-shell-accent)",
        }}
      >
        <button
          className="w-full flex items-center justify-between p-3 hover:bg-opacity-80 transition-colors"
          onClick={() => toggleSection(id)}
          style={{
            background: "var(--window-document-bg)",
            borderBottom: isExpanded ? "1px solid var(--window-document-border)" : "none",
          }}
        >
          <div className="flex items-center gap-2">
            <Icon size={16} style={{ color: "var(--tone-accent-strong)" }} />
            <span className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
              {title}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp size={16} style={{ color: "var(--desktop-menu-text-muted)" }} />
          ) : (
            <ChevronDown size={16} style={{ color: "var(--desktop-menu-text-muted)" }} />
          )}
        </button>
        {isExpanded && <div className="p-3">{children}</div>}
      </div>
    );
  };

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start mb-2 text-xs">
      <span className="font-bold w-32 flex-shrink-0" style={{ color: "var(--desktop-menu-text-muted)" }}>
        {label}:
      </span>
      <span style={{ color: "var(--window-document-text)" }}>{value}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9000] p-4"
      style={{ backgroundColor: "var(--modal-overlay-bg)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-hidden border rounded-xl"
        style={{
          background: "var(--window-document-bg)",
          borderColor: "var(--window-document-border)",
          boxShadow: "var(--modal-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b gap-3"
          style={{
            background: "var(--window-document-bg)",
            borderColor: "var(--window-document-border)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              className="desktop-interior-button h-8 px-3 text-xs shrink-0"
              onClick={onClose}
              title={tx("ui.templates.detail.back_to_list", "Back to list")}
            >
              <ArrowLeft size={14} />
              <span>{tx("ui.templates.detail.back_to_list", "Back to list")}</span>
            </button>
            <span style={{ color: "var(--tone-accent-strong)" }}>{getTemplateIcon()}</span>
            <span className="font-bold text-sm truncate" style={{ color: "var(--window-document-text)" }}>
              {template.name} {tx("ui.templates.detail.title_suffix", "- Template Details")}
            </span>
          </div>
          <button
            className="desktop-interior-button h-9 w-9 p-0"
            onClick={onClose}
            title={tx("ui.templates.shared.close", "Close")}
          >
            <X size={16} style={{ color: "var(--window-document-text)" }} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(92vh-116px)] p-4 retro-scrollbar">
          {/* BASIC INFO */}
          <Section id="basicInfo" title={tx("ui.templates.detail.section.basic_information", "Basic Information")} icon={FileText}>
            <InfoRow label={tx("ui.templates.detail.name", "Name")} value={template.name} />
            {code && <InfoRow label={tx("ui.templates.detail.code", "Code")} value={<code className="font-mono">{code}</code>} />}
            {version && <InfoRow label={tx("ui.templates.detail.version", "Version")} value={`v${version}`} />}
            <InfoRow
              label={tx("ui.templates.detail.type", "Type")}
              value={
                <span className="capitalize">
                  {template.subtype === "email"
                    ? tx("ui.templates.detail.type_email", "Email")
                    : template.subtype === "pdf" || template.subtype === "pdf_ticket"
                      ? tx("ui.templates.detail.type_pdf", "PDF")
                      : template.subtype}
                </span>
              }
            />
            {category && (
              <InfoRow
                label={tx("ui.templates.detail.category", "Category")}
                value={
                  <span
                    className="px-2 py-0.5 text-xs font-bold capitalize"
                    style={{ backgroundColor: "var(--tone-accent-strong)", color: "var(--window-document-text)" }}
                  >
                    {category}
                  </span>
                }
              />
            )}
            <InfoRow
              label={tx("ui.templates.detail.status", "Status")}
              value={
                <span
                  className="px-2 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(107, 114, 128, 0.1)",
                    color: isActive ? "#10B981" : "#6B7280",
                    border: `1px solid ${isActive ? "#10B981" : "#6B7280"}`,
                  }}
                >
                  {isActive
                    ? tx("ui.templates.detail.status_active", "ACTIVE")
                    : tx("ui.templates.detail.status_inactive", "INACTIVE")}
                </span>
              }
            />
            {isDefault && (
              <InfoRow
                label={tx("ui.templates.detail.default_template", "Default Template")}
                value={
                  <span
                    className="px-2 py-0.5 text-xs font-bold flex items-center gap-1 inline-flex"
                    style={{ backgroundColor: "var(--tone-accent-strong)", color: "var(--window-document-text)" }}
                  >
                    <Star size={10} fill="currentColor" />
                    {tx("ui.templates.detail.default_for_category", 'Default for "{category}" category', {
                      category: String(category ?? ""),
                    })}
                  </span>
                }
              />
            )}
            {template.description && <InfoRow label={tx("ui.templates.detail.description", "Description")} value={template.description} />}
          </Section>

          {/* USAGE ANALYSIS */}
          <Section id="usage" title={tx("ui.templates.detail.section.usage_analysis", "Usage Analysis")} icon={Activity}>
            <InfoRow
              label={tx("ui.templates.detail.template_sets", "Template Sets")}
              value={
                usage.templateSets.length > 0 ? (
                  <span className="font-bold" style={{ color: "var(--success)" }}>
                    {tx("ui.templates.detail.used_in_template_sets", "Used in {count} set{suffix}", {
                      count: usage.templateSets.length,
                      suffix: usage.templateSets.length !== 1
                        ? tx("ui.templates.shared.plural_suffix", "s")
                        : "",
                    })}
                  </span>
                ) : (
                  <span className="font-bold inline-flex items-center gap-1" style={{ color: "var(--error)" }}>
                    <AlertTriangle size={12} />
                    {tx("ui.templates.detail.not_used_in_template_sets", "Not used in any template sets")}
                  </span>
                )
              }
            />
            <InfoRow
              label={tx("ui.templates.detail.products", "Products")}
              value={
                usage.products.length > 0 ? (
                  <span>
                    {tx("ui.templates.detail.products_reference_template", "{count} product{suffix} reference this template", {
                      count: usage.products.length,
                      suffix: usage.products.length !== 1
                        ? tx("ui.templates.shared.plural_suffix", "s")
                        : "",
                    })}
                  </span>
                ) : (
                  <span style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {tx("ui.templates.detail.no_products_using_template", "No products using this template")}
                  </span>
                )
              }
            />
            <InfoRow
              label={tx("ui.templates.detail.checkouts", "Checkouts")}
              value={
                usage.checkouts.length > 0 ? (
                  <span>
                    {tx("ui.templates.detail.checkouts_use_template", "{count} checkout{suffix} use this template", {
                      count: usage.checkouts.length,
                      suffix: usage.checkouts.length !== 1
                        ? tx("ui.templates.shared.plural_suffix", "s")
                        : "",
                    })}
                  </span>
                ) : (
                  <span style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {tx("ui.templates.detail.no_checkouts_using_template", "No checkouts using this template")}
                  </span>
                )
              }
            />
            <InfoRow
              label={tx("ui.templates.detail.domains", "Domains")}
              value={
                usage.domains.length > 0 ? (
                  <span>
                    {tx("ui.templates.detail.domains_use_template", "{count} domain{suffix} use this template", {
                      count: usage.domains.length,
                      suffix: usage.domains.length !== 1
                        ? tx("ui.templates.shared.plural_suffix", "s")
                        : "",
                    })}
                  </span>
                ) : (
                  <span style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {tx("ui.templates.detail.no_domains_using_template", "No domains using this template")}
                  </span>
                )
              }
            />
          </Section>

          {/* WHERE USED */}
          <Section id="whereUsed" title={tx("ui.templates.detail.section.where_used", "Where Used")} icon={Layers}>
            {/* Template Sets */}
            {usage.templateSets.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={14} style={{ color: "var(--tone-accent-strong)" }} />
                  <span className="font-bold text-xs" style={{ color: "var(--window-document-text)" }}>
                    {tx("ui.templates.detail.template_sets_count", "Template Sets ({count})", {
                      count: usage.templateSets.length,
                    })}
                  </span>
                </div>
                <div className="pl-6 space-y-1">
                  {usage.templateSets.map((set: { setId: string; setName: string; isDefault: boolean }) => (
                    <div
                      key={set.setId}
                      className="text-xs flex items-center gap-2"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      <span>•</span>
                      <span>{set.setName}</span>
                      {set.isDefault && (
                        <span
                          className="px-1 py-0.5 text-[10px] font-bold"
                          style={{ backgroundColor: "var(--tone-accent-strong)", color: "var(--window-document-text)" }}
                        >
                          {tx("ui.templates.detail.default_badge", "DEFAULT")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Products */}
            {usage.products.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart size={14} style={{ color: "var(--tone-accent-strong)" }} />
                  <span className="font-bold text-xs" style={{ color: "var(--window-document-text)" }}>
                    {tx("ui.templates.detail.products_count", "Products ({count})", {
                      count: usage.products.length,
                    })}
                  </span>
                </div>
                <div className="pl-6 space-y-1">
                  {usage.products.slice(0, 5).map((product: { productId: string; productName: string; templateSetName: string }) => (
                    <div
                      key={product.productId}
                      className="text-xs flex items-center gap-2"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      <span>•</span>
                      <span>{product.productName}</span>
                      <span style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {tx("ui.templates.detail.via_template_set", "(via {templateSetName})", {
                          templateSetName: product.templateSetName,
                        })}
                      </span>
                    </div>
                  ))}
                  {usage.products.length > 5 && (
                    <div className="text-xs pl-3" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      {tx("ui.templates.detail.and_more", "... and {count} more", {
                        count: usage.products.length - 5,
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Checkouts */}
            {usage.checkouts.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart size={14} style={{ color: "var(--tone-accent-strong)" }} />
                  <span className="font-bold text-xs" style={{ color: "var(--window-document-text)" }}>
                    {tx("ui.templates.detail.checkouts_count", "Checkouts ({count})", {
                      count: usage.checkouts.length,
                    })}
                  </span>
                </div>
                <div className="pl-6 space-y-1">
                  {usage.checkouts.map((checkout: { checkoutId: string; checkoutName: string; templateSetName: string }) => (
                    <div
                      key={checkout.checkoutId}
                      className="text-xs flex items-center gap-2"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      <span>•</span>
                      <span>{checkout.checkoutName}</span>
                      <span style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {tx("ui.templates.detail.via_template_set", "(via {templateSetName})", {
                          templateSetName: checkout.templateSetName,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Domains */}
            {usage.domains.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={14} style={{ color: "var(--tone-accent-strong)" }} />
                  <span className="font-bold text-xs" style={{ color: "var(--window-document-text)" }}>
                    {tx("ui.templates.detail.domains_count", "Domains ({count})", {
                      count: usage.domains.length,
                    })}
                  </span>
                </div>
                <div className="pl-6 space-y-1">
                  {usage.domains.map((domain: { domainId: string; domainName: string; templateSetName: string }) => (
                    <div
                      key={domain.domainId}
                      className="text-xs flex items-center gap-2"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      <span>•</span>
                      <span>{domain.domainName}</span>
                      <span style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {tx("ui.templates.detail.via_template_set", "(via {templateSetName})", {
                          templateSetName: domain.templateSetName,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {usage.templateSets.length === 0 &&
              usage.products.length === 0 &&
              usage.checkouts.length === 0 &&
              usage.domains.length === 0 && (
                <div
                  className="text-xs p-4 text-center border"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "rgba(239, 68, 68, 0.05)",
                  color: "var(--error)",
                }}
              >
                  <span className="inline-flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {tx("ui.templates.detail.not_used_anywhere", "This template is not currently being used anywhere.")}
                  </span>
                  <br />
                  <span className="text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {tx("ui.templates.detail.not_used_anywhere_hint", "Consider adding it to a template set or archiving it.")}
                  </span>
                </div>
              )}
          </Section>

          {/* SCHEMA INFO */}
          <Section id="schema" title={tx("ui.templates.detail.section.schema_information", "Schema Information")} icon={Code}>
            {hasSchema ? (
              <>
                <div className="mb-3">
                  <div
                    className="text-xs p-2 border"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "rgba(16, 185, 129, 0.05)",
                      color: "#10B981",
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      {tx("ui.templates.detail.schema_defined", "This template has a defined schema for data validation")}
                    </span>
                  </div>
                </div>
                <button
                  className="desktop-interior-button text-xs"
                  onClick={() => {
                    const schema = template.customProperties?.templateSchema || template.customProperties?.emailTemplateSchema;
                    const schemaJson = JSON.stringify(schema, null, 2);
                    const blob = new Blob([schemaJson], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${code || template.name}-schema.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Code size={12} className="inline mr-1" />
                  {tx("ui.templates.detail.download_schema_json", "Download Schema JSON")}
                </button>
              </>
            ) : (
              <div
                className="text-xs p-4 text-center border"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--desktop-menu-text-muted)",
                }}
              >
                {tx("ui.templates.detail.no_schema", "No schema defined for this template")}
              </div>
            )}
          </Section>

          {/* CHANGE HISTORY */}
          <Section id="history" title={tx("ui.templates.detail.section.change_history", "Change History")} icon={Calendar}>
            <InfoRow
              label={tx("ui.templates.detail.created", "Created")}
              value={
                template._creationTime
                  ? new Date(template._creationTime).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : tx("ui.templates.detail.unknown", "Unknown")
              }
            />
            <InfoRow
              label={tx("ui.templates.detail.last_modified", "Last Modified")}
              value={
                template._creationTime
                  ? new Date(template._creationTime).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : tx("ui.templates.detail.unknown", "Unknown")
              }
            />
            {isActive && (
              <InfoRow
                label={tx("ui.templates.detail.status", "Status")}
                value={
                  <span style={{ color: "var(--success)" }}>
                    {tx("ui.templates.detail.published_active", "Published and active")}
                  </span>
                }
              />
            )}
          </Section>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3 border-t"
          style={{
            background: "var(--window-document-bg)",
            borderColor: "var(--window-document-border)",
          }}
        >
          <button className="desktop-interior-button text-xs" onClick={onClose}>
            {tx("ui.templates.shared.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
