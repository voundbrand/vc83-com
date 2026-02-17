"use client";

/**
 * MAPPING HELPERS
 *
 * Reusable components for field → organization mapping UI
 * Following the clean, intuitive style of your invoice config section
 */

import { useState } from "react";
import { Trash2, Plus, ArrowRight, CheckCircle } from "lucide-react";

// Types
export interface FormField {
  id: string;
  label: string;
  type?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface CRMOrganization {
  _id: string;
  name: string;
  legalEntityName?: string;
  city?: string;
  state?: string;
  status?: string;
}

export interface FieldMapping {
  formValue: string;
  orgId: string | null;
}

interface MappingListProps {
  mappings: FieldMapping[];
  formField: FormField | null;
  organizations: CRMOrganization[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  emptyMessage?: string;
  nullOptionLabel?: string;
}

/**
 * Simple, clean mapping list component
 * Matches the style of your invoice config section
 */
export function MappingList({
  mappings,
  formField,
  organizations,
  onMappingsChange,
  emptyMessage = "No mappings configured yet",
  nullOptionLabel = "-- No Action --",
}: MappingListProps) {
  const [localMappings, setLocalMappings] = useState<FieldMapping[]>(mappings);

  // Get available options from the selected field
  const fieldOptions = formField?.options || [];

  // Sync local state with parent
  const updateMappings = (newMappings: FieldMapping[]) => {
    setLocalMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const addMapping = () => {
    updateMappings([...localMappings, { formValue: "", orgId: null }]);
  };

  const removeMapping = (index: number) => {
    updateMappings(localMappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, field: keyof FieldMapping, value: string | null) => {
    const newMappings = [...localMappings];
    newMappings[index] = {
      ...newMappings[index],
      [field]: value === "" ? null : value,
    };
    updateMappings(newMappings);
  };

  // Get organization name by ID
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getOrgName = (orgId: string | null) => {
    if (!orgId) return nullOptionLabel;
    const org = organizations.find((o) => o._id === orgId);
    return org ? `${org.name}${org.legalEntityName ? ` (${org.legalEntityName})` : ""}` : "Unknown";
  };

  // Check if a mapping is complete
  const isMappingComplete = (mapping: FieldMapping) => {
    return mapping.formValue && mapping.orgId;
  };

  return (
    <div className="space-y-4">
      {/* Mappings List */}
      {localMappings.length === 0 ? (
        <div
          className="p-4 border-2 rounded text-center text-sm"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--neutral-gray)",
          }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {localMappings.map((mapping, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 border-2 rounded"
              style={{
                borderColor: isMappingComplete(mapping) ? "var(--success)" : "var(--win95-border)",
                background: "var(--win95-input-bg)",
              }}
            >
              {/* Status Indicator */}
              <div className="flex-shrink-0">
                {isMappingComplete(mapping) ? (
                  <CheckCircle size={16} style={{ color: "var(--success)" }} />
                ) : (
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      border: "2px solid var(--neutral-gray)",
                    }}
                  />
                )}
              </div>

              {/* Form Value */}
              <div className="flex-1">
                {fieldOptions.length > 0 ? (
                  <select
                    value={mapping.formValue}
                    onChange={(e) => updateMapping(index, "formValue", e.target.value)}
                    className="w-full px-2 py-1 text-xs border"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "white",
                    }}
                  >
                    <option value="">-- Select Value --</option>
                    {fieldOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={mapping.formValue}
                    onChange={(e) => updateMapping(index, "formValue", e.target.value)}
                    placeholder="Form value"
                    className="w-full px-2 py-1 text-xs border"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "white",
                    }}
                  />
                )}
              </div>

              {/* Arrow */}
              <ArrowRight size={16} style={{ color: "var(--win95-text)", flexShrink: 0 }} />

              {/* Organization */}
              <div className="flex-1">
                <select
                  value={mapping.orgId || ""}
                  onChange={(e) => updateMapping(index, "orgId", e.target.value || null)}
                  className="w-full px-2 py-1 text-xs border"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "white",
                  }}
                >
                  <option value="">{nullOptionLabel}</option>
                  {organizations.map((org) => (
                    <option key={org._id} value={org._id}>
                      {org.name}
                      {org.legalEntityName && ` (${org.legalEntityName})`}
                      {org.city && ` - ${org.city}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeMapping(index)}
                className="p-1 border-2 hover:bg-red-100 transition-colors flex-shrink-0"
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
        </div>
      )}

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
        Add Mapping
      </button>

      {/* Helper Text */}
      {formField && fieldOptions.length > 0 && (
        <div
          className="p-2 border-2 rounded text-xs"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--neutral-gray)",
          }}
        >
           Available field options: {fieldOptions.map((opt) => opt.label).join(", ")}
        </div>
      )}
    </div>
  );
}
