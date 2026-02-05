"use client";

import { useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { Loader2, FileText, Mail, File, Globe, ArrowLeft, Maximize2 } from "lucide-react";
import Link from "next/link";
import { TemplateBuilder } from "./template-builder";
import { AllTemplatesTab } from "./all-templates-tab";
import { EmailTemplatesTab } from "./email-templates-tab";
import { PdfTemplatesTab } from "./pdf-templates-tab";
import { TemplateSetsTab } from "./template-sets-tab";
import { WebAppsTab } from "./web-apps-tab";

/**
 * Templates Window
 *
 * Comprehensive template management system following Forms window pattern:
 * - Browse all custom templates (with Active/Inactive tabs)
 * - Explore system email templates library
 * - Explore system PDF templates library
 * - Browse template sets (bundles of templates)
 * - Create/edit templates with schema editor
 *
 * Tabs:
 * - All Templates: Custom organization templates (default)
 * - Email Library: System email templates
 * - PDF Library: System PDF templates
 * - Template Sets: Bundled template collections (v2.0)
 */

type TabType = "all" | "email" | "pdf" | "web" | "sets";

interface TemplatesWindowProps {
  /** When true, shows back-to-desktop navigation (for /templates route) */
  fullScreen?: boolean;
}

export function TemplatesWindow({ fullScreen = false }: TemplatesWindowProps = {}) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.templates");
  const [activeTab, setActiveTab] = useState<TabType>("all"); // Default to All Templates
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Check app availability
  const guard = useAppAvailabilityGuard({
    code: "templates",
    name: "Templates",
    description: "Manage email and PDF templates for events, tickets, invoices, and marketing"
  });

  if (guard) return guard;

  if (!sessionId || !currentOrg) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
            {translationsLoading ? "Loading..." : (t("ui.templates.sign_in_prompt") || "Please sign in to access templates")}
          </p>
        </div>
      </div>
    );
  }

  if (translationsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  // If editing a template, show builder instead of tabs
  if (editingTemplateId) {
    return (
      <TemplateBuilder
        templateId={editingTemplateId as Id<"objects">}
        onBack={() => setEditingTemplateId(null)}
      />
    );
  }

  const handleEditTemplate = (templateId: string) => {
    setEditingTemplateId(templateId);
  };

  const handleEditSchema = (templateId: string) => {
    // TODO: Open schema editor modal or navigate to builder with schema editor open
    setEditingTemplateId(templateId);
  };

  const handleCreateTemplate = () => {
    setEditingTemplateId(null);
    setActiveTab("all");
    // TODO: Open create modal or form
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back to desktop link (full-screen mode only) */}
            {fullScreen && (
              <Link
                href="/"
                className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-button-face)",
                  color: "var(--win95-text)",
                }}
                title="Back to Desktop"
              >
                <ArrowLeft size={14} />
              </Link>
            )}
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
                <FileText size={16} />
                {t("ui.templates.title") || "Templates"}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                {t("ui.templates.subtitle") || "Manage email and PDF templates"}
              </p>
            </div>
          </div>

          {/* Open full screen link (window mode only) */}
          {!fullScreen && (
            <Link
              href="/templates"
              className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
              title="Open Full Screen"
            >
              <Maximize2 size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "all" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "all" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("all")}
        >
          <FileText size={14} />
          All Templates
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "email" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "email" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("email")}
        >
          <Mail size={14} />
          Email Library
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "pdf" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "pdf" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("pdf")}
        >
          <File size={14} />
          PDF Library
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "web" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "web" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("web")}
        >
          <Globe size={14} />
          Web Apps
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "sets" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "sets" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("sets")}
        >
          <FileText size={14} />
          📦 Template Sets
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "all" && (
          <AllTemplatesTab
            onEditTemplate={handleEditTemplate}
            onCreateTemplate={handleCreateTemplate}
            onViewSchema={handleEditSchema}
          />
        )}

        {activeTab === "email" && (
          <EmailTemplatesTab
            onEditTemplate={handleEditTemplate}
            onViewSchema={handleEditSchema}
          />
        )}

        {activeTab === "pdf" && (
          <PdfTemplatesTab
            onEditTemplate={handleEditTemplate}
            onViewSchema={handleEditSchema}
          />
        )}

        {activeTab === "web" && (
          <WebAppsTab
            onEditTemplate={handleEditTemplate}
            onViewSchema={handleEditSchema}
          />
        )}

        {activeTab === "sets" && (
          <TemplateSetsTab />
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
          {activeTab === "all" && "All Templates"}
          {activeTab === "email" && "Email Library"}
          {activeTab === "pdf" && "PDF Library"}
          {activeTab === "web" && "Web Apps"}
          {activeTab === "sets" && "Template Sets"}
        </span>
        <span>{currentOrg?.name || ""}</span>
      </div>
    </div>
  );
}
