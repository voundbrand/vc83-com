"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Layers, Loader2, AlertCircle, FileText, Mail, Receipt } from "lucide-react";

interface TemplateSetSelectorProps {
  value?: Id<"objects"> | null | undefined;
  onChange: (templateSetId: Id<"objects"> | null | undefined) => void;
  label?: string;
  description?: string;
  organizationId: Id<"organizations">;
  required?: boolean;
  disabled?: boolean;
  allowNull?: boolean; // Allow "Use Default" option
  nullLabel?: string; // Label for "Use Default" option
  showDetails?: boolean; // Show details about selected template set
}

/**
 * Template Set Selector Component
 *
 * Reusable dropdown for selecting template sets.
 * A template set bundles together ticket, invoice, and email templates
 * for consistent branding across all customer touchpoints.
 *
 * Usage:
 * ```tsx
 * <TemplateSetSelector
 *   organizationId={orgId}
 *   value={checkoutTemplateSetId}
 *   onChange={(id) => setTemplateSetId(id)}
 *   label="Template Set"
 *   description="Choose templates for tickets, invoices, and emails"
 * />
 * ```
 */
export function TemplateSetSelector({
  value,
  onChange,
  label = "Template Set",
  description,
  organizationId,
  required = false,
  disabled = false,
  allowNull = true,
  nullLabel = "Use organization default",
  showDetails = true,
}: TemplateSetSelectorProps) {
  // Fetch available template sets
  const templateSets = useQuery(
    api.templateSetQueries.getAvailableTemplateSets,
    { organizationId }
  );

  // Fetch selected template set details if needed
  const selectedSet = useQuery(
    api.templateSetQueries.getTemplateSetById,
    value ? { setId: value } : "skip"
  );

  // Loading state
  if (templateSets === undefined) {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
            <Layers size={14} className="inline mr-1" />
            {label}
            {required && <span style={{ color: 'var(--error)' }}> *</span>}
          </label>
        )}
        <div className="retro-input w-full px-2 py-2 text-sm flex items-center gap-2" style={{ color: 'var(--neutral-gray)' }}>
          <Loader2 size={14} className="animate-spin" />
          Loading template sets...
        </div>
      </div>
    );
  }

  // No template sets available
  if (templateSets.length === 0) {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
            <Layers size={14} className="inline mr-1" />
            {label}
            {required && <span style={{ color: 'var(--error)' }}> *</span>}
          </label>
        )}
        {description && (
          <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
            {description}
          </p>
        )}
        <div className="border-2 p-3" style={{ borderColor: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
            <div>
              <h4 className="font-bold text-xs mb-1" style={{ color: '#F59E0B' }}>
                No template sets available
              </h4>
              <p className="text-xs" style={{ color: '#F59E0B' }}>
                Run template set seeding to create default template sets.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render dropdown
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
          <Layers size={14} className="inline mr-1" />
          {label}
          {required && <span style={{ color: 'var(--error)' }}> *</span>}
        </label>
      )}
      {description && (
        <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
          {description}
        </p>
      )}
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value ? (e.target.value as Id<"objects">) : null)}
        disabled={disabled}
        required={required && !allowNull}
        className="retro-input w-full px-2 py-1.5 text-sm"
      >
        {allowNull && (
          <option value="">
            {nullLabel}
          </option>
        )}
        {templateSets.map((set) => (
          <option key={set._id} value={set._id}>
            {set.name}
            {set.isDefault && " (Default)"}
            {set.isSystemSet && " (System)"}
          </option>
        ))}
      </select>

      {/* Show selected template set info */}
      {showDetails && value && selectedSet && (
        <div className="mt-2 p-3 rounded text-xs border-2" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'var(--win95-highlight)' }}>
          <div className="font-bold mb-2" style={{ color: 'var(--win95-highlight)' }}>
            {selectedSet.set.name}
          </div>
          {selectedSet.set.description && (
            <div className="mb-3 text-xs" style={{ color: 'var(--neutral-gray)' }}>
              {selectedSet.set.description}
            </div>
          )}

          {/* Template breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
              Included Templates:
            </div>

            {/* Ticket Template */}
            <div className="flex items-start gap-2 pl-2">
              <FileText size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <div>
                <div className="font-bold text-xs">Ticket:</div>
                <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  {selectedSet.templates.ticket?.name || "Not configured"}
                </div>
              </div>
            </div>

            {/* Invoice Template */}
            <div className="flex items-start gap-2 pl-2">
              <Receipt size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <div>
                <div className="font-bold text-xs">Invoice:</div>
                <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  {selectedSet.templates.invoice?.name || "Not configured"}
                </div>
              </div>
            </div>

            {/* Email Template */}
            <div className="flex items-start gap-2 pl-2">
              <Mail size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <div>
                <div className="font-bold text-xs">Email:</div>
                <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  {selectedSet.templates.email?.name || "Not configured"}
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {selectedSet.set.customProperties?.tags && (selectedSet.set.customProperties.tags as string[]).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {(selectedSet.set.customProperties.tags as string[]).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-xs font-mono"
                  style={{ backgroundColor: 'rgba(107, 70, 193, 0.1)', color: 'var(--win95-highlight)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
