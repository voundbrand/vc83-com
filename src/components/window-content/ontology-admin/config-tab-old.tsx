"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Settings, Save } from "lucide-react";
import { RetroButton } from "@/components/retro-button";

export function ConfigTab() {
  const { sessionId } = useAuth();
  const organizations = useQuery(
    api.ontologyAdmin.getAllOrganizations,
    sessionId ? { sessionId } : "skip"
  );
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Field visibility state (would be loaded from ontology in real implementation)
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({
    // Profile fields
    industry: true,
    foundedYear: true,
    employeeCount: true,
    bio: true,

    // Contact fields
    contactEmail: true,
    billingEmail: true,
    supportEmail: true,
    contactPhone: true,
    faxNumber: false, // Example: hidden by default
    website: true,

    // Legal fields
    taxId: true,
    vatNumber: true,
    companyRegistrationNumber: true,
    legalEntityType: true,

    // Settings
    branding: true,
    locale: true,
    invoicing: true,
  });

  const handleToggleField = (fieldName: string) => {
    setVisibleFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  const handleSave = () => {
    // TODO: Save configuration to ontology
    alert("Field configuration saved! (Note: Backend implementation needed)");
  };

  if (!organizations) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
          <Settings size={48} className="mx-auto mb-4 animate-pulse" />
          <p className="text-sm">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Panel: Organization Selector (30%) */}
      <div className="w-[30%] border-r-2 p-4" style={{ borderColor: 'var(--win95-border)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--win95-text)' }}>
          Select Organization
        </h3>

        <div className="space-y-2">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => setSelectedOrgId(org.id)}
              className="w-full text-left p-3 border-2 rounded transition-all text-xs"
              style={{
                borderColor: selectedOrgId === org.id ? 'var(--win95-text)' : 'var(--win95-border)',
                background: selectedOrgId === org.id ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
                color: 'var(--win95-text)',
              }}
            >
              <div className="font-bold">{org.name}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                {org.slug}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel: Field Configuration (70%) */}
      <div className="flex-1 overflow-auto p-6">
        {selectedOrgId ? (
          <>
            <div className="mb-6">
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                Field Visibility Configuration
              </h3>
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                Control which fields are visible for this organization
              </p>
            </div>

            <div className="space-y-6">
              {/* Profile Fields */}
              <FieldSection
                title="📋 Profile Fields"
                fields={[
                  { name: 'industry', label: 'Industry' },
                  { name: 'foundedYear', label: 'Founded Year' },
                  { name: 'employeeCount', label: 'Employee Count' },
                  { name: 'bio', label: 'Bio' },
                ]}
                visibleFields={visibleFields}
                onToggle={handleToggleField}
              />

              {/* Contact Fields */}
              <FieldSection
                title="📧 Contact Fields"
                fields={[
                  { name: 'contactEmail', label: 'Contact Email' },
                  { name: 'billingEmail', label: 'Billing Email' },
                  { name: 'supportEmail', label: 'Support Email' },
                  { name: 'contactPhone', label: 'Phone' },
                  { name: 'faxNumber', label: 'Fax' },
                  { name: 'website', label: 'Website' },
                ]}
                visibleFields={visibleFields}
                onToggle={handleToggleField}
              />

              {/* Legal Fields */}
              <FieldSection
                title="⚖️ Legal Fields"
                fields={[
                  { name: 'taxId', label: 'Tax ID' },
                  { name: 'vatNumber', label: 'VAT Number' },
                  { name: 'companyRegistrationNumber', label: 'Company Registration' },
                  { name: 'legalEntityType', label: 'Legal Entity Type' },
                ]}
                visibleFields={visibleFields}
                onToggle={handleToggleField}
              />

              {/* Settings */}
              <FieldSection
                title="⚙️ Settings"
                fields={[
                  { name: 'branding', label: 'Branding' },
                  { name: 'locale', label: 'Locale' },
                  { name: 'invoicing', label: 'Invoicing' },
                ]}
                visibleFields={visibleFields}
                onToggle={handleToggleField}
              />
            </div>

            {/* Save Button */}
            <div className="mt-6 pt-6 border-t-2" style={{ borderColor: 'var(--win95-border)' }}>
              <RetroButton onClick={handleSave} className="flex items-center gap-2">
                <Save size={14} />
                Save Configuration
              </RetroButton>
              <p className="text-xs mt-2" style={{ color: 'var(--neutral-gray)' }}>
                Note: This will update field visibility for the selected organization
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
              <Settings size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">Select an organization to configure fields</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Field Section Component
function FieldSection({
  title,
  fields,
  visibleFields,
  onToggle,
}: {
  title: string;
  fields: Array<{ name: string; label: string }>;
  visibleFields: Record<string, boolean>;
  onToggle: (fieldName: string) => void;
}) {
  return (
    <div className="border-2 rounded p-4" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
      <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--win95-text)' }}>
        {title}
      </h4>
      <div className="space-y-2">
        {fields.map((field) => (
          <label
            key={field.name}
            className="flex items-center gap-2 cursor-pointer text-xs hover:bg-opacity-50 p-1 rounded"
          >
            <input
              type="checkbox"
              checked={visibleFields[field.name] ?? false}
              onChange={() => onToggle(field.name)}
              className="cursor-pointer"
            />
            <span style={{ color: visibleFields[field.name] ? 'var(--win95-text)' : 'var(--neutral-gray)' }}>
              {field.label}
            </span>
            {!visibleFields[field.name] && (
              <span className="text-xs italic ml-auto" style={{ color: 'var(--neutral-gray)' }}>
                (hidden)
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
