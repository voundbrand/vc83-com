"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
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
            Authentication required
          </p>
        </div>
      </div>
    );
  }

  // Show loading while query is pending
  if (template === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  // If query returned but template not found, show error
  if (!template) {
    return (
      <div className="p-4">
        <div className="border-2 p-4" style={{ borderColor: "var(--error)", background: "rgba(239, 68, 68, 0.1)" }}>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--error)" }}>
            Template Not Found
          </p>
          <p className="text-xs" style={{ color: "var(--error)" }}>
            The template you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={onBack}
            className="mt-3 px-3 py-1.5 text-xs font-bold border-2"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-button-face)',
              color: 'var(--win95-text)',
            }}
          >
            Go Back
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
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors hover:brightness-95"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-button-face)',
              color: 'var(--win95-text)',
            }}
          >
            <ArrowLeft size={12} />
            Back
          </button>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
              {template.name}
              {isEmailTemplate && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded" style={{ background: 'var(--win95-highlight)', color: 'var(--win95-titlebar-text)' }}>
                  Email
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
      <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "schema" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "schema" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("schema")}
        >
          <Code size={14} />
          Schema
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "preview" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "preview" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("preview")}
        >
          <Eye size={14} />
          Preview
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "settings" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "settings" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("settings")}
        >
          <SettingsIcon size={14} />
          Settings
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "build" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "build" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("build")}
        >
          <Hammer size={14} />
          Build (Coming Soon)
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "schema" && (
          hasSchema ? (
            <TemplateSchemaEditor templateId={templateId} />
          ) : (
            <div className="p-4">
              <div className="border-2 p-4" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--win95-text)' }}>
                  {isEmailTemplate ? 'Email Template (Legacy)' : 'Template'}
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
                  {isEmailTemplate
                    ? 'This email template is a React component defined in code. It doesn\'t use the schema editor.'
                    : 'This template doesn\'t have a schema yet.'}
                </p>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>Template Code:</span>
                    <code className="ml-2 text-xs px-2 py-1 rounded" style={{ background: '#1f2937', color: '#10b981' }}>
                      {templateCode || 'Unknown'}
                    </code>
                  </div>
                  <div>
                    <span className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>Category:</span>
                    <span className="ml-2 text-xs">{template.customProperties?.category || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>Languages:</span>
                    <span className="ml-2 text-xs">{(template.customProperties?.supportedLanguages as string[])?.join(', ') || 'N/A'}</span>
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
                <div className="border-2 p-6" style={{ borderColor: 'var(--win95-border)', background: 'white' }}>
                  <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--win95-border)' }}>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                      Email Preview
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                      This is a preview with sample data
                    </p>
                  </div>
                  <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
                    <Mail size={48} className="mx-auto mb-4" style={{ opacity: 0.3 }} />
                    <p className="text-sm font-bold mb-2">Email Preview Coming Soon</p>
                    <p className="text-xs">
                      Email templates are rendered at send-time with actual event/ticket data.
                    </p>
                    <p className="text-xs mt-2">
                      Template Code: <code className="px-2 py-1 rounded" style={{ background: '#f3f4f6' }}>{templateCode}</code>
                    </p>
                  </div>
                </div>
              </div>
            ) : template.customProperties?.html && template.customProperties?.css ? (
              <div className="max-w-4xl mx-auto">
                <div className="border-2" style={{ borderColor: 'var(--win95-border)', background: 'white' }}>
                  <div className="p-4 border-b" style={{ borderColor: 'var(--win95-border)' }}>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                      PDF Template Preview
                    </h3>
                    <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                      This is a preview with sample data
                    </p>
                  </div>
                  <div style={{ padding: '20px', background: '#F9FAFB' }}>
                    <iframe
                      title="Template Preview"
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
                        border: '2px solid var(--win95-border)',
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
                  <p className="text-sm">No schema available for preview</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="p-4">
            <div className="border-2 p-4" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--win95-text)' }}>
                Template Settings
              </h3>
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                Settings tab coming soon...
              </p>
            </div>
          </div>
        )}

        {activeTab === "build" && (
          <div className="p-4">
            <div className="border-2 p-4" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--win95-text)' }}>
                Visual Builder
              </h3>
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                Visual template builder coming soon...
              </p>
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
