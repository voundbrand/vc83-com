/**
 * WORKFLOWS WINDOW
 *
 * Main window for managing standalone workflows.
 * Provides tabs for viewing workflows, creating from templates, and settings.
 */

"use client";

import React, { useState } from "react";
import { Zap, List, FileText, Settings } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { WorkflowList } from "./workflow-list";
import { WorkflowBuilder } from "./workflow-builder";
import { WorkflowTemplates } from "./workflow-templates";
import { useCurrentOrganization, useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

type TabType = "list" | "builder" | "templates" | "settings";

export function WorkflowsWindow() {
  const { t, isLoading } = useNamespaceTranslations("ui.workflows");
  const currentOrg = useCurrentOrganization();
  const { sessionId } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("list");
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false);

  // Use current org and authenticated session ID
  const organizationId = currentOrg?.id || "";

  // Mutation to create workflow from template
  const createFromTemplate = useMutation(
    api.workflowTemplateAvailability.createWorkflowFromTemplate
  );

  // Show loading state while translations load
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8" style={{ background: 'var(--win95-bg)' }}>
        <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
          Loading...
        </div>
      </div>
    );
  }

  // Show message if not authenticated
  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center p-8" style={{ background: 'var(--win95-bg)' }}>
        <div className="text-center">
          <Zap className="mx-auto h-16 w-16" style={{ color: 'var(--neutral-gray)' }} />
          <h3 className="mt-4 text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
            {t("ui.workflows.auth_required.title")}
          </h3>
          <p className="mt-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.workflows.auth_required.message")}
          </p>
        </div>
      </div>
    );
  }

  // Switch to builder tab when creating/editing
  const handleCreateNew = () => {
    setEditingWorkflowId(null);
    setActiveTab("builder");
  };

  const handleEditWorkflow = (workflowId: string) => {
    setEditingWorkflowId(workflowId);
    setActiveTab("builder");
  };

  const handleBackToList = () => {
    setEditingWorkflowId(null);
    setActiveTab("list");
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    console.log("🔵 [Frontend] handleCreateFromTemplate called", {
      templateId,
      sessionId,
      organizationId,
    });

    if (!sessionId || !organizationId) {
      console.error("❌ [Frontend] Missing sessionId or organizationId", {
        sessionId,
        organizationId,
      });
      return;
    }

    try {
      setIsCreatingFromTemplate(true);
      console.log("🔵 [Frontend] Calling createFromTemplate mutation...");

      // Create workflow from template
      const result = await createFromTemplate({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        templateId: templateId as Id<"objects">,
      });

      console.log("✅ [Frontend] Mutation result:", result);

      if (result.success && result.workflowId) {
        console.log("🔵 [Frontend] Setting workflowId and switching to builder", {
          workflowId: result.workflowId,
        });
        // Set the new workflow ID and switch to builder
        setEditingWorkflowId(result.workflowId);
        setActiveTab("builder");
      } else {
        console.warn("⚠️ [Frontend] Result missing success or workflowId", result);
      }
    } catch (error) {
      console.error("❌ [Frontend] Failed to create workflow from template:", error);
      alert("Failed to create workflow from template. Please try again.");
    } finally {
      setIsCreatingFromTemplate(false);
    }
  };

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="border-b-2 px-4 py-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>{t("ui.workflows.title")}</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              {t("ui.workflows.subtitle")}
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="retro-button flex items-center gap-2 px-3 py-2 text-xs font-bold"
          >
            <Zap className="h-3 w-3" />
            {t("ui.workflows.button.create")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b-2 px-4" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <nav className="flex gap-1">
          <TabButton
            icon={<List className="h-4 w-4" />}
            label={t("ui.workflows.tab.all")}
            active={activeTab === "list"}
            onClick={() => setActiveTab("list")}
          />
          <TabButton
            icon={<Zap className="h-4 w-4" />}
            label={t("ui.workflows.tab.builder")}
            active={activeTab === "builder"}
            onClick={() => setActiveTab("builder")}
          />
          <TabButton
            icon={<FileText className="h-4 w-4" />}
            label={t("ui.workflows.tab.templates")}
            active={activeTab === "templates"}
            onClick={() => setActiveTab("templates")}
          />
          <TabButton
            icon={<Settings className="h-4 w-4" />}
            label={t("ui.workflows.tab.settings")}
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
          />
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "list" && (
          <WorkflowList
            organizationId={organizationId}
            sessionId={sessionId}
            onEditWorkflow={handleEditWorkflow}
            onCreateNew={handleCreateNew}
          />
        )}

        {activeTab === "builder" && (
          <WorkflowBuilder
            organizationId={organizationId}
            sessionId={sessionId}
            workflowId={editingWorkflowId}
            onBack={handleBackToList}
          />
        )}

        {activeTab === "templates" && (
          <WorkflowTemplates
            organizationId={organizationId}
            sessionId={sessionId}
            onCreateFromTemplate={handleCreateFromTemplate}
          />
        )}

        {isCreatingFromTemplate && (
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 9999,
            }}
          >
            <div
              className="border-2 p-8"
              style={{
                background: "var(--win95-bg)",
                borderColor: "var(--win95-border)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-6 w-6 animate-spin rounded-full border-4 border-purple-600"
                  style={{ borderTopColor: "transparent" }}
                />
                <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                  Creating workflow from template...
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
              <Settings className="mx-auto h-16 w-16" style={{ color: 'var(--neutral-gray)', opacity: 0.3 }} />
              <h3 className="mt-4 text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                {t("ui.workflows.settings.title")}
              </h3>
              <p className="mt-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
                {t("ui.workflows.settings.message")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function TabButton({ icon, label, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition-colors"
      style={{
        borderColor: active ? 'var(--win95-text)' : 'transparent',
        color: active ? 'var(--win95-text)' : 'var(--neutral-gray)'
      }}
    >
      {icon}
      {label}
    </button>
  );
}
