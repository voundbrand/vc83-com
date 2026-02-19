"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, FileText, Plus, BarChart3, Rocket, Settings, Box, ArrowLeft, Maximize2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { PublishedPagesTab } from "./published-pages-tab";
import { CreatePageTab } from "./create-page-tab";
import { DeploymentsTab } from "./deployments-tab";
import { DeploymentSettingsTab } from "./deployment-settings-tab";
import { ApplicationsTab } from "./applications-tab";
import { ApplicationDetailsTab } from "./application-details-tab";
import { WebchatDeploymentTab } from "./webchat-deployment-tab";
import { VercelDeploymentModal } from "./vercel-deployment-modal";
import { EnvVarsModal } from "./env-vars-modal";
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
 * - Deployments: List of deployments for selected page
 * - Settings: Contextual settings for selected deployment
 * - Analytics: Page views, conversions (future)
 */

type TabType =
  | "pages"
  | "create"
  | "deployments"
  | "settings"
  | "applications"
  | "application-details"
  | "webchat-deployment"
  | "analytics";

interface SelectedApplication {
  _id: Id<"objects">;
  name: string;
}

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

interface SelectedDeployment {
  id: string;
  name: string;
  provider?: string;
  status?: string;
  lastDeployed?: number | null;
  deployedUrl?: string | null;
  githubRepo?: string;
  vercelUrl?: string;
}

interface WebPublishingWindowProps {
  /** When true, shows back-to-desktop navigation (for /publish route) */
  fullScreen?: boolean;
  initialTab?: TabType | string;
  initialPanel?: string;
}

function resolveInitialTab(input?: string): TabType {
  if (input === "webchat" || input === "webchat-deployment") {
    return "webchat-deployment";
  }
  if (
    input === "pages" ||
    input === "create" ||
    input === "deployments" ||
    input === "settings" ||
    input === "applications" ||
    input === "application-details" ||
    input === "analytics"
  ) {
    return input;
  }
  return "pages";
}

