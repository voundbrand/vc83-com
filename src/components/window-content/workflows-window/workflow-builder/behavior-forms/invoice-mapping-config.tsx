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
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

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
  // Mark as intentionally unused - preserved for future CRM org selection UI
  void availableCrmOrganizations;
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.workflows.invoice_mapping");

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

  if (translationsLoading) {
    return <div className="p-4" style={{ color: "var(--window-document-text)" }}>Loading...</div>;
  }

  return (
    <div
      className="space-y-4 p-4 border-2 rounded"
      style={{
        borderColor: "var(--window-document-border)",
        background: "var(--window-document-bg-elevated)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
            <FileText size={16} />
            {t("ui.workflows.invoice_mapping.header.title")}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.workflows.invoice_mapping.header.description")}
          </p>
        </div>
      </div>

      {/* Template Selection */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--window-document-text)" }}>
          {t("ui.workflows.invoice_mapping.template.label")}
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
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
            color: "var(--window-document-text)",
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
              background: "var(--window-document-bg-elevated)",
              borderColor: "var(--window-document-border)",
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
                      <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        {selectedTemplate.name}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                        {selectedTemplate.previewDescription}
                      </p>
                    </div>
                  </div>

                  {selectedTemplate.useCases && selectedTemplate.useCases.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: "var(--window-document-text)" }}>
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
                        background: "var(--window-document-bg-elevated)",
                        borderColor: "var(--primary)",
                      }}
                    >
                      <p className="text-xs font-bold" style={{ color: "var(--primary)" }}>
                         Recommended for hospital billing (AMEOS use case)
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.workflows.invoice_mapping.template.hint")}
        </p>
      </div>

      {/* Organization Source Field */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--window-document-text)" }}>
          {t("ui.workflows.invoice_mapping.source_field.label")}
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
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
            color: "var(--window-document-text)",
          }}
        >
          <option value="">{t("ui.workflows.invoice_mapping.source_field.placeholder")}</option>
          {availableFormFields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.label} ({field.id}) {field.type ? `- ${field.type}` : ""}
            </option>
          ))}
        </select>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.workflows.invoice_mapping.source_field.hint")}
        </p>
      </div>

      {/* Organization Mapping - Only show if field selected */}
      {config.organizationSourceField && (
        <div className="pl-4 space-y-4 border-l-2" style={{ borderColor: "var(--window-document-border)" }}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {t("ui.workflows.invoice_mapping.mapping.label")}
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
              emptyMessage={t("ui.workflows.invoice_mapping.mapping.empty")}
              nullOptionLabel={t("ui.workflows.invoice_mapping.mapping.null_option")}
            />

            <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.workflows.invoice_mapping.mapping.hint")}
            </p>
            {crmOrganizations && crmOrganizations.length === 0 && (
              <p
                className="text-xs mt-1 p-2 border-2 rounded"
                style={{
                  color: "var(--warning)",
                  borderColor: "var(--warning)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                {t("ui.workflows.invoice_mapping.mapping.no_orgs")}
              </p>
            )}
          </div>

          {/* Options */}
          <div>
            <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--window-document-text)" }}>
              {t("ui.workflows.invoice_mapping.options.title")}
            </label>

            <label
              className="flex items-center justify-between p-2 border-2 cursor-pointer hover:bg-gray-50"
              style={{ borderColor: "var(--window-document-border)" }}
            >
              <div>
                <div className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  {t("ui.workflows.invoice_mapping.options.require_mapping.label")}
                </div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.workflows.invoice_mapping.options.require_mapping.description")}
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
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--window-document-text)" }}>
              {t("ui.workflows.invoice_mapping.payment_terms.label")}
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
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
                color: "var(--window-document-text)",
              }}
            >
              <option value="net30">{t("ui.workflows.invoice_mapping.payment_terms.net30")}</option>
              <option value="net60">{t("ui.workflows.invoice_mapping.payment_terms.net60")}</option>
              <option value="net90">{t("ui.workflows.invoice_mapping.payment_terms.net90")}</option>
            </select>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.workflows.invoice_mapping.payment_terms.hint")}
            </p>
          </div>

          {/* Invoice Field Mapping (Optional) */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--window-document-text)" }}>
              {t("ui.workflows.invoice_mapping.field_mapping.label")} <span style={{ color: "var(--neutral-gray)", fontWeight: "normal" }}>{t("ui.workflows.invoice_mapping.field_mapping.optional")}</span>
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
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
                color: "var(--window-document-text)",
                fontFamily: "monospace",
              }}
              rows={4}
              placeholder='{"custom_field": "invoice_field"}'
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.workflows.invoice_mapping.field_mapping.hint")}
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div
        className="p-3 border-2 rounded"
        style={{
          background: "var(--window-document-bg-elevated)",
          borderColor: "var(--window-document-border)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }} dangerouslySetInnerHTML={{ __html: t("ui.workflows.invoice_mapping.info.how_it_works") }} />
      </div>
    </div>
  );
}
