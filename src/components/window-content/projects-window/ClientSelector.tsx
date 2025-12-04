"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Building2, Loader2 } from "lucide-react";

interface ClientSelectorProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  value: Id<"objects"> | undefined;
  onChange: (clientOrgId: Id<"objects"> | undefined) => void;
  disabled?: boolean;
}

export function ClientSelector({
  sessionId,
  organizationId,
  value,
  onChange,
  disabled = false,
}: ClientSelectorProps) {
  // Query CRM organizations (client type)
  const crmOrgs = useQuery(api.crmOntology.getCrmOrganizations, {
    sessionId,
    organizationId,
  });

  // Loading state
  if (crmOrgs === undefined) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
        <Loader2 size={14} className="animate-spin" style={{ color: "var(--neutral-gray)" }} />
        <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Loading clients...
        </span>
      </div>
    );
  }

  // Show all CRM organizations (no subtype filtering - using tags instead)
  const clients = crmOrgs;

  return (
    <div className="relative">
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value ? (e.target.value as Id<"objects">) : undefined)}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg)",
          color: "var(--win95-text)",
        }}
      >
        <option value="">No client selected</option>
        {clients.map((client: { _id: Id<"objects">; name: string }) => (
          <option key={client._id} value={client._id}>
            {client.name}
          </option>
        ))}
      </select>

      {/* Icon */}
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <Building2 size={14} style={{ color: "var(--neutral-gray)" }} />
      </div>

      {/* Helper text */}
      {clients.length === 0 && (
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          No clients found. Create clients in the CRM app first.
        </p>
      )}
    </div>
  );
}
