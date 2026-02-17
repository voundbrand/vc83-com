"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { Loader2, Plus, Edit, FileText, ClipboardList, Palette, ArrowLeft, Maximize2 } from "lucide-react";
import Link from "next/link";
import { FormBuilder } from "./form-builder";
import { AllFormsTab } from "./all-forms-tab";
import { TemplatesTab } from "./templates-tab";
import { ResponsesTab } from "./responses-tab";
import {
  InteriorHeader,
  InteriorRoot,
  InteriorSubtitle,
  InteriorTabButton,
  InteriorTabRow,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";

/**
 * Forms Window
 *
 * Comprehensive form management system:
 * - Create new forms from templates or scratch
 * - List all forms with draft/published status
 * - View form responses (coming soon)
 * - Manage form templates
 *
 * Tabs:
 * - Create: Create/edit forms with visual builder
 * - All Forms: List of forms with Draft/Published subtabs
 * - Responses: View and analyze form submissions
 * - Templates: Browse and use form templates
 */

type TabType = "create" | "forms" | "responses" | "templates";

interface FormsWindowProps {
  /** When true, shows back-to-desktop navigation (for /forms route) */
  fullScreen?: boolean;
}

export function FormsWindow({ fullScreen = false }: FormsWindowProps = {}) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.forms");
  const [activeTab, setActiveTab] = useState<TabType>("forms"); // Default to All Forms tab
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string | null>(null);
  const [shouldOpenSchemaModal, setShouldOpenSchemaModal] = useState(false);

  // Check app availability - returns guard component if unavailable/loading, null if available
  const guard = useAppAvailabilityGuard({
    code: "forms",
    name: "Forms",
    description: "Create dynamic forms for event registrations, surveys, and applications with conditional logic and pricing"
  });

  const forms = useQuery(
    api.formsOntology.getForms,
    sessionId && currentOrg
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  if (guard) return guard;

  if (!sessionId || !currentOrg) {
    return (
      <InteriorRoot className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
            {translationsLoading ? "Loading..." : t("ui.forms.sign_in_prompt")}
          </p>
        </div>
      </InteriorRoot>
    );
  }

  if (forms === undefined || translationsLoading) {
    return (
      <InteriorRoot className="flex h-full items-center justify-center">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--tone-accent-strong)" }} />
      </InteriorRoot>
    );
  }

  const handleCreateForm = () => {
    setSelectedFormId(null);
    setSelectedTemplateCode(null); // Clear template selection
    setShouldOpenSchemaModal(false); // New form, don't open schema modal
    setActiveTab("create");
  };

  const handleEditForm = (formId: string) => {
    setSelectedFormId(formId);
    setShouldOpenSchemaModal(false); // Regular edit, don't open schema modal
    setActiveTab("create");
  };

  const handleEditSchema = (formId: string) => {
    // Edit schema directly opens the form builder with the schema modal auto-opened
    setSelectedFormId(formId);
    setShouldOpenSchemaModal(true); // Auto-open schema modal
    setActiveTab("create");
  };

  const handleUseTemplate = (templateCode: string) => {
    // Switch to create tab with selected template
    setSelectedFormId(null);
    setSelectedTemplateCode(templateCode);
    setShouldOpenSchemaModal(false); // Template, don't open schema modal
    setActiveTab("create");
  };

  const handleBackToForms = () => {
    setSelectedFormId(null);
    setActiveTab("forms");
  };

  return (
    <InteriorRoot className="flex h-full flex-col">
      {/* Header */}
      <InteriorHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back to desktop link (full-screen mode only) */}
            {fullScreen && (
              <Link
                href="/"
                className="desktop-interior-button inline-flex h-9 items-center gap-2 px-3 text-xs"
                title="Back to Desktop"
              >
                <ArrowLeft size={14} />
              </Link>
            )}
            <div>
              <InteriorTitle className="flex items-center gap-2 text-sm">
                <FileText size={16} />
                {t("ui.forms.title")}
              </InteriorTitle>
              <InteriorSubtitle className="mt-1 text-xs">
                {t("ui.forms.subtitle")}
              </InteriorSubtitle>
            </div>
          </div>

          {/* Open full screen link (window mode only) */}
          {!fullScreen && (
            <Link
              href="/forms"
              className="desktop-interior-button inline-flex h-9 items-center gap-2 px-3 text-xs"
              title="Open Full Screen"
            >
              <Maximize2 size={14} />
            </Link>
          )}
        </div>
      </InteriorHeader>

      {/* Tabs */}
      <InteriorTabRow className="border-b">
        <InteriorTabButton active={activeTab === "forms"} className="flex items-center gap-2" onClick={() => setActiveTab("forms")}>
          <FileText size={14} />
          {t("ui.forms.tabs.all_forms")}
        </InteriorTabButton>
        <InteriorTabButton active={activeTab === "create"} className="flex items-center gap-2" onClick={() => setActiveTab("create")}>
          {/* Dynamic icon and title based on whether we're editing or creating */}
          {selectedFormId ? <Edit size={14} /> : <Plus size={14} />}
          {selectedFormId ? t("ui.forms.tabs.edit") : t("ui.forms.tabs.create")}
        </InteriorTabButton>
        <InteriorTabButton active={activeTab === "responses"} className="flex items-center gap-2" onClick={() => setActiveTab("responses")}>
          <ClipboardList size={14} />
          {t("ui.forms.tabs.responses")}
        </InteriorTabButton>
        <InteriorTabButton active={activeTab === "templates"} className="flex items-center gap-2" onClick={() => setActiveTab("templates")}>
          <Palette size={14} />
          {t("ui.forms.tabs.templates")}
        </InteriorTabButton>
      </InteriorTabRow>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "create" && (
          <FormBuilder
            formId={selectedFormId}
            templateCode={selectedTemplateCode}
            onBack={handleBackToForms}
            openSchemaModal={shouldOpenSchemaModal}
          />
        )}

        {activeTab === "forms" && (
          <AllFormsTab
            forms={forms}
            onCreateForm={handleCreateForm}
            onEditForm={handleEditForm}
            onEditSchema={handleEditSchema}
          />
        )}

        {activeTab === "responses" && (
          <ResponsesTab forms={forms} />
        )}

        {activeTab === "templates" && (
          <TemplatesTab onUseTemplate={handleUseTemplate} />
        )}
      </div>

      {/* Footer - Status Bar */}
      <div
        className="border-t px-4 py-1 text-xs flex items-center justify-between"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--desktop-shell-accent)",
          color: "var(--desktop-menu-text-muted)",
        }}
      >
        <span>
          {forms !== undefined
            ? t("ui.forms.footer.form_count", {
                count: forms.length,
                plural: forms.length !== 1 ? "s" : ""
              })
            : t("ui.forms.footer.loading")}
        </span>
        <span>{currentOrg?.name || ""}</span>
      </div>
    </InteriorRoot>
  );
}
