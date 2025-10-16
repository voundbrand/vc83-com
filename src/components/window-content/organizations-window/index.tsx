"use client";

import { useState } from "react";
import { Building2, Plus, Grid3x3, FileText, Receipt } from "lucide-react";
import { SystemOrganizationsTab } from "./system-organizations-tab";
import { OrganizationsListTab } from "./organizations-list-tab";
import { AppAvailabilityTab } from "./app-availability-tab";
import { TemplatesTab } from "./templates-tab";
import { TaxSettingsTab } from "./tax-settings-tab";
import { useTranslation } from "@/contexts/translation-context";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Id } from "../../../../convex/_generated/dataModel";

/**
 * Organizations Window - Tabbed Interface for Organization Management
 *
 * This window provides tabs for different organization management functions:
 * - Organizations: List all organizations user has access to
 * - Create: Create new organizations (super admin only)
 * - App Availability: Manage which apps are available to which orgs (super admin only)
 * - Templates: Manage which templates are available to which orgs (super admin only)
 */

type TabType = "list" | "create" | "app-availability" | "templates" | "tax-settings";

export function OrganizationsWindow() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("list");
  const { sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organizationId = currentOrganization?.id;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
          {t('ui.organizations.window_title')}
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          {t('ui.organizations.window_subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "list" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "list" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("list")}
        >
          <Building2 size={14} />
          {t('ui.organizations.tab.list')}
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
          {t('ui.organizations.tab.create')}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "app-availability" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "app-availability" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("app-availability")}
        >
          <Grid3x3 size={14} />
          App Availability
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "templates" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "templates" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("templates")}
        >
          <FileText size={14} />
          Templates
        </button>
        <button
          className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "tax-settings" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "tax-settings" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("tax-settings")}
        >
          <Receipt size={14} />
          Tax Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "list" && <OrganizationsListTab />}
        {activeTab === "create" && <SystemOrganizationsTab />}
        {activeTab === "app-availability" && <AppAvailabilityTab />}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "tax-settings" && sessionId && organizationId && (
          <TaxSettingsTab
            sessionId={sessionId}
            organizationId={organizationId as Id<"organizations">}
          />
        )}
      </div>
    </div>
  );
}
