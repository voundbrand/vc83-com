"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Eye, FileText, ClipboardCheck, FileQuestion, Users, MessageSquare } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Loader2 } from "lucide-react";

/**
 * Templates Tab - Form Templates
 *
 * Displays available form templates that can be used to create new forms.
 * Dynamically fetches templates from database - only shows enabled templates.
 */

// Icon mapping for template categories
const getCategoryIcon = (category: string) => {
  switch (category) {
    case "registration":
      return <FileText size={24} />;
    case "survey":
      return <ClipboardCheck size={24} />;
    case "application":
      return <FileQuestion size={24} />;
    case "volunteer":
      return <Users size={24} />;
    case "contact":
      return <MessageSquare size={24} />;
    default:
      return <FileText size={24} />;
  }
};

// Color mapping for template categories
const getCategoryColor = (category: string) => {
  switch (category) {
    case "registration":
      return "var(--win95-highlight)";
    case "survey":
      return "var(--success)";
    case "application":
      return "var(--win95-highlight)";
    case "volunteer":
      return "var(--success)";
    case "contact":
      return "var(--info)";
    default:
      return "var(--win95-highlight)";
  }
};

interface TemplatesTabProps {
  onUseTemplate: (templateCode: string) => void;
}

export function TemplatesTab({ onUseTemplate }: TemplatesTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.forms");

  // Fetch available form templates for this organization
  const availableTemplates = useQuery(
    api.formTemplateAvailability.getAvailableFormTemplates,
    sessionId && currentOrg
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  );

  if (translationsLoading || availableTemplates === undefined) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  // If no templates are available, show friendly empty state (not an error)
  if (availableTemplates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <FileText size={48} className="mb-4" style={{ color: "var(--win95-highlight)" }} />
        <h3 className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          No Templates Available
        </h3>
        <p className="text-xs max-w-md mb-4" style={{ color: "var(--neutral-gray)" }}>
          You can create forms from scratch using the Form Builder tab. Templates are optional and help you get started faster.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          {t("ui.forms.templates.title")}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.forms.templates.description")}
        </p>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableTemplates.map((template) => {
          const customProps = template.customProperties as Record<string, unknown> | undefined;
          const templateCode = customProps?.code as string;
          const templateName = customProps?.name as string;
          const templateDescription = customProps?.description as string;
          const templateCategory = customProps?.category as string;
          const templateFeatures = customProps?.features as string[];
          const colorVar = getCategoryColor(templateCategory);
          const icon = getCategoryIcon(templateCategory);

          return (
            <div
              key={template._id}
              className="border-2 rounded-lg p-4 transition-shadow hover:shadow-md cursor-pointer"
              style={{
                background: "var(--win95-bg-light)",
                borderColor: "var(--win95-border)",
              }}
              onClick={() => onUseTemplate(templateCode)}
            >
              {/* Template Header */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="p-2 rounded border-2 shrink-0"
                  style={{
                    backgroundColor: "var(--win95-bg)",
                    color: colorVar,
                    borderColor: colorVar,
                  }}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    {templateName}
                  </h4>
                  <p className="text-xs mb-2 line-clamp-2" style={{ color: "var(--neutral-gray)" }}>
                    {templateDescription}
                  </p>
                </div>
              </div>

              {/* Category Badge */}
              <div
                className="inline-block px-2 py-1 text-[10px] font-bold rounded border mb-3 uppercase"
                style={{
                  backgroundColor: "var(--win95-bg)",
                  color: colorVar,
                  borderColor: colorVar,
                }}
              >
                {templateCategory}
              </div>

              {/* Features */}
              {templateFeatures && templateFeatures.length > 0 && (
                <div className="space-y-1 mb-4">
                  {templateFeatures.slice(0, 5).map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      <span className="text-[10px] mt-0.5 shrink-0">✓</span>
                      <span className="line-clamp-1">{feature}</span>
                    </div>
                  ))}
                  {templateFeatures.length > 5 && (
                    <div className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                      +{templateFeatures.length - 5} more features
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUseTemplate(templateCode);
                  }}
                  className="flex-1 px-3 py-2 text-xs font-semibold rounded flex items-center justify-center gap-2 transition-opacity border-2"
                  style={{
                    backgroundColor: "var(--win95-highlight)",
                    color: "white",
                    borderColor: "var(--win95-highlight)",
                  }}
                >
                  <FileText size={14} />
                  {t("ui.forms.templates.buttons.use")}
                </button>
                <button
                  disabled
                  className="px-3 py-2 text-xs font-semibold rounded opacity-50 cursor-not-allowed border-2"
                  style={{
                    backgroundColor: "var(--win95-button-face)",
                    color: "var(--win95-text)",
                    borderColor: "var(--win95-border)",
                  }}
                  title={t("ui.forms.templates.buttons.preview_hint")}
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div
        className="mt-6 p-4 border-2 rounded"
        style={{
          backgroundColor: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          💡 {t("ui.forms.templates.usage.title")}
        </h4>
        <div className="text-xs space-y-1" style={{ color: "var(--neutral-gray)" }}>
          <p>• {t("ui.forms.templates.usage.registration")}</p>
          <p>• {t("ui.forms.templates.usage.survey")}</p>
          <p>• {t("ui.forms.templates.usage.application")}</p>
          <p>• {t("ui.forms.templates.usage.custom")}</p>
        </div>
      </div>
    </div>
  );
}
