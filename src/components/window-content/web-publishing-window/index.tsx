"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Globe,
  FileText,
  Plus,
  BarChart3,
  Rocket,
  Settings,
  Box,
  Type,
  ArrowLeft,
  Maximize2,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { PublishedPagesTab } from "./published-pages-tab";
import { CreatePageTab } from "./create-page-tab";
import { DeploymentsTab } from "./deployments-tab";
import { DeploymentSettingsTab } from "./deployment-settings-tab";
import { ApplicationsTab } from "./applications-tab";
import { ApplicationDetailsTab } from "./application-details-tab";
import { WebchatDeploymentTab } from "./webchat-deployment-tab";
import { VercelDeploymentModal } from "./vercel-deployment-modal";
import { EnvVarsModal } from "./env-vars-modal";
import { CmsCopyTab } from "./cms-copy-tab";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { InteriorTabButton } from "@/components/window-content/shared/interior-primitives";
import { InteriorButton } from "@/components/ui/interior-button";
import type { Id } from "../../../../convex/_generated/dataModel";

// Dynamic require avoids TS2589 deep type instantiation in window surface components.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../../convex/_generated/api") as { api: any };

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
  | "cms-copy"
  | "webchat-deployment"
  | "analytics";

interface SelectedApplication {
  _id: Id<"objects">;
  name: string;
}

interface ConnectedApplicationListItem {
  _id: Id<"objects">;
  name: string;
  status: string;
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
    input === "cms-copy" ||
    input === "analytics"
  ) {
    return input;
  }
  return "pages";
}

