"use client";

import { useEffect, useState } from "react";
import { Building2, Plus, Grid3x3, FileText, Package, Cpu, Shield, ShieldCheck, Ticket, BarChart3, Database, DollarSign, Users, FlaskConical, RadioTower } from "lucide-react";
import { SystemOrganizationsTab } from "./system-organizations-tab";
import { OrganizationsListTab } from "./organizations-list-tab";
import { AppAvailabilityTab } from "./app-availability-tab";
import { TemplatesTab } from "./templates-tab";
import { TemplateSetsTab } from "./template-sets-tab";
import { PlatformAiModelsTab } from "./platform-ai-models-tab";
import { BetaAccessTab } from "./beta-access-tab";
import { PlatformAgentTrustTrainingTab } from "./platform-agent-trust-training-tab";
import { CreditRedemptionCodesTab } from "./credit-redemption-codes-tab";
import { SupportAgentQualityTab } from "./support-agent-quality-tab";
import { QaRunsTab } from "./qa-runs-tab";
import { AgentControlCenterTab } from "./agent-control-center-tab";
import { PlatformEconomicsTab } from "./platform-economics-tab";
import { SuperAdminUsersTab } from "./super-admin-users-tab";
import { PlatformMotherRolloutTab } from "./platform-mother-rollout-tab";
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
  | "platform-agent-trust"
  | "credit-redemption-codes"
  | "platform-economics"
  | "support-agent-quality"
  | "qa-runs"
  | "agent-control-center"
  | "platform-mother"
  | "users";

interface OrganizationsWindowProps {
  initialTab?: string;
  initialPanel?: string;
}

const ORGANIZATIONS_WINDOW_TABS: TabType[] = [
  "list",
  "create",
  "template-sets",
  "app-availability",
  "templates",
  "platform-ai-models",
  "beta-access",
  "platform-agent-trust",
  "credit-redemption-codes",
  "platform-economics",
  "support-agent-quality",
  "qa-runs",
  "agent-control-center",
  "platform-mother",
  "users",
];

function resolveOrganizationsWindowTab(tabOrPanel?: string): TabType {
  if (!tabOrPanel) {
    return "list";
  }

  if ((ORGANIZATIONS_WINDOW_TABS as string[]).includes(tabOrPanel)) {
    return tabOrPanel as TabType;
  }

  return "list";
}

export function OrganizationsWindow({ initialTab, initialPanel }: OrganizationsWindowProps = {}) {
  const { t } = useNamespaceTranslations("ui.organizations");
  const [activeTab, setActiveTab] = useState<TabType>(() =>
    resolveOrganizationsWindowTab(initialTab || initialPanel)
  );

  useEffect(() => {
    setActiveTab(resolveOrganizationsWindowTab(initialTab || initialPanel));
  }, [initialPanel, initialTab]);

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
        className="border-b-2"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
      >
        <div className="flex flex-wrap gap-px p-1">
        <button
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
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
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
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
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
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
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
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
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
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
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
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
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
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
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
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
        <button
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: "var(--window-document-border)",
            background: activeTab === "credit-redemption-codes" ? "var(--window-document-bg-elevated)" : "var(--window-document-bg)",
            color: activeTab === "credit-redemption-codes" ? "var(--window-document-text)" : "var(--neutral-gray)",
          }}
          onClick={() => setActiveTab("credit-redemption-codes")}
        >
          <Ticket size={14} />
          Credit Codes
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: "var(--window-document-border)",
            background: activeTab === "platform-economics" ? "var(--window-document-bg-elevated)" : "var(--window-document-bg)",
            color: activeTab === "platform-economics" ? "var(--window-document-text)" : "var(--neutral-gray)",
          }}
          onClick={() => setActiveTab("platform-economics")}
        >
          <DollarSign size={14} />
          AI Economics
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: "var(--window-document-border)",
            background: activeTab === "support-agent-quality" ? "var(--window-document-bg-elevated)" : "var(--window-document-bg)",
            color: activeTab === "support-agent-quality" ? "var(--window-document-text)" : "var(--neutral-gray)",
          }}
          onClick={() => setActiveTab("support-agent-quality")}
        >
          <BarChart3 size={14} />
          Support Quality
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: "var(--window-document-border)",
            background: activeTab === "qa-runs" ? "var(--window-document-bg-elevated)" : "var(--window-document-bg)",
            color: activeTab === "qa-runs" ? "var(--window-document-text)" : "var(--neutral-gray)",
          }}
          onClick={() => setActiveTab("qa-runs")}
        >
          <FlaskConical size={14} />
          QA Runs
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: "var(--window-document-border)",
            background: activeTab === "agent-control-center" ? "var(--window-document-bg-elevated)" : "var(--window-document-bg)",
            color: activeTab === "agent-control-center" ? "var(--window-document-text)" : "var(--neutral-gray)",
          }}
          onClick={() => setActiveTab("agent-control-center")}
        >
          <Database size={14} />
          Agent Control
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: "var(--window-document-border)",
            background: activeTab === "platform-mother" ? "var(--window-document-bg-elevated)" : "var(--window-document-bg)",
            color: activeTab === "platform-mother" ? "var(--window-document-text)" : "var(--neutral-gray)",
          }}
          onClick={() => setActiveTab("platform-mother")}
        >
          <RadioTower size={14} />
          Platform Mother
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border transition-colors flex items-center gap-2 shrink-0"
          style={{
            borderColor: "var(--window-document-border)",
            background: activeTab === "users" ? "var(--window-document-bg-elevated)" : "var(--window-document-bg)",
            color: activeTab === "users" ? "var(--window-document-text)" : "var(--neutral-gray)",
          }}
          onClick={() => setActiveTab("users")}
        >
          <Users size={14} />
          Users
        </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "list" && <OrganizationsListTab />}
        {activeTab === "create" && <SystemOrganizationsTab />}
        {activeTab === "template-sets" && <TemplateSetsTab />}
        {activeTab === "app-availability" && <AppAvailabilityTab />}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "platform-ai-models" && <PlatformAiModelsTab />}
        {activeTab === "beta-access" && <BetaAccessTab />}
        {activeTab === "platform-agent-trust" && <PlatformAgentTrustTrainingTab />}
        {activeTab === "credit-redemption-codes" && <CreditRedemptionCodesTab />}
        {activeTab === "platform-economics" && <PlatformEconomicsTab />}
        {activeTab === "support-agent-quality" && <SupportAgentQualityTab />}
        {activeTab === "qa-runs" && <QaRunsTab />}
        {activeTab === "agent-control-center" && <AgentControlCenterTab />}
        {activeTab === "platform-mother" && <PlatformMotherRolloutTab />}
        {activeTab === "users" && <SuperAdminUsersTab />}
      </div>
    </div>
  );
}
