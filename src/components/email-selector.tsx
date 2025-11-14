"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Mail, Loader2 } from "lucide-react";

interface EmailSelectorProps {
  value?: string;
  onChange: (email: string | undefined) => void;
  organizationId: Id<"organizations">;
  sessionId?: string; // Optional: for fetching domain configs
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  defaultEmail?: string; // System default (e.g., "support@l4yercak3.com")
}

/**
 * Email Selector Component
 *
 * Allows selecting from organization emails or entering a custom email.
 * Options include:
 * - Primary Email (from org contact)
 * - Support Email (from org contact)
 * - Billing Email (from org contact)
 * - Sales Email (from domain config, if available)
 * - Custom Email (manual entry)
 * - System Default (fallback)
 */
export function EmailSelector({
  value,
  onChange,
  organizationId,
  sessionId,
  label = "Email Address",
  description,
  required = false,
  disabled = false,
  defaultEmail = "support@l4yercak3.com",
}: EmailSelectorProps) {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [customEmail, setCustomEmail] = useState("");

  // Fetch organization contact info
  const orgContact = useQuery(
    api.organizationOntology.getOrganizationContact,
    { organizationId }
  );

  // Fetch domain configs (for sales email) - only if sessionId provided
  const domainConfigs = useQuery(
    api.domainConfigOntology.listDomainConfigs,
    sessionId ? { sessionId, organizationId } : "skip"
  );

  // Extract available emails
  const availableEmails: Array<{ value: string; label: string; source: string }> = [];

  // Add system default first
  availableEmails.push({
    value: "",
    label: `System Default (${defaultEmail})`,
    source: "system",
  });

  if (orgContact) {
    const primaryEmail = orgContact.customProperties?.primaryEmail as string | undefined;
    const supportEmail = orgContact.customProperties?.supportEmail as string | undefined;
    const billingEmail = orgContact.customProperties?.billingEmail as string | undefined;

    if (primaryEmail) {
      availableEmails.push({
        value: primaryEmail,
        label: `Primary: ${primaryEmail}`,
        source: "org_contact",
      });
    }

    if (supportEmail && supportEmail !== primaryEmail) {
      availableEmails.push({
        value: supportEmail,
        label: `Support: ${supportEmail}`,
        source: "org_contact",
      });
    }

    if (billingEmail && billingEmail !== primaryEmail && billingEmail !== supportEmail) {
      availableEmails.push({
        value: billingEmail,
        label: `Billing: ${billingEmail}`,
        source: "org_contact",
      });
    }
  }

  // Add domain sales emails (if different from above)
  if (domainConfigs && domainConfigs.length > 0) {
    for (const config of domainConfigs) {
      const emailConfig = config.customProperties?.email as { salesEmail?: string } | undefined;
      const salesEmail = emailConfig?.salesEmail;

      if (salesEmail && !availableEmails.some(e => e.value === salesEmail)) {
        const domainName = config.customProperties?.domainName as string || "Unknown";
        availableEmails.push({
          value: salesEmail,
          label: `Sales (${domainName}): ${salesEmail}`,
          source: "domain_config",
        });
      }
    }
  }

  // Add custom option
  availableEmails.push({
    value: "_custom_",
    label: "Custom Email...",
    source: "custom",
  });

  // Determine mode based on current value
  useEffect(() => {
    if (!value) {
      setMode("preset");
    } else {
      const isPreset = availableEmails.some(e => e.value === value);
      if (isPreset) {
        setMode("preset");
      } else {
        setMode("custom");
        setCustomEmail(value);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handlePresetChange = (selectedValue: string) => {
    if (selectedValue === "_custom_") {
      setMode("custom");
      onChange(customEmail || undefined);
    } else {
      setMode("preset");
      onChange(selectedValue || undefined); // Empty string = use system default
    }
  };

  const handleCustomEmailChange = (email: string) => {
    setCustomEmail(email);
    onChange(email || undefined);
  };

  // Loading state
  if (orgContact === undefined) {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
            <Mail size={14} className="inline mr-1" />
            {label}
            {required && <span style={{ color: 'var(--error)' }}> *</span>}
          </label>
        )}
        <div className="retro-input w-full px-2 py-2 text-sm flex items-center gap-2" style={{ color: 'var(--neutral-gray)' }}>
          <Loader2 size={14} className="animate-spin" />
          Loading organization emails...
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
          <Mail size={14} className="inline mr-1" />
          {label}
          {required && <span style={{ color: 'var(--error)' }}> *</span>}
        </label>
      )}
      {description && (
        <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
          {description}
        </p>
      )}

      {mode === "preset" ? (
        <>
          <select
            value={value && availableEmails.some(e => e.value === value) ? value : ""}
            onChange={(e) => handlePresetChange(e.target.value)}
            disabled={disabled}
            required={required}
            className="retro-input w-full px-2 py-1.5 text-sm"
          >
            {availableEmails.map((email) => (
              <option key={email.value} value={email.value}>
                {email.label}
              </option>
            ))}
          </select>

          {/* Show selected email info */}
          {value && value !== "" && (
            <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--win95-highlight)' }}>
              <div className="font-bold">Selected: {value}</div>
            </div>
          )}

          {(!value || value === "") && (
            <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: 'rgba(156, 163, 175, 0.1)', color: 'var(--neutral-gray)' }}>
              <div>Will use system default: <strong>{defaultEmail}</strong></div>
            </div>
          )}
        </>
      ) : (
        <>
          <input
            type="email"
            value={customEmail}
            onChange={(e) => handleCustomEmailChange(e.target.value)}
            placeholder="Enter custom email address"
            className="retro-input w-full px-2 py-1.5 text-sm"
            disabled={disabled}
            required={required}
          />
          <button
            type="button"
            onClick={() => {
              setMode("preset");
              onChange(undefined);
            }}
            className="mt-2 px-2 py-1 text-xs border-2 transition-colors"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)',
              color: 'var(--win95-text)',
            }}
          >
            ← Back to presets
          </button>
        </>
      )}
    </div>
  );
}
