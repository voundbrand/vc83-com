/**
 * WORKFLOWS WINDOW
 *
 * Main window for managing standalone workflows.
 * Provides tabs for viewing workflows, creating from templates, and settings.
 */

"use client";

import React, { useState } from "react";
import { Zap, List, FileText, Settings, ArrowLeft, Maximize2 } from "lucide-react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { WorkflowList } from "./workflow-list";
import { WorkflowBuilder } from "./workflow-builder";
import { WorkflowTemplates } from "./workflow-templates";
import { useCurrentOrganization, useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  InteriorButton,
  InteriorHeader,
  InteriorPanel,
  InteriorRoot,
  InteriorSubtitle,
  InteriorTabButton,
  InteriorTabRow,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";

type TabType = "list" | "builder" | "templates" | "settings";

interface WorkflowsWindowProps {
  /** When true, shows back-to-desktop navigation (for /workflows route) */
  fullScreen?: boolean;
}

export function WorkflowsWindow({ fullScreen = false }: WorkflowsWindowProps) {
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
      <InteriorRoot className="flex h-full items-center justify-center p-8">
        <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
          Loading...
        </div>
      </InteriorRoot>
    );
  }

  // Show message if not authenticated
  if (!sessionId) {
    return (
      <InteriorRoot className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <Zap className="mx-auto h-16 w-16" style={{ color: 'var(--neutral-gray)' }} />
          <h3 className="mt-4 text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
            {t("ui.workflows.auth_required.title")}
          </h3>
          <p className="mt-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.workflows.auth_required.message")}
          </p>
        </div>
      </InteriorRoot>
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
    console.log("[Frontend] handleCreateFromTemplate called", {
      templateId,
      sessionId,
      organizationId,
    });

    if (!sessionId || !organizationId) {
      console.error("[Frontend] Missing sessionId or organizationId", {
        sessionId,
        organizationId,
      });
      return;
    }

    try {
      setIsCreatingFromTemplate(true);
      console.log("[Frontend] Calling createFromTemplate mutation...");

      // Create workflow directly from template - no object mappings needed!
      const result = await createFromTemplate({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        templateId: templateId as Id<"objects">,
      });

      console.log("[Frontend] Mutation result:", result);

      if (result.success && result.workflowId) {
        console.log("[Frontend] Setting workflowId and switching to builder", {
          workflowId: result.workflowId,
        });
        // Set the new workflow ID and switch to builder
        setEditingWorkflowId(result.workflowId);
        setActiveTab("builder");
      } else {
        console.warn("[Frontend] Result missing success or workflowId", result);
      }
    } catch (error) {
      console.error("[Frontend] Failed to create workflow from template:", error);
      alert("Failed to create workflow from template. Please try again.");
    } finally {
      setIsCreatingFromTemplate(false);
    }
  };

  return (
    <InteriorRoot className="flex h-full flex-col">
      {/* Header */}
      <InteriorHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Back to desktop link (full-screen mode only) */}
          {fullScreen && (
            <Link
              href="/"
              className="desktop-interior-button mr-3 inline-flex h-9 items-center gap-2 px-3 text-xs"
              title="Back to Desktop"
            >
              <ArrowLeft className="h-3 w-3" />
            </Link>
          )}
          <div>
            <InteriorTitle className="text-sm">{t("ui.workflows.title")}</InteriorTitle>
            <InteriorSubtitle className="mt-1 text-xs">
              {t("ui.workflows.subtitle")}
            </InteriorSubtitle>
          </div>
          <InteriorButton onClick={handleCreateNew} className="h-9 gap-2 px-3 text-xs">
            <Zap className="h-3 w-3" />
            {t("ui.workflows.button.create")}
          </InteriorButton>

          {/* Open full screen link (window mode only) */}
          {!fullScreen && (
            <Link
              href="/workflows"
              className="desktop-interior-button ml-2 inline-flex h-9 items-center gap-2 px-3 text-xs"
              title="Open Full Screen"
            >
              <Maximize2 className="h-3 w-3" />
            </Link>
          )}
        </div>
      </InteriorHeader>

      {/* Tabs */}
      <InteriorTabRow className="border-b px-4">
        <nav className="flex gap-2">
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
      </InteriorTabRow>

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
            <InteriorPanel className="p-8">
              <div className="flex items-center gap-3">
                <div
                  className="h-6 w-6 animate-spin rounded-full border-4 border-purple-600"
                  style={{ borderTopColor: "transparent" }}
                />
                <p className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                  Creating workflow from template...
                </p>
              </div>
            </InteriorPanel>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
              <Settings className="mx-auto h-16 w-16" style={{ color: 'var(--neutral-gray)', opacity: 0.3 }} />
              <h3 className="mt-4 text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
                {t("ui.workflows.settings.title")}
              </h3>
              <p className="mt-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
                {t("ui.workflows.settings.message")}
              </p>
            </div>
          </div>
        )}
      </div>
    </InteriorRoot>
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
    <InteriorTabButton active={active} className="flex items-center gap-2 px-3 py-2 text-xs" onClick={onClick}>
      {icon}
      {label}
    </InteriorTabButton>
  );
}
