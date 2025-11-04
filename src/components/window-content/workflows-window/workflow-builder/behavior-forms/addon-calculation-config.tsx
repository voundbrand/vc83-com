/**
 * ADDON CALCULATION CONFIG FORM
 *
 * Configuration UI for the addon_calculation behavior.
 * Manages add-ons with form field mappings.
 */

"use client";

import React, { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type {
  AddonCalculationConfig,
  AddonDefinition,
} from "@/lib/behaviors/handlers/addon-calculation";
import { getTaxCodesForCountry } from "@/lib/tax-calculator";

interface AddonCalculationConfigFormProps {
  config: AddonCalculationConfig;
  onChange: (config: AddonCalculationConfig) => void;
  availableFormFields?: Array<{
    id: string;
    label: string;
    type: string;
    options?: Array<{ value: string; label: string }>;
  }>;
  availableForms?: any[];
  availableProducts?: any[];
}

export function AddonCalculationConfigForm({
  config,
  onChange,
  availableFormFields = [],
  availableForms = [],
  availableProducts = [],
}: AddonCalculationConfigFormProps) {
  const [expandedAddon, setExpandedAddon] = useState<string | null>(null);

  // Get tax codes for dropdown (using DE as default, TODO: use actual org country)
  const taxCodes = getTaxCodesForCountry("DE")?.codes || [];

  const handleUpdate = (updates: Partial<AddonCalculationConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleAddAddon = () => {
    const newAddon: AddonDefinition = {
      id: `addon_${Date.now()}`,
      name: "New Add-on",
      pricePerUnit: 0,
      currency: "USD",
      formFieldIds: [],
      formFieldMapping: {},
      taxable: true,
    };

    handleUpdate({
      addons: [...config.addons, newAddon],
    });

    setExpandedAddon(newAddon.id);
  };

  const handleRemoveAddon = (addonId: string) => {
    handleUpdate({
      addons: config.addons.filter((a) => a.id !== addonId),
    });
  };

  const handleUpdateAddon = (
    addonId: string,
    updates: Partial<AddonDefinition>
  ) => {
    handleUpdate({
      addons: config.addons.map((a) =>
        a.id === addonId ? { ...a, ...updates } : a
      ),
    });
  };

  const handleAddMapping = (addonId: string) => {
    const addon = config.addons.find((a) => a.id === addonId);
    if (!addon) return;

    const newMapping = {
      ...addon.formFieldMapping,
      "": 0,
    };

    handleUpdateAddon(addonId, { formFieldMapping: newMapping });
  };

  const handleUpdateMapping = (
    addonId: string,
    oldKey: string,
    newKey: string,
    newValue: number
  ) => {
    const addon = config.addons.find((a) => a.id === addonId);
    if (!addon) return;

    const newMapping = { ...addon.formFieldMapping };
    if (oldKey !== newKey) {
      delete newMapping[oldKey];
    }
    newMapping[newKey] = newValue;

    handleUpdateAddon(addonId, { formFieldMapping: newMapping });
  };

  const handleRemoveMapping = (addonId: string, key: string) => {
    const addon = config.addons.find((a) => a.id === addonId);
    if (!addon) return;

    const newMapping = { ...addon.formFieldMapping };
    delete newMapping[key];

    handleUpdateAddon(addonId, { formFieldMapping: newMapping });
  };

  const handleAutoPopulateMapping = (addonId: string) => {
    const addon = config.addons.find((a) => a.id === addonId);
    if (!addon || addon.formFieldIds.length === 0) return;

    // Get the first selected field to use for auto-population
    const firstFieldId = addon.formFieldIds[0];
    const field = availableFormFields.find((f) => f.id === firstFieldId);

    if (!field) return;

    // Generate mapping based on field type
    const newMapping: Record<string, number> = {};

    // For fields with options (radio, select, checkbox), use the options
    interface FieldWithOptions {
      options?: Array<{ value?: string; label?: string }>;
    }
    const fieldWithOptions = field as FieldWithOptions;
    if (fieldWithOptions.options && Array.isArray(fieldWithOptions.options)) {
      for (const option of fieldWithOptions.options) {
        const value = option.value || option.label || "";
        // Try to parse as number, default to 1
        const numValue = parseInt(value, 10);
        newMapping[value] = isNaN(numValue) ? 1 : numValue;
      }
    } else {
      // For text/number fields, add some default mappings
      newMapping["0"] = 0;
      newMapping["1"] = 1;
      newMapping["2"] = 2;
    }

    handleUpdateAddon(addonId, { formFieldMapping: newMapping });
  };

  return (
    <div className="space-y-3">
      {/* Calculation Strategy */}
      <div>
        <label
          className="text-xs font-bold block mb-1"
          style={{ color: "var(--win95-text)" }}
        >
          Calculation Strategy
        </label>
        <select
          value={config.calculationStrategy || "sum"}
          onChange={(e) =>
            handleUpdate({
              calculationStrategy: e.target.value as
                | "sum"
                | "max"
                | "min"
                | "first",
            })
          }
          className="retro-input w-full px-2 py-1 text-xs"
        >
          <option value="sum">Sum - Add all quantities</option>
          <option value="max">Max - Take maximum quantity</option>
          <option value="min">Min - Take minimum quantity</option>
          <option value="first">First - Use first field only</option>
        </select>
        <p
          className="mt-1 text-[10px]"
          style={{ color: "var(--neutral-gray)" }}
        >
          How to combine quantities from multiple form fields
        </p>
      </div>

      {/* Require All Fields */}
      <div>
        <label className="flex items-center justify-between">
          <span
            className="text-xs font-bold"
            style={{ color: "var(--win95-text)" }}
          >
            Require All Fields
          </span>
          <input
            type="checkbox"
            checked={config.requireAllFields ?? false}
            onChange={(e) =>
              handleUpdate({ requireAllFields: e.target.checked })
            }
            className="h-3 w-3"
          />
        </label>
        <p
          className="mt-1 text-[10px]"
          style={{ color: "var(--neutral-gray)" }}
        >
          Fail if any form fields are missing
        </p>
      </div>

      {/* Add-ons List */}
      <div
        className="border-t-2 pt-3"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div
            className="text-xs font-bold"
            style={{ color: "var(--win95-text)" }}
          >
            Add-ons ({config.addons.length})
          </div>
          <button onClick={handleAddAddon} className="retro-button p-1">
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {config.addons.length === 0 ? (
          <p
            className="py-4 text-center text-[10px]"
            style={{ color: "var(--neutral-gray)" }}
          >
            No add-ons configured. Click + to add one.
          </p>
        ) : (
          <div className="space-y-2">
            {config.addons.map((addon) => {
              const expanded = expandedAddon === addon.id;
              return (
                <div
                  key={addon.id}
                  className="border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg-light)",
                  }}
                >
                  {/* Addon Header */}
                  <div className="flex items-center justify-between p-2">
                    <div className="flex-1">
                      <div
                        className="text-xs font-bold"
                        style={{ color: "var(--win95-text)" }}
                      >
                        {addon.icon} {addon.name}
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: "var(--neutral-gray)" }}
                      >
                        ${(addon.pricePerUnit / 100).toFixed(2)} {addon.currency}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setExpandedAddon(expanded ? null : addon.id)
                        }
                        className="retro-button p-1"
                      >
                        {expanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoveAddon(addon.id)}
                        className="retro-button p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Addon Config (when expanded) */}
                  {expanded && (
                    <div
                      className="border-t-2 p-2 space-y-3"
                      style={{ borderColor: "var(--win95-border)" }}
                    >
                      {/* Basic Info */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label
                            className="text-xs block mb-1"
                            style={{ color: "var(--win95-text)" }}
                          >
                            Name *
                          </label>
                          <input
                            type="text"
                            value={addon.name}
                            onChange={(e) =>
                              handleUpdateAddon(addon.id, {
                                name: e.target.value,
                              })
                            }
                            className="retro-input w-full px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label
                            className="text-xs block mb-1"
                            style={{ color: "var(--win95-text)" }}
                          >
                            Icon
                          </label>
                          <input
                            type="text"
                            value={addon.icon || ""}
                            onChange={(e) =>
                              handleUpdateAddon(addon.id, {
                                icon: e.target.value,
                              })
                            }
                            placeholder="🎟️"
                            className="retro-input w-full px-2 py-1 text-xs"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label
                          className="text-xs block mb-1"
                          style={{ color: "var(--win95-text)" }}
                        >
                          Description
                        </label>
                        <textarea
                          value={addon.description || ""}
                          onChange={(e) =>
                            handleUpdateAddon(addon.id, {
                              description: e.target.value,
                            })
                          }
                          rows={2}
                          className="retro-input w-full px-2 py-1 text-xs"
                        />
                      </div>

                      {/* Price and Currency */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label
                            className="text-xs block mb-1"
                            style={{ color: "var(--win95-text)" }}
                          >
                            Price (cents) *
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={addon.pricePerUnit}
                            onChange={(e) => {
                              const numValue = e.target.value.replace(/[^0-9]/g, '');
                              handleUpdateAddon(addon.id, {
                                pricePerUnit: parseInt(numValue) || 0,
                              });
                            }}
                            className="retro-input w-full px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label
                            className="text-xs block mb-1"
                            style={{ color: "var(--win95-text)" }}
                          >
                            Currency *
                          </label>
                          <select
                            value={addon.currency}
                            onChange={(e) =>
                              handleUpdateAddon(addon.id, {
                                currency: e.target.value,
                              })
                            }
                            className="retro-input w-full px-2 py-1 text-xs"
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </div>
                      </div>

                      {/* Tax Settings */}
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={addon.taxable ?? true}
                            onChange={(e) =>
                              handleUpdateAddon(addon.id, {
                                taxable: e.target.checked,
                              })
                            }
                            className="h-3 w-3"
                          />
                          <span
                            className="text-xs"
                            style={{ color: "var(--win95-text)" }}
                          >
                            Taxable
                          </span>
                        </label>
                        <div>
                          <select
                            value={addon.taxCode || ""}
                            onChange={(e) =>
                              handleUpdateAddon(addon.id, {
                                taxCode: e.target.value,
                              })
                            }
                            className="retro-input w-full px-2 py-1 text-xs"
                          >
                            <option value="">Select tax code</option>
                            {taxCodes.map((code) => (
                              <option key={code.value} value={code.value}>
                                {code.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Form Field IDs */}
                      <div>
                        <label
                          className="text-xs block mb-1"
                          style={{ color: "var(--win95-text)" }}
                        >
                          Form Fields *
                        </label>
                        {availableFormFields.length > 0 ? (
                          <div
                            className="border-2 px-2 py-2 space-y-1 overflow-y-auto"
                            style={{
                              borderColor: "var(--win95-border)",
                              background: "var(--win95-input-bg)",
                              maxHeight: "150px",
                            }}
                          >
                            {availableFormFields.map((field) => (
                              <label
                                key={field.id}
                                className="flex items-center gap-2 py-1 cursor-pointer hover:bg-black/5"
                              >
                                <input
                                  type="checkbox"
                                  checked={addon.formFieldIds?.includes(field.id)}
                                  onChange={(e) => {
                                    const currentIds = addon.formFieldIds || [];
                                    const newIds = e.target.checked
                                      ? [...currentIds, field.id]
                                      : currentIds.filter((id) => id !== field.id);
                                    handleUpdateAddon(addon.id, {
                                      formFieldIds: newIds,
                                    });
                                  }}
                                  className="h-3 w-3"
                                />
                                <span
                                  className="text-xs flex-1"
                                  style={{ color: "var(--win95-text)" }}
                                >
                                  {field.label} <span style={{ color: "var(--neutral-gray)" }}>({field.id})</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={addon.formFieldIds.join(", ")}
                            onChange={(e) =>
                              handleUpdateAddon(addon.id, {
                                formFieldIds: e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="field1, field2"
                            className="retro-input w-full px-2 py-1 text-xs"
                          />
                        )}
                        <p
                          className="mt-1 text-[10px]"
                          style={{ color: "var(--neutral-gray)" }}
                        >
                          {availableFormFields.length > 0
                            ? `${addon.formFieldIds?.length || 0} field(s) selected`
                            : "Comma-separated list of form field IDs"}
                        </p>
                      </div>

                      {/* Field Value Mapping */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label
                            className="text-xs font-bold"
                            style={{ color: "var(--win95-text)" }}
                          >
                            Value → Quantity Mapping *
                          </label>
                          <div className="flex items-center gap-1">
                            {addon.formFieldIds.length > 0 && (
                              <button
                                onClick={() => handleAutoPopulateMapping(addon.id)}
                                className="retro-button px-2 py-1 text-[10px]"
                                title="Auto-populate from form field options"
                              >
                                Auto
                              </button>
                            )}
                            <button
                              onClick={() => handleAddMapping(addon.id)}
                              className="retro-button p-1"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          {Object.entries(addon.formFieldMapping).map(
                            ([key, value]) => (
                              <div key={key} className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={key}
                                  onChange={(e) =>
                                    handleUpdateMapping(
                                      addon.id,
                                      key,
                                      e.target.value,
                                      value
                                    )
                                  }
                                  placeholder="Value"
                                  className="retro-input flex-1 px-2 py-1 text-xs"
                                />
                                <span
                                  className="text-xs"
                                  style={{ color: "var(--neutral-gray)" }}
                                >
                                  →
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={value}
                                  onChange={(e) => {
                                    const numValue = e.target.value.replace(/[^0-9]/g, '');
                                    handleUpdateMapping(
                                      addon.id,
                                      key,
                                      key,
                                      parseInt(numValue) || 0
                                    );
                                  }}
                                  placeholder="Qty"
                                  className="retro-input w-16 px-2 py-1 text-xs"
                                />
                                <button
                                  onClick={() =>
                                    handleRemoveMapping(addon.id, key)
                                  }
                                  className="retro-button p-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )
                          )}
                        </div>

                        {Object.keys(addon.formFieldMapping).length === 0 && (
                          <p
                            className="py-2 text-center text-[10px]"
                            style={{ color: "var(--neutral-gray)" }}
                          >
                            No mappings. Click Auto to generate from field options, or + to add manually.
                          </p>
                        )}
                        {addon.formFieldIds.length > 0 && Object.keys(addon.formFieldMapping).length > 0 && (
                          <p
                            className="mt-1 text-[10px]"
                            style={{ color: "var(--neutral-gray)" }}
                          >
                            💡 Tip: Click Auto to regenerate mappings from field options
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
