"use client";

import { useState } from "react";
import { CheckCircle2, Edit, FileText, Lock } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { FormsList } from "./forms-list";
import type { Id } from "../../../../convex/_generated/dataModel";
import { InteriorButton, InteriorTabButton, InteriorTabRow } from "@/components/window-content/shared/interior-primitives";

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
  const [subTab, setSubTab] = useState<FormSubTab>("published"); // Default to Active (published) forms

  // Separate forms by status
  // Note: "active" is legacy status from AI tool - treat as "published" for backwards compatibility
  const draftForms = forms.filter(f => f.status === "draft" || !f.status);
  const publishedForms = forms.filter(f => f.status === "published" || f.status === "active");

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs for Active/Inactive */}
      <InteriorTabRow className="border-b px-4 pt-4">
        <InteriorTabButton active={subTab === "published"} className="flex items-center gap-2" onClick={() => setSubTab("published")}>
          <Lock size={12} />
          {t("ui.forms.subtabs.active")} ({publishedForms.length})
        </InteriorTabButton>
        <InteriorTabButton active={subTab === "draft"} className="flex items-center gap-2" onClick={() => setSubTab("draft")}>
          <Edit size={12} />
          {t("ui.forms.subtabs.inactive")} ({draftForms.length})
        </InteriorTabButton>
      </InteriorTabRow>

      {/* Form Lists */}
      <div className="flex-1 overflow-y-auto">
        {subTab === "published" && (
          <div>
            {publishedForms.length === 0 ? (
              <div className="py-12 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
                <CheckCircle2 className="mx-auto mb-4 h-9 w-9" style={{ color: "var(--success)" }} />
                <h3 className="text-sm font-semibold mb-2">{t("ui.forms.empty_active_title")}</h3>
                <p className="text-xs">
                  {t("ui.forms.empty_active_description")}
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

        {subTab === "draft" && (
          <div>
            {draftForms.length === 0 ? (
              <div className="py-12 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
                <FileText className="mx-auto mb-4 h-9 w-9" style={{ color: "var(--window-document-text)" }} />
                <h3 className="text-sm font-semibold mb-2">{t("ui.forms.empty_inactive_title")}</h3>
                <p className="text-xs mb-4">
                  {t("ui.forms.empty_inactive_description")}
                </p>
                <InteriorButton onClick={onCreateForm} className="px-4 py-2 text-xs">
                  {t("ui.forms.button_create_first")}
                </InteriorButton>
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
      </div>
    </div>
  );
}
