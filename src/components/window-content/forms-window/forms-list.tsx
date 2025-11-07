"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { FileText, Plus, Edit, Trash2, Eye, Send, FileX, Loader2 } from "lucide-react";
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
  };
}

interface FormsListProps {
  forms: Form[];
  onCreateForm: () => void;
  onEditForm: (formId: string) => void;
}

export function FormsList({ forms, onCreateForm, onEditForm }: FormsListProps) {
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

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "draft":
        return (
          <span
            className="px-2 py-0.5 text-xs rounded"
            style={{ background: "var(--warning)", color: "white" }}
          >
            {t("ui.forms.status_draft")}
          </span>
        );
      case "published":
        return (
          <span
            className="px-2 py-0.5 text-xs rounded"
            style={{ background: "var(--success)", color: "white" }}
          >
            {t("ui.forms.status_published")}
          </span>
        );
      case "archived":
        return (
          <span
            className="px-2 py-0.5 text-xs rounded"
            style={{ background: "var(--neutral-gray)", color: "white" }}
          >
            {t("ui.forms.status_archived")}
          </span>
        );
      default:
        return null;
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

  return (
    <>
      <div className="p-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => {
            const fieldCount = form.customProperties?.formSchema?.fields?.length || 0;
            const submissions = form.customProperties?.stats?.submissions || 0;
            const isDeleting = deletingFormId === form._id;
            const isPublishing = publishingFormId === form._id;
            const isPublished = form.status === "published";

            return (
              <div
                key={form._id}
                className="border-2 rounded p-4 hover:brightness-95 transition-all"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getFormIcon(form.subtype)}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
                        {form.name}
                      </h3>
                      <p className="text-xs capitalize" style={{ color: "var(--neutral-gray)" }}>
                        {form.subtype ? t(`ui.forms.type_${form.subtype}` as any) : t("ui.forms.type_form")}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(form.status)}
                </div>

                {/* Description */}
                {form.description && (
                  <p
                    className="text-xs mb-3 line-clamp-2"
                    style={{ color: "var(--neutral-gray)" }}
                  >
                    {form.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex gap-4 mb-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <div>
                    <span className="font-bold">{fieldCount}</span> {t("ui.forms.stats_fields")}
                  </div>
                  <div>
                    <span className="font-bold">{submissions}</span> {t("ui.forms.stats_responses")}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {/* Edit */}
                  <button
                    onClick={() => onEditForm(form._id)}
                    disabled={isDeleting || isPublishing}
                    className="flex-1 px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1 border-2 transition-colors hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-button-face)",
                      color: "var(--win95-text)",
                    }}
                    title={t("ui.forms.tooltip_edit")}
                  >
                    <Edit size={12} />
                    {t("ui.forms.button_edit")}
                  </button>

                  {/* Publish/Unpublish */}
                  <button
                    onClick={() => handlePublish(form._id, form.status || "draft")}
                    disabled={isDeleting || isPublishing}
                    className="px-3 py-1.5 text-xs font-bold flex items-center gap-1 border-2 transition-colors hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: isPublished ? "var(--warning)" : "var(--success)",
                      color: "white",
                    }}
                    title={isPublished ? t("ui.forms.tooltip_unpublish") : t("ui.forms.tooltip_publish")}
                  >
                    {isPublishing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isPublished ? (
                      <FileX size={12} />
                    ) : (
                      <Send size={12} />
                    )}
                  </button>

                  {/* Preview (disabled for now) */}
                  <button
                    disabled
                    className="px-3 py-1.5 text-xs font-bold border-2 opacity-50 cursor-not-allowed"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-button-face)",
                      color: "var(--win95-text)",
                    }}
                    title={t("ui.forms.tooltip_preview_soon")}
                  >
                    <Eye size={12} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(form._id, form.name)}
                    disabled={isDeleting || isPublishing}
                    className="px-3 py-1.5 text-xs font-bold border-2 transition-colors hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--error)",
                      color: "white",
                    }}
                    title={t("ui.forms.tooltip_delete")}
                  >
                    {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
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
