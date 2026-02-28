"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Loader2, Download, ExternalLink, Globe, Code, Settings, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { type ComponentProps, useMemo, useState } from "react";
import { InteriorButton } from "@/components/window-content/shared/interior-primitives";

/** Web app template interface */
interface WebAppTemplate {
  _id: string;
  name: string;
  description?: string;
  status?: string;
  customProperties?: {
    features?: string[];
    deployment?: {
      mode?: "managed" | "external";
      githubRepo?: string;
      vercelDeployButton?: string;
      managedUrl?: string;
      demoUrl?: string;
    };
    category?: string;
    tags?: string[];
  };
}

/** Template settings for save callback */
interface TemplateSettings {
  githubRepo: string;
  vercelDeployButton: string;
}

interface WebAppsTabProps {
  onEditTemplate: (templateId: string) => void;
  onViewSchema?: (templateId: string) => void;
}

type WebAppsButtonProps = Omit<ComponentProps<typeof InteriorButton>, "variant"> & {
  variant?: "primary" | "outline";
};

function WebAppsButton({ variant = "outline", ...props }: WebAppsButtonProps) {
  return <InteriorButton size="sm" variant={variant === "primary" ? "primary" : "neutral"} {...props} />;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function WebAppsTab({ onEditTemplate, onViewSchema }: WebAppsTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();

  // Fetch all templates including system templates
  const allTemplates = useQuery(
    api.templateOntology.getAllTemplatesIncludingSystem,
    sessionId && currentOrg ? {
      sessionId,
      organizationId: currentOrg.id as Id<"organizations">
    } : "skip"
  );

  // Filter to only web app templates
  const webAppTemplates = useMemo(() => {
    if (!allTemplates) return undefined;
    return allTemplates.filter(t => t.subtype === "web_app");
  }, [allTemplates]);

  if (webAppTemplates === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tone-accent)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mx-4 mt-4 rounded border-2 p-3" style={{ borderColor: "#10B981", background: "#ECFDF5" }}>
        <p className="text-xs font-bold" style={{ color: "#065F46" }}>
          Managed publish is the default path.
        </p>
        <p className="text-xs mt-1" style={{ color: "#065F46" }}>
          No GitHub or Vercel setup is required for first-run web app publishing. External deploy remains available as advanced mode.
        </p>
      </div>
      {webAppTemplates.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <Globe size={48} className="mx-auto mb-4" style={{ color: 'var(--neutral-gray)' }} />
            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
              No Web App Templates Yet
            </h3>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              Starter managed templates are seeded automatically. Create or publish from the Builder to see them here.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {webAppTemplates.map((template) => (
              <WebAppCard
                key={template._id}
                template={template}
                onView={() => onViewSchema?.(template._id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Web App Template Card
 */
function WebAppCard({
  template,
  onView
}: {
  template: WebAppTemplate;
  onView: () => void;
}) {
  const customProps = template.customProperties || {};
  const features = customProps.features || [];
  const deployment = useMemo(() => customProps.deployment || {}, [customProps.deployment]);
  const category = customProps.category || "web_app";
  const tags = customProps.tags || [];
  const deploymentMode = deployment.mode === "external" ? "external" : "managed";
  const isManagedMode = deploymentMode === "managed";
  const managedLaunchUrl = deployment.managedUrl || deployment.demoUrl;
  const [showEditModal, setShowEditModal] = useState(false);

  // Validate deployment configuration
  const isDeploymentReady = useMemo(() => {
    if (isManagedMode) {
      return true;
    }
    return Boolean(
      deployment.githubRepo &&
      deployment.vercelDeployButton &&
      deployment.githubRepo.startsWith('https://github.com/') &&
      deployment.vercelDeployButton.startsWith('https://vercel.com/new/clone')
    );
  }, [deployment, isManagedMode]);

  const handleDeployClick = () => {
    if (isManagedMode) {
      if (managedLaunchUrl) {
        window.open(managedLaunchUrl, '_blank');
      } else {
        alert("Managed mode is ready. Publish from Builder to generate the live URL.");
      }
      return;
    }

    // Pre-deployment validation
    if (!isDeploymentReady) {
      alert('External mode requires configuration. Click "External Settings" to configure.');
      setShowEditModal(true);
      return;
    }

    // Open Vercel deploy in new tab
    if (deployment.vercelDeployButton) {
      window.open(deployment.vercelDeployButton, '_blank');
    } else if (deployment.githubRepo) {
      window.open(deployment.githubRepo, '_blank');
    }
  };

  const handleEditSettingsClick = () => {
    setShowEditModal(true);
  };

  const handleDemoClick = () => {
    if (deployment.demoUrl) {
      window.open(deployment.demoUrl, '_blank');
    }
  };

  return (
    <div
      className="border-2 rounded p-4 flex flex-col h-full"
      style={{
        borderColor: 'var(--window-document-border)',
        background: 'var(--window-document-bg)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="p-2 border-2 rounded"
          style={{
            borderColor: 'var(--window-document-border)',
            background: 'var(--window-document-bg-elevated)',
          }}
        >
          <Globe size={24} style={{ color: 'var(--tone-accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
            {template.name}
          </h3>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 border rounded"
              style={{
                borderColor: 'var(--window-document-border)',
                background: 'var(--window-document-bg-elevated)',
                color: 'var(--neutral-gray)',
              }}
            >
              {category.replace(/_/g, ' ')}
            </span>
            {template.status === "published" && (
              <span
                className="text-xs px-2 py-0.5 border rounded"
                style={{
                  borderColor: '#10B981',
                  background: '#D1FAE5',
                  color: '#065F46',
                }}
              >
                Available
              </span>
            )}
            <span
              className="text-xs px-2 py-0.5 border rounded"
              style={{
                borderColor: isManagedMode ? "#10B981" : "#F59E0B",
                background: isManagedMode ? "#D1FAE5" : "#FEF3C7",
                color: isManagedMode ? "#065F46" : "#92400E",
              }}
            >
              {isManagedMode ? "Managed" : "External Advanced"}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs mb-3 flex-1" style={{ color: 'var(--neutral-gray)' }}>
        {template.description}
      </p>

      {/* Features */}
      {features.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
            Features:
          </h4>
          <ul className="text-xs space-y-1" style={{ color: 'var(--neutral-gray)' }}>
            {features.slice(0, 3).map((feature: string, idx: number) => (
              <li key={idx} className="flex items-start gap-1">
                <span>•</span>
                <span>{feature}</span>
              </li>
            ))}
            {features.length > 3 && (
              <li className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                + {features.length - 3} more features
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 4).map((tag: string) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 border rounded"
              style={{
                borderColor: 'var(--window-document-border)',
                background: 'var(--window-document-bg-elevated)',
                color: 'var(--neutral-gray)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Deployment Status */}
      {isManagedMode && (
        <div className="mb-3 p-2 border rounded flex items-start gap-2" style={{ borderColor: '#10B981', background: '#D1FAE5' }}>
          <CheckCircle2 size={16} style={{ color: '#047857', flexShrink: 0, marginTop: '2px' }} />
          <p className="text-xs" style={{ color: '#065F46' }}>
            Managed mode active: publish and updates work without GitHub/Vercel integration setup.
          </p>
        </div>
      )}
      {!isManagedMode && !isDeploymentReady && (
        <div className="mb-3 p-2 border rounded flex items-start gap-2" style={{ borderColor: '#F59E0B', background: '#FEF3C7' }}>
          <AlertCircle size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
          <p className="text-xs" style={{ color: '#92400E' }}>
            External mode needs GitHub and Vercel URLs. Click "External Settings" to configure.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: 'var(--window-document-border)' }}>
        {/* Primary Actions Row */}
        <div className="flex gap-2">
          <WebAppsButton
            onClick={handleDeployClick}
            variant={isManagedMode || isDeploymentReady ? "primary" : "outline"}
            size="sm"
            className="flex-1 flex items-center justify-center gap-1"
          >
            <Download size={14} />
            <span>{isManagedMode ? "Open Managed App" : "Deploy External"}</span>
          </WebAppsButton>

          <WebAppsButton
            onClick={handleEditSettingsClick}
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-1"
          >
            <Settings size={14} />
            <span>{isManagedMode ? "External Advanced" : "External Settings"}</span>
          </WebAppsButton>
        </div>

        {/* Secondary Actions Row */}
        <div className="flex gap-2">
          {deployment.demoUrl && (
            <WebAppsButton
              onClick={handleDemoClick}
              variant="outline"
              size="sm"
              className="flex-1 flex items-center justify-center gap-1"
            >
              <ExternalLink size={14} />
              <span>View Demo</span>
            </WebAppsButton>
          )}

          <WebAppsButton
            onClick={onView}
            variant="outline"
            size="sm"
            className="flex-1 flex items-center justify-center gap-1"
          >
            <Code size={14} />
            <span>Details</span>
          </WebAppsButton>
        </div>
      </div>

      {/* Template Settings Editor Modal */}
      {showEditModal && (
        <TemplateSettingsEditorModal
          template={template}
          onClose={() => setShowEditModal(false)}
          onSave={(updatedSettings) => {
            // TODO: Implement save logic
            console.log('Save template settings:', updatedSettings);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Template Settings Editor Modal
 * Allows users to configure deployment URLs and environment variables
 */
function TemplateSettingsEditorModal({
  template,
  onClose,
  onSave
}: {
  template: WebAppTemplate;
  onClose: () => void;
  onSave: (settings: TemplateSettings) => void;
}) {
  const deployment = template.customProperties?.deployment || {};
  const [githubRepo, setGithubRepo] = useState(deployment.githubRepo || '');
  const [vercelDeployButton, setVercelDeployButton] = useState(deployment.vercelDeployButton || '');

  const handleSave = () => {
    onSave({
      githubRepo,
      vercelDeployButton
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]" onClick={onClose}>
      <div
        className="bg-white border-2 rounded p-6 max-w-2xl w-full mx-4"
        style={{ borderColor: 'var(--window-document-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: 'var(--window-document-border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--window-document-text)' }}>
            Edit Template Settings: {template.name}
          </h2>
          <button onClick={onClose} className="text-2xl hover:opacity-70" style={{ color: 'var(--neutral-gray)' }}>
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="space-y-4">
          {/* GitHub Repository URL */}
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
              GitHub Repository URL
            </label>
            <input
              type="url"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="https://github.com/your-org/your-repo"
              className="w-full p-2 border-2 rounded text-sm"
              style={{ borderColor: 'var(--window-document-border)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              External advanced mode only: repository URL for Vercel-backed deploy.
            </p>
          </div>

          {/* Vercel Deploy Button URL */}
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
              Vercel Deploy Button URL
            </label>
            <textarea
              value={vercelDeployButton}
              onChange={(e) => setVercelDeployButton(e.target.value)}
              placeholder="https://vercel.com/new/clone?repository-url=..."
              rows={3}
              className="w-full p-2 border-2 rounded text-sm font-mono"
              style={{ borderColor: 'var(--window-document-border)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              External advanced mode only: Vercel deploy button URL with pre-configured environment variables.
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 border rounded" style={{ borderColor: '#3B82F6', background: '#DBEAFE' }}>
            <p className="text-xs" style={{ color: '#1E40AF' }}>
              <strong>Note:</strong> Managed mode is default and does not require these fields. Configure these only if you explicitly need external GitHub/Vercel deployment.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex gap-2 mt-6 pt-4 border-t" style={{ borderColor: 'var(--window-document-border)' }}>
          <WebAppsButton onClick={handleSave} variant="primary" size="sm" className="flex-1">
            Save Settings
          </WebAppsButton>
          <WebAppsButton onClick={onClose} variant="outline" size="sm" className="flex-1">
            Cancel
          </WebAppsButton>
        </div>
      </div>
    </div>
  );
}
