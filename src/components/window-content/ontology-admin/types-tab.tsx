"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Package2 } from "lucide-react";

const TYPE_ICONS: Record<string, string> = {
  translation: "🌐",
  organization_profile: "🏢",
  organization_contact: "📧",
  organization_social: "📱",
  organization_legal: "⚖️",
  organization_settings: "⚙️",
  address: "🏠",
};

export function TypesTab() {
  const { sessionId } = useAuth();
  const objectTypes = useQuery(
    api.ontologyAdmin.getObjectTypes,
    sessionId ? { sessionId } : "skip"
  );

  if (!objectTypes) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
          <Package2 size={48} className="mx-auto mb-4 animate-pulse" />
          <p className="text-sm">Loading object types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6">
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
          Registered Object Types ({objectTypes.length})
        </h3>
        <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
          All object types currently in use across all organizations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {objectTypes.map((typeData) => {
          const icon = TYPE_ICONS[typeData.type] || "📦";

          return (
            <div
              key={typeData.type}
              className="border-2 rounded p-4 transition-all hover:shadow-md"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-bg-light)',
              }}
            >
              {/* Type Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">{icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate" style={{ color: 'var(--win95-text)' }}>
                    {typeData.type}
                  </h4>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--neutral-gray)' }}>
                    {typeData.count} {typeData.count === 1 ? 'object' : 'objects'}
                  </p>
                </div>
              </div>

              {/* Subtypes */}
              {typeData.subtypes && typeData.subtypes.length > 0 && (
                <div className="mb-3 pb-3 border-b" style={{ borderColor: 'var(--win95-border)' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                    Subtypes:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {typeData.subtypes.map((subtype) => (
                      <span
                        key={subtype}
                        className="px-2 py-0.5 text-xs rounded"
                        style={{
                          background: 'var(--win95-bg)',
                          color: 'var(--win95-text)',
                          border: '1px solid var(--win95-border)',
                        }}
                      >
                        {subtype}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Fields */}
              {typeData.sampleFields && typeData.sampleFields.length > 0 && (
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                    Common Fields:
                  </p>
                  <ul className="text-xs space-y-0.5" style={{ color: 'var(--neutral-gray)' }}>
                    {typeData.sampleFields.slice(0, 5).map((field) => (
                      <li key={field} className="flex items-center gap-1">
                        <span className="text-[8px]">▸</span> {field}
                      </li>
                    ))}
                    {typeData.sampleFields.length > 5 && (
                      <li className="italic">
                        + {typeData.sampleFields.length - 5} more...
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {objectTypes.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--neutral-gray)' }}>
          <Package2 size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-sm">No object types found</p>
          <p className="text-xs mt-1">Create your first ontology object to get started</p>
        </div>
      )}
    </div>
  );
}
