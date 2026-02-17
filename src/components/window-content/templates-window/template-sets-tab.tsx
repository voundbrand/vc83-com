"use client";

import { useState, type ReactElement } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { AlertCircle, Check, CheckCircle, CircleDollarSign, ClipboardList, Copy, CreditCard, Edit, FileText, Loader2, Mail, MessageSquare, Package, Plus, ScrollText, Star, Tag, Ticket, Trash2, X } from "lucide-react";

const getTemplateTypeIcon = (type: string, size = 12) => {
  const iconMap: Record<string, ReactElement> = {
    email: <Mail size={size} />,
    pdf: <FileText size={size} />,
    ticket: <Ticket size={size} />,
    invoice: <CircleDollarSign size={size} />,
    receipt: <CreditCard size={size} />,
    badge: <Tag size={size} />,
    certificate: <ScrollText size={size} />,
    program: <ClipboardList size={size} />,
    quote: <MessageSquare size={size} />,
  };
  return iconMap[type] || <Package size={size} />;
};

/** Template interface for audit data templates */
interface AuditTemplate {
  _id: string;
  name: string;
  code?: string;
  subtype?: string;
  category?: string;
  hasSchema?: boolean;
}

/** Template set interface */
interface TemplateSet {
  _id: string;
  name: string;
  description?: string;
  customProperties?: {
    isDefault?: boolean;
    version?: string;
    tags?: string[];
    templates?: TemplateSetItem[];
  };
}

/** Template item in a template set */
interface TemplateSetItem {
  templateId: string;
  templateType?: string;
  isRequired?: boolean;
  displayOrder?: number;
}

/**
 * Template Sets Tab (v2.0 - Flexible Schema-Driven)
 *
 * Organization UI to create and manage template sets with ANY schema-driven templates.
 * Shows ONLY organization template sets (NOT system defaults for security).
 * System Default is used automatically as fallback when no org sets exist.
 * No longer limited to ticket/invoice/email - supports all template types!
 */
