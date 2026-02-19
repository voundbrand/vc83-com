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
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basicInfo: true,
    usage: true,
    whereUsed: true,
    schema: false,
    history: false,
  });

  // Fetch template details
  const template = useQuery(
    api.templateOntology.getTemplateById,
    sessionId ? { sessionId, templateId } : "skip"
  );

  // Fetch template usage data
  const usageData = useQuery(
    api.templateSetOntology.getTemplateUsage,
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
              Loading template details...
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
              title="Back to list"
            >
              <ArrowLeft size={14} />
              <span>Back to list</span>
            </button>
            <span style={{ color: "var(--tone-accent-strong)" }}>{getTemplateIcon()}</span>
            <span className="font-bold text-sm truncate" style={{ color: "var(--window-document-text)" }}>
              {template.name} - Template Details
            </span>
          </div>
          <button
            className="desktop-interior-button h-9 w-9 p-0"
            onClick={onClose}
            title="Close"
          >
            <X size={16} style={{ color: "var(--window-document-text)" }} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(92vh-116px)] p-4 retro-scrollbar">
          {/* BASIC INFO */}
          <Section id="basicInfo" title="Basic Information" icon={FileText}>
            <InfoRow label="Name" value={template.name} />
            {code && <InfoRow label="Code" value={<code className="font-mono">{code}</code>} />}
            {version && <InfoRow label="Version" value={`v${version}`} />}
            <InfoRow
              label="Type"
              value={
                <span className="capitalize">
                  {template.subtype === "email" ? "Email" : template.subtype === "pdf" || template.subtype === "pdf_ticket" ? "PDF" : template.subtype}
                </span>
              }
            />
            {category && (
              <InfoRow
                label="Category"
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
              label="Status"
              value={
                <span
                  className="px-2 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(107, 114, 128, 0.1)",
                    color: isActive ? "#10B981" : "#6B7280",
                    border: `1px solid ${isActive ? "#10B981" : "#6B7280"}`,
                  }}
                >
                  {isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              }
            />
            {isDefault && (
              <InfoRow
                label="Default Template"
                value={
                  <span
                    className="px-2 py-0.5 text-xs font-bold flex items-center gap-1 inline-flex"
                    style={{ backgroundColor: "var(--tone-accent-strong)", color: "var(--window-document-text)" }}
                  >
                    <Star size={10} fill="currentColor" />
                    Default for "{category}" category
                  </span>
                }
              />
            )}
            {template.description && <InfoRow label="Description" value={template.description} />}
          </Section>

          {/* USAGE ANALYSIS */}
          <Section id="usage" title="Usage Analysis" icon={Activity}>
            <InfoRow
              label="Template Sets"
              value={
                usage.templateSets.length > 0 ? (
                  <span className="font-bold" style={{ color: "var(--success)" }}>
                    Used in {usage.templateSets.length} set{usage.templateSets.length !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="font-bold inline-flex items-center gap-1" style={{ color: "var(--error)" }}>
                    <AlertTriangle size={12} />
                    Not used in any template sets
                  </span>
                )
              }
            />
            <InfoRow
              label="Products"
              value={
                usage.products.length > 0 ? (
                  <span>
                    {usage.products.length} product{usage.products.length !== 1 ? "s" : ""} reference this template
                  </span>
                ) : (
                  <span style={{ color: "var(--desktop-menu-text-muted)" }}>No products using this template</span>
                )
              }
            />
            <InfoRow
              label="Checkouts"
              value={
                usage.checkouts.length > 0 ? (
                  <span>
                    {usage.checkouts.length} checkout{usage.checkouts.length !== 1 ? "s" : ""} use this template
                  </span>
                ) : (
                  <span style={{ color: "var(--desktop-menu-text-muted)" }}>No checkouts using this template</span>
                )
              }
            />
            <InfoRow
              label="Domains"
              value={
                usage.domains.length > 0 ? (
                  <span>
                    {usage.domains.length} domain{usage.domains.length !== 1 ? "s" : ""} use this template
                  </span>
                ) : (
                  <span style={{ color: "var(--desktop-menu-text-muted)" }}>No domains using this template</span>
                )
              }
            />
          </Section>

          {/* WHERE USED */}
          <Section id="whereUsed" title="Where Used" icon={Layers}>
            {/* Template Sets */}
            {usage.templateSets.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={14} style={{ color: "var(--tone-accent-strong)" }} />
                  <span className="font-bold text-xs" style={{ color: "var(--window-document-text)" }}>
                    Template Sets ({usage.templateSets.length})
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
                          DEFAULT
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
                    Products ({usage.products.length})
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
                        (via {product.templateSetName})
                      </span>
                    </div>
                  ))}
                  {usage.products.length > 5 && (
                    <div className="text-xs pl-3" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      ... and {usage.products.length - 5} more
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
                    Checkouts ({usage.checkouts.length})
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
                        (via {checkout.templateSetName})
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
                    Domains ({usage.domains.length})
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
                        (via {domain.templateSetName})
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
                    This template is not currently being used anywhere.
                  </span>
                  <br />
                  <span className="text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Consider adding it to a template set or archiving it.
                  </span>
                </div>
              )}
          </Section>

          {/* SCHEMA INFO */}
          <Section id="schema" title="Schema Information" icon={Code}>
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
                      This template has a defined schema for data validation
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
                  Download Schema JSON
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
                No schema defined for this template
              </div>
            )}
          </Section>

          {/* CHANGE HISTORY */}
          <Section id="history" title="Change History" icon={Calendar}>
            <InfoRow
              label="Created"
              value={
                template._creationTime
                  ? new Date(template._creationTime).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Unknown"
              }
            />
            <InfoRow
              label="Last Modified"
              value={
                template._creationTime
                  ? new Date(template._creationTime).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Unknown"
              }
            />
            {isActive && (
              <InfoRow
                label="Status"
                value={
                  <span style={{ color: "var(--success)" }}>
                    Published and active
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
