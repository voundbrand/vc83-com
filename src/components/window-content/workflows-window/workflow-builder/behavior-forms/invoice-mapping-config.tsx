/**
 * INVOICE MAPPING CONFIG FORM
 *
 * Configuration UI for the invoice_mapping behavior.
 * Maps form/input data to CRM organizations for invoice creation.
 *
 * CLEAN DESIGN: Matches your invoice config section style
 */

"use client";

import { useMemo } from "react";
import { FileText, Info } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { MappingList, type FormField } from "./mapping-helpers";
import type { InvoiceMappingConfig } from "@/lib/behaviors/handlers/invoice-mapping";

interface InvoiceMappingConfigFormProps {
  config: InvoiceMappingConfig;
  onChange: (config: InvoiceMappingConfig) => void;
  sessionId: string;
  organizationId: Id<"objects">;
  availableForms?: Array<{ fields?: Array<Record<string, unknown>> }>;
  availableCrmOrganizations?: Array<Record<string, unknown>>;
}

export function InvoiceMappingConfigForm({
  config,
  onChange,
  sessionId,
  organizationId,
  availableForms = [],
  availableCrmOrganizations = [],
}: InvoiceMappingConfigFormProps) {
  // Fetch CRM organizations
  // Note: getCrmOrganizations expects Id<"organizations"> but we're passing Id<"objects">
  // This works because both are in the objects table with different type fields
  const crmOrganizations = useQuery(api.crmOntology.getCrmOrganizations, {
    sessionId,
    organizationId: organizationId as unknown as Id<"organizations">,
    status: "active",
  });

  // Fetch available PDF templates
  const availableTemplates = useQuery(api.pdfTemplates.getAvailableTemplates, {
    category: "B2B", // For invoice mapping, we typically use B2B templates
  });

  // Find all form fields from available forms
  const availableFormFields = useMemo(() => {
    const fields: FormField[] = [];

    availableForms.forEach((form) => {
      // Forms store fields in customProperties.formSchema
      const customProps = form as { customProperties?: { formSchema?: { sections?: unknown[]; fields?: unknown[] } } };
      const formSchema = customProps.customProperties?.formSchema;

      if (!formSchema) return;

      // Extract from sections (if form has sections)
      if (formSchema.sections && Array.isArray(formSchema.sections)) {
        for (const section of formSchema.sections) {
          const sectionData = section as { fields?: unknown[] };
          if (sectionData.fields && Array.isArray(sectionData.fields)) {
            for (const field of sectionData.fields) {
              const fieldData = field as { id?: string; label?: string; type?: string; options?: Array<{ value: string; label: string }> };
              if (fieldData.id && fieldData.label) {
                fields.push({
                  id: fieldData.id,
                  label: fieldData.label,
                  type: fieldData.type,
                  options: fieldData.options,
                });
              }
            }
          }
        }
      }

      // Extract from top-level fields (if form has no sections)
      if (formSchema.fields && Array.isArray(formSchema.fields)) {
        for (const field of formSchema.fields) {
          const fieldData = field as { id?: string; label?: string; type?: string; options?: Array<{ value: string; label: string }> };
          if (fieldData.id && fieldData.label) {
            fields.push({
              id: fieldData.id,
              label: fieldData.label,
              type: fieldData.type,
              options: fieldData.options,
            });
          }
        }
      }
    });

    return fields;
  }, [availableForms]);

  // Find selected field
  const selectedField =
    availableFormFields.find((f) => f.id === config.organizationSourceField) || null;

  // Convert mapping to array format
  const mappings = useMemo(() => {
    return Object.entries(config.organizationMapping).map(([formValue, orgId]) => ({
      formValue,
      orgId: orgId || null,
    }));
  }, [config.organizationMapping]);

  // Update config when mappings change
  const handleMappingsChange = (newMappings: Array<{ formValue: string; orgId: string | null }>) => {
    const newMapping: Record<string, string | null> = {};
    newMappings.forEach((m) => {
      if (m.formValue) {
        newMapping[m.formValue] = m.orgId;
      }
    });
    onChange({ ...config, organizationMapping: newMapping });
  };

  return (
    <div
      className="space-y-4 p-4 border-2 rounded"
      style={{
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg-light)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <FileText size={16} />
            Invoice Mapping
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Map form values to organizations and automatically create invoices with billing information
          </p>
        </div>
      </div>

      {/* Template Selection */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Invoice Template
        </label>
        <select
          value={config.templateId || "b2b_consolidated"}
          onChange={(e) =>
            onChange({
              ...config,
              templateId: e.target.value as "b2c_receipt" | "b2b_single" | "b2b_consolidated" | "b2b_consolidated_detailed",
            })
          }
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
        >
          {availableTemplates?.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} - {template.description}
            </option>
          ))}
          {!availableTemplates && (
            <>
              <option value="b2b_consolidated">B2B Consolidated Invoice - Multiple employees → one invoice</option>
              <option value="b2b_consolidated_detailed">B2B Consolidated (Detailed) - With per-employee breakdowns</option>
              <option value="b2b_single">B2B Single Invoice - Individual B2B transaction</option>
              <option value="b2c_receipt">B2C Receipt - Individual customer receipt</option>
            </>
          )}
        </select>

        {/* Template Info Card */}
        {availableTemplates && config.templateId && (
          <div
            className="mt-2 p-3 border-2 rounded"
            style={{
              background: "var(--win95-bg-light)",
              borderColor: "var(--win95-border)",
            }}
          >
            {(() => {
              const selectedTemplate = availableTemplates.find((t) => t.id === (config.templateId || "b2b_consolidated"));
              if (!selectedTemplate) return null;

              return (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Info size={14} style={{ color: "var(--primary)", marginTop: "2px" }} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                        {selectedTemplate.name}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                        {selectedTemplate.previewDescription}
                      </p>
                    </div>
                  </div>

                  {selectedTemplate.useCases && selectedTemplate.useCases.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                        Use Cases:
                      </p>
                      <ul className="text-xs space-y-1 pl-4" style={{ color: "var(--neutral-gray)" }}>
                        {selectedTemplate.useCases.slice(0, 3).map((useCase, idx) => (
                          <li key={idx}>• {useCase}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedTemplate.id === "b2b_consolidated" && (
                    <div
                      className="p-2 border-2 rounded"
                      style={{
                        background: "var(--win95-input-bg)",
                        borderColor: "var(--primary)",
                      }}
                    >
                      <p className="text-xs font-bold" style={{ color: "var(--primary)" }}>
                        ✨ Recommended for hospital billing (AMEOS use case)
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
          💡 The template determines how the invoice PDF will be formatted and what information will be displayed
        </p>
      </div>

      {/* Organization Source Field */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Form Field Containing Organization Info
        </label>
        <select
          value={config.organizationSourceField || ""}
          onChange={(e) =>
            onChange({
              ...config,
              organizationSourceField: e.target.value,
            })
          }
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
        >
          <option value="">-- Select Field --</option>
          {availableFormFields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.label} ({field.id}) {field.type ? `- ${field.type}` : ""}
            </option>
          ))}
        </select>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          The form field that contains organization/company information (e.g., company, employer, organization_name)
        </p>
      </div>

      {/* Organization Mapping - Only show if field selected */}
      {config.organizationSourceField && (
        <div className="pl-4 space-y-4 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                Form Value → Organization Mapping
              </label>
            </div>

            <MappingList
              mappings={mappings}
              formField={selectedField}
              organizations={
                crmOrganizations?.map((org) => {
                  const customProps = org.customProperties as { address?: { city?: string; state?: string } } | undefined;
                  return {
                    _id: org._id,
                    name: org.name,
                    legalEntityName: org.subtype || undefined,
                    city: customProps?.address?.city,
                    state: customProps?.address?.state,
                    status: org.status as "active" | "inactive" | "archived" | undefined,
                  };
                }) || []
              }
              onMappingsChange={handleMappingsChange}
              emptyMessage="No invoice mappings yet. Add mappings to automatically create invoices for organizations."
              nullOptionLabel="-- No Invoice (Skip) --"
            />

            <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
              💡 Map form values to CRM organizations. When matched, an invoice is automatically created with organization billing details.
            </p>
            {crmOrganizations && crmOrganizations.length === 0 && (
              <p
                className="text-xs mt-1 p-2 border-2 rounded"
                style={{
                  color: "var(--warning)",
                  borderColor: "var(--warning)",
                  background: "var(--win95-bg-light)",
                }}
              >
                ⚠️ No CRM organizations found. Create organizations in the CRM app first to enable mapping.
              </p>
            )}
          </div>

          {/* Options */}
          <div>
            <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--win95-text)" }}>
              Behavior Options
            </label>

            <label
              className="flex items-center justify-between p-2 border-2 cursor-pointer hover:bg-gray-50"
              style={{ borderColor: "var(--win95-border)" }}
            >
              <div>
                <div className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                  Require Mapping
                </div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Fail checkout if organization not found in mapping
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.requireMapping ?? false}
                onChange={(e) =>
                  onChange({
                    ...config,
                    requireMapping: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />
            </label>
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
              Default Payment Terms
            </label>
            <select
              value={config.defaultPaymentTerms || "net30"}
              onChange={(e) =>
                onChange({
                  ...config,
                  defaultPaymentTerms: e.target.value as "net30" | "net60" | "net90",
                })
              }
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
              }}
            >
              <option value="net30">NET 30 (Due in 30 days)</option>
              <option value="net60">NET 60 (Due in 60 days)</option>
              <option value="net90">NET 90 (Due in 90 days)</option>
            </select>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Default payment terms for invoices
            </p>
          </div>

          {/* Invoice Field Mapping (Optional) */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
              Invoice Field Mapping <span style={{ color: "var(--neutral-gray)", fontWeight: "normal" }}>(Optional)</span>
            </label>
            <textarea
              value={JSON.stringify(config.invoiceFieldMapping || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onChange({ ...config, invoiceFieldMapping: parsed });
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              className="w-full px-2 py-1 text-xs font-mono border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
                fontFamily: "monospace",
              }}
              rows={4}
              placeholder='{"custom_field": "invoice_field"}'
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Advanced: Map custom form fields to invoice fields. Leave empty to use defaults.
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div
        className="p-3 border-2 rounded"
        style={{
          background: "var(--win95-input-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          💡 <strong>How it works:</strong> When a form is submitted, the organization field value is extracted and
          matched against your mapping. If found, an invoice is automatically created for the CRM organization with
          billing address and payment terms.
        </p>
      </div>
    </div>
  );
}
