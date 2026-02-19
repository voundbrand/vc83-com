"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, Plus, X, CheckCircle, FileText, Mail, Trash2 } from "lucide-react";

interface TemplateSetEditorV2Props {
  sessionId: string;
  setId: Id<"objects">;
  systemOrgId: Id<"organizations">;
  onClose: () => void;
}

/**
 * Template Set Editor v2.0
 *
 * Flexible multi-template editor with:
 * - Visual list of selected templates
 * - Add/remove templates
 * - Required/Optional toggles
 * - Beautiful v2.0 UI
 */
export function TemplateSetEditorV2({
  sessionId,
  setId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  systemOrgId,
  onClose,
}: TemplateSetEditorV2Props) {
  const [showAddTemplates, setShowAddTemplates] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch template set with all templates (v2.0)
  const templateSetData = useQuery(
    api.templateSetQueries.getTemplateSetWithAllTemplates,
    { setId }
  );

  // Fetch all available templates
  const allEmailTemplates = useQuery(
    api.emailTemplateOntology.getAllSystemEmailTemplates,
    {}
  );

  const allPdfTemplates = useQuery(
    api.pdfTemplateAvailability.getAllSystemPdfTemplates,
    { sessionId }
  );

  // Mutations
  const addTemplates = useMutation(api.templateSetOntology.addTemplatesToSet);
  const removeTemplates = useMutation(api.templateSetOntology.removeTemplatesFromSet);
  const updateTemplate = useMutation(api.templateSetOntology.updateTemplateInSet);

  const set = templateSetData?.set;
  const currentTemplates = templateSetData?.templates || [];
  const emailTemplates = templateSetData?.emailTemplates || [];
  const pdfTemplates = templateSetData?.pdfTemplates || [];

  // Get template IDs already in set
  const templatesInSet = new Set(currentTemplates.map(t => t.template._id));

  // Filter available templates (not already in set)
  const availableEmailTemplates = (allEmailTemplates || []).filter(
    t => !templatesInSet.has(t._id)
  );
  const availablePdfTemplates = (allPdfTemplates || []).filter(
    t => !templatesInSet.has(t._id)
  );

  const handleAddTemplates = async () => {
    if (selectedTemplates.size === 0) return;

    try {
      setIsUpdating(true);

      // Build templates array
      const templates = Array.from(selectedTemplates).map(templateId => {
        const emailTemplate = allEmailTemplates?.find(t => t._id === templateId);
        const pdfTemplate = allPdfTemplates?.find(t => t._id === templateId);

        let templateType = "unknown";
        if (emailTemplate) {
          const category = emailTemplate.customProperties?.category || "email";
          templateType = category;
        } else if (pdfTemplate) {
          const category = pdfTemplate.customProperties?.category || "pdf";
          templateType = category;
        }

        return {
          templateId: templateId as Id<"objects">,
          templateType,
          isRequired: false, // Default to optional
        };
      });

      await addTemplates({
        sessionId,
        setId,
        templates,
      });

      setSelectedTemplates(new Set());
      setShowAddTemplates(false);
    } catch (error) {
      console.error("Failed to add templates:", error);
      alert(error instanceof Error ? error.message : "Failed to add templates");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveTemplate = async (templateId: Id<"objects">) => {
    try {
      setIsUpdating(true);
      await removeTemplates({
        sessionId,
        setId,
        templateIds: [templateId],
      });
    } catch (error) {
      console.error("Failed to remove template:", error);
      alert(error instanceof Error ? error.message : "Failed to remove template");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleRequired = async (templateId: Id<"objects">, currentRequired: boolean) => {
    try {
      setIsUpdating(true);
      await updateTemplate({
        sessionId,
        setId,
        templateId,
        isRequired: !currentRequired,
      });
    } catch (error) {
      console.error("Failed to update template:", error);
      alert(error instanceof Error ? error.message : "Failed to update template");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!templateSetData || !allEmailTemplates || !allPdfTemplates) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--tone-accent)" }} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            {set?.name}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            v2.0 • {currentTemplates.length} templates
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          style={{ color: "var(--neutral-gray)" }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Current Templates List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
            Templates in Set
          </h4>
          <button
            onClick={() => setShowAddTemplates(true)}
            disabled={isUpdating}
            className="flex items-center gap-1 px-2 py-1 text-xs font-bold rounded transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--tone-accent)",
              color: "white",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "color-mix(in srgb, var(--tone-accent) 80%, black)",
            }}
          >
            <Plus size={12} />
            Add Templates
          </button>
        </div>

        {currentTemplates.length === 0 ? (
          <div className="border-2 p-8 rounded text-center" style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--window-document-bg-elevated)" }}>
            <FileText size={32} className="mx-auto mb-2" style={{ color: "var(--neutral-gray)" }} />
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              No templates yet. Click "Add Templates" to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Email Templates */}
            {emailTemplates.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mail size={14} style={{ color: "var(--tone-accent)" }} />
                  <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                    Email Templates ({emailTemplates.length})
                  </span>
                </div>
                {emailTemplates.map((item) => (
                  <TemplateRow
                    key={item.template._id}
                    template={item.template}
                    isRequired={item.isRequired}
                    onToggleRequired={() => handleToggleRequired(item.template._id, item.isRequired)}
                    onRemove={() => handleRemoveTemplate(item.template._id)}
                    isUpdating={isUpdating}
                  />
                ))}
              </div>
            )}

            {/* PDF Templates */}
            {pdfTemplates.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} style={{ color: "var(--tone-accent)" }} />
                  <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                    PDF Templates ({pdfTemplates.length})
                  </span>
                </div>
                {pdfTemplates.map((item) => (
                  <TemplateRow
                    key={item.template._id}
                    template={item.template}
                    isRequired={item.isRequired}
                    onToggleRequired={() => handleToggleRequired(item.template._id, item.isRequired)}
                    onRemove={() => handleRemoveTemplate(item.template._id)}
                    isUpdating={isUpdating}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Templates Modal */}
      {showAddTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white border-2 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
            style={{ borderColor: "var(--window-document-border)" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b-2 sticky top-0 bg-white z-10" style={{ borderColor: "var(--window-document-border)" }}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Plus size={16} />
                Add Templates to Set
              </h3>
              <button
                onClick={() => setShowAddTemplates(false)}
                style={{ color: "var(--neutral-gray)" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Template Selection */}
            <div className="p-4 space-y-4">
              {/* Email Templates */}
              {availableEmailTemplates.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Mail size={18} style={{ color: "var(--tone-accent)" }} />
                    <h5 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                      Email Templates ({availableEmailTemplates.length})
                    </h5>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {availableEmailTemplates.map((template) => (
                      <TemplateCheckbox
                        key={template._id}
                        template={template}
                        isSelected={selectedTemplates.has(template._id)}
                        onToggle={() => {
                          const newSet = new Set(selectedTemplates);
                          if (newSet.has(template._id)) {
                            newSet.delete(template._id);
                          } else {
                            newSet.add(template._id);
                          }
                          setSelectedTemplates(newSet);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* PDF Templates */}
              {availablePdfTemplates.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={18} style={{ color: "var(--tone-accent)" }} />
                    <h5 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                      PDF Templates ({availablePdfTemplates.length})
                    </h5>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {availablePdfTemplates.map((template) => (
                      <TemplateCheckbox
                        key={template._id}
                        template={template}
                        isSelected={selectedTemplates.has(template._id)}
                        onToggle={() => {
                          const newSet = new Set(selectedTemplates);
                          if (newSet.has(template._id)) {
                            newSet.delete(template._id);
                          } else {
                            newSet.add(template._id);
                          }
                          setSelectedTemplates(newSet);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {availableEmailTemplates.length === 0 && availablePdfTemplates.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle size={48} className="mx-auto mb-4" style={{ color: "var(--success)" }} />
                  <p className="text-sm font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                    All Templates Added!
                  </p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    This set already includes all available templates.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t-2 sticky bottom-0 bg-white" style={{ borderColor: "var(--window-document-border)" }}>
              <button
                onClick={handleAddTemplates}
                disabled={selectedTemplates.size === 0 || isUpdating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: "var(--tone-accent)",
                  color: "white",
                  borderWidth: "2px",
                  borderStyle: "solid",
                  borderColor: "color-mix(in srgb, var(--tone-accent) 80%, black)",
                }}
              >
                {isUpdating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} />
                    Add {selectedTemplates.size} Template{selectedTemplates.size !== 1 ? "s" : ""}
                  </>
                )}
              </button>
              <button
                onClick={() => setShowAddTemplates(false)}
                disabled={isUpdating}
                className="px-4 py-2 text-xs font-bold rounded transition-colors"
                style={{
                  backgroundColor: "var(--window-document-bg-elevated)",
                  color: "var(--window-document-text)",
                  borderWidth: "2px",
                  borderStyle: "solid",
                  borderColor: "var(--window-document-border)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Template Row Component
function TemplateRow({
  template,
  isRequired,
  onToggleRequired,
  onRemove,
  isUpdating,
}: {
  template: { _id: Id<"objects">; name: string; customProperties?: { category?: string } };
  isRequired: boolean;
  onToggleRequired: () => void;
  onRemove: () => void;
  isUpdating: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between p-3 border-2 rounded"
      style={{
        borderColor: "var(--window-document-border)",
        backgroundColor: "var(--window-document-bg-elevated)",
      }}
    >
      <div className="flex items-center gap-3 flex-1">
        <span className="text-sm" style={{ color: "var(--window-document-text)" }}>
          {template.name}
        </span>
        {template.customProperties?.category && (
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              backgroundColor: "var(--window-document-bg)",
              color: "var(--neutral-gray)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--window-document-border)",
            }}
          >
            {template.customProperties.category}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Required/Optional Toggle */}
        <button
          onClick={onToggleRequired}
          disabled={isUpdating}
          className="px-3 py-1 text-xs font-bold rounded transition-colors disabled:opacity-50"
          style={{
            backgroundColor: isRequired ? "var(--success)" : "var(--window-document-bg)",
            color: isRequired ? "white" : "var(--window-document-text)",
            borderWidth: "2px",
            borderStyle: "solid",
            borderColor: isRequired ? "var(--success)" : "var(--window-document-border)",
          }}
        >
          {isRequired ? "Required" : "Optional"}
        </button>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          disabled={isUpdating}
          className="p-1 rounded transition-colors disabled:opacity-50 hover:bg-red-100"
          style={{ color: "var(--error)" }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// Template Checkbox Component
function TemplateCheckbox({
  template,
  isSelected,
  onToggle,
}: {
  template: { _id: Id<"objects">; name: string; customProperties?: { category?: string } };
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className="flex items-center gap-2 p-2 border-2 rounded cursor-pointer transition-colors"
      style={{
        borderColor: isSelected ? "var(--tone-accent)" : "var(--window-document-border)",
        backgroundColor: isSelected ? "color-mix(in srgb, var(--tone-accent) 10%, white)" : "var(--window-document-bg)",
      }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="w-4 h-4"
      />
      <div className="flex-1">
        <div className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
          {template.name}
        </div>
        {template.customProperties?.category && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {template.customProperties.category}
          </div>
        )}
      </div>
    </label>
  );
}
