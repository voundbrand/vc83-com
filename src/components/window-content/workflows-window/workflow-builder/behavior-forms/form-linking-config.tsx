/**
 * FORM LINKING CONFIG FORM
 *
 * Configuration UI for the form_linking behavior.
 * Allows selecting which form to show, when to show it, and trigger conditions.
 */

"use client";

import React from "react";
import type { FormLinkingConfig } from "@/lib/behaviors/handlers/form-linking";

interface FormLinkingConfigFormProps {
  config: FormLinkingConfig;
  onChange: (config: FormLinkingConfig) => void;
  availableForms?: Array<{ _id: string; name: string; subtype?: string }>;
}

export function FormLinkingConfigForm({
  config,
  onChange,
  availableForms = [],
}: FormLinkingConfigFormProps) {
  const handleUpdate = (updates: Partial<FormLinkingConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleTriggerConditionUpdate = (
    updates: Partial<NonNullable<FormLinkingConfig["triggerConditions"]>>
  ) => {
    handleUpdate({
      triggerConditions: {
        ...config.triggerConditions,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-3">
      {/* Form Selector */}
      <div>
        <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
          Form to Link <span className="text-red-500">*</span>
        </label>
        <select
          value={config.formId || ""}
          onChange={(e) => handleUpdate({ formId: e.target.value as any })}
          className="retro-input w-full px-2 py-1 text-xs"
          required
        >
          <option value="">-- Select Form --</option>
          {availableForms.map((form) => (
            <option key={form._id} value={form._id}>
              {form.name} {form.subtype ? `(${form.subtype})` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          The form that will be shown to users
        </p>
      </div>

      {/* Timing */}
      <div>
        <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
          When to Collect Form <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="timing"
              value="duringCheckout"
              checked={config.timing === "duringCheckout"}
              onChange={() => handleUpdate({ timing: "duringCheckout" })}
              className="h-3 w-3"
            />
            <span className="text-xs">
              🛒 <strong>During Checkout</strong> - Show before payment
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="timing"
              value="afterPurchase"
              checked={config.timing === "afterPurchase"}
              onChange={() => handleUpdate({ timing: "afterPurchase" })}
              className="h-3 w-3"
            />
            <span className="text-xs">
              ✉️ <strong>After Purchase</strong> - Send via email
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="timing"
              value="standalone"
              checked={config.timing === "standalone"}
              onChange={() => handleUpdate({ timing: "standalone" })}
              className="h-3 w-3"
            />
            <span className="text-xs">
              🔗 <strong>Standalone</strong> - Separate link only
            </span>
          </label>
        </div>
      </div>

      {/* Required Toggle */}
      <div>
        <label className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
            Form Completion Required
          </span>
          <input
            type="checkbox"
            checked={config.required ?? true}
            onChange={(e) => handleUpdate({ required: e.target.checked })}
            className="h-3 w-3"
          />
        </label>
        <p className="mt-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          {config.required ?? true
            ? "User must complete form to proceed"
            : "Form is optional"}
        </p>
      </div>

      {/* Trigger Conditions (Optional) */}
      <div className="border-t-2 pt-3" style={{ borderColor: "var(--win95-border)" }}>
        <div className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          Trigger Conditions (Optional)
        </div>

        {/* Product Subtype Filter */}
        <div className="mb-3">
          <label className="text-xs block mb-1" style={{ color: "var(--win95-text)" }}>
            Only show for product subtypes:
          </label>
          <input
            type="text"
            value={config.triggerConditions?.productSubtype?.join(", ") || ""}
            onChange={(e) =>
              handleTriggerConditionUpdate({
                productSubtype: e.target.value
                  ? e.target.value.split(",").map((s) => s.trim())
                  : undefined,
              })
            }
            placeholder="e.g., ticket, physical"
            className="retro-input w-full px-2 py-1 text-xs"
          />
          <p className="mt-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
            Comma-separated list (leave empty for all)
          </p>
        </div>

        {/* Minimum Quantity */}
        <div className="mb-3">
          <label className="text-xs block mb-1" style={{ color: "var(--win95-text)" }}>
            Minimum Quantity:
          </label>
          <input
            type="number"
            min="1"
            value={config.triggerConditions?.minQuantity || ""}
            onChange={(e) =>
              handleTriggerConditionUpdate({
                minQuantity: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="1"
            className="retro-input w-full px-2 py-1 text-xs"
          />
          <p className="mt-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
            Only show if cart has at least this many items
          </p>
        </div>

        {/* Conditional Field (Advanced) */}
        <div>
          <label className="text-xs block mb-1" style={{ color: "var(--win95-text)" }}>
            Conditional Field (Advanced):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.triggerConditions?.conditionalField?.field || ""}
              onChange={(e) =>
                handleTriggerConditionUpdate({
                  conditionalField: {
                    field: e.target.value,
                    value:
                      config.triggerConditions?.conditionalField?.value || "",
                  },
                })
              }
              placeholder="Field name"
              className="retro-input flex-1 px-2 py-1 text-xs"
            />
            <input
              type="text"
              value={
                Array.isArray(config.triggerConditions?.conditionalField?.value)
                  ? config.triggerConditions.conditionalField.value.join(", ")
                  : config.triggerConditions?.conditionalField?.value || ""
              }
              onChange={(e) =>
                handleTriggerConditionUpdate({
                  conditionalField: {
                    field:
                      config.triggerConditions?.conditionalField?.field || "",
                    value: e.target.value.includes(",")
                      ? e.target.value.split(",").map((s) => s.trim())
                      : e.target.value,
                  },
                })
              }
              placeholder="Value(s)"
              className="retro-input flex-1 px-2 py-1 text-xs"
            />
          </div>
          <p className="mt-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
            Only show if a specific field has this value
          </p>
        </div>
      </div>
    </div>
  );
}
