"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { FileText, Plus, Edit, Trash2, Eye, Send, FileX, Loader2, ExternalLink, Code } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ConfirmationModal } from "@/components/confirmation-modal";

interface Form {
  _id: Id<"objects">;
  name: string;
  description?: string;
  subtype?: string;
  status?: string;
  customProperties?: Record<string, unknown> & {
    formSchema?: {
      fields?: unknown[];
    };
    stats?: {
      submissions?: number;
      views?: number;
    };
    publicUrl?: string;
  };
}

interface FormsListProps {
  forms: Form[];
  onCreateForm: () => void;
  onEditForm: (formId: string) => void;
  onEditSchema?: (formId: string) => void;
}

export function FormsList({ forms, onCreateForm, onEditForm, onEditSchema }: FormsListProps) {
  const { sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.forms");
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [publishingFormId, setPublishingFormId] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    formId: string;
    formName: string;
  } | null>(null);
  const [errorAlert, setErrorAlert] = useState<{
    isOpen: boolean;
    message: string;
  } | null>(null);

  const deleteFormMutation = useMutation(api.formsOntology.deleteForm);
  const publishFormMutation = useMutation(api.formsOntology.publishForm);
  const unpublishFormMutation = useMutation(api.formsOntology.unpublishForm);

  const getFormIcon = (subtype?: string) => {
    switch (subtype) {
      case "registration":
        return "🎫";
      case "survey":
        return "📊";
      case "application":
        return "📝";
      default:
        return "📋";
    }
  };

  const handleDelete = (formId: string, formName: string) => {
    if (!sessionId) return;

    setDeleteConfirmModal({
      isOpen: true,
      formId,
      formName,
    });
  };

  const confirmDelete = async () => {
    if (!sessionId || !deleteConfirmModal) return;

    try {
      setDeletingFormId(deleteConfirmModal.formId);
      await deleteFormMutation({
        sessionId,
        formId: deleteConfirmModal.formId as Id<"objects">,
      });
      setDeleteConfirmModal(null);
    } catch (error) {
      console.error("Failed to delete form:", error);
      setErrorAlert({
        isOpen: true,
        message: `Failed to delete form: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setDeletingFormId(null);
    }
  };

  const handlePublish = async (formId: string, currentStatus: string) => {
    if (!sessionId) return;

    try {
      setPublishingFormId(formId);

      if (currentStatus === "published") {
        // Unpublish
        await unpublishFormMutation({
          sessionId,
          formId: formId as Id<"objects">,
        });
      } else {
        // Publish
        await publishFormMutation({
          sessionId,
          formId: formId as Id<"objects">,
        });
      }
    } catch (error) {
      console.error("Failed to change form status:", error);
      setErrorAlert({
        isOpen: true,
        message: `Failed to ${currentStatus === "published" ? "unpublish" : "publish"} form: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setPublishingFormId(null);
    }
  };

  if (forms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <FileText size={64} style={{ color: "var(--neutral-gray)", opacity: 0.3 }} />
        <h2 className="mt-4 text-lg font-bold" style={{ color: "var(--win95-text)" }}>
          {t("ui.forms.empty_title")}
        </h2>
        <p className="mt-2 text-sm text-center max-w-md" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.forms.empty_description")}
        </p>
        <button
          onClick={onCreateForm}
          className="mt-6 px-6 py-3 text-sm font-bold flex items-center gap-2 border-2 transition-colors hover:brightness-95"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-button-face)",
            color: "var(--win95-text)",
          }}
        >
          <Plus size={16} />
          {t("ui.forms.button_create_first")}
        </button>
      </div>
    );
  }

  // Status badge colors - matching web publishing style
  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "var(--neutral-gray)", text: "white", label: t("ui.forms.status_draft") },
    published: { bg: "var(--success)", text: "white", label: t("ui.forms.status_published") },
    archived: { bg: "var(--error)", text: "white", label: t("ui.forms.status_archived") },
  };

  return (
    <>
      <div className="p-4">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            {t("ui.forms.your_forms")}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {forms.length} {forms.length !== 1 ? t("ui.forms.count_plural") : t("ui.forms.count")} {t("ui.forms.total")}
          </p>
        </div>

        {/* Forms list - list style like web publishing */}
        <div className="space-y-2">
          {forms.map((form) => {
            const fieldCount = form.customProperties?.formSchema?.fields?.length || 0;
            const submissions = form.customProperties?.stats?.submissions || 0;
            const isDeleting = deletingFormId === form._id;
            const isPublishing = publishingFormId === form._id;
            const isPublished = form.status === "published";
            const publicUrl = form.customProperties?.publicUrl;
            const status = form.status || "draft";
            const statusStyle = statusColors[status] || statusColors.draft;

            return (
              <div
                key={form._id}
                className="border-2 p-3 transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--win95-hover-light)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--win95-bg-light)";
                }}
              >
                <div className="flex items-start justify-between">
                  {/* Left: Form info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getFormIcon(form.subtype)}</span>
                      <h4 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
                        {form.name}
                      </h4>
                      <span
                        className="px-2 py-0.5 text-xs font-bold"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                      >
                        {statusStyle.label}
                      </span>
                    </div>

                    {/* Type badge */}
                    <div className="text-xs mb-1 capitalize" style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.forms.type_label")} <span className="font-bold">{form.subtype ? t(`ui.forms.type_${form.subtype}` as any) : t("ui.forms.type_form")}</span>
                    </div>

                    {/* Description (if exists) */}
                    {form.description && (
                      <p className="text-xs mb-1 line-clamp-2" style={{ color: "var(--neutral-gray)" }}>
                        {form.description}
                      </p>
                    )}

                    {/* Meta info - stats */}
                    <div className="flex items-center gap-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      <span>
                        <span className="font-bold">{fieldCount}</span> {t("ui.forms.stats_fields")}
                      </span>
                      <span>
                        <span className="font-bold">{submissions}</span> {t("ui.forms.stats_responses")}
                      </span>
                    </div>

                    {/* Public URL (if exists) */}
                    {publicUrl && (
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs hover:underline mt-1 flex items-center gap-1"
                        style={{ color: "var(--win95-highlight)" }}
                      >
                        {publicUrl}
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  {/* Right: Action buttons - inline like web publishing */}
                  <div className="flex items-center gap-1">
                    {/* Edit button */}
                    <button
                      className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-bg-light)",
                        color: "var(--info)",
                      }}
                      title={t("ui.forms.tooltip_edit")}
                      disabled={isDeleting || isPublishing}
                      onClick={() => onEditForm(form._id)}
                      onMouseEnter={(e) => {
                        if (!isDeleting && !isPublishing)
                          e.currentTarget.style.background = "var(--win95-hover-light)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--win95-bg-light)";
                      }}
                    >
                      <Edit size={12} />
                    </button>

                    {/* Edit Schema button */}
                    {onEditSchema && (
                      <button
                        className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-bg-light)",
                          color: "#8b5cf6", // Purple color for schema
                        }}
                        title="Edit form schema (JSON)"
                        disabled={isDeleting || isPublishing}
                        onClick={() => onEditSchema(form._id)}
                        onMouseEnter={(e) => {
                          if (!isDeleting && !isPublishing)
                            e.currentTarget.style.background = "var(--win95-hover-light)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--win95-bg-light)";
                        }}
                      >
                        <Code size={12} />
                      </button>
                    )}

                    {/* Publish/Unpublish button */}
                    <button
                      onClick={() => handlePublish(form._id, form.status || "draft")}
                      disabled={isDeleting || isPublishing}
                      className="px-2 py-1 text-xs border-2 flex items-center gap-1 disabled:opacity-50 transition-colors"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-bg-light)",
                        color: isPublished ? "var(--warning)" : "var(--success)",
                      }}
                      title={isPublished ? t("ui.forms.tooltip_unpublish") : t("ui.forms.tooltip_publish")}
                      onMouseEnter={(e) => {
                        if (!isDeleting && !isPublishing)
                          e.currentTarget.style.background = "var(--win95-hover-light)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--win95-bg-light)";
                      }}
                    >
                      {isPublishing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : isPublished ? (
                        <FileX size={12} />
                      ) : (
                        <Send size={12} />
                      )}
                    </button>

                    {/* Preview button (disabled for now) */}
                    <button
                      disabled
                      className="px-2 py-1 text-xs border-2 opacity-50 cursor-not-allowed"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-bg-light)",
                        color: "var(--win95-text)",
                      }}
                      title={t("ui.forms.tooltip_preview_soon")}
                    >
                      <Eye size={12} />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(form._id, form.name)}
                      disabled={isDeleting || isPublishing}
                      className="px-2 py-1 text-xs border-2 flex items-center gap-1 disabled:opacity-50 transition-colors"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-bg-light)",
                        color: "var(--error)",
                      }}
                      title={t("ui.forms.tooltip_delete")}
                      onMouseEnter={(e) => {
                        if (!isDeleting && !isPublishing)
                          e.currentTarget.style.background = "var(--win95-hover-light)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--win95-bg-light)";
                      }}
                    >
                      {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
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
        title={t("ui.forms.delete_modal_title")}
        message={`${t("ui.forms.delete_confirm_message")} "${deleteConfirmModal?.formName}"?\n\n${t("ui.forms.delete_warning")}`}
        confirmText={t("ui.forms.button_confirm_delete")}
        cancelText={t("ui.forms.button_cancel")}
        variant="danger"
        isLoading={deletingFormId === deleteConfirmModal?.formId}
      />

      {/* Error Alert Modal */}
      <ConfirmationModal
        isOpen={errorAlert?.isOpen || false}
        onClose={() => setErrorAlert(null)}
        onConfirm={() => setErrorAlert(null)}
        title={t("ui.forms.error_title")}
        message={errorAlert?.message || ""}
        confirmText="OK"
        cancelText=""
        variant="warning"
      />
    </>
  );
}
