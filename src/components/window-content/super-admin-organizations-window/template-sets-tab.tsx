"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertCircle, Package, Star, CheckCircle, Plus, X, Trash2 } from "lucide-react";

/**
 * Template Sets Tab
 *
 * Super admin UI to view and manage template sets.
 * Phase 5: Set as Default functionality.
 */
export function TemplateSetsTab() {
  const { sessionId, isSuperAdmin } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get system organization by querying directly
  const systemOrg = useQuery(
    api.checkoutSessions.getOrganizationBySlug,
    { slug: "system" }
  );

  const systemOrgId = systemOrg?._id;

  // Fetch all template sets (system org only, no need for includeSystem since we're already querying system)
  const templateSets = useQuery(
    api.templateSetOntology.getTemplateSets,
    sessionId && systemOrgId
      ? { sessionId, organizationId: systemOrgId, includeSystem: false }
      : "skip"
  );

  // Fetch available templates for dropdowns
  const ticketTemplates = useQuery(
    api.pdfTemplateQueries.getPdfTemplatesByCategory,
    systemOrgId ? { category: "ticket", organizationId: systemOrgId } : "skip"
  );

  const invoiceTemplates = useQuery(
    api.pdfTemplateQueries.getPdfTemplatesByCategory,
    systemOrgId ? { category: "invoice", organizationId: systemOrgId } : "skip"
  );

  const emailTemplates = useQuery(
    api.emailTemplateOntology.getAllSystemEmailTemplates,
    {}
  );

  if (!sessionId || !isSuperAdmin) {
    return (
      <div className="p-4">
        <div className="border-2 p-4" style={{ borderColor: 'var(--error)', backgroundColor: 'color-mix(in srgb, var(--error) 10%, white)' }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
            <div>
              <h4 className="font-bold text-sm" style={{ color: 'color-mix(in srgb, var(--error) 80%, black)' }}>Super Admin Access Required</h4>
              <p className="text-xs mt-1" style={{ color: 'color-mix(in srgb, var(--error) 60%, black)' }}>
                You must be a super admin to manage template sets.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!systemOrgId || templateSets === undefined || ticketTemplates === undefined || invoiceTemplates === undefined || emailTemplates === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
      </div>
    );
  }

  if (templateSets.length === 0) {
    return (
      <div className="p-4">
        <div className="border-2 p-4" style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
            <div>
              <h4 className="font-bold text-sm" style={{ color: '#78350f' }}>No Template Sets Found</h4>
              <p className="text-xs mt-1" style={{ color: '#92400e' }}>
                No template sets have been created yet. Create your first template set to bundle ticket, invoice, and email templates together.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Package size={16} />
            Template Set Configuration
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            Manage template sets that bundle ticket, invoice, and email templates for consistent branding.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded transition-colors"
          style={{
            backgroundColor: 'var(--win95-highlight)',
            color: 'white',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: 'color-mix(in srgb, var(--win95-highlight) 80%, black)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--win95-highlight) 90%, black)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--win95-highlight)'}
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
            ticketTemplates={ticketTemplates}
            invoiceTemplates={invoiceTemplates}
            emailTemplates={emailTemplates}
            sessionId={sessionId}
          />
        ))}
      </div>

      {/* Create Template Set Modal */}
      {showCreateModal && (
        <CreateTemplateSetModal
          onClose={() => setShowCreateModal(false)}
          sessionId={sessionId}
          systemOrgId={systemOrgId}
          ticketTemplates={ticketTemplates}
          invoiceTemplates={invoiceTemplates}
          emailTemplates={emailTemplates}
        />
      )}
    </div>
  );
}

/**
 * Template Set Card Component
 *
 * Phase 5: Added Set as Default functionality.
 */
