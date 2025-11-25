"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Save, AlertCircle, CheckCircle, Code, RefreshCw, Eye, FileJson, Copy } from "lucide-react";
import type { FormSchema } from "@/templates/forms/types";

interface SchemaEditorTabProps {
  formId: Id<"objects">;
}

export function SchemaEditorTab({ formId }: SchemaEditorTabProps) {
  const { sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.forms");

  const [schemaJson, setSchemaJson] = useState<string>("");
  const [originalSchema, setOriginalSchema] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Fetch form data
  const form = useQuery(
    api.formsOntology.getForm,
    sessionId && formId ? { sessionId, formId } : "skip"
  );

  const updateForm = useMutation(api.formsOntology.updateForm);

  // Load schema when form data arrives
  useEffect(() => {
    if (form?.customProperties?.formSchema) {
      const schema = form.customProperties.formSchema as FormSchema;
      const formatted = JSON.stringify(schema, null, 2);
      setSchemaJson(formatted);
      setOriginalSchema(formatted);
      setIsDirty(false);
    }
  }, [form]);

  // Track changes
  useEffect(() => {
    setIsDirty(schemaJson !== originalSchema);
  }, [schemaJson, originalSchema]);

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
      const parsed = JSON.parse(schemaJson) as FormSchema;

      // Basic validation
      if (!parsed.version) {
        throw new Error("Schema must have a 'version' field");
      }
      if (!parsed.sections || !Array.isArray(parsed.sections)) {
        throw new Error("Schema must have a 'sections' array");
      }
      if (!parsed.settings) {
        throw new Error("Schema must have a 'settings' object");
      }

      // Validate sections
      parsed.sections.forEach((section, idx) => {
        if (!section.id) throw new Error(`Section ${idx} missing 'id'`);
        if (!section.title) throw new Error(`Section ${idx} missing 'title'`);
        if (!section.fields || !Array.isArray(section.fields)) {
          throw new Error(`Section ${idx} missing 'fields' array`);
        }

        // Validate fields
        section.fields.forEach((field, fieldIdx) => {
          if (!field.id) throw new Error(`Section ${idx}, Field ${fieldIdx} missing 'id'`);
          if (!field.type) throw new Error(`Section ${idx}, Field ${fieldIdx} missing 'type'`);
          if (!field.label && field.type !== "text_block" && field.type !== "description") {
            throw new Error(`Section ${idx}, Field ${fieldIdx} missing 'label'`);
          }
        });
      });

      setError(null);
      setSuccess("✓ Schema is valid!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(`Validation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleSave = async () => {
    if (!sessionId || !formId) return;

    try {
      setIsSaving(true);
      setError(null);

      // Validate before saving
      const parsed = JSON.parse(schemaJson) as FormSchema;

      // Basic validation (same as handleValidate)
      if (!parsed.version || !parsed.sections || !parsed.settings) {
        throw new Error("Invalid schema structure");
      }

      // Update form with new schema
      await updateForm({
        sessionId,
        formId,
        name: form?.name || "Untitled Form",
        description: form?.description || "",
        formSchema: parsed,
        eventId: (form?.customProperties?.eventId as Id<"objects"> | null) || null,
      });

      setOriginalSchema(schemaJson);
      setIsDirty(false);
      setSuccess("Schema saved successfully!");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Discard all changes and reset to saved schema?")) {
      setSchemaJson(originalSchema);
      setError(null);
      setIsDirty(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(schemaJson);
      setSuccess("✓ Copied to clipboard!");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(`Failed to copy: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  if (!sessionId || !form) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--win95-highlight)" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b-2 p-4" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Code size={20} style={{ color: "var(--win95-highlight)" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
              Schema Editor
            </h3>
            {isDirty && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--warning)", color: "white" }}>
                Unsaved Changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-bold border-2 flex items-center gap-1 transition-colors hover:brightness-95"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--success)",
              }}
              title="Copy schema to clipboard"
            >
              <Copy size={14} />
              Copy
            </button>

            <button
              onClick={handleFormat}
              className="px-3 py-1.5 text-xs font-bold border-2 flex items-center gap-1 transition-colors hover:brightness-95"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
              title="Format JSON (prettify)"
            >
              <FileJson size={14} />
              Format
            </button>

            <button
              onClick={handleValidate}
              className="px-3 py-1.5 text-xs font-bold border-2 flex items-center gap-1 transition-colors hover:brightness-95"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
              title="Validate schema structure"
            >
              <Eye size={14} />
              Validate
            </button>

            <button
              onClick={handleReset}
              disabled={!isDirty}
              className="px-3 py-1.5 text-xs font-bold border-2 flex items-center gap-1 transition-colors hover:brightness-95 disabled:opacity-50"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
              title="Reset to saved schema"
            >
              <RefreshCw size={14} />
              Reset
            </button>

            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="px-4 py-1.5 text-xs font-bold border-2 flex items-center gap-1 transition-colors hover:brightness-95 disabled:opacity-50"
              style={{
                borderColor: "var(--win95-border)",
                background: isDirty && !isSaving ? "var(--win95-highlight)" : "var(--win95-button-face)",
                color: isDirty && !isSaving ? "white" : "var(--win95-text)",
              }}
            >
              <Save size={14} />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="border-2 p-3 mb-2" style={{ borderColor: "var(--error)", background: "rgba(239, 68, 68, 0.1)" }}>
            <div className="flex items-start gap-2">
              <AlertCircle size={16} style={{ color: "var(--error)" }} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold" style={{ color: "var(--error)" }}>Validation Error</p>
                <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="border-2 p-3" style={{ borderColor: "var(--success)", background: "rgba(16, 185, 129, 0.1)" }}>
            <div className="flex items-start gap-2">
              <CheckCircle size={16} style={{ color: "var(--success)" }} className="flex-shrink-0 mt-0.5" />
              <p className="text-xs" style={{ color: "var(--success)" }}>{success}</p>
            </div>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 p-4 overflow-hidden">
        <textarea
          value={schemaJson}
          onChange={(e) => setSchemaJson(e.target.value)}
          className="w-full h-full border-2 p-3 font-mono text-xs resize-none"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-text)",
            fontFamily: "'Courier New', monospace",
            lineHeight: "1.5",
          }}
          spellCheck={false}
        />
      </div>

      {/* Footer Help */}
      <div className="border-t-2 p-3 text-xs" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)", color: "var(--neutral-gray)" }}>
        <p className="mb-2"><strong>Quick Tips:</strong></p>
        <ul className="space-y-1 ml-4">
          <li>• Add <code className="px-1 py-0.5" style={{ background: "var(--win95-bg)" }}>text_block</code> fields for static text/introductions</li>
          <li>• Use <code className="px-1 py-0.5" style={{ background: "var(--win95-bg)" }}>content</code> property for HTML content</li>
          <li>• Click "Format" to prettify JSON | "Validate" to check structure | "Save" to apply changes</li>
          <li>• Example: <code className="px-1 py-0.5" style={{ background: "var(--win95-bg)" }}>{`{"id": "intro", "type": "text_block", "label": "", "content": "<p>Welcome!</p>"}`}</code></li>
        </ul>
      </div>
    </div>
  );
}