interface WebPublishingTabDescriptor {
  key: TabType;
  icon: LucideIcon;
  label: string;
  title?: string;
  disabled?: boolean;
  onSelect?: () => void;
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
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t } = useNamespaceTranslations("ui.web_publishing");
  const unsafeUseQuery = useQuery as unknown as (queryRef: unknown, args?: unknown) => unknown;

  const connectedApplications = unsafeUseQuery(
    apiAny.applicationOntology.getApplications,
    sessionId && currentOrg?.id
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  ) as ConnectedApplicationListItem[] | undefined;

  useEffect(() => {
    if (!connectedApplications) {
      return;
    }
    if (!selectedApplication) {
      if (connectedApplications.length === 1) {
        const only = connectedApplications[0];
        setSelectedApplication({ _id: only._id, name: only.name });
      }
      return;
    }
    const stillExists = connectedApplications.find((app) => app._id === selectedApplication._id);
    if (!stillExists) {
      setSelectedApplication(null);
    }
  }, [connectedApplications, selectedApplication]);

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

  const tabs: WebPublishingTabDescriptor[] = [
    {
      key: "pages",
      icon: FileText,
      label: t("ui.web_publishing.tab.published_pages"),
    },
    {
      key: "create",
      icon: Plus,
      label: t("ui.web_publishing.tab.create_page"),
      onSelect: () => {
        setEditMode(null);
        setActiveTab("create");
      },
    },
    {
      key: "webchat-deployment",
      icon: MessageSquare,
      label: "Webchat Deployment",
    },
    ...(selectedPage
      ? [
          {
            key: "deployments" as const,
            icon: Rocket,
            label: "Deployments",
            title: `Deployments for ${selectedPage.name}`,
          },
        ]
      : []),
    ...(selectedDeployment
      ? [
          {
            key: "settings" as const,
            icon: Settings,
            label: "Settings",
            title: `Settings for ${selectedDeployment.name}`,
          },
        ]
      : []),
    {
      key: "applications",
      icon: Box,
      label: "Applications",
    },
    {
      key: "cms-copy",
      icon: Type,
      label: "CMS Copy",
      title: selectedApplication ? `CMS Copy for ${selectedApplication.name}` : "Select app in CMS Copy",
    },
    {
      key: "analytics",
      icon: BarChart3,
      label: t("ui.web_publishing.tab.analytics"),
      disabled: true,
      title: t("ui.web_publishing.tab.coming_soon"),
    },
  ];

  const headerActionClass = "desktop-interior-button h-8 px-2.5 text-xs font-semibold flex items-center gap-2";

  return (
    <div className="web-publishing-modern-shell desktop-interior-root flex h-full flex-col">
      {/* Header */}
      <div className="web-publishing-modern-header desktop-interior-header px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back to desktop link (full-screen mode only) */}
            {fullScreen && (
              <Link
                href="/"
                className={headerActionClass}
                title="Back to Desktop"
              >
                <ArrowLeft size={14} />
              </Link>
            )}
            <div>
              <h2 className="desktop-interior-title text-sm flex items-center gap-2">
                <Globe size={16} />
                {t("ui.web_publishing.header.title")}
              </h2>
              <p className="desktop-interior-subtitle mt-1">
                {t("ui.web_publishing.header.description")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/builder/new?launch=event&source=web-publishing"
              className={headerActionClass}
              title="Open Builder launch flow"
            >
              <Rocket size={14} />
              Launch Flow
            </Link>

            {/* Open full screen link (window mode only) */}
            {!fullScreen && (
              <Link
                href="/publish"
                className={headerActionClass}
                title="Open Full Screen"
              >
                <Maximize2 size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="desktop-interior-tab-row web-publishing-modern-tab-row">
        {tabs.map((tab) => (
          <InteriorTabButton
            key={tab.key}
            active={activeTab === tab.key}
            disabled={tab.disabled}
            title={tab.title}
            className="h-8 shrink-0 px-3 text-xs font-semibold flex items-center gap-2"
            onClick={() => {
              if (tab.disabled) {
                return;
              }
              if (tab.onSelect) {
                tab.onSelect();
                return;
              }
              setActiveTab(tab.key);
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </InteriorTabButton>
        ))}
      </div>

      {/* Tab Content */}
      <div className="web-publishing-modern-content flex-1 overflow-y-auto">
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

        {activeTab === "cms-copy" && (
          <div className="h-full flex flex-col">
            <div
              className="px-4 py-3 border-b flex items-center gap-2"
              style={{ borderColor: "var(--window-document-border)" }}
            >
              <label
                className="text-xs font-semibold"
                style={{ color: "var(--neutral-gray)" }}
                htmlFor="cms-copy-application-select"
              >
                Application
              </label>
              <select
                id="cms-copy-application-select"
                value={selectedApplication ? String(selectedApplication._id) : ""}
                onChange={(event) => {
                  const next = connectedApplications?.find(
                    (app) => String(app._id) === event.target.value
                  );
                  setSelectedApplication(next ? { _id: next._id, name: next.name } : null);
                }}
                className="px-2 py-1 text-xs border-2 min-w-[260px]"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "white",
                  color: "var(--window-document-text)",
                }}
              >
                <option value="">Select connected app</option>
                {(connectedApplications || []).map((app) => (
                  <option key={app._id} value={app._id}>
                    {app.name} ({app.status})
                  </option>
                ))}
              </select>
              <InteriorButton
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab("applications")}
              >
                Manage Apps
              </InteriorButton>
            </div>

            {!sessionId && (
              <div className="p-4 text-xs desktop-interior-subtitle">
                Please log in to edit CMS copy.
              </div>
            )}

            {sessionId && connectedApplications === undefined && (
              <div className="p-4 text-xs desktop-interior-subtitle">
                Loading connected applications...
              </div>
            )}

            {sessionId &&
              connectedApplications &&
              connectedApplications.length === 0 && (
                <div className="p-4 text-xs desktop-interior-subtitle">
                  No connected applications found. Connect an app first in the Applications tab.
                </div>
              )}

            {sessionId &&
              connectedApplications &&
              connectedApplications.length > 0 &&
              !selectedApplication && (
                <div className="p-4 text-xs desktop-interior-subtitle">
                  Select an application from the dropdown to load CMS copy.
                </div>
              )}

            {sessionId && selectedApplication && (
              <CmsCopyTab
                applicationId={selectedApplication._id}
                applicationName={selectedApplication.name}
              />
            )}
          </div>
        )}

        {/* Analytics (future) */}
        {activeTab === "analytics" && (
          <div className="p-4 text-xs desktop-interior-subtitle">
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
