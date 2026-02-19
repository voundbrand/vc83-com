"use client";

/**
 * BUILDER APPS TAB
 *
 * Lists v0-generated deployable applications.
 * Shows app status, deployment info, and quick actions.
 */

import { useState } from "react";
import {
  Sparkles,
  Github,
  ExternalLink,
  Rocket,
  Archive,
  Trash2,
  Link as LinkIcon,
  Clock,
  Code,
  FolderGit2,
  RefreshCw,
} from "lucide-react";
import { InteriorButton } from "@/components/ui/interior-button";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import type { Id } from "../../../../convex/_generated/dataModel";

interface BuilderAppCustomProps {
  appCode?: string;
  v0ChatId?: string;
  v0WebUrl?: string;
  v0DemoUrl?: string;
  generatedFiles?: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  sdkVersion?: string;
  linkedObjects?: {
    events: Id<"objects">[];
    products: Id<"objects">[];
    forms: Id<"objects">[];
    contacts: Id<"objects">[];
  };
  deployment?: {
    githubRepo?: string | null;
    githubBranch?: string;
    vercelProjectId?: string | null;
    vercelDeployUrl?: string | null;
    productionUrl?: string | null;
    status?: string;
    lastDeployedAt?: number | null;
    deploymentError?: string | null;
  };
}

interface BuilderApp {
  _id: Id<"objects">;
  name: string;
  description?: string;
  status: string;
  subtype?: string;
  customProperties?: BuilderAppCustomProps;
  createdAt?: number;
  updatedAt?: number;
}

interface BuilderAppsTabProps {
  onSelectApp?: (app: BuilderApp) => void;
  onDeployApp?: (app: BuilderApp) => void;
}

/**
 * Builder Apps Tab - List of v0-generated deployable applications
 */
