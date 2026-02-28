"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  Loader2,
  Code,
  Eye,
  Settings as SettingsIcon,
  Hammer,
  Mail,
} from "lucide-react";
import { TemplateSchemaEditor } from "@/components/template-schema-editor";
import { TemplateRenderer } from "@/components/template-renderer";
import type { TemplateSchema } from "@/templates/template-schema";

interface TemplateBuilderProps {
  templateId: Id<"objects">;
  onBack: () => void;
}

type BuilderTab = "schema" | "preview" | "settings" | "build";

export function TemplateBuilder({ templateId, onBack }: TemplateBuilderProps) {
  const { sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.templates");
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const [activeTab, setActiveTab] = useState<BuilderTab>("schema");

  // Fetch template by ID (works for both system and user templates)
  const template = useQuery(
    api.templateOntology.getTemplateById,
    sessionId ? { sessionId, templateId } : "skip"
  );

  if (!sessionId) {
    return (
      <div className="p-4">
        <div className="border-2 p-4" style={{ borderColor: "var(--error)", background: "rgba(239, 68, 68, 0.1)" }}>
          <p className="text-sm" style={{ color: "var(--error)" }}>
            {tx("ui.templates.builder.authentication_required", "Authentication required")}
          </p>
        </div>
      </div>
    );
  }

  // Show loading while query is pending
  if (template === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--tone-accent)" }} />
      </div>
    );
  }

  // If query returned but template not found, show error
  if (!template) {
    return (
      <div className="p-4">
        <div className="border-2 p-4" style={{ borderColor: "var(--error)", background: "rgba(239, 68, 68, 0.1)" }}>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--error)" }}>
            {tx("ui.templates.builder.template_not_found", "Template Not Found")}
          </p>
          <p className="text-xs" style={{ color: "var(--error)" }}>
            {tx("ui.templates.builder.template_not_found_description", "The template you're looking for doesn't exist or has been removed.")}
          </p>
          <button
            onClick={onBack}
            className="mt-3 px-3 py-1.5 text-xs font-bold border-2"
            style={{
              borderColor: 'var(--window-document-border)',
              background: 'var(--window-document-bg-elevated)',
              color: 'var(--window-document-text)',
            }}
          >
            {tx("ui.templates.builder.go_back", "Go Back")}
          </button>
        </div>
      </div>
    );
  }

  // Check for schema in either templateSchema (PDF) or emailTemplateSchema (Email)
  const templateSchema = (template.customProperties?.templateSchema || template.customProperties?.emailTemplateSchema) as TemplateSchema | undefined;
  const isEmailTemplate = template.subtype === "email";
  const hasSchema = !!templateSchema;
  const templateCode = template.customProperties?.code || template.customProperties?.templateCode;
  const templateCategory = (template.customProperties?.category as string | undefined)?.toLowerCase();
  const templateSubtype = (template.subtype as string | undefined)?.toLowerCase();
  const isPhase1CustomSurface =
    templateSubtype === "web_app" ||
    templateSubtype === "page" ||
    templateSubtype === "checkout" ||
    templateCategory === "web" ||
    templateCategory === "event" ||
    templateCategory === "checkout";
  const isStableTransactionalDoc =
    templateSubtype === "pdf" ||
    templateSubtype === "ticket" ||
    templateSubtype === "invoice" ||
    templateCategory === "ticket" ||
    templateCategory === "invoice" ||
    templateCategory === "receipt";

  // Debug: Check what we have
  const hasHtml = !!template.customProperties?.html;
  const hasCss = !!template.customProperties?.css;
  console.log("Template Preview Debug:", {
    templateId: template._id,
    templateName: template.name,
    hasHtml,
    hasCss,
    hasTemplateSchema: !!templateSchema,
    htmlLength: template.customProperties?.html?.length || 0,
    cssLength: template.customProperties?.css?.length || 0,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header with Back Button */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--window-document-border)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors hover:brightness-95"
            style={{
              borderColor: 'var(--window-document-border)',
              background: 'var(--window-document-bg-elevated)',
              color: 'var(--window-document-text)',
            }}
          >
            <ArrowLeft size={12} />
            {tx("ui.templates.builder.back", "Back")}
          </button>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
              {template.name}
              {isEmailTemplate && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded" style={{ background: 'var(--tone-accent)', color: 'var(--window-document-text)' }}>
                  {tx("ui.templates.builder.email_badge", "Email")}
                </span>
              )}
            </h2>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              {template.description}
              {templateCode && <span className="ml-2">• {templateCode}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Builder Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "schema" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "schema" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("schema")}
        >
          <Code size={14} />
          {tx("ui.templates.builder.tabs.schema", "Schema")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "preview" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "preview" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("preview")}
        >
          <Eye size={14} />
          {tx("ui.templates.builder.tabs.preview", "Preview")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "settings" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: activeTab === "settings" ? 'var(--window-document-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("settings")}
        >
          <SettingsIcon size={14} />
          {tx("ui.templates.builder.tabs.settings", "Settings")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--window-document-border)',
            background: activeTab === "build" ? 'var(--window-document-bg-elevated)' : 'var(--window-document-bg)',
            color: isPhase1CustomSurface
              ? (activeTab === "build" ? 'var(--window-document-text)' : 'var(--neutral-gray)')
              : 'var(--neutral-gray)',
            opacity: isPhase1CustomSurface ? 1 : 0.5,
          }}
          onClick={() => {
            if (!isPhase1CustomSurface) return;
            setActiveTab("build");
          }}
          disabled={!isPhase1CustomSurface}
          title={
            isPhase1CustomSurface
              ? tx("ui.templates.builder.build_enabled_tooltip", "Phase 1 custom generation enabled for web/event surfaces")
              : tx("ui.templates.builder.build_disabled_tooltip", "Phase 1 custom generation is limited to web/event surfaces")
          }
        >
          <Hammer size={14} />
          {tx("ui.templates.builder.tabs.build_phase_1", "Build (Phase 1)")}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "schema" && (
          hasSchema ? (
            <TemplateSchemaEditor templateId={templateId} />
          ) : (
            <div className="p-4">
              <div className="border-2 p-4" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--window-document-text)' }}>
                  {isEmailTemplate
                    ? tx("ui.templates.builder.email_template_legacy", "Email Template (Legacy)")
                    : tx("ui.templates.builder.template", "Template")}
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
                  {isEmailTemplate
                    ? tx(
                      "ui.templates.builder.email_template_schema_editor_note",
                      "This email template is a React component defined in code. It doesn't use the schema editor."
                    )
                    : tx("ui.templates.builder.no_schema_yet", "This template doesn't have a schema yet.")}
                </p>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>
                      {tx("ui.templates.builder.template_code", "Template Code:")}
                    </span>
                    <code className="ml-2 text-xs px-2 py-1 rounded" style={{ background: '#1f2937', color: '#10b981' }}>
                      {templateCode || tx("ui.templates.builder.unknown", "Unknown")}
                    </code>
                  </div>
                  <div>
                    <span className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>
                      {tx("ui.templates.builder.category", "Category:")}
                    </span>
                    <span className="ml-2 text-xs">{template.customProperties?.category || tx("ui.templates.builder.not_available", "N/A")}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>
                      {tx("ui.templates.builder.languages", "Languages:")}
                    </span>
                    <span className="ml-2 text-xs">
                      {(template.customProperties?.supportedLanguages as string[])?.join(', ') || tx("ui.templates.builder.not_available", "N/A")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === "preview" && (
          <div className="h-full overflow-auto p-4" style={{ background: '#F3F4F6' }}>
            {isEmailTemplate ? (
              <div className="max-w-4xl mx-auto">
                <div className="border-2 p-6" style={{ borderColor: 'var(--window-document-border)', background: 'white' }}>
                  <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--window-document-border)' }}>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
                      {tx("ui.templates.builder.email_preview", "Email Preview")}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                      {tx("ui.templates.builder.preview_with_sample_data", "This is a preview with sample data")}
                    </p>
                  </div>
                  <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
                    <Mail size={48} className="mx-auto mb-4" style={{ opacity: 0.3 }} />
                    <p className="text-sm font-bold mb-2">
                      {tx("ui.templates.builder.email_preview_coming_soon", "Email Preview Coming Soon")}
                    </p>
                    <p className="text-xs">
                      {tx("ui.templates.builder.email_rendered_at_send_time", "Email templates are rendered at send-time with actual event/ticket data.")}
                    </p>
                    <p className="text-xs mt-2">
                      {tx("ui.templates.builder.template_code", "Template Code:")}{" "}
                      <code className="px-2 py-1 rounded" style={{ background: '#f3f4f6' }}>{templateCode}</code>
                    </p>
                  </div>
                </div>
              </div>
            ) : template.customProperties?.html && template.customProperties?.css ? (
              <div className="max-w-4xl mx-auto">
                <div className="border-2" style={{ borderColor: 'var(--window-document-border)', background: 'white' }}>
                  <div className="p-4 border-b" style={{ borderColor: 'var(--window-document-border)' }}>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
                      {tx("ui.templates.builder.pdf_template_preview", "PDF Template Preview")}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                      {tx("ui.templates.builder.preview_with_sample_data", "This is a preview with sample data")}
                    </p>
                  </div>
                  <div style={{ padding: '20px', background: '#F9FAFB' }}>
                    <iframe
                      title={tx("ui.templates.builder.template_preview_title", "Template Preview")}
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <meta charset="UTF-8">
                            <style>${template.customProperties.css}</style>
                          </head>
                          <body>
                            ${template.customProperties.html}
                          </body>
                        </html>
                      `}
                      style={{
                        width: '100%',
                        height: '800px',
                        border: '2px solid var(--window-document-border)',
                        background: 'white',
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : templateSchema ? (
              <div className="max-w-4xl mx-auto">
                <TemplateRenderer
                  schema={templateSchema}
                  data={getMockData(templateSchema)}
                  mode="preview"
                  scale={1}
                  interactive={false}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
                  <Eye size={48} className="mx-auto mb-4" style={{ opacity: 0.3 }} />
                  <p className="text-sm">{tx("ui.templates.builder.no_schema_preview", "No schema available for preview")}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="p-4">
            <div className="border-2 p-4" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--window-document-text)' }}>
                {tx("ui.templates.builder.template_settings", "Template Settings")}
              </h3>
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                {tx("ui.templates.builder.settings_coming_soon", "Settings tab coming soon...")}
              </p>
            </div>
          </div>
        )}

        {activeTab === "build" && (
          <div className="p-4">
            <div className="border-2 p-4" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--window-document-text)' }}>
                {tx("ui.templates.builder.visual_builder", "Visual Builder")}
              </h3>
              {isPhase1CustomSurface ? (
                <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  {tx(
                    "ui.templates.builder.phase1_enabled_description",
                    "Phase 1 custom generation is enabled for web/event surfaces with platform-managed credits."
                  )}
                </p>
              ) : (
                <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  {tx(
                    "ui.templates.builder.phase1_scope_guard",
                    "Phase 1 scope guard: invoice/ticket transactional documents stay on the stable template path."
                  )}
                </p>
              )}
              {isStableTransactionalDoc && (
                <p className="text-xs mt-2" style={{ color: 'var(--neutral-gray)' }}>
                  {tx(
                    "ui.templates.builder.transactional_doc_guidance",
                    "Continue using schema and preview tabs for transactional document updates."
                  )}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Generate mock data for template preview
 */
function getMockData(schema: TemplateSchema): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  // Generate mock values based on variable definitions
  schema.variables.forEach((variable) => {
    const path = variable.name.split(".");
    let current = data;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    const lastKey = path[path.length - 1];
    current[lastKey] = getMockValue(variable.type, variable.name);
  });

  return data;
}

/**
 * Generate mock value based on type
 */
function getMockValue(type: string, name: string): unknown {
  switch (type) {
    case "string":
      if (name.includes("email")) return "john.doe@example.com";
      if (name.includes("name")) return "Sample Event";
      if (name.includes("location")) return "Grand Venue, 123 Main St";
      return "Sample Text";

    case "number":
      return 100;

    case "date":
      return new Date().toLocaleDateString();

    case "boolean":
      return true;

    case "image":
      return "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800";

    default:
      return null;
  }
}
