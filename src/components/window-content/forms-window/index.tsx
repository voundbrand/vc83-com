"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { Loader2, Plus, FileText, ClipboardList, Palette } from "lucide-react";
import { FormBuilder } from "./form-builder";
import { AllFormsTab } from "./all-forms-tab";
import { TemplatesTab } from "./templates-tab";
import { ResponsesTab } from "./responses-tab";

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

export function FormsWindow() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.forms");
  const [activeTab, setActiveTab] = useState<TabType>("forms"); // Default to All Forms tab
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string | null>(null);

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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
            {translationsLoading ? "Loading..." : t("ui.forms.sign_in_prompt")}
          </p>
        </div>
      </div>
    );
  }

  if (forms === undefined || translationsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  const handleCreateForm = () => {
    setSelectedFormId(null);
    setSelectedTemplateCode(null); // Clear template selection
    setActiveTab("create");
  };

  const handleEditForm = (formId: string) => {
    setSelectedFormId(formId);
    setActiveTab("create");
  };

  const handleUseTemplate = (templateCode: string) => {
    // Switch to create tab with selected template
    setSelectedFormId(null);
    setSelectedTemplateCode(templateCode);
    setActiveTab("create");
  };

  const handleBackToForms = () => {
    setSelectedFormId(null);
    setActiveTab("forms");
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <FileText size={16} />
          {t("ui.forms.title")}
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          {t("ui.forms.subtitle")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "forms" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "forms" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("forms")}
        >
          <FileText size={14} />
          {t("ui.forms.tabs.all_forms")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "create" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "create" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("create")}
        >
          <Plus size={14} />
          {t("ui.forms.tabs.create")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "responses" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "responses" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("responses")}
        >
          <ClipboardList size={14} />
          {t("ui.forms.tabs.responses")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "templates" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "templates" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("templates")}
        >
          <Palette size={14} />
          {t("ui.forms.tabs.templates")}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "create" && (
          <FormBuilder
            formId={selectedFormId}
            templateCode={selectedTemplateCode}
            onBack={handleBackToForms}
          />
        )}

        {activeTab === "forms" && (
          <AllFormsTab
            forms={forms}
            onCreateForm={handleCreateForm}
            onEditForm={handleEditForm}
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
        className="px-4 py-1 border-t-2 text-xs flex items-center justify-between"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
          color: "var(--neutral-gray)",
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
    </div>
  );
}
