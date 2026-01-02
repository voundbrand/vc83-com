/**
 * TEMPLATES LIST COMPONENT
 *
 * Unified list view for Email, PDF, and All Templates
 * Similar to FormsList component with CRUD operations
 * Features:
 * - Click row to edit
 * - Duplicate templates
 * - Set as default
 * - View schemas
 * - Delete templates
 */

"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import {
  FileText,
  Edit,
  Trash2,
  Copy,
  Code,
  Loader2,
  Mail,
  FileImage,
  Layers,
  Star,
  Power,
  PowerOff,
  Info
} from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ConfirmationModal } from "@/components/confirmation-modal";
import {
  getTemplateTypeIcon,
  isValidEmailTemplateType,
  isValidPdfTemplateType
} from "@/templates/template-types";
import { TemplateUsageBadges, type TemplateUsageData } from "@/components/template-usage-badges";
import { TemplateDetailPanel } from "./template-detail-panel";

interface Template {
  _id: Id<"objects">;
  name: string;
  type: string;
  subtype: string;
  description?: string;
  status?: string;
  isSystemTemplate?: boolean; // Flag to indicate if template is from system organization
  customProperties?: Record<string, unknown> & {
    code?: string;
    category?: string;
    version?: string;
    templateSchema?: unknown;
    emailTemplateSchema?: unknown;
    isDefault?: boolean;
  };
}

interface TemplatesListProps {
  templates: Template[];
  onEditTemplate: (templateId: string) => void;
  onViewSchema?: (templateId: string) => void;
  templateType?: "email" | "pdf" | "all";
  templateUsageData?: Record<string, TemplateUsageData>; // Usage data by template ID
}

