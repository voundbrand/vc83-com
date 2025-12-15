"use client";

import { useState } from "react";
import { Globe, FileText, Plus, Settings, BarChart3, Rocket, History } from "lucide-react";
import { PublishedPagesTab } from "./published-pages-tab";
import { CreatePageTab } from "./create-page-tab";
import { DeploymentSettingsTab } from "./deployment-settings-tab";
import { DeploymentDeployTab } from "./deployment-deploy-tab";
import { DeploymentHistoryTab } from "./deployment-history-tab";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Web Publishing Window - Org Owner Interface
 *
 * This window is available to org owners when the Web Publishing app is enabled.
 * It allows them to create and manage published pages using available templates.
 *
 * Tabs:
 * - Published Pages: List of org's published pages (draft, published, unpublished)
 * - Create/Edit Page: Same UI for creating new or editing existing pages
 * - Deployment Settings: Configure GitHub and deployment targets (per-page)
 * - Deploy: Execute deployment with pre-flight checks (per-page)
 * - Deployment History: View deployment timeline (per-page)
 * - Analytics: Page views, conversions (future)
 */

type TabType = "pages" | "create" | "deployment-settings" | "deployment-deploy" | "deployment-history" | "analytics";

interface EditMode {
  pageId: Id<"objects">;
  pageData: {
    _id: Id<"objects">;
    name: string;
    customProperties?: {
      slug: string;
      metaTitle: string;
      metaDescription?: string;
      templateCode?: string;
      themeCode?: string;
      templateContent?: Record<string, unknown>;
    };
  };
}

interface SelectedPage {
  _id: Id<"objects">;
  name: string;
}

export function WebPublishingWindow() {
  const [activeTab, setActiveTab] = useState<TabType>("pages");
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [selectedPage, setSelectedPage] = useState<SelectedPage | null>(null);
  const { t } = useNamespaceTranslations("ui.web_publishing");

  // Check app availability - returns guard component if unavailable/loading, null if available
  const guard = useAppAvailabilityGuard({
    code: "web-publishing",
    name: "Web Publishing",
    description: "Create and manage public web pages using customizable templates"
  });

  if (guard) return guard;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <Globe size={16} />
          {t("ui.web_publishing.header.title")}
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          {t("ui.web_publishing.header.description")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        {/* Pages Tab */}
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "pages" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "pages" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => {
            setActiveTab("pages");
            setSelectedPage(null);
          }}
        >
          <FileText size={14} />
          {t("ui.web_publishing.tab.published_pages")}
        </button>

        {/* Create Page Tab */}
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "create" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "create" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => {
            setEditMode(null);
            setSelectedPage(null);
            setActiveTab("create");
          }}
        >
          <Plus size={14} />
          {t("ui.web_publishing.tab.create_page")}
        </button>

        {/* Deployment Tabs (only show when page is selected) */}
        {selectedPage && (
          <>
            <button
              className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
              style={{
                borderColor: 'var(--win95-border)',
                background: activeTab === "deployment-settings" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
                color: activeTab === "deployment-settings" ? 'var(--win95-text)' : 'var(--neutral-gray)'
              }}
              onClick={() => setActiveTab("deployment-settings")}
              title={`Deployment settings for ${selectedPage.name}`}
            >
              <Settings size={14} />
              Settings
            </button>
            <button
              className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
              style={{
                borderColor: 'var(--win95-border)',
                background: activeTab === "deployment-deploy" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
                color: activeTab === "deployment-deploy" ? 'var(--win95-text)' : 'var(--neutral-gray)'
              }}
              onClick={() => setActiveTab("deployment-deploy")}
              title={`Deploy ${selectedPage.name}`}
            >
              <Rocket size={14} />
              Deploy
            </button>
            <button
              className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
              style={{
                borderColor: 'var(--win95-border)',
                background: activeTab === "deployment-history" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
                color: activeTab === "deployment-history" ? 'var(--win95-text)' : 'var(--neutral-gray)'
              }}
              onClick={() => setActiveTab("deployment-history")}
              title={`Deployment history for ${selectedPage.name}`}
            >
              <History size={14} />
              History
            </button>
          </>
        )}

        {/* Analytics Tab (future) */}
        <button
          className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 opacity-50 cursor-not-allowed"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)',
            color: 'var(--neutral-gray)'
          }}
          disabled
          title={t("ui.web_publishing.tab.coming_soon")}
        >
          <BarChart3 size={14} />
          {t("ui.web_publishing.tab.analytics")}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Pages List */}
        {activeTab === "pages" && (
          <PublishedPagesTab
            onEditPage={(page) => {
              setEditMode({
                pageId: page._id,
                pageData: page,
              });
              setActiveTab("create");
            }}
            onSelectPage={(page) => {
              setSelectedPage({
                _id: page._id,
                name: page.name,
              });
              setActiveTab("deployment-settings");
            }}
          />
        )}

        {/* Create/Edit Page */}
        {activeTab === "create" && (
          <CreatePageTab
            editMode={editMode}
          />
        )}

        {/* Deployment Settings */}
        {activeTab === "deployment-settings" && selectedPage && (
          <DeploymentSettingsTab
            pageId={selectedPage._id}
            pageName={selectedPage.name}
          />
        )}

        {/* Deployment Deploy */}
        {activeTab === "deployment-deploy" && selectedPage && (
          <DeploymentDeployTab
            pageId={selectedPage._id}
            pageName={selectedPage.name}
          />
        )}

        {/* Deployment History */}
        {activeTab === "deployment-history" && selectedPage && (
          <DeploymentHistoryTab
            pageId={selectedPage._id}
            pageName={selectedPage.name}
          />
        )}

        {/* Analytics (future) */}
        {activeTab === "analytics" && (
          <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.web_publishing.tab.coming_soon")}...
          </div>
        )}
      </div>
    </div>
  );
}
