"use client";

import { useState } from "react";
import { Edit, Lock, FileText } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { FormsList } from "./forms-list";
import type { Id } from "../../../../convex/_generated/dataModel";

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

interface AllFormsTabProps {
  forms: Form[];
  onCreateForm: () => void;
  onEditForm: (formId: string) => void;
  onEditSchema?: (formId: string) => void;
}

type FormSubTab = "draft" | "published";

export function AllFormsTab({ forms, onCreateForm, onEditForm, onEditSchema }: AllFormsTabProps) {
  const { t } = useNamespaceTranslations("ui.forms");
  const [subTab, setSubTab] = useState<FormSubTab>("draft");

  // Separate forms by status
  const draftForms = forms.filter(f => f.status === "draft");
  const publishedForms = forms.filter(f => f.status === "published");

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs for Draft/Published */}
      <div className="flex border-b-2 px-4 pt-4" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
        <button
          onClick={() => setSubTab("draft")}
          className={`px-4 py-2 text-xs font-semibold border-2 border-b-0 transition-colors flex items-center gap-2 ${
            subTab === "draft" ? "-mb-0.5" : ""
          }`}
          style={{
            backgroundColor: subTab === "draft" ? "var(--win95-bg-light)" : "var(--win95-bg)",
            color: subTab === "draft" ? "var(--win95-highlight)" : "var(--neutral-gray)",
            borderColor: subTab === "draft" ? "var(--win95-border)" : "transparent",
          }}
        >
          <Edit size={12} />
          {t("ui.forms.subtabs.drafts")} ({draftForms.length})
        </button>
        <button
          onClick={() => setSubTab("published")}
          className={`px-4 py-2 text-xs font-semibold border-2 border-b-0 transition-colors flex items-center gap-2 ${
            subTab === "published" ? "-mb-0.5" : ""
          }`}
          style={{
            backgroundColor: subTab === "published" ? "var(--win95-bg-light)" : "var(--win95-bg)",
            color: subTab === "published" ? "var(--win95-highlight)" : "var(--neutral-gray)",
            borderColor: subTab === "published" ? "var(--win95-border)" : "transparent",
          }}
        >
          <Lock size={12} />
          {t("ui.forms.subtabs.published")} ({publishedForms.length})
        </button>
      </div>

      {/* Form Lists */}
      <div className="flex-1 overflow-y-auto">
        {subTab === "draft" && (
          <div>
            {draftForms.length === 0 ? (
              <div className="text-center py-12" style={{ color: "var(--neutral-gray)" }}>
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-sm font-semibold mb-2">{t("ui.forms.empty_drafts_title")}</h3>
                <p className="text-xs mb-4">
                  {t("ui.forms.empty_drafts_description")}
                </p>
                <button
                  onClick={onCreateForm}
                  className="px-4 py-2 text-xs font-bold border-2 transition-colors hover:brightness-95"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-button-face)",
                    color: "var(--win95-text)",
                  }}
                >
                  {t("ui.forms.button_create_first")}
                </button>
              </div>
            ) : (
              <FormsList
                forms={draftForms}
                onCreateForm={onCreateForm}
                onEditForm={onEditForm}
                onEditSchema={onEditSchema}
              />
            )}
          </div>
        )}

        {subTab === "published" && (
          <div>
            {publishedForms.length === 0 ? (
              <div className="text-center py-12" style={{ color: "var(--neutral-gray)" }}>
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-sm font-semibold mb-2">{t("ui.forms.empty_published_title")}</h3>
                <p className="text-xs">
                  {t("ui.forms.empty_published_description")}
                </p>
              </div>
            ) : (
              <FormsList
                forms={publishedForms}
                onCreateForm={onCreateForm}
                onEditForm={onEditForm}
                onEditSchema={onEditSchema}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