export function BuilderAppsTab({ onSelectApp, onDeployApp }: BuilderAppsTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreatingRepo, setIsCreatingRepo] = useState<Id<"objects"> | null>(null);

  // Query builder apps
  // Note: Using explicit any casts to work around Convex type complexity causing
  // "Type instantiation is excessively deep" errors in large APIs
  const queryArgs = sessionId && currentOrg?.id
    ? {
        sessionId,
        organizationId: currentOrg.id as Id<"organizations">,
        status: statusFilter !== "all" ? statusFilter : undefined,
      }
    : "skip";
  const apps = useQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.builderAppOntology as any).getBuilderApps,
    queryArgs
  ) as BuilderApp[] | undefined;

  // Mutations
  // Note: Using explicit any casts to work around Convex type complexity causing
  // "Type instantiation is excessively deep" errors in large APIs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const archiveApp = useMutation((api.builderAppOntology as any).archiveBuilderApp);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deleteApp = useMutation((api.builderAppOntology as any).deleteBuilderApp);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateDeployUrl = useMutation((api.builderAppOntology as any).generateBuilderAppDeployUrl);

  // Actions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createGitHubRepo = useAction((api.integrations.github as any).createRepoFromBuilderApp);

  const handleArchive = async (appId: Id<"objects">) => {
    if (!sessionId) return;
    try {
      await archiveApp({ sessionId, appId });
      notification.success("Success", "Builder app archived successfully");
    } catch (error) {
      console.error("Failed to archive app:", error);
      notification.error("Error", "Failed to archive builder app");
    }
  };

  const handleDelete = async (appId: Id<"objects">) => {
    if (!sessionId) return;
    try {
      await deleteApp({ sessionId, appId });
      notification.success("Success", "Builder app deleted permanently");
    } catch (error) {
      console.error("Failed to delete app:", error);
      notification.error("Error", "Failed to delete builder app");
    }
  };

  const handleCreateRepo = async (app: BuilderApp) => {
    if (!sessionId || !currentOrg?.id) return;

    setIsCreatingRepo(app._id);
    try {
      const repoName = app.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const result = await createGitHubRepo({
        sessionId,
        organizationId: currentOrg.id as Id<"organizations">,
        appId: app._id,
        repoName,
        description: app.description || `${app.name} - Built with l4yercak3 and v0`,
        isPrivate: true,
      });

      notification.success("Repository Created", `Created ${result.repoUrl}`);

      // Auto-generate Vercel deploy URL
      await generateDeployUrl({
        sessionId,
        appId: app._id,
        githubRepo: result.repoUrl,
      });

      notification.success("Deploy URL Generated", "Ready to deploy to Vercel");
    } catch (error) {
      console.error("Failed to create repo:", error);
      notification.error("Error", error instanceof Error ? error.message : "Failed to create GitHub repository");
    } finally {
      setIsCreatingRepo(null);
    }
  };

  const handleDeployToVercel = (app: BuilderApp) => {
    const deployUrl = app.customProperties?.deployment?.vercelDeployUrl;
    if (deployUrl) {
      window.open(deployUrl, "_blank");
    } else if (onDeployApp) {
      onDeployApp(app);
    }
  };

  if (!sessionId) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
        Please log in to view builder apps.
      </div>
    );
  }

  if (apps === undefined) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
        Loading builder apps...
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "deployed":
        return "var(--success)";
      case "ready":
        return "var(--primary)";
      case "deploying":
        return "var(--warning)";
      case "draft":
      case "generating":
        return "var(--neutral-gray)";
      case "failed":
        return "var(--error)";
      case "archived":
        return "var(--neutral-gray)";
      default:
        return "var(--neutral-gray)";
    }
  };

  const getDeploymentStatus = (deployment?: BuilderAppCustomProps["deployment"]) => {
    if (!deployment) return { label: "Not Configured", color: "var(--neutral-gray)" };
    if (deployment.productionUrl) return { label: "Live", color: "var(--success)" };
    if (deployment.vercelDeployUrl) return { label: "Ready to Deploy", color: "var(--primary)" };
    if (deployment.githubRepo) return { label: "Repo Created", color: "var(--warning)" };
    return { label: "Not Configured", color: "var(--neutral-gray)" };
  };

  const formatRelativeTime = (timestamp?: number | null) => {
    if (!timestamp) return "Never";
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getTotalLinkedObjects = (linked?: BuilderAppCustomProps["linkedObjects"]) => {
    if (!linked) return 0;
    return (
      (linked.events?.length || 0) +
      (linked.products?.length || 0) +
      (linked.forms?.length || 0) +
      (linked.contacts?.length || 0)
    );
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            Builder Apps
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            v0-generated Next.js applications ready for deployment
          </p>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2 py-1 text-xs border-2"
          style={{
            borderColor: "var(--window-document-border)",
            background: "white",
            color: "var(--window-document-text)",
          }}
        >
          <option value="all">All Status</option>
          <option value="ready">Ready</option>
          <option value="deployed">Deployed</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Apps List */}
      {apps.length === 0 ? (
        <div
          className="border-2 p-6 text-center"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          <Sparkles size={48} className="mx-auto mb-4" style={{ color: "var(--primary)" }} />
          <h4 className="text-sm font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
            No Builder Apps Yet
          </h4>
          <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
            Create your first v0-powered app using the AI Builder.
            <br />
            Open the Builder window and select "v0" as your AI provider.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => {
            const props = app.customProperties || {};
            const deployment = props.deployment;
            const deploymentStatus = getDeploymentStatus(deployment);
            const linkedCount = getTotalLinkedObjects(props.linkedObjects);
            const fileCount = props.generatedFiles?.length || 0;

            return (
              <div
                key={app._id}
                className="border-2 p-4 transition-colors"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "white",
                }}
              >
                <div className="flex items-start justify-between">
                  {/* Left: App info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={18} style={{ color: "var(--primary)" }} />
                      <h4 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                        {app.name}
                      </h4>
                      <span
                        className="px-2 py-0.5 text-xs font-bold"
                        style={{
                          background: getStatusColor(app.status),
                          color: "white",
                        }}
                      >
                        {app.status.toUpperCase()}
                      </span>
                      {props.appCode && (
                        <span
                          className="px-2 py-0.5 text-xs"
                          style={{
                            background: "var(--window-document-bg-elevated)",
                            color: "var(--neutral-gray)",
                            border: "1px solid var(--window-document-border)",
                          }}
                        >
                          {props.appCode}
                        </span>
                      )}
                    </div>

                    {app.description && (
                      <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                        {app.description}
                      </p>
                    )}

                    {/* Details */}
                    <div className="space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {/* Deployment Status */}
                      <div className="flex items-center gap-2">
                        <Rocket size={12} />
                        <span>Deployment:</span>
                        <span className="font-bold" style={{ color: deploymentStatus.color }}>
                          {deploymentStatus.label}
                        </span>
                        {deployment?.lastDeployedAt && (
                          <span>• {formatRelativeTime(deployment.lastDeployedAt)}</span>
                        )}
                      </div>

                      {/* GitHub Repo */}
                      {deployment?.githubRepo && (
                        <div className="flex items-center gap-2">
                          <Github size={12} />
                          <a
                            href={deployment.githubRepo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {deployment.githubRepo.replace("https://github.com/", "")}
                          </a>
                        </div>
                      )}

                      {/* Production URL */}
                      {deployment?.productionUrl && (
                        <div className="flex items-center gap-2">
                          <ExternalLink size={12} />
                          <a
                            href={deployment.productionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:underline"
                          >
                            {deployment.productionUrl}
                          </a>
                        </div>
                      )}

                      {/* v0 Link */}
                      {props.v0WebUrl && (
                        <div className="flex items-center gap-2">
                          <Code size={12} />
                          <a
                            href={props.v0WebUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            style={{ color: "var(--tone-accent)" }}
                          >
                            View in v0.dev
                          </a>
                        </div>
                      )}

                      {/* Files & Links */}
                      <div className="flex items-center gap-4">
                        {fileCount > 0 && (
                          <span className="flex items-center gap-1">
                            <FolderGit2 size={12} />
                            {fileCount} files
                          </span>
                        )}
                        {linkedCount > 0 && (
                          <span className="flex items-center gap-1">
                            <LinkIcon size={12} />
                            {linkedCount} linked objects
                          </span>
                        )}
                        {app.updatedAt && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Updated {formatRelativeTime(app.updatedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Action buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    {/* Create GitHub Repo (if not created) */}
                    {!deployment?.githubRepo && app.status === "ready" && (
                      <InteriorButton
                        onClick={() => handleCreateRepo(app)}
                        variant="primary"
                        size="sm"
                        className="flex items-center gap-1 whitespace-nowrap"
                        disabled={isCreatingRepo === app._id}
                      >
                        {isCreatingRepo === app._id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Github size={14} />
                        )}
                        {isCreatingRepo === app._id ? "Creating..." : "Create Repo"}
                      </InteriorButton>
                    )}

                    {/* Deploy to Vercel (if repo exists) */}
                    {deployment?.githubRepo && !deployment?.productionUrl && (
                      <InteriorButton
                        onClick={() => handleDeployToVercel(app)}
                        variant="primary"
                        size="sm"
                        className="flex items-center gap-1 whitespace-nowrap"
                      >
                        <Rocket size={14} />
                        Deploy
                      </InteriorButton>
                    )}

                    {/* View Live (if deployed) */}
                    {deployment?.productionUrl && (
                      <InteriorButton
                        onClick={() => window.open(deployment.productionUrl!, "_blank")}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1 whitespace-nowrap"
                      >
                        <ExternalLink size={14} />
                        View Live
                      </InteriorButton>
                    )}

                    {/* Archive */}
                    {app.status !== "archived" && (
                      <InteriorButton
                        onClick={() => {
                          if (confirm(`Archive "${app.name}"? It can be restored later.`)) {
                            handleArchive(app._id);
                          }
                        }}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1 whitespace-nowrap"
                        title="Archive app"
                      >
                        <Archive size={14} />
                      </InteriorButton>
                    )}

                    {/* Delete */}
                    <InteriorButton
                      onClick={() => {
                        if (confirm(`Permanently delete "${app.name}"? This cannot be undone.`)) {
                          handleDelete(app._id);
                        }
                      }}
                      variant="secondary"
                      size="sm"
                      className="flex items-center gap-1 whitespace-nowrap text-red-600 hover:bg-red-50"
                      title="Delete permanently"
                    >
                      <Trash2 size={14} />
                    </InteriorButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
