"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Settings, Save, Globe } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { Id } from "../../../../convex/_generated/dataModel";

type ConfigScope = "global" | "organization";

export function ConfigTab() {
  const { sessionId } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [configScope, setConfigScope] = useState<ConfigScope>("global");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Fetch available object types
  const objectTypes = useQuery(
    api.ontologyAdmin.getObjectTypes,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch organizations (for org-specific config)
  const organizations = useQuery(
    api.ontologyAdmin.getAllOrganizations,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch current field configuration
  const fieldConfig = useQuery(
    api.ontologyAdmin.getFieldConfiguration,
    selectedType && sessionId
      ? {
          sessionId,
          objectType: selectedType,
          organizationId:
            configScope === "organization" && selectedOrgId
              ? (selectedOrgId as Id<"organizations">)
              : undefined,
        }
      : "skip"
  );

  // Save field configuration mutation
  const saveConfig = useMutation(api.ontologyAdmin.saveFieldConfiguration);

  // Field visibility state
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());

  // Update visibleFields when fieldConfig loads
  React.useEffect(() => {
    if (fieldConfig?.visibleFields) {
      setVisibleFields(new Set(fieldConfig.visibleFields));
    }
  }, [fieldConfig]);

  const handleToggleField = (fieldName: string) => {
    const newFields = new Set(visibleFields);
    if (newFields.has(fieldName)) {
      newFields.delete(fieldName);
    } else {
      newFields.add(fieldName);
    }
    setVisibleFields(newFields);
  };

  const handleSave = async () => {
    if (!selectedType || !sessionId) return;

    try {
      await saveConfig({
        sessionId,
        objectType: selectedType,
        organizationId:
          configScope === "organization" && selectedOrgId
            ? (selectedOrgId as Id<"organizations">)
            : undefined,
        visibleFields: Array.from(visibleFields),
      });
      alert("✅ Field configuration saved successfully!");
    } catch (error) {
      alert(`❌ Error saving configuration: ${error}`);
    }
  };

  // Get available fields for selected type (before early return)
  const availableFields = useMemo(() => {
    if (!selectedType || !objectTypes) return [];
    const typeData = objectTypes.find((t) => t.type === selectedType);
    return typeData?.sampleFields || [];
  }, [selectedType, objectTypes]);

  if (!objectTypes || !organizations) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
          <Settings size={48} className="mx-auto mb-4 animate-pulse" />
          <p className="text-sm">Loading configuration options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Panel: Type & Scope Selection (30%) */}
      <div className="w-[30%] border-r-2 p-4 overflow-auto" style={{ borderColor: 'var(--win95-border)' }}>

        {/* Step 1: Select Object Type */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--win95-text)' }}>
            1. Select Object Type
          </h3>
          <div className="space-y-2">
            {objectTypes.map((typeData) => (
              <button
                key={typeData.type}
                onClick={() => setSelectedType(typeData.type)}
                className="w-full text-left p-3 border-2 rounded transition-all text-xs"
                style={{
                  borderColor: selectedType === typeData.type ? 'var(--win95-text)' : 'var(--win95-border)',
                  background: selectedType === typeData.type ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
                  color: 'var(--win95-text)',
                }}
              >
                <div className="font-bold">{typeData.type}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                  {typeData.count} {typeData.count === 1 ? 'object' : 'objects'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Configuration Scope */}
        {selectedType && (
          <div className="mb-6 pb-6 border-t-2 pt-6" style={{ borderColor: 'var(--win95-border)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--win95-text)' }}>
              2. Configuration Scope
            </h3>

            <div className="space-y-2 mb-3">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-opacity-50">
                <input
                  type="radio"
                  name="scope"
                  value="global"
                  checked={configScope === "global"}
                  onChange={() => setConfigScope("global")}
                  className="cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                    <Globe size={12} className="inline mr-1" />
                    Global (All Organizations)
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
                    Default for all organizations
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-opacity-50">
                <input
                  type="radio"
                  name="scope"
                  value="organization"
                  checked={configScope === "organization"}
                  onChange={() => setConfigScope("organization")}
                  className="cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                    🏢 Organization-Specific
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
                    Override for one organization
                  </div>
                </div>
              </label>
            </div>

            {/* Organization selector (if org-specific) */}
            {configScope === "organization" && (
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--win95-text)' }}>
                  Select Organization:
                </label>
                <select
                  value={selectedOrgId || ""}
                  onChange={(e) => setSelectedOrgId(e.target.value || null)}
                  className="w-full p-2 border-2 rounded text-xs"
                  style={{
                    borderColor: 'var(--win95-border)',
                    background: 'var(--win95-bg)',
                    color: 'var(--win95-text)',
                  }}
                >
                  <option value="">-- Choose Organization --</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Panel: Field Configuration (70%) */}
      <div className="flex-1 overflow-auto p-6">
        {selectedType ? (
          <>
            <div className="mb-6">
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                Field Visibility for: {selectedType}
              </h3>
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                {configScope === "global"
                  ? "Global configuration - applies to all organizations"
                  : selectedOrgId
                  ? `Organization-specific - applies only to ${organizations.find((o) => o.id === selectedOrgId)?.name}`
                  : "Select an organization to configure"}
              </p>
            </div>

            {(configScope === "global" || (configScope === "organization" && selectedOrgId)) ? (
              <>
                {availableFields.length > 0 ? (
                  <div className="border-2 rounded p-4 mb-6" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
                    <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--win95-text)' }}>
                      Available Fields ({availableFields.length})
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableFields.map((field) => (
                        <label
                          key={field}
                          className="flex items-center gap-2 cursor-pointer text-xs hover:bg-opacity-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={visibleFields.has(field)}
                            onChange={() => handleToggleField(field)}
                            className="cursor-pointer"
                          />
                          <span style={{ color: visibleFields.has(field) ? 'var(--win95-text)' : 'var(--neutral-gray)' }}>
                            {field}
                          </span>
                          {!visibleFields.has(field) && (
                            <span className="text-xs italic ml-auto" style={{ color: 'var(--neutral-gray)' }}>
                              (hidden)
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12" style={{ color: 'var(--neutral-gray)' }}>
                    <Settings size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No fields found for this object type</p>
                    <p className="text-xs mt-1">
                      Fields will appear once objects of this type have customProperties
                    </p>
                  </div>
                )}

                {/* Save Button */}
                {availableFields.length > 0 && (
                  <div className="pt-6 border-t-2" style={{ borderColor: 'var(--win95-border)' }}>
                    <RetroButton onClick={handleSave} className="flex items-center gap-2">
                      <Save size={14} />
                      Save Configuration
                    </RetroButton>
                    <p className="text-xs mt-2" style={{ color: 'var(--neutral-gray)' }}>
                      This will {configScope === "global" ? "set the default" : "override the default"} field visibility
                      {configScope === "organization" && selectedOrgId && ` for ${organizations.find((o) => o.id === selectedOrgId)?.name}`}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12" style={{ color: 'var(--neutral-gray)' }}>
                <Settings size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">Select an organization to configure</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
              <Settings size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">Select an object type to configure fields</p>
              <p className="text-xs mt-1">Choose from the list on the left</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
