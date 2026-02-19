"use client";

import { useState } from "react";
import { Plug, RefreshCw, Trash2, Archive, Clock, ExternalLink, Settings as SettingsIcon, Terminal } from "lucide-react";
import { InteriorButton } from "@/components/ui/interior-button";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { CLISetupGuide, CLISetupModal } from "./cli-setup-guide";
import type { Id } from "../../../../convex/_generated/dataModel";

interface ApplicationProps {
  source?: {
    type?: string;
    framework?: string;
    frameworkVersion?: string;
    hasTypeScript?: boolean;
    projectPathHash?: string;
  };
  connection?: {
    features?: string[];
    backendUrl?: string;
    apiKeyId?: Id<"apiKeys">;
  };
  sync?: {
    enabled?: boolean;
    lastSyncAt?: number;
    lastSyncStatus?: string;
    stats?: {
      totalPushed?: number;
      totalPulled?: number;
    };
  };
  cli?: {
    registeredAt?: number;
    lastActivityAt?: number;
    generatedFiles?: Array<{ path: string; type: string; generatedAt: number }>;
  };
}

interface ConnectedApplication {
  _id: Id<"objects">;
  name: string;
  description?: string;
  status: string;
  subtype?: string;
  customProperties?: ApplicationProps;
  createdAt?: number;
  updatedAt?: number;
}

interface ApplicationsTabProps {
  onSelectApplication?: (app: ConnectedApplication) => void;
}

/**
 * Applications Tab - List of CLI-connected external applications
 *
 * Shows:
 * - All connected applications (CLI, boilerplate, manual)
 * - Framework info, features, sync status
 * - Quick actions: View details, Sync, Disconnect
 */
