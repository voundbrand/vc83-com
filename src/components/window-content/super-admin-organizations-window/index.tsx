"use client";

import { useState } from "react";
import { Building2, Plus, Grid3x3, FileText, Package, Cpu, Shield, ShieldCheck } from "lucide-react";
import { SystemOrganizationsTab } from "./system-organizations-tab";
import { OrganizationsListTab } from "./organizations-list-tab";
import { AppAvailabilityTab } from "./app-availability-tab";
import { TemplatesTab } from "./templates-tab";
import { TemplateSetsTab } from "./template-sets-tab";
import { PlatformAiModelsTab } from "./platform-ai-models-tab";
import { BetaAccessTab } from "./beta-access-tab";
import { PlatformAgentTrustTrainingTab } from "./platform-agent-trust-training-tab";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

/**
 * Organizations Window - Tabbed Interface for Organization Management
 *
 * This window provides tabs for different organization management functions:
 * - Organizations: List all organizations user has access to
 * - Create: Create new organizations (super admin only)
 * - App Availability: Manage which apps are available to which orgs (super admin only)
 * - Templates: Manage which templates are available to which orgs (super admin only)
 * - Platform AI Models: Manage which AI models are available platform-wide (super admin only)
 * - Beta Access: Manage platform-wide beta access gating (super admin only)
 */

type TabType =
  | "list"
  | "create"
  | "template-sets"
  | "app-availability"
  | "templates"
  | "platform-ai-models"
  | "beta-access"
  | "platform-agent-trust";

export function OrganizationsWindow() {
  const { t } = useNamespaceTranslations("ui.organizations");
  const [activeTab, setActiveTab] = useState<TabType>("list");

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--window-document-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--window-document-border)' }}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
          {t('ui.organizations.window_title')}
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          {t('ui.organizations.window_subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div
        className="border-b-2 overflow-x-auto"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
      >
        <div className="flex min-w-max">
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "list" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "list" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("list")}
        >
          <Building2 size={14} />
          {t('ui.organizations.tab.list')}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "create" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "create" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("create")}
        >
          <Plus size={14} />
          {t('ui.organizations.tab.create')}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "app-availability" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "app-availability" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("app-availability")}
        >
          <Grid3x3 size={14} />
          App Availability
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "templates" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "templates" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("templates")}
        >
          <FileText size={14} />
          Templates
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "template-sets" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "template-sets" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("template-sets")}
        >
          <Package size={14} />
          Template Sets
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "platform-ai-models" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "platform-ai-models" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("platform-ai-models")}
        >
          <Cpu size={14} />
          Platform AI Models
        </button>
        <button
          className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "beta-access" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "beta-access" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("beta-access")}
        >
          <Shield size={14} />
          Beta Access
        </button>
        <button
          className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: "var(--window-document-border)",
            background: activeTab === "platform-agent-trust" ? "var(--window-document-bg-elevated)" : "var(--window-document-bg)",
            color: activeTab === "platform-agent-trust" ? "var(--window-document-text)" : "var(--neutral-gray)",
          }}
          onClick={() => setActiveTab("platform-agent-trust")}
        >
          <ShieldCheck size={14} />
          Platform Agent Trust
        </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "list" && <OrganizationsListTab />}
        {activeTab === "create" && <SystemOrganizationsTab />}
        {activeTab === "template-sets" && <TemplateSetsTab />}
        {activeTab === "app-availability" && <AppAvailabilityTab />}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "platform-ai-models" && <PlatformAiModelsTab />}
        {activeTab === "beta-access" && <BetaAccessTab />}
        {activeTab === "platform-agent-trust" && <PlatformAgentTrustTrainingTab />}
      </div>
    </div>
  );
}