export function TemplatesList({
  templates,
  onEditTemplate,
  onViewSchema,
  templateType = "all",
  templateUsageData
}: TemplatesListProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [duplicatingTemplateId, setDuplicatingTemplateId] = useState<string | null>(null);
  const [settingDefaultTemplateId, setSettingDefaultTemplateId] = useState<string | null>(null);
  const [togglingStatusTemplateId, setTogglingStatusTemplateId] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    templateId: string;
    templateName: string;
  } | null>(null);
  const [errorAlert, setErrorAlert] = useState<{
    isOpen: boolean;
    message: string;
  } | null>(null);
  const [detailPanelTemplateId, setDetailPanelTemplateId] = useState<string | null>(null);

  // Mutation hooks
  const deleteTemplateMutation = useMutation(api.templateOntology.deleteTemplate);
  const duplicateTemplateMutation = useMutation(api.templateOntology.duplicateTemplate);
  const setDefaultTemplateMutation = useMutation(api.templateOntology.setDefaultTemplate);
  const toggleStatusMutation = useMutation(api.templateOntology.toggleTemplateStatus);

  const handleDelete = (templateId: string, templateName: string) => {
    if (!sessionId) return;

    setDeleteConfirmModal({
      isOpen: true,
      templateId,
      templateName,
    });
  };

  const confirmDelete = async () => {
    if (!sessionId || !deleteConfirmModal) return;

    try {
      setDeletingTemplateId(deleteConfirmModal.templateId);
      await deleteTemplateMutation({
        sessionId,
        templateId: deleteConfirmModal.templateId as Id<"objects">,
      });
      setDeleteConfirmModal(null);

      // Show success message
      setErrorAlert({
        isOpen: true,
        message: `Template "${deleteConfirmModal.templateName}" deleted successfully!`,
      });
      setTimeout(() => setErrorAlert(null), 2000);
    } catch (error) {
      console.error("Failed to delete template:", error);
      setErrorAlert({
        isOpen: true,
        message: `Failed to delete template: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setDeletingTemplateId(null);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDuplicate = async (templateId: string, _templateName: string) => {
    if (!sessionId || !currentOrg) return;

    try {
      setDuplicatingTemplateId(templateId);
      const result = await duplicateTemplateMutation({
        sessionId,
        templateId: templateId as Id<"objects">,
        targetOrganizationId: currentOrg.id as Id<"organizations">, // Create in current org!
      });

      setErrorAlert({
        isOpen: true,
        message: `Template duplicated successfully! Created "${result.name}" - Check "All Templates" tab (Inactive)`,
      });

      setTimeout(() => setErrorAlert(null), 3000);
    } catch (error) {
      console.error("Failed to duplicate template:", error);
      setErrorAlert({
        isOpen: true,
        message: `Failed to duplicate template: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setDuplicatingTemplateId(null);
    }
  };

  const handleSetDefault = async (templateId: string, category: string) => {
    if (!sessionId) return;

    try {
      setSettingDefaultTemplateId(templateId);
      await setDefaultTemplateMutation({
        sessionId,
        templateId: templateId as Id<"objects">,
        category,
      });

      setErrorAlert({
        isOpen: true,
        message: `Successfully set as default template for "${category}" category!`,
      });

      setTimeout(() => setErrorAlert(null), 2000);
    } catch (error) {
      console.error("Failed to set default template:", error);
      setErrorAlert({
        isOpen: true,
        message: `Failed to set default: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setSettingDefaultTemplateId(null);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleToggleStatus = async (templateId: string, templateName: string, _currentStatus: string) => {
    if (!sessionId) return;

    try {
      setTogglingStatusTemplateId(templateId);
      const result = await toggleStatusMutation({
        sessionId,
        templateId: templateId as Id<"objects">,
      });

      const action = result.newStatus === "published" ? "activated" : "deactivated";
      setErrorAlert({
        isOpen: true,
        message: `Template "${templateName}" ${action} successfully!`,
      });

      setTimeout(() => setErrorAlert(null), 2000);
    } catch (error) {
      console.error("Failed to toggle template status:", error);
      setErrorAlert({
        isOpen: true,
        message: `Failed to toggle status: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setTogglingStatusTemplateId(null);
    }
  };

  const getTemplateIcon = (template: Template) => {
    // For email templates, show icon based on subtype if it's a valid template type
    if (template.subtype === "email" || isValidEmailTemplateType(template.subtype)) {
      // If it's just "email", show generic mail icon
      if (template.subtype === "email") return <Mail size={18} />;
      // Otherwise, show the specific template type icon as emoji
      const icon = getTemplateTypeIcon("email", template.subtype);
      return <span className="text-base">{icon}</span>;
    }

    // For PDF templates, show icon based on subtype if it's a valid template type
    if (template.subtype === "pdf" || template.subtype === "pdf_ticket" || isValidPdfTemplateType(template.subtype)) {
      // If it's just "pdf" or "pdf_ticket", show generic PDF icon
      if (template.subtype === "pdf" || template.subtype === "pdf_ticket") return <FileImage size={18} />;
      // Otherwise, show the specific template type icon as emoji
      const icon = getTemplateTypeIcon("pdf", template.subtype);
      return <span className="text-base">{icon}</span>;
    }

    // Fallback for unknown types
    return <FileText size={18} />;
  };

  const getCategoryBadge = (category?: string) => {
    if (!category) return null;

    const categoryColors: Record<string, { bg: string; text: string }> = {
      transactional: { bg: "#3B82F6", text: "white" },
      marketing: { bg: "#8B5CF6", text: "white" },
      event: { bg: "#10B981", text: "white" },
      support: { bg: "#F59E0B", text: "white" },
      ticket: { bg: "#EF4444", text: "white" },
      invoice: { bg: "#6366F1", text: "white" },
      newsletter: { bg: "#EC4899", text: "white" },
    };

    const style = categoryColors[category] || { bg: "#6B7280", text: "white" };

    return (
      <span
        className="px-2 py-0.5 text-xs font-bold capitalize"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {category}
      </span>
    );
  };

  const hasSchema = (template: Template) => {
    return !!(template.customProperties?.templateSchema || template.customProperties?.emailTemplateSchema);
  };

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Layers size={64} style={{ color: "var(--neutral-gray)", opacity: 0.3 }} />
        <h2 className="mt-4 text-lg font-bold" style={{ color: "var(--win95-text)" }}>
          No Templates Found
        </h2>
        <p className="mt-2 text-sm text-center max-w-md" style={{ color: "var(--neutral-gray)" }}>
          {templateType === "email" && "No email templates available. Email templates are used for sending automated emails to customers."}
          {templateType === "pdf" && "No PDF templates available. PDF templates are used for generating tickets, invoices, and other documents."}
          {templateType === "all" && "No templates available. Templates are used throughout the system for emails, PDFs, and more."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            {templateType === "email" && "Email Templates"}
            {templateType === "pdf" && "PDF Templates"}
            {templateType === "all" && "All Templates"}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {templates.length} template{templates.length !== 1 ? "s" : ""} available
          </p>
        </div>

        {/* Templates list */}
        <div className="space-y-2">
          {templates.map((template) => {
            const isDeleting = deletingTemplateId === template._id;
            const isDuplicating = duplicatingTemplateId === template._id;
            const isSettingDefault = settingDefaultTemplateId === template._id;
            const isTogglingStatus = togglingStatusTemplateId === template._id;
            const isDefault = template.customProperties?.isDefault === true;
            const category = template.customProperties?.category;
            const version = template.customProperties?.version;
            const code = template.customProperties?.code;
            const isActive = template.status === "published";
            const isSystemTemplate = template.isSystemTemplate === true; // Use the flag from the backend
            const hasHtml = !!(template.customProperties as any)?.html;

            return (
              <div
                key={template._id}
                className="border-2 p-3 transition-colors cursor-pointer"
                style={{
                  borderColor: isDefault ? "var(--win95-highlight)" : "var(--win95-border)",
                  background: isDefault ? "rgba(107, 70, 193, 0.05)" : "var(--win95-bg-light)",
                }}
                onClick={() => onEditTemplate(template._id)}
                onMouseEnter={(e) => {
                  if (!isDefault) {
                    e.currentTarget.style.background = "var(--win95-hover-light)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDefault) {
                    e.currentTarget.style.background = "var(--win95-bg-light)";
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  {/* Left: Template info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getTemplateIcon(template)}
                      <h4 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
                        {template.name}
                      </h4>

                      {/* System badge - Shows if template is from system organization */}
                      {isSystemTemplate && (
                        <span
                          className="px-2 py-0.5 text-xs font-bold flex items-center gap-1"
                          style={{
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            color: "#3b82f6",
                            border: "1px solid #3b82f6"
                          }}
                          title="System template (available to all organizations)"
                        >
                          SYSTEM
                        </span>
                      )}

                      {isDefault && (
                        <span
                          className="px-2 py-0.5 text-xs font-bold flex items-center gap-1"
                          style={{ backgroundColor: "var(--win95-highlight)", color: "var(--win95-titlebar-text)" }}
                          title="Default template for this category"
                        >
                          <Star size={10} fill="white" />
                          DEFAULT
                        </span>
                      )}
                      {/* Status badge (only for non-system templates) */}
                      {!isSystemTemplate && (
                        <span
                          className="px-2 py-0.5 text-xs font-bold"
                          style={{
                            backgroundColor: isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(107, 114, 128, 0.1)",
                            color: isActive ? "#10B981" : "#6B7280",
                            border: `1px solid ${isActive ? "#10B981" : "#6B7280"}`
                          }}
                          title={isActive ? "Template is active and available for use" : "Template is inactive (draft)"}
                        >
                          {isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      )}
                      {getCategoryBadge(category)}
                    </div>

                    {/* Code and version */}
                    {(code || version) && (
                      <div className="text-xs mb-1 font-mono" style={{ color: "var(--neutral-gray)" }}>
                        {code && <span>{code}</span>}
                        {code && version && <span className="mx-2">•</span>}
                        {version && <span>v{version}</span>}
                      </div>
                    )}

                    {/* Description (if exists) */}
                    {template.description && (
                      <p className="text-xs mb-1 line-clamp-2" style={{ color: "var(--neutral-gray)" }}>
                        {template.description}
                      </p>
                    )}

                    {/* Template type badges */}
                    <div className="flex items-center gap-2">
                      {hasSchema(template) && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold"
                          style={{
                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                            color: "#10B981",
                            border: "1px solid #10B981"
                          }}
                          title="Schema-driven template (modern, flexible)"
                        >
                          <Code size={10} />
                          SCHEMA
                        </span>
                      )}
                      {hasHtml && !hasSchema(template) && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold"
                          style={{
                            backgroundColor: "rgba(245, 158, 11, 0.1)",
                            color: "#F59E0B",
                            border: "1px solid #F59E0B"
                          }}
                          title="Hardcoded HTML template (legacy)"
                        >
                          <Code size={10} />
                          HTML
                        </span>
                      )}
                    </div>

                    {/* Usage badges */}
                    {templateUsageData && templateUsageData[template._id] && (
                      <div className="mt-1">
                        <TemplateUsageBadges
                          templateId={template._id}
                          usageData={templateUsageData[template._id]}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right: Action buttons */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {/* View Details button */}
                    <button
                      className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-bg-light)",
                        color: "#3b82f6",
                      }}
                      title="View template details and usage"
                      disabled={isDeleting || isDuplicating || isSettingDefault || isTogglingStatus}
                      onClick={() => setDetailPanelTemplateId(template._id)}
                      onMouseEnter={(e) => {
                        if (!isDeleting && !isDuplicating && !isSettingDefault && !isTogglingStatus)
                          e.currentTarget.style.background = "var(--win95-hover-light)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--win95-bg-light)";
                      }}
                    >
                      <Info size={12} />
                    </button>

                    {/* Edit button */}
                    <button
                      className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-bg-light)",
                        color: "var(--win95-highlight)",
                      }}
                      title="Edit template"
                      disabled={isDeleting || isDuplicating || isSettingDefault}
                      onClick={() => onEditTemplate(template._id)}
                      onMouseEnter={(e) => {
                        if (!isDeleting && !isDuplicating && !isSettingDefault)
                          e.currentTarget.style.background = "var(--win95-hover-light)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--win95-bg-light)";
                      }}
                    >
                      <Edit size={12} />
                    </button>

                    {/* View Schema button */}
                    {hasSchema(template) && onViewSchema && (
                      <button
                        className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-bg-light)",
                          color: "#10b981",
                        }}
                        title="View template schema (JSON)"
                        disabled={isDeleting || isDuplicating || isSettingDefault}
                        onClick={() => onViewSchema(template._id)}
                        onMouseEnter={(e) => {
                          if (!isDeleting && !isDuplicating && !isSettingDefault)
                            e.currentTarget.style.background = "var(--win95-hover-light)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--win95-bg-light)";
                        }}
                      >
                        <Code size={12} />
                      </button>
                    )}

                    {/* Duplicate button */}
                    <button
                      className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-bg-light)",
                        color: "#8b5cf6",
                      }}
                      title="Duplicate template"
                      disabled={isDeleting || isDuplicating || isSettingDefault}
                      onClick={() => handleDuplicate(template._id, template.name)}
                      onMouseEnter={(e) => {
                        if (!isDeleting && !isDuplicating && !isSettingDefault)
                          e.currentTarget.style.background = "var(--win95-hover-light)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--win95-bg-light)";
                      }}
                    >
                      {isDuplicating ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                    </button>

                    {/* Set/Unset Default button */}
                    {category && !isSystemTemplate && (
                      <button
                        onClick={() => handleSetDefault(template._id, category)}
                        disabled={isDeleting || isDuplicating || isSettingDefault || isTogglingStatus}
                        className="px-2 py-1 text-xs border-2 flex items-center gap-1 disabled:opacity-50 transition-colors"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-bg-light)",
                          color: isDefault ? "#6B7280" : "#F59E0B",
                        }}
                        title={isDefault ? "Remove default status" : "Set as default template for this category"}
                        onMouseEnter={(e) => {
                          if (!isDeleting && !isDuplicating && !isSettingDefault && !isTogglingStatus)
                            e.currentTarget.style.background = "var(--win95-hover-light)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--win95-bg-light)";
                        }}
                      >
                        {isSettingDefault ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} fill={isDefault ? "#6B7280" : "none"} />}
                      </button>
                    )}

                    {/* Toggle Status button (only for custom templates) */}
                    {!isSystemTemplate && (
                      <button
                        onClick={() => handleToggleStatus(template._id, template.name, template.status || "draft")}
                        disabled={isDeleting || isDuplicating || isSettingDefault || isTogglingStatus}
                        className="px-2 py-1 text-xs border-2 flex items-center gap-1 disabled:opacity-50 transition-colors"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-bg-light)",
                          color: isActive ? "#6B7280" : "#10B981",
                        }}
                        title={isActive ? "Deactivate template" : "Activate template"}
                        onMouseEnter={(e) => {
                          if (!isDeleting && !isDuplicating && !isSettingDefault && !isTogglingStatus)
                            e.currentTarget.style.background = "var(--win95-hover-light)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--win95-bg-light)";
                        }}
                      >
                        {isTogglingStatus ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : isActive ? (
                          <PowerOff size={12} />
                        ) : (
                          <Power size={12} />
                        )}
                      </button>
                    )}

                    {/* Delete button (only for custom templates) */}
                    {!isSystemTemplate && (
                      <button
                        onClick={() => handleDelete(template._id, template.name)}
                        disabled={isDeleting || isDuplicating || isSettingDefault || isTogglingStatus || isDefault}
                        className="px-2 py-1 text-xs border-2 flex items-center gap-1 disabled:opacity-50 transition-colors"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-bg-light)",
                          color: isDefault ? "var(--neutral-gray)" : "var(--error)",
                        }}
                        title={isDefault ? "Remove default status before deleting" : "Delete template"}
                        onMouseEnter={(e) => {
                          if (!isDeleting && !isDuplicating && !isSettingDefault && !isTogglingStatus && !isDefault)
                            e.currentTarget.style.background = "var(--win95-hover-light)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--win95-bg-light)";
                        }}
                      >
                        {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmModal?.isOpen || false}
        onClose={() => setDeleteConfirmModal(null)}
        onConfirm={confirmDelete}
        title="Delete Template?"
        message={`Are you sure you want to delete "${deleteConfirmModal?.templateName}"?\n\nThis action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingTemplateId === deleteConfirmModal?.templateId}
      />

      {/* Error/Info Alert Modal */}
      <ConfirmationModal
        isOpen={errorAlert?.isOpen || false}
        onClose={() => setErrorAlert(null)}
        onConfirm={() => setErrorAlert(null)}
        title="Notice"
        message={errorAlert?.message || ""}
        confirmText="OK"
        cancelText=""
        variant="warning"
      />

      {/* Template Detail Panel */}
      {detailPanelTemplateId && (
        <TemplateDetailPanel
          templateId={detailPanelTemplateId as Id<"objects">}
          onClose={() => setDetailPanelTemplateId(null)}
        />
      )}
    </>
  );
}
