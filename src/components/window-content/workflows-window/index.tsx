/**
 * WORKFLOWS WINDOW
 *
 * Main window for managing standalone workflows.
 * Provides tabs for viewing workflows, creating from templates, and settings.
 */

"use client";

import React, { useState } from "react";
import { Zap, List, FileText, Settings } from "lucide-react";
import { WorkflowList } from "./workflow-list";
import { WorkflowBuilder } from "./workflow-builder";
import { useCurrentOrganization, useAuth } from "@/hooks/use-auth";

type TabType = "list" | "builder" | "templates" | "settings";

export function WorkflowsWindow() {
  const currentOrg = useCurrentOrganization();
  const { sessionId } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("list");
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);

  // Use current org and authenticated session ID
  const organizationId = currentOrg?.id || "";

  // Show message if not authenticated
  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center p-8" style={{ background: 'var(--win95-bg)' }}>
        <div className="text-center">
          <Zap className="mx-auto h-16 w-16" style={{ color: 'var(--neutral-gray)' }} />
          <h3 className="mt-4 text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
            Authentication Required
          </h3>
          <p className="mt-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            Please sign in to access the Workflows app
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

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="border-b-2 px-4 py-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>WORKFLOWS</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Orchestrate multi-object behaviors and automation
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="retro-button flex items-center gap-2 px-3 py-2 text-xs font-bold"
          >
            <Zap className="h-3 w-3" />
            CREATE
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b-2 px-4" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <nav className="flex gap-1">
          <TabButton
            icon={<List className="h-4 w-4" />}
            label="All Workflows"
            active={activeTab === "list"}
            onClick={() => setActiveTab("list")}
          />
          <TabButton
            icon={<Zap className="h-4 w-4" />}
            label="Builder"
            active={activeTab === "builder"}
            onClick={() => setActiveTab("builder")}
          />
          <TabButton
            icon={<FileText className="h-4 w-4" />}
            label="Templates"
            active={activeTab === "templates"}
            onClick={() => setActiveTab("templates")}
          />
          <TabButton
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
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
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
              <FileText className="mx-auto h-16 w-16" style={{ color: 'var(--neutral-gray)', opacity: 0.3 }} />
              <h3 className="mt-4 text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                WORKFLOW TEMPLATES
              </h3>
              <p className="mt-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
                Pre-built workflow templates coming soon
              </p>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
              <Settings className="mx-auto h-16 w-16" style={{ color: 'var(--neutral-gray)', opacity: 0.3 }} />
              <h3 className="mt-4 text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                WORKFLOW SETTINGS
              </h3>
              <p className="mt-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
                Workflow system settings coming soon
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
