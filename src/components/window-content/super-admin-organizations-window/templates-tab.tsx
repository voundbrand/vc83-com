"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  FileText,
  Check,
  Loader2,
  AlertCircle,
  Edit,
  Trash2,
  Copy,
  Search,
  Filter,
  Package,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const apiAny: any = require("../../../../convex/_generated/api").api;

/** Audit template interface */
interface AuditTemplate {
  _id: string;
  name: string;
  code: string;
  subtype?: string;
  category?: string;
  hasSchema?: boolean;
  status?: string;
}

/** Organization interface */
interface Organization {
  _id: Id<"organizations">;
  name: string;
  slug: string;
}

const READ_ONLY_AVAILABILITY_TYPES = new Set(["email", "page", "checkout", "pdf"]);

function isReadOnlyAvailabilityType(type: string): boolean {
  return READ_ONLY_AVAILABILITY_TYPES.has(type);
}

type TranslateWithFallback = (
  key: string,
  fallback: string,
  params?: Record<string, string | number>
) => string;

/**
 * Templates Tab - Redesigned with Two Sections + Theme System
 *
 * SECTION 1: CRUD - Manage ALL system templates in one clean list
 * SECTION 2: Availability - Select org, enable/disable templates
 */
export function TemplatesTab() {
  const { sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.super_admin.templates");
  const tx: TranslateWithFallback = (key, fallback, params) => {
    const fullKey = `ui.super_admin.templates.${key}`;
    const translated = t(fullKey, params);
    return translated === fullKey ? fallback : translated;
  };

  // Fetch audit data for all templates
  const auditData = useQuery(
    apiAny.auditTemplates.auditAllTemplates,
    sessionId ? {} : "skip"
  ) as {
    templates: {
      schemaEmail: AuditTemplate[];
      htmlEmail: AuditTemplate[];
      pdf: AuditTemplate[];
      unknown: AuditTemplate[];
    };
  } | undefined;

  // Fetch all organizations
  const organizations = useQuery(
    apiAny.organizations.listAll,
    sessionId ? { sessionId } : "skip"
  ) as Organization[] | undefined;

  if (!sessionId) {
    return (
      <div className="p-4">
        <div
          className="border-2 p-4"
          style={{
            borderColor: "#ef4444",
            background: "#fef2f2",
          }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={20} style={{ color: "#dc2626" }} className="flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm" style={{ color: "#991b1b" }}>
                {tx("access.authentication_required", "Authentication Required")}
              </h4>
              <p className="text-xs mt-1" style={{ color: "#b91c1c" }}>
                {tx("access.login_required_body", "Please log in to manage templates.")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!auditData || !organizations) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--tone-accent)" }} />
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="p-4">
        <div
          className="border-2 p-4"
          style={{
            borderColor: "#ca8a04",
            background: "#fefce8",
          }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={20} style={{ color: "#ca8a04" }} className="flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm" style={{ color: "#854d0e" }}>
                {tx("empty.no_organizations_title", "No Organizations Found")}
              </h4>
              <p className="text-xs mt-1" style={{ color: "#a16207" }}>
                {tx("empty.no_organizations_body", "No organizations exist yet.")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Combine all templates from audit data
  const allTemplates = [
    ...auditData.templates.schemaEmail,
    ...auditData.templates.htmlEmail,
    ...auditData.templates.pdf,
    ...auditData.templates.unknown,
  ];

  return (
    <div
      className="p-4 space-y-8 overflow-y-auto max-h-[calc(100vh-200px)]"
      style={{ background: "var(--window-document-bg)" }}
    >
      {/* SECTION 1: CRUD - Template Management */}
      <TemplateCRUDSection templates={allTemplates} sessionId={sessionId} tx={tx} />

      {/* SECTION 2: Availability - Per-Org Template Access */}
      <TemplateAvailabilitySection
        templates={allTemplates}
        organizations={organizations}
        sessionId={sessionId}
        tx={tx}
      />
    </div>
  );
}

/**
 * SECTION 1: CRUD - System Templates Management
 */
function TemplateCRUDSection({
  templates,
  sessionId,
  tx,
}: {
  templates: AuditTemplate[];
  sessionId: string;
  tx: TranslateWithFallback;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [schemaFilter, setSchemaFilter] = useState<string>("all");

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.code.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const templateType = getTemplateType(template);
      const matchesType = typeFilter === "all" || templateType === typeFilter;

      // Schema filter
      const matchesSchema =
        schemaFilter === "all" ||
        (schemaFilter === "schema" && template.hasSchema) ||
        (schemaFilter === "legacy" && !template.hasSchema);

      return matchesSearch && matchesType && matchesSchema;
    });
  }, [templates, searchQuery, typeFilter, schemaFilter]);

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <FileText size={16} />
          {tx("crud.header.title", "System Templates Management")}
        </h3>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          {tx(
            "crud.header.subtitle",
            "Manage all system templates: create, edit, delete, and duplicate."
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3 flex-wrap items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2"
            style={{ color: "var(--neutral-gray)" }}
          />
          <input
            type="text"
            placeholder={tx("crud.filters.search_placeholder", "Search templates...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border-2 focus:outline-none"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg-elevated)",
              color: "var(--window-document-text)",
            }}
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: "var(--neutral-gray)" }} />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border-2 px-2 py-1.5 focus:outline-none"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg-elevated)",
              color: "var(--window-document-text)",
            }}
          >
            <option value="all">{tx("crud.filters.type.all", "All Types")}</option>
            <option value="email">{tx("crud.filters.type.email", "Email")}</option>
            <option value="pdf">{tx("crud.filters.type.pdf", "PDF")}</option>
            <option value="form">{tx("crud.filters.type.form", "Form")}</option>
            <option value="checkout">{tx("crud.filters.type.checkout", "Checkout")}</option>
            <option value="workflow">{tx("crud.filters.type.workflow", "Workflow")}</option>
            <option value="other">{tx("crud.filters.type.other", "Other")}</option>
          </select>
        </div>

        {/* Schema Filter */}
        <select
          value={schemaFilter}
          onChange={(e) => setSchemaFilter(e.target.value)}
          className="text-xs border-2 px-2 py-1.5 focus:outline-none"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
            color: "var(--window-document-text)",
          }}
        >
          <option value="all">{tx("crud.filters.schema.all", "All Templates")}</option>
          <option value="schema">{tx("crud.filters.schema.schema_only", "Schema-Driven Only")}</option>
          <option value="legacy">{tx("crud.filters.schema.legacy_only", "Legacy HTML Only")}</option>
        </select>
      </div>

      {/* Templates Table */}
      <div className="border-2 overflow-x-auto" style={{ borderColor: "var(--window-document-border)" }}>
        <table className="w-full text-xs">
          <thead>
            <tr
              className="border-b-2"
              style={{
                background: "var(--window-document-bg-elevated)",
                borderColor: "var(--window-document-border)",
              }}
            >
              <th
                className="px-3 py-2 text-left font-bold"
                style={{ color: "var(--window-document-text)" }}
              >
                {tx("crud.table.name", "Name")}
              </th>
              <th
                className="px-3 py-2 text-left font-bold"
                style={{ color: "var(--window-document-text)" }}
              >
                {tx("crud.table.code", "Code")}
              </th>
              <th
                className="px-3 py-2 text-center font-bold"
                style={{ color: "var(--window-document-text)" }}
              >
                {tx("crud.table.type", "Type")}
              </th>
              <th
                className="px-3 py-2 text-center font-bold"
                style={{ color: "var(--window-document-text)" }}
              >
                {tx("crud.table.schema", "Schema")}
              </th>
              <th
                className="px-3 py-2 text-center font-bold"
                style={{ color: "var(--window-document-text)" }}
              >
                {tx("crud.table.status", "Status")}
              </th>
              <th
                className="px-3 py-2 text-center font-bold"
                style={{ color: "var(--window-document-text)" }}
              >
                {tx("crud.table.actions", "Actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTemplates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center" style={{ color: "var(--neutral-gray)" }}>
                  {tx("crud.table.empty", "No templates found matching your filters.")}
                </td>
              </tr>
            ) : (
              filteredTemplates.map((template) => (
                <TemplateCRUDRow
                  key={template._id}
                  template={template}
                  sessionId={sessionId}
                  tx={tx}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
        {tx(
          "crud.summary",
          `Showing ${filteredTemplates.length} of ${templates.length} templates`,
          { shown: filteredTemplates.length, total: templates.length }
        )}
      </div>
    </div>
  );
}

/**
 * Individual row in CRUD table
 */
function TemplateCRUDRow({
  template,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sessionId,
  tx,
}: {
  template: AuditTemplate;
  sessionId: string;
  tx: TranslateWithFallback;
}) {
  const templateType = getTemplateType(template);
  const typeIcon = getTypeIcon(templateType);
  const typeColor = getTypeColor(templateType);

  return (
    <tr
      className="border-b hover:bg-opacity-50 transition-colors"
      style={{
        borderColor: "var(--window-document-border)",
        background: "transparent",
      }}
    >
      {/* Name */}
      <td className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
        {template.name}
      </td>

      {/* Code */}
      <td className="px-3 py-2">
        <code
          className="text-xs px-1 py-0.5"
          style={{
            background: "var(--window-document-bg-elevated)",
            color: "var(--neutral-gray)",
          }}
        >
          {template.code}
        </code>
      </td>

      {/* Type */}
      <td className="px-3 py-2 text-center">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: typeColor, color: "white" }}
        >
          {typeIcon} {templateType.toUpperCase()}
        </span>
      </td>

      {/* Schema */}
      <td className="px-3 py-2 text-center">
        {template.hasSchema ? (
          <span className="font-bold" style={{ color: "#10b981" }}></span>
        ) : (
          <span className="font-bold" style={{ color: "#ef4444" }}></span>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-2 text-center">
        <span
          className={`inline-block px-2 py-0.5 text-xs font-semibold`}
          style={{
            background: template.status === "published" ? "#dcfce7" : "var(--window-document-bg-elevated)",
            color: template.status === "published" ? "#166534" : "var(--neutral-gray)",
          }}
        >
          {template.status}
        </span>
      </td>

      {/* Actions */}
      <td className="px-3 py-2">
        <div className="flex items-center justify-center gap-2">
          <button
            className="p-1 border transition-colors"
            style={{
              borderColor: "var(--window-document-border)",
              color: "var(--window-document-text)",
            }}
            title={tx("crud.actions.edit_title", "Edit template")}
          >
            <Edit size={14} />
          </button>
          <button
            className="p-1 border transition-colors"
            style={{
              borderColor: "var(--window-document-border)",
              color: "var(--window-document-text)",
            }}
            title={tx("crud.actions.duplicate_title", "Duplicate template")}
          >
            <Copy size={14} />
          </button>
          <button
            className="p-1 border transition-colors"
            style={{
              borderColor: "var(--window-document-border)",
              color: "#ef4444",
            }}
            title={tx("crud.actions.delete_title", "Delete template")}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

/**
 * SECTION 2: Availability - Per-Org Template Access Control
 */
function TemplateAvailabilitySection({
  templates,
  organizations,
  sessionId,
  tx,
}: {
  templates: AuditTemplate[];
  organizations: Organization[];
  sessionId: string;
  tx: TranslateWithFallback;
}) {
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"organizations"> | null>(
    organizations.length > 0 ? organizations[0]._id : null
  );

  // Fetch all availabilities for selected org
  const formAvailabilities = useQuery(
    apiAny.formTemplateAvailability.getAllFormTemplateAvailabilities,
    selectedOrgId && sessionId ? { sessionId, organizationId: selectedOrgId } : "skip"
  );

  const workflowAvailabilities = useQuery(
    apiAny.workflowTemplateAvailability.getAllWorkflowTemplateAvailabilities,
    selectedOrgId && sessionId ? { sessionId, organizationId: selectedOrgId } : "skip"
  );

  // Preserved for future template set availability feature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const templateSetAvailabilities = useQuery(
    apiAny.templateSetAvailability.getAllTemplateSetAvailabilities,
    selectedOrgId && sessionId ? { sessionId } : "skip"
  );

  // Check if template is available for selected org
  const isTemplateAvailable = (template: AuditTemplate) => {
    if (!selectedOrgId) return false;

    const type = getTemplateType(template);
    const code = template.code;

    if (isReadOnlyAvailabilityType(type)) {
      return true;
    }

    // Check appropriate availability list based on type
    if (type === "form") {
      return formAvailabilities?.some(
        (a: any) => a.customProperties?.templateCode === code && a.customProperties?.available
      );
    } else if (type === "workflow") {
      return workflowAvailabilities?.some(
        (a: any) => a.customProperties?.templateCode === code && a.customProperties?.available
      );
    }

    return false;
  };

  // Mutations for toggling availability
  const enableFormTemplate = useMutation(apiAny.formTemplateAvailability.enableFormTemplate);
  const disableFormTemplate = useMutation(apiAny.formTemplateAvailability.disableFormTemplate);
  const enableWorkflowTemplate = useMutation(apiAny.workflowTemplateAvailability.enableWorkflowTemplate);
  const disableWorkflowTemplate = useMutation(apiAny.workflowTemplateAvailability.disableWorkflowTemplate);

  const [loadingTemplates, setLoadingTemplates] = useState<Set<string>>(new Set());

  const handleToggle = async (template: AuditTemplate, currentState: boolean) => {
    if (!selectedOrgId) return;

    const code = template.code;
    const type = getTemplateType(template);

    if (isReadOnlyAvailabilityType(type)) {
      return;
    }

    setLoadingTemplates((prev) => new Set(prev).add(code));

    try {
      const args = {
        sessionId,
        organizationId: selectedOrgId,
        templateCode: code,
      };

      if (currentState) {
        // Disable
        if (type === "form") {
          await disableFormTemplate(args);
        } else if (type === "workflow") {
          await disableWorkflowTemplate(args);
        }
      } else {
        // Enable
        if (type === "form") {
          await enableFormTemplate(args);
        } else if (type === "workflow") {
          await enableWorkflowTemplate(args);
        }
      }
    } catch (error) {
      console.error("Failed to toggle template availability:", error);
      const message =
        error instanceof Error
          ? error.message
          : tx("availability.errors.unknown_error", "Unknown error");
      alert(tx("availability.errors.failed_to_update", `Failed to update: ${message}`, { message }));
    } finally {
      setLoadingTemplates((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    }
  };

  const selectedOrg = organizations.find((org) => org._id === selectedOrgId);

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <Package size={16} />
          {tx("availability.header.title", "Template Availability Management")}
        </h3>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          {tx(
            "availability.header.subtitle",
            "Form/workflow toggles remain editable. Email, page, checkout, and PDF templates are read-only and globally available."
          )}
        </p>
      </div>

      {/* Organization Selector */}
      <div className="mb-4">
        <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
          {tx("availability.select_org_label", "Select Organization:")}
        </label>
        <select
          value={selectedOrgId || ""}
          onChange={(e) => setSelectedOrgId(e.target.value as Id<"organizations">)}
          className="w-full max-w-md text-xs border-2 px-3 py-2 focus:outline-none"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
            color: "var(--window-document-text)",
          }}
        >
          {organizations.map((org) => (
            <option key={org._id} value={org._id}>
              {org.name} ({org.slug})
            </option>
          ))}
        </select>
      </div>

      {/* Templates List with Checkboxes */}
      {selectedOrg && (
        <>
          <div className="mb-3 text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
            {tx(
              "availability.available_templates_for_org",
              `Available Templates for "${selectedOrg.name}":`,
              { organizationName: selectedOrg.name }
            )}
          </div>

          <div
            className="border-2 max-h-[400px] overflow-y-auto"
            style={{ borderColor: "var(--window-document-border)" }}
          >
            <div className="divide-y" style={{ borderColor: "var(--window-document-border)" }}>
              {templates.map((template) => {
                const isAvailable = isTemplateAvailable(template);
                const isLoading = loadingTemplates.has(template.code);
                const type = getTemplateType(template);
                const typeIcon = getTypeIcon(type);
                const isReadOnlyType = isReadOnlyAvailabilityType(type);

                return (
                  <div
                    key={template._id}
                    className="px-4 py-3 flex items-center justify-between transition-colors"
                    style={{
                      background: "transparent",
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => handleToggle(template, isAvailable || false)}
                        disabled={isLoading || isReadOnlyType}
                        className={`w-5 h-5 border-2 flex items-center justify-center transition-colors ${
                          isLoading || isReadOnlyType ? "opacity-50" : ""
                        }`}
                        title={
                          isReadOnlyType
                            ? tx(
                                "availability.read_only_title",
                                "Read-only compatibility mode: this template type is always available."
                              )
                            : undefined
                        }
                        style={{
                          borderColor: "var(--window-document-border)",
                          backgroundColor: isLoading
                            ? "var(--window-document-border)"
                            : isAvailable
                            ? "#22c55e"
                            : "transparent",
                        }}
                      >
                        {isLoading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : isAvailable ? (
                          <Check size={14} style={{ color: "white" }} />
                        ) : null}
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="text-xs">{typeIcon}</span>
                        <span className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                          {template.name}
                        </span>
                        <code
                          className="text-xs px-1"
                          style={{
                            background: "var(--window-document-bg-elevated)",
                            color: "var(--neutral-gray)",
                          }}
                        >
                          {template.code}
                        </code>
                        {template.hasSchema && (
                          <span className="text-xs font-bold" style={{ color: "#10b981" }}>
                            {tx("availability.badges.schema", "Schema")}
                          </span>
                        )}
                        {isReadOnlyType && (
                          <span className="text-xs font-bold" style={{ color: "#f59e0b" }}>
                            {tx("availability.badges.read_only", "Read-only")}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {type}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx(
              "availability.summary",
              `${templates.filter(isTemplateAvailable).length} of ${templates.length} templates enabled`,
              { enabled: templates.filter(isTemplateAvailable).length, total: templates.length }
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Helper: Determine template type from audit data
 */
function getTemplateType(template: AuditTemplate): string {
  if (template.subtype === "pdf") return "pdf";
  if (template.subtype === "email") return "email";
  if (template.subtype === "form") return "form";
  if (template.subtype === "page") return "page";
  if (template.subtype === "checkout") return "checkout"; // Fixed: was checking category instead of subtype
  if (template.category === "workflow") return "workflow";
  return "other";
}

/**
 * Helper: Get icon for template type
 */
function getTypeIcon(type: string): React.ReactNode {
  switch (type) {
    case "email":
      return "EM";
    case "pdf":
      return "PDF";
    case "form":
      return "FORM";
    case "checkout":
      return "CHK";
    case "workflow":
      return "WF";
    case "page":
      return "WEB";
    default:
      return "TPL";
  }
}

/**
 * Helper: Get color for template type
 */
function getTypeColor(type: string): string {
  switch (type) {
    case "email":
      return "#3b82f6"; // blue
    case "pdf":
      return "#ef4444"; // red
    case "form":
      return "#8b5cf6"; // purple
    case "checkout":
      return "#10b981"; // green
    case "workflow":
      return "#f59e0b"; // amber
    case "page":
      return "#06b6d4"; // cyan
    default:
      return "#6b7280"; // gray
  }
}
