"use client";

import { useState } from "react";
import { X, Package, CheckCircle, FileText, Mail, Loader2, CircleCheckBig } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { TemplateCard } from "./window-content/templates-window/template-card";
import { TemplatePreviewModal } from "./template-preview-modal";

interface TemplateSetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateSetId: Id<"objects">;
  onUseSet?: () => void;
  t: (key: string) => string; // Translation function passed from parent
}

/**
 * Template Set Preview Modal
 *
 * Shows all 3 templates (ticket, invoice, email) side-by-side for preview.
 * Allows users to see the complete template set before using it.
 *
 * Layout:
 * ```
 * ┌─ VIP Premium Set Preview ──────────────────────────────┐
 * │                                                         │
 * │  📦 VIP Premium Set                                     │
 * │  Luxury event suite for premium customers              │
 * │                                                         │
 * │  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
 * │  │ 🎫 Ticket  │  │ 💰 Invoice │  │ 📧 Email   │       │
 * │  │            │  │            │  │            │       │
 * │  │  [Large    │  │  [Large    │  │  [Large    │       │
 * │  │   Preview] │  │   Preview] │  │   Preview] │       │
 * │  │            │  │            │  │            │       │
 * │  └────────────┘  └────────────┘  └────────────┘       │
 * │                                                         │
 * │  [Use This Set]  [Close]                               │
 * └─────────────────────────────────────────────────────────┘
 * ```
 */
export function TemplateSetPreviewModal({
  isOpen,
  onClose,
  templateSetId,
  onUseSet,
  t,
}: TemplateSetPreviewModalProps) {
  useAuth(); // For authenticated queries
  const [individualTemplatePreview, setIndividualTemplatePreview] = useState<{
    code: string;
    type: "email" | "pdf";
  } | null>(null);

  // Fetch template set details with ALL linked templates (v2.0)
  const templateSetData = useQuery(
    api.templateSetQueries.getTemplateSetWithAllTemplates,
    isOpen ? { setId: templateSetId } : "skip"
  );

  const templateSet = templateSetData?.set;
  const emailTemplates = templateSetData?.emailTemplates;
  const pdfTemplates = templateSetData?.pdfTemplates;
  const counts = templateSetData?.counts;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: "var(--modal-overlay-bg)" }}
    >
      <div
        className="border-2 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: "var(--shell-surface)",
          borderColor: "var(--shell-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b-2 sticky top-0 z-10"
          style={{
            backgroundColor: "var(--shell-surface)",
            borderColor: "var(--shell-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <Package size={20} style={{ color: "var(--shell-accent)" }} />
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
                {templateSet?.name || t("ui.templates.template_set.preview.title")}
              </h3>
              {templateSet?.description && (
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  {templateSet.description}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: "var(--neutral-gray)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--shell-text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--neutral-gray)")}
          >
            <X size={24} />
          </button>
        </div>

        {/* Template Content */}
        <div className="p-6">
          {(
            <div className="space-y-6">
              {/* Header with counts */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
                  All Templates in this Set ({counts?.total || 0})
                </h4>
                {templateSet?.customProperties?.version && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: "color-mix(in srgb, var(--shell-accent) 10%, var(--shell-surface))", color: "var(--shell-accent)" }}>
                      v{templateSet.customProperties.version}
                    </span>
                    {counts && counts.required > 0 && (
                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "var(--notification-success-bg)", color: "var(--notification-success-text)" }}>
                        <CircleCheckBig size={12} className="inline mr-1" />
                        {counts.required} Required
                      </span>
                    )}
                    {counts && counts.optional > 0 && (
                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "var(--shell-surface-elevated)", color: "var(--shell-text)" }}>
                        + {counts.optional} Optional
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Email Templates Grid */}
              {emailTemplates && emailTemplates.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Mail size={18} style={{ color: "var(--shell-accent)" }} />
                    <h5 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
                      Email Templates ({emailTemplates.length})
                    </h5>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {emailTemplates.map((item, index) => {
                      const template = item.template;
                      return (
                        <div key={`email-${template._id}-${index}`} className="relative">
                          {item.isRequired && (
                            <div className="absolute top-2 right-2 z-10">
                              <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: "var(--success)", color: "var(--shell-titlebar-text)" }}>
                                Required
                              </span>
                            </div>
                          )}
                          <TemplateCard
                            template={template}
                            onPreview={() => {
                              const code = template.customProperties?.code || template.customProperties?.templateCode;
                              if (code) {
                                setIndividualTemplatePreview({ code, type: "email" });
                              }
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PDF Templates Grid */}
              {pdfTemplates && pdfTemplates.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={18} style={{ color: "var(--shell-accent)" }} />
                    <h5 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
                      PDF Templates ({pdfTemplates.length})
                    </h5>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {pdfTemplates.map((item, index) => {
                      const template = item.template;
                      return (
                        <div key={`pdf-${template._id}-${index}`} className="relative">
                          {item.isRequired && (
                            <div className="absolute top-2 right-2 z-10">
                              <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: "var(--success)", color: "var(--shell-titlebar-text)" }}>
                                Required
                              </span>
                            </div>
                          )}
                          <TemplateCard
                            template={template}
                            onPreview={() => {
                              const code = template.customProperties?.code || template.customProperties?.templateCode;
                              if (code) {
                                setIndividualTemplatePreview({ code, type: "pdf" });
                              }
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {counts && counts.total === 0 && (
                <div className="text-center py-12 border-2 rounded" style={{ borderColor: "var(--shell-border)", backgroundColor: "var(--shell-surface-elevated)" }}>
                  <Package size={48} className="mx-auto mb-4" style={{ color: "var(--neutral-gray)" }} />
                  <p className="text-sm font-bold mb-2" style={{ color: "var(--shell-text)" }}>No Templates in Set</p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>This template set doesn't have any templates yet.</p>
                </div>
              )}

              {/* Loading state */}
              {!templateSetData && (
                <div className="text-center py-12">
                  <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: "var(--shell-accent)" }} />
                  <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>Loading templates...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="flex gap-3 p-4 border-t-2 sticky bottom-0"
          style={{
            backgroundColor: "var(--shell-surface)",
            borderColor: "var(--shell-border)",
          }}
        >
          {onUseSet && (
            <button
              onClick={onUseSet}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded transition-colors"
              style={{
                backgroundColor: "var(--shell-accent)",
                color: "var(--shell-titlebar-text)",
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "color-mix(in srgb, var(--shell-accent) 80%, black)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--shell-accent) 90%, black)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--shell-accent)";
              }}
            >
              <CheckCircle size={16} />
              {t("ui.templates.template_set.preview.button.use_set")}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold rounded transition-colors"
            style={{
              backgroundColor: "var(--shell-surface-elevated)",
              color: "var(--shell-text)",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "var(--shell-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--shell-surface-elevated) 95%, black)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--shell-surface-elevated)";
            }}
          >
            {t("ui.templates.preview.button.close")}
          </button>
        </div>
      </div>

      {/* Individual Template Preview Modal */}
      {individualTemplatePreview && (
        <TemplatePreviewModal
          isOpen={true}
          onClose={() => setIndividualTemplatePreview(null)}
          templateCode={individualTemplatePreview.code}
          templateType={individualTemplatePreview.type}
        />
      )}
    </div>
  );
}
