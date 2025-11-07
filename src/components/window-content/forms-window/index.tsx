"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { Loader2, Plus, FileText } from "lucide-react";
import { FormsList } from "./forms-list";
import { FormBuilder } from "./form-builder";

export type ViewMode = "list" | "builder" | "responses";

export function FormsWindow() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.forms");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

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
    setViewMode("builder");
  };

  const handleEditForm = (formId: string) => {
    setSelectedFormId(formId);
    setViewMode("builder");
  };

  const handleBackToList = () => {
    setSelectedFormId(null);
    setViewMode("list");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={24} style={{ color: "var(--win95-highlight)" }} />
            <div>
              <h1 className="text-lg font-bold" style={{ color: "var(--win95-text)" }}>
                {t("ui.forms.title")}
              </h1>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.forms.subtitle")}
              </p>
            </div>
          </div>

          {viewMode === "list" && (
            <button
              onClick={handleCreateForm}
              className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2 transition-colors hover:brightness-95"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
            >
              <Plus size={16} />
              {t("ui.forms.button_new_form")}
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 text-xs font-bold border-2 transition-colors ${
              viewMode === "list" ? "brightness-90" : "hover:brightness-95"
            }`}
            style={{
              borderColor: "var(--win95-border)",
              background: viewMode === "list" ? "var(--win95-bg-light)" : "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            <FileText size={12} className="inline mr-1" />
            {t("ui.forms.tab_all_forms")}
          </button>
          {/* Future tabs */}
          {/* <button
            onClick={() => setViewMode("responses")}
            className={`px-3 py-1.5 text-xs font-bold border-2 transition-colors ${
              viewMode === "responses" ? "brightness-90" : "hover:brightness-95"
            }`}
            style={{
              borderColor: "var(--win95-border)",
              background: viewMode === "responses" ? "var(--win95-bg-light)" : "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            <ClipboardList size={12} className="inline mr-1" />
            {t("ui.forms.tab_all_responses")}
          </button> */}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "list" && (
          <FormsList
            forms={forms}
            onCreateForm={handleCreateForm}
            onEditForm={handleEditForm}
          />
        )}

        {viewMode === "builder" && (
          <FormBuilder
            formId={selectedFormId}
            onBack={handleBackToList}
          />
        )}

        {/* Future: Responses view */}
        {/* {viewMode === "responses" && (
          <ResponsesList />
        )} */}
      </div>
    </div>
  );
}