export function ApplicationsTab({ onSelectApplication }: ApplicationsTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Query connected applications
  const applications = useQuery(
    api.applicationOntology.getApplications,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations">, status: statusFilter !== "all" ? statusFilter : undefined }
      : "skip"
  ) as ConnectedApplication[] | undefined;

  // Archive mutation
  const archiveApplication = useMutation(api.applicationOntology.archiveApplication);
  // Delete mutation
  const deleteApplication = useMutation(api.applicationOntology.deleteApplication);

  const handleArchive = async (appId: Id<"objects">) => {
    if (!sessionId) return;
    try {
      await archiveApplication({ sessionId, applicationId: appId });
      notification.success("Success", "Application archived successfully");
    } catch (error) {
      console.error("Failed to archive application:", error);
      notification.error("Error", "Failed to archive application");
    }
  };

  const handleDelete = async (appId: Id<"objects">) => {
    if (!sessionId) return;
    try {
      await deleteApplication({ sessionId, applicationId: appId });
      notification.success("Success", "Application deleted permanently");
    } catch (error) {
      console.error("Failed to delete application:", error);
      notification.error("Error", "Failed to delete application");
    }
  };

  if (!sessionId) {
    return (
      <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
        Please log in to view connected applications.
      </div>
    );
  }

  if (applications === undefined) {
    return (
      <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
        Loading applications...
      </div>
    );
  }

  const getFrameworkIcon = (framework?: string) => {
    switch (framework?.toLowerCase()) {
      case 'nextjs': return '▲';
      case 'remix': return 'R';
      case 'astro': return 'A';
      case 'vite': return 'V';
      case 'nuxt': return 'N';
      case 'sveltekit': return 'S';
      default: return 'App';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'var(--success)';
      case 'paused': return 'var(--warning)';
      case 'disconnected': return 'var(--error)';
      case 'archived': return 'var(--neutral-gray)';
      default: return 'var(--neutral-gray)';
    }
  };

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
            Connected Applications
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            External apps connected via CLI or boilerplate
          </p>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2 py-1 text-xs border-2"
          style={{
            borderColor: 'var(--window-document-border)',
            background: 'white',
            color: 'var(--window-document-text)'
          }}
        >
          <option value="active">Active</option>
          <option value="all">All</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        // Empty State with Step-by-Step Guide
        <div
          className="border-2 p-6"
          style={{
            borderColor: 'var(--window-document-border)',
            background: 'var(--window-document-bg-elevated)'
          }}
        >
          <CLISetupGuide variant="full" showInstall={true} />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Application Cards */}
          {applications.map((app) => {
            const props = app.customProperties || {};
            const source = props.source || {};
            const connection = props.connection || {};
            const sync = props.sync || {};
            const cli = props.cli || {};

            return (
              <div
                key={app._id}
                className="border-2 p-4 transition-colors"
                style={{
                  borderColor: 'var(--window-document-border)',
                  background: 'white'
                }}
              >
                <div className="flex items-start justify-between">
                  {/* Left: App info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getFrameworkIcon(source.framework)}</span>
                      <h4 className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
                        {app.name}
                      </h4>
                      <span
                        className="px-2 py-0.5 text-xs font-bold"
                        style={{
                          background: getStatusColor(app.status),
                          color: 'white'
                        }}
                      >
                        {app.status.toUpperCase()}
                      </span>
                      {source.type && (
                        <span
                          className="px-2 py-0.5 text-xs"
                          style={{
                            background: 'var(--window-document-bg-elevated)',
                            color: 'var(--neutral-gray)',
                            border: '1px solid var(--window-document-border)'
                          }}
                        >
                          {source.type}
                        </span>
                      )}
                    </div>

                    {app.description && (
                      <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                        {app.description}
                      </p>
                    )}

                    {/* Framework & Features */}
                    <div className="space-y-1 text-xs" style={{ color: 'var(--neutral-gray)' }}>
                      <div className="flex items-center gap-2">
                        <span>Framework:</span>
                        <span className="font-bold" style={{ color: 'var(--window-document-text)' }}>
                          {source.framework || 'Unknown'}
                          {source.frameworkVersion && ` v${source.frameworkVersion}`}
                          {source.hasTypeScript && ' (TypeScript)'}
                        </span>
                      </div>

                      {connection.features && connection.features.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>Features:</span>
                          {connection.features.map((feature) => (
                            <span
                              key={feature}
                              className="px-1.5 py-0.5 text-xs"
                              style={{
                                background: 'var(--tone-accent)',
                                color: 'white'
                              }}
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Sync Status */}
                      {sync.enabled && (
                        <div className="flex items-center gap-2">
                          <RefreshCw size={12} />
                          <span>
                            Last sync: {formatRelativeTime(sync.lastSyncAt)}
                            {sync.lastSyncStatus && ` (${sync.lastSyncStatus})`}
                          </span>
                          {sync.stats && (
                            <span>
                              • {sync.stats.totalPushed || 0} pushed, {sync.stats.totalPulled || 0} pulled
                            </span>
                          )}
                        </div>
                      )}

                      {/* CLI Activity */}
                      <div className="flex items-center gap-2">
                        <Clock size={12} />
                        <span>
                          Registered: {cli.registeredAt ? new Date(cli.registeredAt).toLocaleDateString() : 'Unknown'}
                        </span>
                        {cli.lastActivityAt && (
                          <span>• Active: {formatRelativeTime(cli.lastActivityAt)}</span>
                        )}
                      </div>

                      {/* Generated Files */}
                      {cli.generatedFiles && cli.generatedFiles.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span> {cli.generatedFiles.length} generated file(s)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Action buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    {connection.backendUrl && (
                      <InteriorButton
                        onClick={() => window.open(connection.backendUrl, '_blank')}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1 whitespace-nowrap"
                        title="Open Backend"
                      >
                        <ExternalLink size={14} />
                      </InteriorButton>
                    )}
                    {onSelectApplication && (
                      <InteriorButton
                        onClick={() => onSelectApplication(app)}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1 whitespace-nowrap"
                      >
                        <SettingsIcon size={14} />
                        Details
                      </InteriorButton>
                    )}
                    {app.status !== 'archived' && (
                      <InteriorButton
                        onClick={() => {
                          if (confirm(`Archive "${app.name}"? The application will be disconnected but can be restored.`)) {
                            handleArchive(app._id);
                          }
                        }}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1 whitespace-nowrap"
                        title="Archive application"
                      >
                        <Archive size={14} />
                      </InteriorButton>
                    )}
                    <InteriorButton
                      onClick={() => {
                        if (confirm(`Permanently delete "${app.name}"? This action cannot be undone.`)) {
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

      {/* Connect Another App Card */}
      {applications.length > 0 && (
        <div
          className="mt-4 p-4 border-2"
          style={{
            borderColor: 'var(--window-document-border)',
            background: 'var(--window-document-bg-elevated)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 flex items-center justify-center rounded"
                style={{
                  background: 'linear-gradient(135deg, var(--tone-accent) 0%, var(--tone-accent-strong) 100%)',
                }}
              >
                <Terminal size={20} style={{ color: "#0f0f0f" }} />
              </div>
              <div>
                <h4 className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
                  Connect Another App
                </h4>
                <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  Use the CLI to connect more applications
                </p>
              </div>
            </div>
            <InteriorButton
              onClick={() => setShowConnectModal(true)}
              variant="primary"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plug size={14} />
              View Instructions
            </InteriorButton>
          </div>
        </div>
      )}

      {/* CLI Setup Modal */}
      <CLISetupModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        showInstall={false}
      />
    </div>
  );
}