export function TemplateSetsTab() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCopySystemModal, setShowCopySystemModal] = useState(false);

  const organizationId = currentOrg?.id as Id<"organizations"> | undefined;

  // Fetch ONLY organization template sets (NOT system defaults!)
  // Organization owners should NOT see or edit system-level template sets
  const templateSets = useQuery(
    api.templateSetOntology.getTemplateSets,
    sessionId && organizationId
      ? { sessionId, organizationId, includeSystem: false } // Security: no system sets
      : "skip"
  );

  // Fetch ALL schema-driven templates using audit system (system templates)
  const auditData = useQuery(
    api.auditTemplates.auditAllTemplates,
    sessionId ? {} : "skip"
  );

  // Fetch organization-specific templates (including copies from system)
  const orgTemplates = useQuery(
    api.templateOntology.getTemplatesForOrg,
    sessionId && organizationId
      ? { sessionId, organizationId }
      : "skip"
  );

  // Get only schema-driven templates (all types) - combine system + org templates
  const systemSchemaTemplates: AuditTemplate[] = [
    ...(auditData?.templates.schemaEmail || []),
    ...(auditData?.templates.pdf.filter((t: AuditTemplate) => t.hasSchema) || []),
  ];

  // Merge organization templates with system templates, dedupe by ID
  const allSchemaTemplates: AuditTemplate[] = [
    ...systemSchemaTemplates,
    ...((orgTemplates || []) as AuditTemplate[]).filter((orgT: AuditTemplate) =>
      !systemSchemaTemplates.some((sysT: AuditTemplate) => sysT._id === orgT._id)
    ),
  ];

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  if (templateSets === undefined || auditData === undefined || orgTemplates === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  if (templateSets.length === 0) {
    return (
      <div className="p-4 space-y-4">
        {/* Info: Using System Default as Fallback */}
        <div className="border-2 p-4" style={{ borderColor: "#3b82f6", background: "#eff6ff" }}>
          <div className="flex items-start gap-2">
            <CheckCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />
            <div>
              <h4 className="font-bold text-sm" style={{ color: "#1e40af" }}>
                Using System Default Template Set
              </h4>
              <p className="text-xs mt-1" style={{ color: "#1e3a8a" }}>
                Your organization is currently using the platform's default template set with all schema-driven templates.
                You can create your own custom template set to use different branding or template combinations.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowCopySystemModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded transition-colors"
            style={{
              backgroundColor: "var(--win95-highlight)",
              color: "white",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "color-mix(in srgb, var(--win95-highlight) 80%, black)",
            }}
          >
            <Copy size={14} />
            Copy System Default &amp; Customize
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded transition-colors"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              color: "var(--win95-text)",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "var(--win95-border)",
            }}
          >
            <Plus size={14} />
            Create From Scratch
          </button>
        </div>

        {showCreateModal && (
          <CreateTemplateSetModal
            onClose={() => setShowCreateModal(false)}
            sessionId={sessionId}
            organizationId={organizationId!}
            allTemplates={allSchemaTemplates}
          />
        )}

        {showCopySystemModal && (
          <CopySystemDefaultModal
            onClose={() => setShowCopySystemModal(false)}
            sessionId={sessionId}
            organizationId={organizationId!}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <Package size={16} />
            Template Set Configuration (v2.0)
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Bundle ANY schema-driven templates together for consistent branding. No limitations!
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded transition-colors"
          style={{
            backgroundColor: "var(--win95-highlight)",
            color: "white",
            borderWidth: "2px",
            borderStyle: "solid",
            borderColor: "color-mix(in srgb, var(--win95-highlight) 80%, black)",
          }}
        >
          <Plus size={14} />
          Create New Set
        </button>
      </div>

      {/* Template Sets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templateSets.map((set) => (
          <TemplateSetCard
            key={set._id}
            templateSet={set}
            allTemplates={allSchemaTemplates}
            sessionId={sessionId}
            organizationId={organizationId!}
          />
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTemplateSetModal
          onClose={() => setShowCreateModal(false)}
          sessionId={sessionId}
          organizationId={organizationId!}
          allTemplates={allSchemaTemplates}
        />
      )}
    </div>
  );
}

/**
 * Template Set Card (v2.0 - Shows flexible template list)
 */
function TemplateSetCard({
  templateSet,
  allTemplates,
  sessionId,
  organizationId,
}: {
  templateSet: TemplateSet;
  allTemplates: AuditTemplate[];
  sessionId: string;
  organizationId: Id<"organizations">;
}) {
  const props = templateSet.customProperties || {};
  const isDefault = props.isDefault || false;
  const version = props.version || "1.0";
  const tags = (props.tags as string[]) || [];

  // Get templates in this set (v2.0 format)
  const templatesList = props.templates || [];

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const deleteTemplateSet = useMutation(api.templateSetOntology.deleteTemplateSet);
  const setDefaultTemplateSet = useMutation(api.templateSetOntology.setDefaultTemplateSet);

  const handleSetAsDefault = async () => {
    try {
      setIsSettingDefault(true);
      setSaveError(null);

      await setDefaultTemplateSet({
        sessionId,
        setId: templateSet._id as Id<"objects">,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Failed to set as default:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to set as default");
      setTimeout(() => setSaveError(null), 3000);
    } finally {
      setIsSettingDefault(false);
    }
  };

  // Get template details by ID
  const getTemplateName = (templateId: string) => {
    const template = allTemplates.find((t) => t._id === templateId);
    return template ? template.name : "Unknown Template";
  };

  const getTemplateType = (templateId: string) => {
    const template = allTemplates.find((t) => t._id === templateId);
    if (!template) return "unknown";
    return template.subtype || template.category || "other";
  };

  return (
    <div
      className="border-2 p-4 rounded-lg transition-shadow"
      style={{
        borderColor: isDefault ? "var(--win95-highlight)" : "var(--win95-border)",
        backgroundColor: "var(--win95-bg)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isDefault ? (
            <Star size={16} style={{ color: "#f59e0b", fill: "#f59e0b" }} />
          ) : (
            <Package size={16} style={{ color: "var(--neutral-gray)" }} />
          )}
          <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            {templateSet.name}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && <CheckCircle size={14} style={{ color: "var(--success)" }} />}
          {isDefault && (
            <span
              className="text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: "#fffbeb",
                color: "#92400e",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "#fde68a",
              }}
            >
              Default
            </span>
          )}
          <span
            className="text-xs px-2 py-1 rounded font-mono"
            style={{
              backgroundColor: version === "2.0" ? "#dcfce7" : "var(--win95-bg-light)",
              color: version === "2.0" ? "#166534" : "var(--neutral-gray)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: version === "2.0" ? "#86efac" : "var(--win95-border)",
            }}
          >
            v{version}
          </span>
        </div>
      </div>

      {/* Description */}
      {templateSet.description && (
        <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
          {templateSet.description}
        </p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: "var(--win95-bg-light)",
                color: "var(--win95-text)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "var(--win95-border)",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Error */}
      {saveError && (
        <div
          className="mb-3 p-2 rounded text-xs"
          style={{
            backgroundColor: "color-mix(in srgb, var(--error) 10%, white)",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "var(--error)",
            color: "color-mix(in srgb, var(--error) 60%, black)",
          }}
        >
          {saveError}
        </div>
      )}

      {/* Templates List (v2.0) */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
          Templates in Set ({templatesList.length}):
        </div>
        {templatesList.length === 0 ? (
          <p className="text-xs italic" style={{ color: "var(--neutral-gray)" }}>
            No templates added yet
          </p>
        ) : (
          <div className="space-y-1">
            {templatesList.map((item: TemplateSetItem, idx: number) => {
              const type = item.templateType || getTemplateType(item.templateId);
              const icon = getTemplateTypeIcon(type);
              const name = getTemplateName(item.templateId);

              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs p-2 rounded"
                  style={{
                    backgroundColor: "var(--win95-bg-light)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: "var(--win95-border)",
                  }}
                >
                  <span>{icon}</span>
                  <span style={{ color: "var(--win95-text)" }} className="flex-1">
                    {name}
                  </span>
                  {item.isRequired && (
                    <span
                      className="text-xs px-1 rounded"
                      style={{ backgroundColor: "#fef2f2", color: "#991b1b" }}
                    >
                      Required
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 text-xs px-3 py-1 rounded transition-colors"
            style={{
              backgroundColor: "var(--win95-highlight)",
              color: "white",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "color-mix(in srgb, var(--win95-highlight) 80%, black)",
            }}
          >
            <Edit size={12} />
            Edit Templates
          </button>

          {!isDefault && (
            <button
              onClick={handleSetAsDefault}
              disabled={isSettingDefault}
              className="flex items-center gap-2 text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "#f59e0b",
                color: "white",
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "#d97706",
              }}
            >
              {isSettingDefault ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Setting...
                </>
              ) : (
                <>
                  <Star size={12} />
                  Set as Default
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-xs px-3 py-1 rounded transition-colors"
            style={{
              backgroundColor: "var(--error)",
              color: "white",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "color-mix(in srgb, var(--error) 80%, black)",
            }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          templateSetName={templateSet.name}
          isDefault={isDefault}
          onConfirm={async () => {
            try {
              await deleteTemplateSet({
                sessionId,
                setId: templateSet._id as Id<"objects">,
              });
              setShowDeleteConfirm(false);
            } catch (error) {
              console.error("Failed to delete:", error);
              setSaveError(error instanceof Error ? error.message : "Failed to delete");
              setShowDeleteConfirm(false);
              setTimeout(() => setSaveError(null), 3000);
            }
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditTemplateSetModal
          templateSet={templateSet}
          allTemplates={allTemplates}
          sessionId={sessionId}
          organizationId={organizationId!}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}

/**
 * Create Template Set Modal (v2.0 - Flexible)
 */
function CreateTemplateSetModal({
  onClose,
  sessionId,
  organizationId,
  allTemplates,
}: {
  onClose: () => void;
  sessionId: string;
  organizationId: Id<"organizations">;
  allTemplates: AuditTemplate[];
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: "",
    isDefault: false,
  });
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTemplateSet = useMutation(api.templateSetOntology.createTemplateSet);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    if (selectedTemplates.length === 0) {
      setError("Please select at least one template");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Build v2.0 templates array
      const templates = selectedTemplates.map((templateId, idx) => {
        const template = allTemplates.find((t) => t._id === templateId);
        return {
          templateId: templateId as Id<"objects">,
          templateType: template?.subtype || template?.category || "other",
          isRequired: false,
          displayOrder: idx + 1,
        };
      });

      await createTemplateSet({
        sessionId,
        organizationId: organizationId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        templates,
        tags: tags.length > 0 ? tags : undefined,
        isDefault: formData.isDefault,
      });

      onClose();
    } catch (err) {
      console.error("Failed to create template set:", err);
      setError(err instanceof Error ? err.message : "Failed to create template set");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="border-2 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <Plus size={16} />
            Create New Template Set (v2.0)
          </h3>
          <button onClick={onClose} disabled={isSubmitting}>
            <X size={20} style={{ color: "var(--neutral-gray)" }} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div
              className="p-3 rounded text-xs"
              style={{
                backgroundColor: "color-mix(in srgb, var(--error) 10%, white)",
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "var(--error)",
                color: "color-mix(in srgb, var(--error) 60%, black)",
              }}
            >
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Name <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., VIP Premium Set"
              disabled={isSubmitting}
              className="w-full text-xs px-3 py-2 rounded disabled:opacity-50"
              style={{
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "var(--win95-border)",
                backgroundColor: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this template set..."
              rows={2}
              disabled={isSubmitting}
              className="w-full text-xs px-3 py-2 rounded disabled:opacity-50"
              style={{
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "var(--win95-border)",
                backgroundColor: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
            />
          </div>

          {/* Templates Selection */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              Select Templates <span style={{ color: "var(--error)" }}>*</span> ({selectedTemplates.length} selected)
            </label>
            <div
              className="border-2 rounded max-h-64 overflow-y-auto"
              style={{ borderColor: "var(--win95-border)" }}
            >
              {allTemplates.length === 0 ? (
                <p className="text-xs p-4 text-center" style={{ color: "var(--neutral-gray)" }}>
                  No schema-driven templates found
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--win95-border-light)" }}>
                  {allTemplates.map((template) => {
                    const isSelected = selectedTemplates.includes(template._id);
                    const type = template.subtype || template.category || "other";

                    return (
                      <button
                        key={template._id}
                        type="button"
                        onClick={() => toggleTemplate(template._id)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
                        style={{
                          backgroundColor: isSelected ? "color-mix(in srgb, var(--win95-highlight) 10%, white)" : "transparent",
                        }}
                      >
                        <div
                          className="w-5 h-5 border-2 flex items-center justify-center"
                          style={{
                            borderColor: "var(--win95-border)",
                            backgroundColor: isSelected ? "#22c55e" : "transparent",
                          }}
                        >
                          {isSelected && <Check size={14} style={{ color: "white" }} />}
                        </div>
                        <span className="text-xs inline-flex">{getTemplateTypeIcon(type)}</span>
                        <div className="flex-1">
                          <div className="text-xs font-medium" style={{ color: "var(--win95-text)" }}>
                            {template.name}
                          </div>
                          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                            {template.code} • {type}
                          </div>
                        </div>
                        <CheckCircle size={12} style={{ color: "#10b981" }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="vip, premium, luxury (comma-separated)"
              disabled={isSubmitting}
              className="w-full text-xs px-3 py-2 rounded disabled:opacity-50"
              style={{
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "var(--win95-border)",
                backgroundColor: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
            />
          </div>

          {/* Set as Default */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              disabled={isSubmitting}
              className="w-4 h-4"
            />
            <label htmlFor="isDefault" className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
              Set as organization default
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--win95-highlight)",
                color: "white",
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "color-mix(in srgb, var(--win95-highlight) 80%, black)",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  Create Template Set
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--win95-bg-light)",
                color: "var(--win95-text)",
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "var(--win95-border)",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Edit Template Set Modal (v2.0)
 */
function EditTemplateSetModal({
  templateSet,
  allTemplates,
  sessionId,
  organizationId,
  onClose,
}: {
  templateSet: TemplateSet;
  allTemplates: AuditTemplate[];
  sessionId: string;
  organizationId: Id<"organizations">;
  onClose: () => void;
}) {
  void organizationId; // Preserved for future org-scoped template management
  const props = templateSet.customProperties || {};
  const existingTemplates = props.templates || [];

  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(
    existingTemplates.map((t: TemplateSetItem) => t.templateId)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTemplateSet = useMutation(api.templateSetOntology.updateTemplateSet);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTemplates.length === 0) {
      setError("Please select at least one template");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Build v2.0 templates array
      const templates = selectedTemplates.map((templateId, idx) => {
        const template = allTemplates.find((t) => t._id === templateId);
        return {
          templateId: templateId as Id<"objects">,
          templateType: template?.subtype || template?.category || "other",
          isRequired: false,
          displayOrder: idx + 1,
        };
      });

      await updateTemplateSet({
        sessionId,
        setId: templateSet._id as Id<"objects">,
        templates,
      });

      onClose();
    } catch (err) {
      console.error("Failed to update template set:", err);
      setError(err instanceof Error ? err.message : "Failed to update template set");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="border-2 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <Edit size={16} />
            Edit Templates - {templateSet.name}
          </h3>
          <button onClick={onClose} disabled={isSubmitting}>
            <X size={20} style={{ color: "var(--neutral-gray)" }} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div
              className="p-3 rounded text-xs"
              style={{
                backgroundColor: "color-mix(in srgb, var(--error) 10%, white)",
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "var(--error)",
                color: "color-mix(in srgb, var(--error) 60%, black)",
              }}
            >
              {error}
            </div>
          )}

          {/* Templates Selection */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              Select Templates ({selectedTemplates.length} selected)
            </label>
            <div
              className="border-2 rounded max-h-96 overflow-y-auto"
              style={{ borderColor: "var(--win95-border)" }}
            >
              <div className="divide-y" style={{ borderColor: "var(--win95-border-light)" }}>
                {allTemplates.map((template) => {
                  const isSelected = selectedTemplates.includes(template._id);
                  const type = template.subtype || template.category || "other";

                  return (
                    <button
                      key={template._id}
                      type="button"
                      onClick={() => toggleTemplate(template._id)}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
                      style={{
                        backgroundColor: isSelected ? "color-mix(in srgb, var(--win95-highlight) 10%, white)" : "transparent",
                      }}
                    >
                      <div
                        className="w-5 h-5 border-2 flex items-center justify-center"
                        style={{
                          borderColor: "var(--win95-border)",
                          backgroundColor: isSelected ? "#22c55e" : "transparent",
                        }}
                      >
                        {isSelected && <Check size={14} style={{ color: "white" }} />}
                      </div>
                      <span className="text-xs inline-flex">{getTemplateTypeIcon(type)}</span>
                      <div className="flex-1">
                        <div className="text-xs font-medium" style={{ color: "var(--win95-text)" }}>
                          {template.name}
                        </div>
                        <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {template.code} • {type}
                        </div>
                      </div>
                      <CheckCircle size={12} style={{ color: "#10b981" }} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--win95-highlight)",
                color: "white",
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "color-mix(in srgb, var(--win95-highlight) 80%, black)",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  Save Changes
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--win95-bg-light)",
                color: "var(--win95-text)",
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "var(--win95-border)",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Delete Confirmation Modal
 */
function DeleteConfirmModal({
  templateSetName,
  isDefault,
  onConfirm,
  onCancel,
}: {
  templateSetName: string;
  isDefault: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="border-2 rounded-lg shadow-xl max-w-md w-full"
        style={{
          backgroundColor: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b-2"
          style={{
            borderColor: "var(--win95-border)",
            backgroundColor: "color-mix(in srgb, var(--error) 10%, white)",
          }}
        >
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "color-mix(in srgb, var(--error) 80%, black)" }}>
            <AlertCircle size={16} />
            Confirm Deletion
          </h3>
          <button onClick={onCancel} disabled={isDeleting}>
            <X size={20} style={{ color: "var(--neutral-gray)" }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <p className="text-sm" style={{ color: "var(--win95-text)" }}>
            Are you sure you want to delete the template set:
          </p>
          <div
            className="p-3 rounded"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "var(--win95-border)",
            }}
          >
            <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
              {templateSetName}
            </p>
          </div>

          {isDefault && (
            <div className="p-3 rounded" style={{ backgroundColor: "#fffbeb", borderWidth: "2px", borderStyle: "solid", borderColor: "#fde68a" }}>
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: "#78350f" }}>
                    Warning: Default Template Set
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#92400e" }}>
                    This is the default template set. Deleting it may affect organizations.
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            This action cannot be undone. The template set will be soft-deleted.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--error)",
              color: "white",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "color-mix(in srgb, var(--error) 80%, black)",
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Yes, Delete
              </>
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold rounded transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              color: "var(--win95-text)",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "var(--win95-border)",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Copy System Default Modal (Security Feature)
 *
 * Allows organization owners to copy the System Default template set
 * and customize it without modifying the system-level defaults.
 */
function CopySystemDefaultModal({
  onClose,
  sessionId,
  organizationId,
}: {
  onClose: () => void;
  sessionId: string;
  organizationId: Id<"organizations">;
}) {
  const [formData, setFormData] = useState({
    name: "My Custom Template Set",
    setAsDefault: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyTemplateSet = useMutation(api.templateSetOntology.copyTemplateSet);

  // Query to find the System Default template set
  const systemDefaultSet = useQuery(
    api.templateSetOntology.getSystemDefaultTemplateSet,
    sessionId ? { sessionId } : "skip"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    if (!systemDefaultSet) {
      setError("System default template set not found");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await copyTemplateSet({
        sessionId,
        sourceSetId: systemDefaultSet._id as Id<"objects">,
        targetOrganizationId: organizationId,
        name: formData.name.trim(),
        setAsDefault: formData.setAsDefault,
      });

      onClose();
    } catch (err) {
      console.error("Failed to copy template set:", err);
      setError(err instanceof Error ? err.message : "Failed to copy template set");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (systemDefaultSet === undefined) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="flex items-center justify-center p-8">
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
        </div>
      </div>
    );
  }

  if (!systemDefaultSet) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div
          className="border-2 rounded-lg shadow-xl max-w-md w-full p-4"
          style={{
            backgroundColor: "var(--win95-bg)",
            borderColor: "var(--win95-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={20} style={{ color: "var(--error)" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
              System Default Not Found
            </h3>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
            The system default template set could not be found. Please contact support.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              color: "var(--win95-text)",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "var(--win95-border)",
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const templateCount = systemDefaultSet.customProperties?.templates?.length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="border-2 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <Copy size={16} />
            Copy System Default Template Set
          </h3>
          <button onClick={onClose} disabled={isSubmitting}>
            <X size={20} style={{ color: "var(--neutral-gray)" }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="p-4 space-y-4">
            {/* Info about what's being copied */}
            <div className="border-2 p-4" style={{ borderColor: "#3b82f6", background: "#eff6ff" }}>
              <div className="flex items-start gap-2">
                <CheckCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />
                <div>
                  <h4 className="font-bold text-sm" style={{ color: "#1e40af" }}>
                    {systemDefaultSet.name}
                  </h4>
                  <p className="text-xs mt-1" style={{ color: "#1e3a8a" }}>
                    {systemDefaultSet.description}
                  </p>
                  <p className="text-xs mt-2 font-bold" style={{ color: "#1e40af" }}>
                    Includes {templateCount} schema-driven templates
                  </p>
                </div>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                Custom Name for Your Copy
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2 rounded"
                style={{
                  backgroundColor: "var(--win95-bg)",
                  borderColor: "var(--win95-border)",
                  color: "var(--win95-text)",
                }}
                placeholder="My Custom Template Set"
                disabled={isSubmitting}
              />
            </div>

            {/* Set as Default Checkbox */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="setAsDefault"
                checked={formData.setAsDefault}
                onChange={(e) => setFormData({ ...formData, setAsDefault: e.target.checked })}
                disabled={isSubmitting}
              />
              <label htmlFor="setAsDefault" className="text-xs" style={{ color: "var(--win95-text)" }}>
                <span className="font-bold">Set as organization default</span>
                <br />
                <span style={{ color: "var(--neutral-gray)" }}>
                  Use this template set for all new products and checkouts
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded" style={{ backgroundColor: "#fef2f2", borderWidth: "2px", borderStyle: "solid", borderColor: "#fca5a5" }}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--error)" }} />
                  <p className="text-xs" style={{ color: "#7f1d1d" }}>
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Info about what happens next */}
            <div className="p-3 rounded" style={{ backgroundColor: "#fffbeb", borderWidth: "2px", borderStyle: "solid", borderColor: "#fde68a" }}>
              <div className="flex items-start gap-2">
                <CheckCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: "#78350f" }}>
                    What happens next:
                  </p>
                  <ul className="text-xs mt-1 space-y-1" style={{ color: "#92400e" }}>
                    <li>• All {templateCount} templates will be copied to your organization</li>
                    <li>• You can customize branding, colors, and content</li>
                    <li>• System default remains unchanged</li>
                    <li>• Your copy will be used for all future emails and PDFs</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--win95-highlight)",
                color: "white",
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "color-mix(in srgb, var(--win95-highlight) 80%, black)",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Copying Templates...
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy & Customize
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--win95-bg-light)",
                color: "var(--win95-text)",
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "var(--win95-border)",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
