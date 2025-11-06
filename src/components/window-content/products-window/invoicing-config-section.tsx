"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Trash2, Plus, CreditCard } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

export interface InvoiceConfig {
  employerSourceField: string;
  employerMapping: Record<string, string | null>; // Maps form value to CRM organization ID
  defaultPaymentTerms?: "net30" | "net60" | "net90";
}

interface InvoicingConfigSectionProps {
  config: InvoiceConfig | null;
  onChange: (config: InvoiceConfig | null) => void;
  availableFormFields: Array<{
    id: string;
    label: string;
    type?: string;
    options?: Array<{ value: string; label: string }>;
  }>;
  sessionId: string;
  organizationId: Id<"organizations">;
}

export function InvoicingConfigSection({
  config,
  onChange,
  availableFormFields,
  sessionId,
  organizationId,
}: InvoicingConfigSectionProps) {
  const { t } = useNamespaceTranslations("ui.products");

  // Fetch CRM organizations
  const crmOrganizations = useQuery(
    api.crmOntology.getCrmOrganizations,
    { sessionId, organizationId, status: "active" }
  );

  // Local state for the mapping entries
  const [mappingEntries, setMappingEntries] = useState<Array<{ formValue: string; orgName: string | null }>>([]);

  // Initialize mappingEntries from config on mount/update
  useEffect(() => {
    if (config?.employerMapping) {
      const entries = Object.entries(config.employerMapping).map(([formValue, orgName]) => ({
        formValue,
        orgName,
      }));
      setMappingEntries(entries);
    } else {
      setMappingEntries([]);
    }
  }, [config?.employerMapping]);

  // Find selected field's options if it's a select/radio field
  const selectedFieldOptions =
    availableFormFields.find((f) => f.id === config?.employerSourceField)?.options || [];

  // Sync mappingEntries back to config when they change
  const updateMappingInConfig = (entries: Array<{ formValue: string; orgName: string | null }>) => {
    const employerMapping: Record<string, string | null> = {};
    entries.forEach((entry) => {
      if (entry.formValue) {
        employerMapping[entry.formValue] = entry.orgName || null;
      }
    });

    onChange({
      employerSourceField: config?.employerSourceField || "",
      employerMapping,
      defaultPaymentTerms: config?.defaultPaymentTerms || "net30",
    });
  };

  const addMapping = () => {
    const newEntries = [...mappingEntries, { formValue: "", orgName: null }];
    setMappingEntries(newEntries);
    // Don't call updateMappingInConfig yet - wait for user to fill in values
  };

  const removeMapping = (index: number) => {
    const newEntries = mappingEntries.filter((_, i) => i !== index);
    setMappingEntries(newEntries);
    updateMappingInConfig(newEntries);
  };

  const updateMapping = (index: number, field: "formValue" | "orgName", value: string) => {
    const newEntries = [...mappingEntries];
    newEntries[index] = {
      ...newEntries[index],
      [field]: value === "" ? null : value,
    };
    setMappingEntries(newEntries);
    // Only sync to config if formValue is not empty (to avoid creating invalid mappings)
    const validEntries = newEntries.filter(e => e.formValue && e.formValue.trim() !== "");
    if (validEntries.length > 0 || newEntries.length === 0) {
      updateMappingInConfig(newEntries);
    }
  };

  // Show nothing if no form is linked (not applicable)
  if (availableFormFields.length === 0) {
    return null;
  }

  return (
    <div
      className="space-y-4 p-4 border-2 rounded"
      style={{
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg-light)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <CreditCard size={16} />
            {t("ui.products.invoicing.title")}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Map form values to employer organizations for invoice payment (enable invoice payment at checkout level)
          </p>
        </div>
      </div>

      {/* Employer Source Field */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          {t("ui.products.invoicing.sourceField.label")}
        </label>
        <select
          value={config?.employerSourceField || ""}
          onChange={(e) =>
            onChange(e.target.value ? {
              employerSourceField: e.target.value,
              employerMapping: config?.employerMapping || {},
              defaultPaymentTerms: config?.defaultPaymentTerms || "net30",
            } : null)
          }
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
        >
          <option value="">-- Not Configured (No Invoice Mapping) --</option>
          {availableFormFields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.label} ({field.id}) {field.type ? `- ${field.type}` : ""}
            </option>
          ))}
        </select>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          The form field that contains employer/organization information (e.g., attendee_category, employer_name)
        </p>
      </div>

      {/* Employer Mapping Table - Only show if field selected */}
      {config?.employerSourceField && (
        <div className="pl-4 space-y-4 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                {t("ui.products.invoicing.mapping.label")}
              </label>
            </div>

            {/* Show field options hint if available */}
            {selectedFieldOptions.length > 0 && (
              <div
                className="p-2 mb-2 border-2 rounded text-xs"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--neutral-gray)",
                }}
              >
                💡 Available options: {selectedFieldOptions.map((opt) => opt.label).join(", ")}
              </div>
            )}

            <div className="space-y-2">
              {mappingEntries.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 border-2 rounded"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-input-bg)",
                  }}
                >
                  {/* Form Value */}
                  <div className="flex-1">
                    {selectedFieldOptions.length > 0 ? (
                      <select
                        value={entry.formValue}
                        onChange={(e) => updateMapping(index, "formValue", e.target.value)}
                        className="w-full px-2 py-1 text-xs border"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "white",
                        }}
                      >
                        <option value="">-- Select Option --</option>
                        {selectedFieldOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} ({opt.value})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={entry.formValue}
                        onChange={(e) => updateMapping(index, "formValue", e.target.value)}
                        placeholder="Form value (e.g., ameos)"
                        className="w-full px-2 py-1 text-xs border"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "white",
                        }}
                      />
                    )}
                  </div>

                  {/* Arrow */}
                  <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                    →
                  </span>

                  {/* Organization - Dropdown from CRM */}
                  <div className="flex-1">
                    <select
                      value={entry.orgName || ""}
                      onChange={(e) => updateMapping(index, "orgName", e.target.value)}
                      className="w-full px-2 py-1 text-xs border"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "white",
                      }}
                    >
                      <option value="">-- No Invoice (Disable) --</option>
                      {crmOrganizations?.map((org) => (
                        <option key={org._id} value={org._id}>
                          {org.name} {org.subtype ? `(${org.subtype})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeMapping(index)}
                    className="p-1 border-2 hover:bg-red-100 transition-colors"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-button-face)",
                    }}
                    title="Remove mapping"
                  >
                    <Trash2 size={14} style={{ color: "var(--danger)" }} />
                  </button>
                </div>
              ))}

              {/* Add Mapping Button */}
              <button
                type="button"
                onClick={addMapping}
                className="w-full px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 border-2 transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-button-face)",
                  color: "var(--win95-text)",
                }}
              >
                <Plus size={14} />
                {t("ui.products.invoicing.button.addMapping")}
              </button>
            </div>

            <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
              💡 Map form values to CRM organizations. Select an organization from your CRM to enable invoice payment, or leave empty to disable invoicing for that value.
            </p>
            {crmOrganizations && crmOrganizations.length === 0 && (
              <p className="text-xs mt-1 p-2 border-2 rounded" style={{ color: "var(--warning)", borderColor: "var(--warning)", background: "var(--win95-bg-light)" }}>
                ⚠️ No CRM organizations found. Create organizations in the CRM app first to enable invoice mapping.
              </p>
            )}
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
              {t("ui.products.invoicing.paymentTerms.label")}
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
              <option value="net30">{t("ui.products.invoicing.paymentTerms.net30")}</option>
              <option value="net60">{t("ui.products.invoicing.paymentTerms.net60")}</option>
              <option value="net90">{t("ui.products.invoicing.paymentTerms.net90")}</option>
            </select>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Default payment terms for invoices (can be customized per organization in CRM)
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
          💡 <strong>How it works:</strong> When invoice payment is enabled at checkout and a customer selects
          &quot;Invoice (Pay Later)&quot;, the system extracts the employer info from the selected form field,
          matches it to a CRM organization using your mapping above, and creates an invoice to that organization.
        </p>
      </div>
    </div>
  );
}
