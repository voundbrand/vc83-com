"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Loader2, Download, ExternalLink, Globe, Code, Settings, AlertCircle } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useMemo, useState } from "react";
import { RetroButton } from "@/components/retro-button";

interface WebAppsTabProps {
  onEditTemplate: (templateId: string) => void;
  onViewSchema?: (templateId: string) => void;
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
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {webAppTemplates.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <Globe size={48} className="mx-auto mb-4" style={{ color: 'var(--neutral-gray)' }} />
            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
              No Web App Templates Available
            </h3>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              Web app templates haven't been enabled for your organization yet.
              Contact your administrator or check back later.
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
  template: any;
  onView: () => void;
}) {
  const customProps = template.customProperties || {};
  const features = customProps.features || [];
  const deployment = useMemo(() => customProps.deployment || {}, [customProps.deployment]);
  const category = customProps.category || "web_app";
  const tags = customProps.tags || [];
  const [showEditModal, setShowEditModal] = useState(false);

  // Validate deployment configuration
  const isDeploymentReady = useMemo(() => {
    // Check if GitHub repo and Vercel deploy button are configured
    return Boolean(
      deployment.githubRepo &&
      deployment.vercelDeployButton &&
      deployment.githubRepo.startsWith('https://github.com/') &&
      deployment.vercelDeployButton.startsWith('https://vercel.com/new/clone')
    );
  }, [deployment]);

  const handleDeployClick = () => {
    // Pre-deployment validation
    if (!isDeploymentReady) {
      alert('This template needs configuration before deployment. Click "Edit Settings" to configure.');
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
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="p-2 border-2 rounded"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)',
          }}
        >
          <Globe size={24} style={{ color: 'var(--win95-highlight)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
            {template.name}
          </h3>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 border rounded"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-bg-light)',
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
          <h4 className="text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
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
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-bg-light)',
                color: 'var(--neutral-gray)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Deployment Status Warning */}
      {!isDeploymentReady && (
        <div className="mb-3 p-2 border rounded flex items-start gap-2" style={{ borderColor: '#F59E0B', background: '#FEF3C7' }}>
          <AlertCircle size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
          <p className="text-xs" style={{ color: '#92400E' }}>
            Configuration needed: Click "Edit Settings" to configure GitHub repo and Vercel deployment URLs.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: 'var(--win95-border)' }}>
        {/* Primary Actions Row */}
        <div className="flex gap-2">
          <RetroButton
            onClick={handleDeployClick}
            variant={isDeploymentReady ? "primary" : "outline"}
            size="sm"
            className="flex-1 flex items-center justify-center gap-1"
          >
            <Download size={14} />
            <span>Deploy to Vercel</span>
          </RetroButton>

          <RetroButton
            onClick={handleEditSettingsClick}
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-1"
          >
            <Settings size={14} />
            <span>Edit Settings</span>
          </RetroButton>
        </div>

        {/* Secondary Actions Row */}
        <div className="flex gap-2">
          {deployment.demoUrl && (
            <RetroButton
              onClick={handleDemoClick}
              variant="outline"
              size="sm"
              className="flex-1 flex items-center justify-center gap-1"
            >
              <ExternalLink size={14} />
              <span>View Demo</span>
            </RetroButton>
          )}

          <RetroButton
            onClick={onView}
            variant="outline"
            size="sm"
            className="flex-1 flex items-center justify-center gap-1"
          >
            <Code size={14} />
            <span>Details</span>
          </RetroButton>
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
  template: any;
  onClose: () => void;
  onSave: (settings: any) => void;
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
        style={{ borderColor: 'var(--win95-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: 'var(--win95-border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--win95-text)' }}>
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
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
              GitHub Repository URL
            </label>
            <input
              type="url"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="https://github.com/your-org/your-repo"
              className="w-full p-2 border-2 rounded text-sm"
              style={{ borderColor: 'var(--win95-border)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              The GitHub repository URL for this template (e.g., https://github.com/l4yercak3/freelancer-portal-template)
            </p>
          </div>

          {/* Vercel Deploy Button URL */}
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
              Vercel Deploy Button URL
            </label>
            <textarea
              value={vercelDeployButton}
              onChange={(e) => setVercelDeployButton(e.target.value)}
              placeholder="https://vercel.com/new/clone?repository-url=..."
              rows={3}
              className="w-full p-2 border-2 rounded text-sm font-mono"
              style={{ borderColor: 'var(--win95-border)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              The Vercel deploy button URL with pre-configured environment variables
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 border rounded" style={{ borderColor: '#3B82F6', background: '#DBEAFE' }}>
            <p className="text-xs" style={{ color: '#1E40AF' }}>
              <strong>Note:</strong> These URLs should point to your organization's template repository.
              Contact your administrator if you need help configuring these values.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex gap-2 mt-6 pt-4 border-t" style={{ borderColor: 'var(--win95-border)' }}>
          <RetroButton onClick={handleSave} variant="primary" size="sm" className="flex-1">
            Save Settings
          </RetroButton>
          <RetroButton onClick={onClose} variant="outline" size="sm" className="flex-1">
            Cancel
          </RetroButton>
        </div>
      </div>
    </div>
  );
}
