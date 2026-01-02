/**
 * EMPLOYER DETECTION CONFIG FORM
 *
 * Configuration UI for the employer_detection behavior.
 * Maps form field values to CRM organizations for employer billing.
 *
 * CLEAN DESIGN: Matches your invoice config section style
 */

"use client";

import { useMemo } from "react";
import { Building2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { MappingList, type FormField } from "./mapping-helpers";
import type { EmployerDetectionConfig } from "@/lib/behaviors/handlers/employer-detection";

interface EmployerDetectionConfigFormProps {
  config: EmployerDetectionConfig;
  onChange: (config: EmployerDetectionConfig) => void;
  sessionId: string;
  organizationId: Id<"objects">;
  availableForms?: Array<{ fields?: Array<Record<string, unknown>> }>;
  availableCrmOrganizations?: Array<Record<string, unknown>>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function EmployerDetectionConfigForm({
  config,
  onChange,
  sessionId,
  organizationId,
  availableForms = [],
  availableCrmOrganizations: _availableCrmOrganizations = [],
}: EmployerDetectionConfigFormProps) {
  // Fetch CRM organizations
  // Note: getCrmOrganizations expects Id<"organizations"> but we're passing Id<"objects">
  // This works because both are in the objects table with different type fields
  const crmOrganizations = useQuery(api.crmOntology.getCrmOrganizations, {
    sessionId,
    organizationId: organizationId as unknown as Id<"organizations">,
    status: "active",
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
    availableFormFields.find((f) => f.id === config.employerSourceField) || null;

  // Convert mapping to array format
  const mappings = useMemo(() => {
    return Object.entries(config.employerMapping).map(([formValue, orgId]) => ({
      formValue,
      orgId: orgId || null,
    }));
  }, [config.employerMapping]);

  // Update config when mappings change
  const handleMappingsChange = (newMappings: Array<{ formValue: string; orgId: string | null }>) => {
    const newMapping: Record<string, string | null> = {};
    newMappings.forEach((m) => {
      if (m.formValue) {
        newMapping[m.formValue] = m.orgId;
      }
    });
    onChange({ ...config, employerMapping: newMapping });
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
            <Building2 size={16} />
            Employer Detection
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Map form values to employer organizations for automatic billing address detection
          </p>
        </div>
      </div>

      {/* Employer Source Field */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Form Field Containing Employer Info
        </label>
        <select
          value={config.employerSourceField || ""}
          onChange={(e) =>
            onChange({
              ...config,
              employerSourceField: e.target.value,
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
          The form field that contains employer/organization information (e.g., attendee_category, company)
        </p>
      </div>

      {/* Employer Mapping - Only show if field selected */}
      {config.employerSourceField && (
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
              emptyMessage="No employer mappings yet. Add mappings to automatically detect employers from form responses."
              nullOptionLabel="-- No Employer (Individual) --"
            />

            <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
              💡 Map form values to CRM organizations. When matched, billing address is auto-filled from organization data.
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

          {/* Behavior Options */}
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
                  Auto-fill Billing Address
                </div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Automatically fill billing address from CRM organization
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.autoFillBillingAddress ?? true}
                onChange={(e) =>
                  onChange({
                    ...config,
                    autoFillBillingAddress: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />
            </label>

            <label
              className="flex items-center justify-between p-2 border-2 cursor-pointer hover:bg-gray-50 mt-2"
              style={{ borderColor: "var(--win95-border)" }}
            >
              <div>
                <div className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                  Require Organization
                </div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Fail checkout if CRM organization not found
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.requireOrganization ?? false}
                onChange={(e) =>
                  onChange({
                    ...config,
                    requireOrganization: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />
            </label>

            <label
              className="flex items-center justify-between p-2 border-2 cursor-pointer hover:bg-gray-50 mt-2"
              style={{ borderColor: "var(--win95-border)" }}
            >
              <div>
                <div className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                  🎫 Skip Payment & Create Tickets Immediately
                </div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  For employer billing: Skip payment step and create tickets right after customer info
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.skipPaymentStep ?? false}
                onChange={(e) =>
                  onChange({
                    ...config,
                    skipPaymentStep: e.target.checked,
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
              Default payment terms when employer is detected
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
          💡 <strong>How it works:</strong> When a form is submitted, the employer field value is extracted and
          matched against your mapping. If found, the corresponding CRM organization&apos;s billing address is
          automatically filled in the checkout form.
        </p>
      </div>
    </div>
  );
}