function TemplateSetCard({
  templateSet,
  ticketTemplates,
  invoiceTemplates,
  emailTemplates,
  sessionId,
}: {
  templateSet: {
    _id: string;
    name: string;
    description?: string;
    customProperties?: {
      ticketTemplateId?: string;
      invoiceTemplateId?: string;
      emailTemplateId?: string;
      isDefault?: boolean;
      tags?: string[];
    };
  };
  ticketTemplates: Array<{ _id: string; name: string }>;
  invoiceTemplates: Array<{ _id: string; name: string }>;
  emailTemplates: Array<{ _id: string; name: string }>;
  sessionId: string;
}) {
  const props = templateSet.customProperties || {};
  const isDefault = props.isDefault || false;
  const tags = (props.tags as string[]) || [];

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  const updateTemplateSet = useMutation(api.templateSetOntology.updateTemplateSet);
  const deleteTemplateSet = useMutation(api.templateSetOntology.deleteTemplateSet);
  const setDefaultTemplateSet = useMutation(api.templateSetOntology.setDefaultTemplateSet);

  const handleTemplateChange = async (
    templateType: "ticket" | "invoice" | "email",
    newTemplateId: string
  ) => {
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const updateArgs: {
        sessionId: string;
        setId: Id<"objects">;
        ticketTemplateId?: Id<"objects">;
        invoiceTemplateId?: Id<"objects">;
        emailTemplateId?: Id<"objects">;
      } = {
        sessionId,
        setId: templateSet._id as Id<"objects">,
      };

      if (templateType === "ticket") {
        updateArgs.ticketTemplateId = newTemplateId as Id<"objects">;
      } else if (templateType === "invoice") {
        updateArgs.invoiceTemplateId = newTemplateId as Id<"objects">;
      } else if (templateType === "email") {
        updateArgs.emailTemplateId = newTemplateId as Id<"objects">;
      }

      await updateTemplateSet(updateArgs);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Failed to update template set:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to update");
      setTimeout(() => setSaveError(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetAsDefault = async () => {
    try {
      setIsSettingDefault(true);
      setSaveError(null);
      setSaveSuccess(false);

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

  return (
    <div
      className="border-2 p-4 rounded-lg hover:shadow-md transition-shadow"
      style={{
        borderColor: isDefault ? "var(--win95-highlight)" : "var(--win95-border)",
        backgroundColor: "var(--win95-bg)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isDefault ? (
            <Star size={16} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
          ) : (
            <Package size={16} style={{ color: 'var(--neutral-gray)' }} />
          )}
          <h4 className="text-sm font-bold">{templateSet.name}</h4>
        </div>
        <div className="flex items-center gap-2">
          {(isSaving || isSettingDefault) && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />}
          {saveSuccess && <CheckCircle size={14} style={{ color: 'var(--success)' }} />}
          {isDefault && (
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#fffbeb', color: '#92400e', borderWidth: '1px', borderStyle: 'solid', borderColor: '#fde68a' }}>
              Default
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {templateSet.description && (
        <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>{templateSet.description}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--win95-bg-light)',
                color: 'var(--win95-text)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--win95-border)'
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Save Error */}
      {saveError && (
        <div className="mb-3 p-2 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--error) 10%, white)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--error)' }}>
          <p className="text-xs" style={{ color: 'color-mix(in srgb, var(--error) 60%, black)' }}>{saveError}</p>
        </div>
      )}

      {/* Template Assignments - Now with Dropdowns */}
      <div className="space-y-3 text-xs">
        {/* Ticket Template Dropdown */}
        <div>
          <label className="flex items-center gap-2 mb-1">
            <span style={{ color: 'var(--neutral-gray)' }}>🎫 Ticket:</span>
          </label>
          <select
            value={props.ticketTemplateId || ""}
            onChange={(e) => handleTemplateChange("ticket", e.target.value)}
            disabled={isSaving}
            className="w-full text-xs px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: 'var(--win95-border)',
              backgroundColor: 'var(--win95-bg)'
            }}
          >
            <option value="">Select ticket template...</option>
            {ticketTemplates.map((template) => (
              <option key={template._id} value={template._id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        {/* Invoice Template Dropdown */}
        <div>
          <label className="flex items-center gap-2 mb-1">
            <span style={{ color: 'var(--neutral-gray)' }}>💰 Invoice:</span>
          </label>
          <select
            value={props.invoiceTemplateId || ""}
            onChange={(e) => handleTemplateChange("invoice", e.target.value)}
            disabled={isSaving}
            className="w-full text-xs px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: 'var(--win95-border)',
              backgroundColor: 'var(--win95-bg)'
            }}
          >
            <option value="">Select invoice template...</option>
            {invoiceTemplates.map((template) => (
              <option key={template._id} value={template._id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        {/* Email Template Dropdown */}
        <div>
          <label className="flex items-center gap-2 mb-1">
            <span style={{ color: 'var(--neutral-gray)' }}>📧 Email:</span>
          </label>
          <select
            value={props.emailTemplateId || ""}
            onChange={(e) => handleTemplateChange("email", e.target.value)}
            disabled={isSaving}
            className="w-full text-xs px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: 'var(--win95-border)',
              backgroundColor: 'var(--win95-bg)'
            }}
          >
            <option value="">Select email template...</option>
            {emailTemplates.map((template) => (
              <option key={template._id} value={template._id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons - Phase 5: Set as Default enabled */}
      <div className="mt-4 pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
        <div className="flex gap-2">
          {!isDefault && (
            <button
              onClick={handleSetAsDefault}
              disabled={isSaving || isSettingDefault}
              className="flex items-center gap-2 text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: '#d97706'
              }}
              onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#d97706')}
              onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#f59e0b')}
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
            disabled={isSaving || isSettingDefault}
            className="flex items-center gap-2 text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--error)',
              color: 'white',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: 'color-mix(in srgb, var(--error) 80%, black)'
            }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--error) 90%, black)')}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--error)')}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
        {isDefault && (
          <p className="text-xs mt-2" style={{ color: '#f59e0b' }}>
            ⭐ This is the default template set
          </p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
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
              console.error("Failed to delete template set:", error);
              setSaveError(error instanceof Error ? error.message : "Failed to delete");
              setShowDeleteConfirm(false);
              setTimeout(() => setSaveError(null), 3000);
            }
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

/**
 * Create Template Set Modal
 *
 * Phase 3: Modal form for creating new template sets.
 */
function CreateTemplateSetModal({
  onClose,
  sessionId,
  systemOrgId,
  ticketTemplates,
  invoiceTemplates,
  emailTemplates,
}: {
  onClose: () => void;
  sessionId: string;
  systemOrgId: Id<"organizations">;
  ticketTemplates: Array<{ _id: string; name: string }>;
  invoiceTemplates: Array<{ _id: string; name: string }>;
  emailTemplates: Array<{ _id: string; name: string }>;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    ticketTemplateId: "",
    invoiceTemplateId: "",
    emailTemplateId: "",
    tags: "",
    isDefault: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTemplateSet = useMutation(api.templateSetOntology.createTemplateSet);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!formData.ticketTemplateId) {
      setError("Ticket template is required");
      return;
    }
    if (!formData.invoiceTemplateId) {
      setError("Invoice template is required");
      return;
    }
    if (!formData.emailTemplateId) {
      setError("Email template is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Parse tags (comma-separated)
      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      await createTemplateSet({
        sessionId,
        organizationId: systemOrgId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        ticketTemplateId: formData.ticketTemplateId as Id<"objects">,
        invoiceTemplateId: formData.invoiceTemplateId as Id<"objects">,
        emailTemplateId: formData.emailTemplateId as Id<"objects">,
        tags: tags.length > 0 ? tags : undefined,
        isDefault: formData.isDefault,
      });

      // Success - close modal
      onClose();
    } catch (err) {
      console.error("Failed to create template set:", err);
      setError(err instanceof Error ? err.message : "Failed to create template set");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white border-2 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ borderColor: "var(--win95-border)" }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Plus size={16} />
            Create New Template Set
          </h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{ color: 'var(--neutral-gray)' }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.color = 'var(--win95-text)')}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--neutral-gray)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--error) 10%, white)', borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--error)' }}>
              <p className="text-xs" style={{ color: 'color-mix(in srgb, var(--error) 60%, black)' }}>{error}</p>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold mb-1">
              Name <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., VIP Premium Set"
              disabled={isSubmitting}
              className="w-full text-xs px-3 py-2 rounded disabled:opacity-50"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'var(--win95-border)',
                backgroundColor: 'var(--win95-bg)'
              }}
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-bold mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this template set..."
              rows={3}
              disabled={isSubmitting}
              className="w-full text-xs px-3 py-2 rounded disabled:opacity-50"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'var(--win95-border)',
                backgroundColor: 'var(--win95-bg)'
              }}
            />
          </div>

          {/* Ticket Template Dropdown */}
          <div>
            <label className="block text-xs font-bold mb-1">
              🎫 Ticket Template <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select
              value={formData.ticketTemplateId}
              onChange={(e) => setFormData({ ...formData, ticketTemplateId: e.target.value })}
              disabled={isSubmitting}
              className="w-full text-xs px-3 py-2 rounded disabled:opacity-50"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'var(--win95-border)',
                backgroundColor: 'var(--win95-bg)'
              }}
            >
              <option value="">Select ticket template...</option>
              {ticketTemplates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Template Dropdown */}
          <div>
            <label className="block text-xs font-bold mb-1">
              💰 Invoice Template <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select
              value={formData.invoiceTemplateId}
              onChange={(e) => setFormData({ ...formData, invoiceTemplateId: e.target.value })}
              disabled={isSubmitting}
              className="w-full text-xs px-3 py-2 rounded disabled:opacity-50"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'var(--win95-border)',
                backgroundColor: 'var(--win95-bg)'
              }}
            >
              <option value="">Select invoice template...</option>
              {invoiceTemplates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Email Template Dropdown */}
          <div>
            <label className="block text-xs font-bold mb-1">
              📧 Email Template <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select
              value={formData.emailTemplateId}
              onChange={(e) => setFormData({ ...formData, emailTemplateId: e.target.value })}
              disabled={isSubmitting}
              className="w-full text-xs px-3 py-2 rounded disabled:opacity-50"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'var(--win95-border)',
                backgroundColor: 'var(--win95-bg)'
              }}
            >
              <option value="">Select email template...</option>
              {emailTemplates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags Field */}
          <div>
            <label className="block text-xs font-bold mb-1">Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., vip, premium, luxury (comma-separated)"
              disabled={isSubmitting}
              className="w-full text-xs px-3 py-2 rounded disabled:opacity-50"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'var(--win95-border)',
                backgroundColor: 'var(--win95-bg)'
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Comma-separated tags for organizing template sets
            </p>
          </div>

          {/* Set as Default Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              disabled={isSubmitting}
              className="w-4 h-4"
            />
            <label htmlFor="isDefault" className="text-xs font-bold">
              Set as organization default
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--win95-highlight)',
                color: 'white',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'color-mix(in srgb, var(--win95-highlight) 80%, black)'
              }}
              onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--win95-highlight) 90%, black)')}
              onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--win95-highlight)')}
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
                backgroundColor: 'var(--win95-bg-light)',
                color: 'var(--win95-text)',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: 'var(--win95-border)'
              }}
              onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--win95-bg-light) 95%, black)')}
              onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--win95-bg-light)')}
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
 *
 * Phase 4: Confirmation dialog before deleting a template set.
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
        className="bg-white border-2 rounded-lg shadow-xl max-w-md w-full"
        style={{ borderColor: "var(--win95-border)" }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b-2" style={{ borderColor: "var(--win95-border)", backgroundColor: 'color-mix(in srgb, var(--error) 10%, white)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'color-mix(in srgb, var(--error) 80%, black)' }}>
            <AlertCircle size={16} />
            Confirm Deletion
          </h3>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            style={{ color: 'var(--neutral-gray)' }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.color = 'var(--win95-text)')}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--neutral-gray)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          <p className="text-sm">
            Are you sure you want to delete the template set:
          </p>
          <div className="p-3 rounded" style={{ backgroundColor: 'var(--win95-bg-light)', borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--win95-border)' }}>
            <p className="text-sm font-bold">{templateSetName}</p>
          </div>

          {isDefault && (
            <div className="p-3 rounded" style={{ backgroundColor: '#fffbeb', borderWidth: '2px', borderStyle: 'solid', borderColor: '#fde68a' }}>
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: '#78350f' }}>Warning: Default Template Set</p>
                  <p className="text-xs mt-1" style={{ color: '#92400e' }}>
                    This is the default template set. Deleting it may cause issues with checkouts that don't have an explicit template set assigned.
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            This action cannot be undone. The template set will be soft-deleted and can no longer be used.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex gap-3 p-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--error)',
              color: 'white',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: 'color-mix(in srgb, var(--error) 80%, black)'
            }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--error) 90%, black)')}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--error)')}
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
              backgroundColor: 'var(--win95-bg-light)',
              color: 'var(--win95-text)',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: 'var(--win95-border)'
            }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--win95-bg-light) 95%, black)')}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--win95-bg-light)')}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
