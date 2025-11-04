/**
 * BEHAVIOR CONFIG MODAL
 *
 * Full-screen modal for configuring behaviors with clear visual context
 * showing which objects are being connected and configured.
 */

"use client";

import React from "react";
import { X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { FormLinkingConfigForm } from "./behavior-forms/form-linking-config";
import { AddonCalculationConfigForm } from "./behavior-forms/addon-calculation-config";
import { EmployerDetectionConfigForm } from "./behavior-forms/employer-detection-config";
import { InvoiceMappingConfigForm } from "./behavior-forms/invoice-mapping-config";
import { PaymentProviderSelectionConfigForm } from "./behavior-forms/payment-provider-selection-config";
import { StripePaymentConfigForm } from "./behavior-forms/stripe-payment-config";
import { InvoicePaymentConfigForm } from "./behavior-forms/invoice-payment-config";
import { ConsolidatedInvoiceGenerationConfigForm } from "./behavior-forms/consolidated-invoice-generation-config";

interface WorkflowObject {
  objectId: Id<"objects">;
  objectType: string;
  role?: string;
  config?: Record<string, unknown>;
}

interface WorkflowBehavior {
  id: string;
  type: string;
  enabled: boolean;
  priority: number;
  config?: Record<string, unknown>;
  triggers?: {
    inputTypes?: string[];
    objectTypes?: string[];
    workflows?: string[];
  };
}

interface BehaviorConfigModalProps {
  behavior: WorkflowBehavior;
  selectedObjects: WorkflowObject[];
  onClose: () => void;
  onSave: (updatedBehavior: WorkflowBehavior) => void;
  sessionId: string;
  organizationId: string;
}

export function BehaviorConfigModal({
  behavior,
  selectedObjects,
  onClose,
  onSave,
  sessionId,
  organizationId,
}: BehaviorConfigModalProps) {
  const [config, setConfig] = React.useState(behavior.config);

  // Fetch full form data for selected forms
  const formObjects = selectedObjects.filter((obj) => obj.objectType === "form");

  // Fetch each form's data individually
  const formsData = formObjects.map((formObj) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useQuery(api.ontologyHelpers.getObject, {
      objectId: formObj.objectId as Id<"objects">,
    });
  }).filter(Boolean);

  // Fetch all events for the organization (for consolidated invoice dropdown)
   
  const allEvents = useQuery(api.eventOntology.getEvents, {
    sessionId,
    organizationId: organizationId as unknown as Id<"organizations">,
  });

  const getBehaviorName = () => {
    switch (behavior.type) {
      case "form-linking":
      case "form_linking":
        return "Form Linking";
      case "addon-calculation":
      case "addon_calculation":
        return "Add-on Calculation";
      case "employer-detection":
      case "employer_detection":
        return "Employer Detection";
      case "invoice-mapping":
      case "invoice_mapping":
        return "Invoice Mapping";
      case "payment-provider-selection":
        return "Payment Provider Selection";
      case "stripe-payment":
        return "Stripe Payment";
      case "invoice-payment":
        return "Invoice Payment";
      case "tax-calculation":
        return "Tax Calculation";
      case "consolidated-invoice-generation":
        return "Consolidated Invoice Generation";
      default:
        return behavior.type;
    }
  };

  const getAvailableObjects = (type: string) => {
    if (type === "form" && formsData) {
      // Return full form objects with all fields data
      return formsData;
    }
    if (type === "event" && allEvents) {
      // Return all events from the organization
      return allEvents.map(event => ({
        objectId: event._id,
        name: event.name,
        objectType: "event"
      }));
    }
    return selectedObjects.filter((obj) => obj.objectType === type);
  };

  const getCrmOrganizations = () => {
    return selectedObjects.filter((obj) => obj.objectType === "crm_organization");
  };

  // Extract all form fields from available forms
  const getAvailableFormFields = () => {
    const fields: Array<{
      id: string;
      label: string;
      type: string;
      options?: Array<{ value: string; label: string }>;
    }> = [];

    formsData.forEach((form) => {
      if (!form) return;

      // Forms store fields in customProperties.formSchema
      const customProps = form as { customProperties?: { formSchema?: { sections?: unknown[]; fields?: unknown[] } } };
      const formSchema = customProps.customProperties?.formSchema;

      if (!formSchema) return;

      // Extract from sections (if form uses sections)
      if (formSchema.sections && Array.isArray(formSchema.sections)) {
        for (const section of formSchema.sections) {
          const sectionData = section as { fields?: unknown[] };
          if (sectionData.fields && Array.isArray(sectionData.fields)) {
            for (const field of sectionData.fields) {
              const fieldData = field as {
                id?: string;
                label?: string;
                type?: string;
                options?: Array<{ value: string; label: string }>;
              };
              if (fieldData.id && fieldData.label) {
                fields.push({
                  id: fieldData.id,
                  label: fieldData.label,
                  type: fieldData.type || 'text',
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
          const fieldData = field as {
            id?: string;
            label?: string;
            type?: string;
            options?: Array<{ value: string; label: string }>;
          };
          if (fieldData.id && fieldData.label) {
            fields.push({
              id: fieldData.id,
              label: fieldData.label,
              type: fieldData.type || 'text',
              options: fieldData.options,
            });
          }
        }
      }
    });

    return fields;
  };

  const handleSave = () => {
    onSave({ ...behavior, config });
    onClose();
  };

  const renderConfigForm = () => {
    switch (behavior.type) {
      case "form-linking":
      case "form_linking":
        return (
          <FormLinkingConfigForm
            config={config}
            onChange={setConfig}
            availableForms={getAvailableObjects("form")}
          />
        );

      case "addon-calculation":
      case "addon_calculation":
        return (
          <AddonCalculationConfigForm
            config={config}
            onChange={setConfig}
            availableFormFields={getAvailableFormFields()}
            availableForms={getAvailableObjects("form")}
            availableProducts={getAvailableObjects("product")}
          />
        );

      case "employer-detection":
      case "employer_detection":
        return (
          <EmployerDetectionConfigForm
            config={config}
            onChange={setConfig}
            availableForms={getAvailableObjects("form")}
            availableCrmOrganizations={getCrmOrganizations()}
            sessionId={sessionId}
            organizationId={organizationId as Id<"objects">}
          />
        );

      case "invoice-mapping":
      case "invoice_mapping":
        return (
          <InvoiceMappingConfigForm
            config={config}
            onChange={setConfig}
            availableForms={getAvailableObjects("form")}
            availableCrmOrganizations={getCrmOrganizations()}
            sessionId={sessionId}
            organizationId={organizationId as Id<"objects">}
          />
        );

      case "payment-provider-selection":
        return (
          <PaymentProviderSelectionConfigForm
            config={config}
            onChange={setConfig}
            availableForms={getAvailableObjects("form")}
            availableProducts={getAvailableObjects("product")}
            availableCrmOrganizations={getCrmOrganizations()}
          />
        );

      case "stripe-payment":
        return (
          <StripePaymentConfigForm
            config={config}
            onChange={setConfig}
          />
        );

      case "invoice-payment":
        return (
          <InvoicePaymentConfigForm
            config={config}
            onChange={setConfig}
            availableCrmOrganizations={getCrmOrganizations()}
          />
        );

      case "consolidated-invoice-generation":
        return (
          <ConsolidatedInvoiceGenerationConfigForm
            config={config}
            onChange={setConfig}
            sessionId={sessionId}
            organizationId={organizationId as Id<"objects">}
            availableEvents={getAvailableObjects("event")}
            availableProducts={getAvailableObjects("product")}
          />
        );

      default:
        return (
          <div className="p-4 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
            <textarea
              value={JSON.stringify(config, null, 2)}
              onChange={(e) => {
                try {
                  setConfig(JSON.parse(e.target.value));
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              className="w-full h-64 p-2 font-mono text-xs"
              style={{ background: 'var(--win95-bg)', color: 'var(--win95-text)', border: '2px solid var(--win95-border)' }}
            />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
      <div
        className="w-full h-full max-w-6xl max-h-[90vh] m-4 rounded-lg shadow-2xl flex flex-col"
        style={{ background: 'var(--win95-bg)', border: '3px solid var(--win95-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 border-b-2"
          style={{ background: 'var(--win95-highlight)', borderColor: 'var(--win95-border)' }}
        >
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'white' }}>
              Configure: {getBehaviorName()}
            </h2>
            <p className="text-[10px]" style={{ color: 'white', opacity: 0.9 }}>
              Priority: {behavior.priority} • {behavior.enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/10 rounded"
            style={{ color: 'white' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Available Objects Context */}
        <div className="p-3 border-b-2" style={{ background: 'var(--win95-bg-light)', borderColor: 'var(--win95-border)' }}>
          <div className="text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
            📦 Available Objects in Workflow:
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedObjects.length === 0 ? (
              <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                No objects added yet. Add objects from the left panel.
              </span>
            ) : (
              selectedObjects
                .filter((obj) => obj.objectId) // Filter out objects with null/undefined objectId
                .map((obj, index) => {
                  const colors = {
                    form: { bg: "#f3e8ff", text: "#9333ea" },
                    product: { bg: "#dbeafe", text: "#2563eb" },
                    checkout: { bg: "#dcfce7", text: "#16a34a" },
                    crm_organization: { bg: "#fef3c7", text: "#f59e0b" },
                    crm_contact: { bg: "#fee2e2", text: "#dc2626" },
                  };
                  const color = colors[obj.objectType as keyof typeof colors] || { bg: "#f3f4f6", text: "#6b7280" };

                  return (
                    <div
                      key={`${obj.objectId}-${index}`} // Use compound key to ensure uniqueness
                      className="px-2 py-1 rounded text-[10px] font-bold"
                      style={{ background: color.bg, color: color.text }}
                    >
                      {obj.objectType.replace(/_/g, " ").toUpperCase()}: {obj.role || obj.objectId}
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Configuration Form */}
        <div className="flex-1 overflow-auto p-4">
          {renderConfigForm()}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between p-3 border-t-2"
          style={{ background: 'var(--win95-bg-light)', borderColor: 'var(--win95-border)' }}
        >
          <div className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
            Behavior ID: {behavior.id}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="retro-button px-4 py-2 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="retro-button px-4 py-2 text-xs"
              style={{ background: 'var(--win95-highlight)', color: 'white' }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
