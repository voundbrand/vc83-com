"use client";

import { useState } from "react";
import { TrendingUp, Copy, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Pipeline Templates Tab
 *
 * Displays system pipeline templates that organizations can copy to their workspace.
 * Similar to template sets - read-only system templates that can be instantiated.
 */

interface PipelineTemplatesTabProps {
  onTemplateCreated?: (pipelineId: Id<"objects">) => void;
}

interface PipelineTemplate {
  _id: Id<"objects">;
  name: string;
  description?: string;
  subtype?: string;
  customProperties?: {
    isTemplate?: boolean;
    category?: string;
    icon?: string;
    color?: string;
    aiSettings?: Record<string, unknown>;
  };
  stageCount?: number;
}

export function PipelineTemplatesTab({ onTemplateCreated }: PipelineTemplatesTabProps) {
  const { t } = useNamespaceTranslations("ui.crm");
  const { sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const currentOrganizationId = currentOrganization?.id;
  const [expandedTemplate, setExpandedTemplate] = useState<Id<"objects"> | null>(null);

  // Query system templates
  const templates = useQuery(
    api.crmPipeline.getPipelineTemplates,
    sessionId ? { sessionId } : "skip"
  );

  // Copy template mutation
  const copyTemplate = useMutation(api.crmPipeline.copyTemplateToOrganization);
  const [copying, setCopying] = useState<Id<"objects"> | null>(null);

  const handleCopyTemplate = async (templateId: Id<"objects">) => {
    if (!sessionId || !currentOrganizationId) return;

    try {
      setCopying(templateId);
      const result = await copyTemplate({
        sessionId,
        organizationId: currentOrganizationId as Id<"organizations">,
        templateId,
      });

      // Navigate to the newly created pipeline
      if (result && onTemplateCreated) {
        onTemplateCreated(result.pipelineId);
      }
    } catch (error) {
      console.error("Failed to copy template:", error);
      // TODO: Show error toast
    } finally {
      setCopying(null);
    }
  };

  if (!sessionId || !currentOrganizationId) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p style={{ color: "var(--neutral-gray)" }} className="text-sm">
          {t("ui.crm.pipeline.templates.not_authenticated") || "Please sign in to view templates"}
        </p>
      </div>
    );
  }

  if (templates === undefined) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 className="animate-spin" size={24} style={{ color: "var(--win95-highlight)" }} />
        <p className="ml-3 text-sm" style={{ color: "var(--win95-text)" }}>
          {t("ui.crm.pipeline.templates.loading") || "Loading templates..."}
        </p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <TrendingUp size={48} className="mb-4 opacity-30" style={{ color: "var(--neutral-gray)" }} />
        <p className="font-pixel text-sm mb-2" style={{ color: "var(--win95-text)" }}>
          {t("ui.crm.pipeline.templates.no_templates") || "No templates available"}
        </p>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.crm.pipeline.templates.no_templates_hint") || "System templates will appear here"}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          {t("ui.crm.pipeline.templates.title") || "Pipeline Templates"}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.crm.pipeline.templates.description") ||
           "Copy these system templates to your organization to get started quickly"}
        </p>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 gap-4">
        {templates.map((template: PipelineTemplate) => {
          const isExpanded = expandedTemplate === template._id;
          const isCopying = copying === template._id;
          const categoryColor = template.customProperties?.color || "var(--win95-highlight)";

          return (
            <div
              key={template._id}
              className="border-2 rounded-lg p-4 hover:shadow-md transition-shadow"
              style={{
                background: "var(--win95-bg-light)",
                borderColor: "var(--win95-border)",
              }}
            >
              {/* Template Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className="p-2 rounded border-2 flex-shrink-0"
                    style={{
                      backgroundColor: "var(--win95-bg)",
                      color: categoryColor,
                      borderColor: categoryColor,
                    }}
                  >
                    <TrendingUp size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                      {template.name}
                    </h4>
                    {template.description && (
                      <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {template.subtype && (
                        <span className="px-2 py-1 rounded border" style={{ borderColor: categoryColor, color: categoryColor }}>
                          {template.subtype}
                        </span>
                      )}
                      {template.stageCount !== undefined && (
                        <span>
                          {template.stageCount} {template.stageCount === 1 ? 'stage' : 'stages'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Copy Button */}
                <button
                  onClick={() => handleCopyTemplate(template._id)}
                  disabled={isCopying}
                  className="retro-button px-3 py-2 flex items-center gap-2 ml-4 flex-shrink-0"
                  style={{
                    background: isCopying ? "var(--neutral-gray)" : "var(--win95-highlight)",
                    color: "var(--win95-button-text)",
                  }}
                >
                  {isCopying ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span className="font-pixel text-xs">
                        {t("ui.crm.pipeline.templates.copying") || "Copying..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span className="font-pixel text-xs">
                        {t("ui.crm.pipeline.templates.use_template") || "Use Template"}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* AI Settings Info (if available) */}
              {template.customProperties?.aiSettings && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--win95-border)" }}>
                  <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                    {t("ui.crm.pipeline.templates.ai_features") || "AI Features"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(template.customProperties.aiSettings).map(([key, value]) => (
                      <span
                        key={key}
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          background: "var(--win95-bg)",
                          color: value ? "var(--success)" : "var(--neutral-gray)",
                          border: "1px solid var(--win95-border)",
                        }}
                      >
                        {key.replace(/([A-Z])/g, " $1").trim()}
                        : {value ? "✓" : "✗"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
