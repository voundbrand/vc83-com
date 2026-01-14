/**
 * SEQUENCES WINDOW
 *
 * Main window for managing multi-channel automation sequences.
 * Provides tabs for viewing sequences, editing sequence timeline, templates, and enrollments.
 */

"use client";

import React, { useState } from "react";
import { Mail, List, FileText, Users, Plus, Settings, Loader2 } from "lucide-react";
import { SequencesList } from "./sequences-list";
import { SequenceEditor } from "./sequence-editor";
import { TemplatesList } from "./templates-list";
import { EnrollmentsList } from "./enrollments-list";
import { useCurrentOrganization, useAuth } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";

type TabType = "list" | "editor" | "templates" | "enrollments" | "settings";

export function SequencesWindow() {
  const currentOrg = useCurrentOrganization();
  const { sessionId, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("list");
  const [editingSequenceId, setEditingSequenceId] = useState<string | null>(null);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);

  const organizationId = currentOrg?.id || "";

  const guard = useAppAvailabilityGuard({
    code: "sequences",
    name: "Sequences",
    description: "Multi-channel automation sequences for email, SMS, and WhatsApp messaging",
  });

  if (guard) return guard;

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8" style={{ background: "var(--win95-bg)" }}>
        <div className="text-center" style={{ color: "var(--neutral-gray)" }}>
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-2" />
          Loading...
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center p-8" style={{ background: "var(--win95-bg)" }}>
        <div className="text-center">
          <Mail className="mx-auto h-16 w-16" style={{ color: "var(--neutral-gray)" }} />
          <h3 className="mt-4 text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            Authentication Required
          </h3>
          <p className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
            Please sign in to access Sequences
          </p>
        </div>
      </div>
    );
  }

  const handleCreateNew = () => {
    setEditingSequenceId(null);
    setActiveTab("editor");
  };

  const handleEditSequence = (sequenceId: string) => {
    setEditingSequenceId(sequenceId);
    setActiveTab("editor");
  };

  const handleViewEnrollments = (sequenceId: string) => {
    setSelectedSequenceId(sequenceId);
    setActiveTab("enrollments");
  };

  const handleBackToList = () => {
    setEditingSequenceId(null);
    setSelectedSequenceId(null);
    setActiveTab("list");
  };

  const handleSaveSuccess = () => {
    handleBackToList();
  };

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--win95-bg)" }}>
      <div
        className="border-b-2 px-4 py-3"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
              Sequences
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Multi-channel automation for email, SMS &amp; WhatsApp
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="retro-button flex items-center gap-2 px-3 py-2 text-xs font-bold"
          >
            <Plus className="h-3 w-3" />
            New Sequence
          </button>
        </div>
      </div>

      <div
        className="border-b-2 px-4"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <nav className="flex gap-1">
          <TabButton
            icon={<List className="h-4 w-4" />}
            label="All Sequences"
            active={activeTab === "list"}
            onClick={() => setActiveTab("list")}
          />
          <TabButton
            icon={<Mail className="h-4 w-4" />}
            label="Editor"
            active={activeTab === "editor"}
            onClick={() => setActiveTab("editor")}
          />
          <TabButton
            icon={<FileText className="h-4 w-4" />}
            label="Templates"
            active={activeTab === "templates"}
            onClick={() => setActiveTab("templates")}
          />
          <TabButton
            icon={<Users className="h-4 w-4" />}
            label="Enrollments"
            active={activeTab === "enrollments"}
            onClick={() => setActiveTab("enrollments")}
          />
          <TabButton
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
          />
        </nav>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === "list" && (
          <SequencesList
            organizationId={organizationId}
            sessionId={sessionId}
            onEditSequence={handleEditSequence}
            onViewEnrollments={handleViewEnrollments}
            onCreateNew={handleCreateNew}
          />
        )}

        {activeTab === "editor" && (
          <SequenceEditor
            organizationId={organizationId}
            sessionId={sessionId}
            sequenceId={editingSequenceId}
            onBack={handleBackToList}
            onSaveSuccess={handleSaveSuccess}
          />
        )}

        {activeTab === "templates" && (
          <TemplatesList organizationId={organizationId} sessionId={sessionId} />
        )}

        {activeTab === "enrollments" && (
          <EnrollmentsList
            organizationId={organizationId}
            sessionId={sessionId}
            sequenceId={selectedSequenceId}
            onBack={() => setSelectedSequenceId(null)}
          />
        )}

        {activeTab === "settings" && (
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
              <Settings
                className="mx-auto h-16 w-16"
                style={{ color: "var(--neutral-gray)", opacity: 0.3 }}
              />
              <h3 className="mt-4 text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                Sequence Settings
              </h3>
              <p className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                Configure default sending windows, channels, and integrations
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
        borderColor: active ? "var(--win95-text)" : "transparent",
        color: active ? "var(--win95-text)" : "var(--neutral-gray)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
