/**
 * TEMPLATE SCHEMA EDITOR
 *
 * JSON editor for template schemas (similar to SchemaEditorTab for forms)
 * Allows editing template structure, styling, and layout directly as JSON
 *
 * Features:
 * - JSON editing with syntax highlighting
 * - Real-time validation
 * - Format/prettify
 * - Live preview panel
 * - Save to database
 */

"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Save,
  AlertCircle,
  CheckCircle,
  Code,
  RefreshCw,
  Eye,
  FileJson,
  Copy,
  Loader2,
  X,
} from "lucide-react";
import type { TemplateSchema } from "@/templates/template-schema";
import { TemplateRenderer } from "./template-renderer";

interface TemplateSchemaEditorProps {
  templateId: Id<"objects">;
  onClose?: () => void;
}

export function TemplateSchemaEditor({ templateId, onClose }: TemplateSchemaEditorProps) {
  const { sessionId } = useAuth();

  const [schemaJson, setSchemaJson] = useState<string>("");
  const [originalSchema, setOriginalSchema] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [parsedSchema, setParsedSchema] = useState<TemplateSchema | null>(null);

  // Fetch template by ID (works for both system and custom templates)
  const template = useQuery(
    api.templateOntology.getTemplateById,
    sessionId ? { sessionId, templateId } : "skip"
  );

  const isEmailTemplate = template?.subtype === "email";

  // Mutation for updating template
  const updateTemplate = useMutation(api.templateOntology.updateTemplate);

  // Load schema when template data arrives
  useEffect(() => {
    // Check for schema in either templateSchema (PDF) or emailTemplateSchema (Email)
    const schema = (template?.customProperties?.templateSchema || template?.customProperties?.emailTemplateSchema) as TemplateSchema | undefined;

    if (schema) {
      const formatted = JSON.stringify(schema, null, 2);
      setSchemaJson(formatted);
      setOriginalSchema(formatted);
      setIsDirty(false);
      setParsedSchema(schema);
    } else if (isEmailTemplate) {
      // Email template without schema - provide empty email schema template
      const emptyEmailSchema = {
        code: template.customProperties?.code || "email_template",
        name: template.name,
        description: template.description || "",
        category: "transactional" as const,
        version: "1.0.0",
        defaultSections: [
          {
            type: "hero",
            title: "Email Title",
            subtitle: "Email subtitle"
          }
        ],
        defaultBrandColor: "#6B46C1",
        supportedLanguages: ["en"],
        variables: []
      };
      const formatted = JSON.stringify(emptyEmailSchema, null, 2);
      setSchemaJson(formatted);
      setOriginalSchema(formatted);
    }
  }, [template, isEmailTemplate]);

  // Track changes
  useEffect(() => {
    setIsDirty(schemaJson !== originalSchema);
  }, [schemaJson, originalSchema]);

  // Try to parse schema for preview
  useEffect(() => {
    try {
      const parsed = JSON.parse(schemaJson);

      // Check if this is full customProperties (has html/css/templateSchema)
      // or just a bare schema (has variables/layout at root)
      const isFullCustomProperties = parsed.html || parsed.css || parsed.templateSchema || parsed.emailTemplateSchema;
      const actualSchema: TemplateSchema | null = isFullCustomProperties
        ? (parsed.templateSchema || parsed.emailTemplateSchema || null)
        : parsed;

      setParsedSchema(actualSchema);
      setError(null);
    } catch {
      setParsedSchema(null);
      // Don't set error here - only on explicit validation
    }
  }, [schemaJson]);

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(schemaJson);
      const formatted = JSON.stringify(parsed, null, 2);
      setSchemaJson(formatted);
      setError(null);
      setSuccess("Schema formatted successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(`Invalid JSON: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleValidate = () => {
    try {
      const parsed = JSON.parse(schemaJson) as TemplateSchema;

      // Basic validation
      if (!parsed.version) {
        throw new Error("Schema must have a 'version' field");
      }
      if (!parsed.code) {
        throw new Error("Schema must have a 'code' field");
      }
      if (!parsed.name) {
        throw new Error("Schema must have a 'name' field");
      }

      // Check if this is an email schema (has defaultSections) or PDF schema (has layout.sections)
      const isEmailSchema = "defaultSections" in parsed && Array.isArray(parsed.defaultSections);
      const isPdfSchema = parsed.layout && "sections" in parsed.layout && Array.isArray(parsed.layout.sections);

      if (!isEmailSchema && !isPdfSchema) {
        throw new Error("Schema must have either 'defaultSections' (email) or 'layout.sections' (PDF)");
      }

      // Email schema validation
      if (isEmailSchema) {
        const emailSchema = parsed as unknown as { defaultSections: unknown[]; variables?: unknown[] };
        if (!emailSchema.defaultSections || !Array.isArray(emailSchema.defaultSections)) {
          throw new Error("Email schema must have 'defaultSections' array");
        }
        // Email schemas may not have strict section structure validation
        emailSchema.defaultSections.forEach((section: unknown, idx: number) => {
          if (!section || typeof section !== "object") {
            throw new Error(`Email section ${idx} must be an object`);
          }
          const sec = section as { type?: string };
          if (!sec.type) throw new Error(`Email section ${idx} missing 'type'`);
        });
      }

      // PDF schema validation
      if (isPdfSchema) {
        if (!parsed.styling) {
          throw new Error("PDF schema must have a 'styling' object");
        }
        // Validate PDF sections
        parsed.layout!.sections.forEach((section, idx) => {
          if (!section.id) throw new Error(`PDF section ${idx} missing 'id'`);
          if (!section.type) throw new Error(`PDF section ${idx} missing 'type'`);
          if (typeof section.order !== "number") throw new Error(`PDF section ${idx} missing 'order'`);
          if (typeof section.visible !== "boolean") throw new Error(`PDF section ${idx} missing 'visible'`);
        });
      }

      // Validate variables (both schemas should have this)
      if (parsed.variables && Array.isArray(parsed.variables)) {
        parsed.variables.forEach((variable, idx) => {
          if (!variable.name) throw new Error(`Variable ${idx} missing 'name'`);
          if (!variable.type) throw new Error(`Variable ${idx} missing 'type'`);
          if (typeof variable.required !== "boolean") {
            throw new Error(`Variable ${idx} missing 'required'`);
          }
        });
      }

      setError(null);
      setSuccess(`✓ ${isEmailSchema ? "Email" : "PDF"} schema is valid!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(schemaJson);
      setSuccess("Schema copied to clipboard");
      setTimeout(() => setSuccess(null), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handleSave = async () => {
    if (!sessionId || !templateId) return;

    try {
      setIsSaving(true);
      setError(null);

      // Parse JSON
      const parsed = JSON.parse(schemaJson);

      // Determine if this is:
      // 1. Full customProperties (has html/css/templateSchema)
      // 2. Just a bare schema (has variables/layout at root)
      const isFullCustomProperties = parsed.html || parsed.css || parsed.templateSchema || parsed.emailTemplateSchema;
      const schemaToValidate: TemplateSchema = isFullCustomProperties
        ? (parsed.templateSchema || parsed.emailTemplateSchema)
        : parsed;

      // Validate the schema (whether nested or at root)
      if (!schemaToValidate) {
        throw new Error("No valid schema found. Must have 'templateSchema' (for full customProperties) or schema fields at root level.");
      }

      if (!schemaToValidate.version) {
        throw new Error("Schema must have a 'version' field");
      }
      if (!schemaToValidate.code) {
        throw new Error("Schema must have a 'code' field");
      }
      if (!schemaToValidate.name) {
        throw new Error("Schema must have a 'name' field");
      }

      // Check if this is an email schema (has defaultSections) or PDF schema (has layout.sections)
      const isEmailSchema = "defaultSections" in schemaToValidate && Array.isArray(schemaToValidate.defaultSections);
      const isPdfSchema = schemaToValidate.layout && "sections" in schemaToValidate.layout && Array.isArray(schemaToValidate.layout.sections);

      if (!isEmailSchema && !isPdfSchema) {
        throw new Error("Schema must have either 'defaultSections' (email) or 'layout.sections' (PDF)");
      }

      // Email schema validation
      if (isEmailSchema) {
        const emailSchema = schemaToValidate as unknown as { defaultSections: unknown[]; variables?: unknown[] };
        if (!emailSchema.defaultSections || !Array.isArray(emailSchema.defaultSections)) {
          throw new Error("Email schema must have 'defaultSections' array");
        }
        emailSchema.defaultSections.forEach((section: unknown, idx: number) => {
          if (!section || typeof section !== "object") {
            throw new Error(`Email section ${idx} must be an object`);
          }
          const sec = section as { type?: string };
          if (!sec.type) throw new Error(`Email section ${idx} missing 'type'`);
        });
      }

      // PDF schema validation
      if (isPdfSchema) {
        if (!schemaToValidate.styling) {
          throw new Error("PDF schema must have a 'styling' object");
        }
        // Validate PDF sections (if any)
        if (schemaToValidate.layout!.sections.length > 0) {
          schemaToValidate.layout!.sections.forEach((section, idx) => {
            if (!section.id) throw new Error(`PDF section ${idx} missing 'id'`);
            if (!section.type) throw new Error(`PDF section ${idx} missing 'type'`);
          });
        }
      }

      // Validation passed, save to database
      await updateTemplate({
        sessionId,
        templateId,
        updates: {
          // Pass the entire parsed JSON as customProperties
          // This allows editing html, css, templateSchema, etc.
          customProperties: parsed,
        },
      });

      setOriginalSchema(schemaJson);
      setIsDirty(false);
      setSuccess("Template schema saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(
        `Save failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset your changes?")) {
      setSchemaJson(originalSchema);
      setError(null);
    }
  };

  // Show loading while query is pending
  if (template === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin mr-2" size={20} />
        <span>Loading template...</span>
      </div>
    );
  }

  // Show error if template not found
  if (!template) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center" style={{ color: "var(--error)" }}>
          <AlertCircle size={32} className="mx-auto mb-2" />
          <div className="text-sm font-bold">Template Not Found</div>
          <div className="text-xs mt-1">The template you're trying to edit doesn't exist or you don't have permission to view it.</div>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-3 px-3 py-1.5 text-xs font-bold border-2"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-button-face)',
                color: 'var(--win95-text)',
              }}
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b-2"
        style={{
          backgroundColor: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            Template Schema Editor
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {template.name}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: "var(--neutral-gray)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--win95-text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--neutral-gray)")}
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center gap-2 p-3 border-b-2"
        style={{
          backgroundColor: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <button
          onClick={handleFormat}
          className="px-3 py-1.5 text-xs font-bold border-2 transition-colors flex items-center gap-1"
          style={{
            backgroundColor: "var(--win95-bg)",
            borderColor: "var(--win95-border)",
            color: "var(--win95-text)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--win95-bg-dark)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--win95-bg)")}
        >
          <Code size={14} />
          Format
        </button>

        <button
          onClick={handleValidate}
          className="px-3 py-1.5 text-xs font-bold border-2 transition-colors flex items-center gap-1"
          style={{
            backgroundColor: "var(--win95-bg)",
            borderColor: "var(--win95-border)",
            color: "var(--win95-text)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--win95-bg-dark)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--win95-bg)")}
        >
          <CheckCircle size={14} />
          Validate
        </button>

        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-xs font-bold border-2 transition-colors flex items-center gap-1"
          style={{
            backgroundColor: "var(--win95-bg)",
            borderColor: "var(--win95-border)",
            color: "var(--win95-text)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--win95-bg-dark)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--win95-bg)")}
        >
          <Copy size={14} />
          Copy
        </button>

        <button
          onClick={handleReset}
          disabled={!isDirty}
          className="px-3 py-1.5 text-xs font-bold border-2 transition-colors flex items-center gap-1"
          style={{
            backgroundColor: "var(--win95-bg)",
            borderColor: "var(--win95-border)",
            color: isDirty ? "var(--win95-text)" : "var(--neutral-gray)",
            cursor: isDirty ? "pointer" : "not-allowed",
          }}
          onMouseEnter={(e) =>
            isDirty && (e.currentTarget.style.backgroundColor = "var(--win95-bg-dark)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--win95-bg)")}
        >
          <RefreshCw size={14} />
          Reset
        </button>

        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-3 py-1.5 text-xs font-bold border-2 transition-colors flex items-center gap-1"
          style={{
            backgroundColor: showPreview ? "var(--win95-highlight)" : "var(--win95-bg)",
            borderColor: "var(--win95-border)",
            color: showPreview ? "white" : "var(--win95-text)",
          }}
          onMouseEnter={(e) =>
            !showPreview && (e.currentTarget.style.backgroundColor = "var(--win95-bg-dark)")
          }
          onMouseLeave={(e) =>
            !showPreview && (e.currentTarget.style.backgroundColor = "var(--win95-bg)")
          }
        >
          <Eye size={14} />
          {showPreview ? "Hide" : "Show"} Preview
        </button>

        <div className="flex-1" />

        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="px-4 py-1.5 text-xs font-bold border-2 transition-colors flex items-center gap-1"
          style={{
            backgroundColor: isDirty && !isSaving ? "var(--win95-highlight)" : "var(--win95-bg)",
            borderColor: "var(--win95-border)",
            color: isDirty && !isSaving ? "white" : "var(--neutral-gray)",
            cursor: isDirty && !isSaving ? "pointer" : "not-allowed",
          }}
        >
          {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Status messages */}
      {(error || success) && (
        <div className="p-3 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
          {error && (
            <div
              className="flex items-start gap-2 p-3 border-2"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderColor: "var(--error)",
              }}
            >
              <AlertCircle size={16} style={{ color: "var(--error)" }} className="flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold" style={{ color: "var(--error)" }}>
                  Error
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--error)" }}>
                  {error}
                </div>
              </div>
            </div>
          )}
          {success && (
            <div
              className="flex items-start gap-2 p-3 border-2"
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                borderColor: "var(--success)",
              }}
            >
              <CheckCircle size={16} style={{ color: "var(--success)" }} className="flex-shrink-0 mt-0.5" />
              <div className="text-xs font-bold" style={{ color: "var(--success)" }}>
                {success}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* JSON Editor */}
        <div className={`flex flex-col ${showPreview ? "w-1/2" : "w-full"} border-r-2`} style={{ borderColor: "var(--win95-border)" }}>
          <div
            className="p-2 border-b-2 text-xs font-bold"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              borderColor: "var(--win95-border)",
              color: "var(--win95-text)",
            }}
          >
            <FileJson size={14} className="inline mr-1" />
            Schema JSON {isDirty && <span style={{ color: "var(--warning)" }}>●</span>}
          </div>
          <textarea
            value={schemaJson}
            onChange={(e) => setSchemaJson(e.target.value)}
            className="flex-1 p-4 font-mono text-xs resize-none focus:outline-none"
            style={{
              backgroundColor: "var(--win95-input-bg)",
              color: "var(--win95-text)",
              fontFamily: "Monaco, Courier, monospace",
              lineHeight: "1.5",
            }}
            spellCheck={false}
          />
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="w-1/2 flex flex-col">
            <div
              className="p-2 border-b-2 text-xs font-bold"
              style={{
                backgroundColor: "var(--win95-bg-light)",
                borderColor: "var(--win95-border)",
                color: "var(--win95-text)",
              }}
            >
              <Eye size={14} className="inline mr-1" />
              Live Preview
            </div>
            <div className="flex-1 overflow-auto p-4" style={{ backgroundColor: "#F3F4F6" }}>
              {template?.customProperties?.html && template?.customProperties?.css ? (
                // Show HTML/CSS preview for templates with html/css
                <div className="max-w-4xl mx-auto">
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
              ) : parsedSchema ? (
                // Show TemplateRenderer for schema-based templates
                <div className="max-w-2xl mx-auto">
                  <TemplateRenderer
                    schema={parsedSchema}
                    data={getMockData(parsedSchema)}
                    mode="preview"
                    scale={1}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center" style={{ color: "var(--neutral-gray)" }}>
                    <AlertCircle size={32} className="mx-auto mb-2" />
                    <div className="text-sm">Invalid JSON</div>
                    <div className="text-xs mt-1">Fix the schema to see preview</div>
                  </div>
                </div>
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

  // Safety check: schema might not have variables
  if (!schema.variables || !Array.isArray(schema.variables)) {
    return data;
  }

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

  // Add current year
  data.currentYear = new Date().getFullYear();

  return data;
}

/**
 * Generate mock value based on type
 */
function getMockValue(type: string, name: string): unknown {
  switch (type) {
    case "string":
      if (name.includes("email")) return "john.doe@example.com";
      if (name.includes("firstName")) return "John";
      if (name.includes("lastName")) return "Doe";
      if (name.includes("ticketNumber")) return "TKT-001234";
      if (name.includes("name")) return "Sample Event";
      if (name.includes("location")) return "Grand Venue, 123 Main St";
      if (name.includes("description")) return "This is a sample description for preview purposes.";
      if (name.includes("url")) return "https://example.com";
      return "Sample Text";

    case "number":
      if (name.includes("price")) return 5000; // cents
      if (name.includes("guest")) return 2;
      return 100;

    case "date":
      return new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    case "boolean":
      return true;

    case "image":
      return "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800";

    case "qr":
      return "MOCK-QR-DATA-" + Math.random().toString(36).substring(7);

    default:
      return null;
  }
}
