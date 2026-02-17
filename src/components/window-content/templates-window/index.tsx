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
import {
  InteriorHeader,
  InteriorRoot,
  InteriorSubtitle,
  InteriorTabButton,
  InteriorTabRow,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";

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
      <InteriorRoot className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
            {translationsLoading ? "Loading..." : (t("ui.templates.sign_in_prompt") || "Please sign in to access templates")}
          </p>
        </div>
      </InteriorRoot>
    );
  }

  if (translationsLoading) {
    return (
      <InteriorRoot className="flex h-full items-center justify-center">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--tone-accent-strong)" }} />
      </InteriorRoot>
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
                {t("ui.templates.title") || "Templates"}
              </InteriorTitle>
              <InteriorSubtitle className="mt-1 text-xs">
                {t("ui.templates.subtitle") || "Manage email and PDF templates"}
              </InteriorSubtitle>
            </div>
          </div>

          {/* Open full screen link (window mode only) */}
          {!fullScreen && (
            <Link
              href="/templates"
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
        <InteriorTabButton active={activeTab === "all"} className="flex items-center gap-2" onClick={() => setActiveTab("all")}>
          <FileText size={14} />
          All Templates
        </InteriorTabButton>
        <InteriorTabButton active={activeTab === "email"} className="flex items-center gap-2" onClick={() => setActiveTab("email")}>
          <Mail size={14} />
          Email Library
        </InteriorTabButton>
        <InteriorTabButton active={activeTab === "pdf"} className="flex items-center gap-2" onClick={() => setActiveTab("pdf")}>
          <File size={14} />
          PDF Library
        </InteriorTabButton>
        <InteriorTabButton active={activeTab === "web"} className="flex items-center gap-2" onClick={() => setActiveTab("web")}>
          <Globe size={14} />
          Web Apps
        </InteriorTabButton>
        <InteriorTabButton active={activeTab === "sets"} className="flex items-center gap-2" onClick={() => setActiveTab("sets")}>
          <FileText size={14} />
          Template Sets
        </InteriorTabButton>
      </InteriorTabRow>

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
        className="border-t px-4 py-1 text-xs flex items-center justify-between"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--desktop-shell-accent)",
          color: "var(--desktop-menu-text-muted)",
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
    </InteriorRoot>
  );
}