export function WebPublishingWindow({
  fullScreen = false,
  initialTab,
  initialPanel,
}: WebPublishingWindowProps = {}) {
  const requestedInitialTab = useMemo(
    () => resolveInitialTab(initialTab || initialPanel),
    [initialPanel, initialTab]
  );
  const [activeTab, setActiveTab] = useState<TabType>(requestedInitialTab);
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [selectedPage, setSelectedPage] = useState<SelectedPage | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<SelectedDeployment | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showEnvVarsModal, setShowEnvVarsModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<SelectedApplication | null>(null);
  const { t } = useNamespaceTranslations("ui.web_publishing");

  useEffect(() => {
    setActiveTab(requestedInitialTab);
  }, [requestedInitialTab]);

  // Check app availability - returns guard component if unavailable/loading, null if available
  const guard = useAppAvailabilityGuard({
    code: "web-publishing",
    name: "Web Publishing",
    description: "Create and manage public web pages using customizable templates"
  });

  if (guard) return guard;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--window-document-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--window-document-border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back to desktop link (full-screen mode only) */}
            {fullScreen && (
              <Link
                href="/"
                className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
                title="Back to Desktop"
              >
                <ArrowLeft size={14} />
              </Link>
            )}
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--window-document-text)' }}>
                <Globe size={16} />
                {t("ui.web_publishing.header.title")}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                {t("ui.web_publishing.header.description")}
              </p>
            </div>
          </div>

          {/* Open full screen link (window mode only) */}
          {!fullScreen && (
            <Link
              href="/publish"
              className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
              title="Open Full Screen"
            >
              <Maximize2 size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
        {/* Pages Tab */}
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "pages" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "pages" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("pages")}
        >
          <FileText size={14} />
          {t("ui.web_publishing.tab.published_pages")}
        </button>

        {/* Create Page Tab */}
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "create" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "create" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => {
            setEditMode(null);
            setActiveTab("create");
          }}
        >
          <Plus size={14} />
          {t("ui.web_publishing.tab.create_page")}
        </button>

        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "webchat-deployment" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "webchat-deployment" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("webchat-deployment")}
        >
          <MessageSquare size={14} />
          Webchat Deployment
        </button>

        {/* Deployment Tabs (only show when page is selected) */}
        {selectedPage && (
          <>
            <button
              className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
              style={{
                borderColor: 'var(--window-document-border)',
                background: activeTab === "deployments" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
                color: activeTab === "deployments" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
              }}
              onClick={() => setActiveTab("deployments")}
              title={`Deployments for ${selectedPage.name}`}
            >
              <Rocket size={14} />
              Deployments
            </button>
            {selectedDeployment && (
              <button
                className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
                style={{
                  borderColor: 'var(--window-document-border)',
                  background: activeTab === "settings" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
                  color: activeTab === "settings" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
                }}
                onClick={() => setActiveTab("settings")}
                title={`Settings for ${selectedDeployment.name}`}
              >
                <Settings size={14} />
                Settings
              </button>
            )}
          </>
        )}

        {/* Applications Tab */}
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "applications" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "applications" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("applications")}
        >
          <Box size={14} />
          Applications
        </button>

        {/* Analytics Tab (future) */}
        <button
          className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 opacity-50 cursor-not-allowed"
          style={{
            borderColor: 'var(--window-document-border)',
            background: 'var(--window-document-bg)',
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
            onSelectPageForDeployment={(page) => {
              setSelectedPage(page);
              setSelectedDeployment(null);
              setActiveTab("deployments");
            }}
          />
        )}

        {/* Create/Edit Page */}
        {activeTab === "create" && (
          <CreatePageTab
            editMode={editMode}
          />
        )}

        {/* Deployments List */}
        {activeTab === "deployments" && selectedPage && (
          <DeploymentsTab
            pageId={selectedPage._id}
            pageName={selectedPage.name}
            selectedDeploymentId={selectedDeployment?.id}
            onSelectDeployment={(deployment) => {
              setSelectedDeployment(deployment);
              setActiveTab("settings");
            }}
            onAddDeployment={() => {
              setShowDeployModal(true);
            }}
            onOpenWebchatDeployment={() => {
              setActiveTab("webchat-deployment");
            }}
          />
        )}

        {activeTab === "webchat-deployment" && (
          <WebchatDeploymentTab />
        )}

        {/* Deployment Settings */}
        {activeTab === "settings" && selectedPage && selectedDeployment && (
          <DeploymentSettingsTab
            pageId={selectedPage._id}
            pageName={selectedPage.name}
            deployment={selectedDeployment}
            onOpenEnvVarsModal={() => setShowEnvVarsModal(true)}
          />
        )}

        {/* Connected Applications */}
        {activeTab === "applications" && (
          <ApplicationsTab
            onSelectApplication={(app) => {
              setSelectedApplication({ _id: app._id, name: app.name });
              setActiveTab("application-details");
            }}
          />
        )}

        {/* Application Details (Activity Protocol, Pages, Settings) */}
        {activeTab === "application-details" && selectedApplication && (
          <ApplicationDetailsTab
            applicationId={selectedApplication._id}
            applicationName={selectedApplication.name}
            onBack={() => {
              setSelectedApplication(null);
              setActiveTab("applications");
            }}
          />
        )}

        {/* Analytics (future) */}
        {activeTab === "analytics" && (
          <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.web_publishing.tab.coming_soon")}...
          </div>
        )}
      </div>

      {/* Vercel Deployment Modal */}
      {showDeployModal && selectedPage && (
        <VercelDeploymentModal
          page={{
            _id: selectedPage._id,
            name: selectedPage.name,
          }}
          onClose={() => setShowDeployModal(false)}
          onEditPage={() => {
            setShowDeployModal(false);
            // Could open settings modal here
          }}
        />
      )}

      {/* Env Vars Modal */}
      {showEnvVarsModal && selectedPage && (
        <EnvVarsModal
          page={{
            _id: selectedPage._id,
            name: selectedPage.name,
          }}
          onClose={() => setShowEnvVarsModal(false)}
          onSaved={() => {
            setShowEnvVarsModal(false);
          }}
        />
      )}
    </div>
  );
}
