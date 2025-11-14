"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { FileText, Loader2, AlertCircle } from "lucide-react";

type PdfCategory = "invoice" | "ticket" | "certificate" | "receipt" | "badge";
type EmailCategory = "luxury" | "minimal" | "internal" | "all"; // Added "all" for no filter

interface TemplateSelectorProps {
  category: PdfCategory | EmailCategory;
  value?: Id<"objects"> | null | undefined;
  onChange: (templateId: Id<"objects"> | null | undefined) => void;
  label?: string;
  description?: string;
  organizationId?: Id<"organizations">;
  required?: boolean;
  disabled?: boolean;
  allowNull?: boolean; // Allow "None" option
  nullLabel?: string; // Label for "None" option (e.g., "Use system default")
}

/**
 * Template Selector Component
 *
 * Reusable dropdown for selecting PDF templates by category.
 * Fetches available templates from the database and displays them
 * in a styled dropdown matching the Win95 retro theme.
 *
 * Usage:
 * ```tsx
 * <TemplateSelector
 *   category="ticket"
 *   value={productTicketTemplateId}
 *   onChange={(id) => setTicketTemplateId(id)}
 *   label="Ticket Design Template"
 * />
 * ```
 */
export function TemplateSelector({
  category,
  value,
  onChange,
  label,
  description,
  organizationId,
  required = false,
  disabled = false,
  allowNull = true,
  nullLabel = "Use system default",
}: TemplateSelectorProps) {
  // Determine if this is a PDF or email template category
  const isPdfCategory = (["invoice", "ticket", "certificate", "receipt", "badge"] as const).includes(category as PdfCategory);
  const isAllEmailCategory = category === "all";
  const isEmailCategory = (["luxury", "minimal", "internal"] as const).includes(category as "luxury" | "minimal" | "internal");

  // Fetch templates for category (PDF or Email)
  // Note: Passing "skip" as args tells Convex to skip that query
  // Both queries are "registered" but only execute when args are not "skip"
  const pdfTemplates = useQuery(
    api.pdfTemplateQueries.getPdfTemplatesByCategory,
    isPdfCategory ? { category: category as PdfCategory, organizationId } : "skip"
  );

  const emailTemplatesByCategory = useQuery(
    api.pdfTemplateQueries.getEmailTemplatesByCategory,
    isEmailCategory ? { category: category as "luxury" | "minimal" | "internal", organizationId } : "skip"
  );

  const allEmailTemplates = useQuery(
    api.pdfTemplateQueries.getAllEmailTemplates,
    isAllEmailCategory ? { organizationId } : "skip"
  );

  // Use the appropriate result based on category
  const templates = isPdfCategory
    ? pdfTemplates
    : isEmailCategory
      ? emailTemplatesByCategory
      : isAllEmailCategory
        ? allEmailTemplates
        : undefined;

  // Loading state
  if (templates === undefined) {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
            <FileText size={14} className="inline mr-1" />
            {label}
            {required && <span style={{ color: 'var(--error)' }}> *</span>}
          </label>
        )}
        <div className="retro-input w-full px-2 py-2 text-sm flex items-center gap-2" style={{ color: 'var(--neutral-gray)' }}>
          <Loader2 size={14} className="animate-spin" />
          Loading templates...
        </div>
      </div>
    );
  }

  // No templates available
  if (templates.length === 0) {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
            <FileText size={14} className="inline mr-1" />
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
                No {category} templates available
              </h4>
              <p className="text-xs" style={{ color: '#F59E0B' }}>
                Run template seeding to create default templates.
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
          <FileText size={14} className="inline mr-1" />
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
        {templates.map((template) => (
          <option key={template._id} value={template._id}>
            {template.name}
            {template.isDefault && " (Default)"}
            {template.isSystemTemplate ? "" : " (Custom)"}
          </option>
        ))}
      </select>

      {/* Show selected template info */}
      {value && templates && (
        <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--win95-highlight)' }}>
          {(() => {
            const selected = templates.find((t: {_id: string}) => t._id === value);
            if (!selected) return null;
            return (
              <div>
                <div className="font-bold">{(selected as any).name}</div>
                {(selected as any).description && (
                  <div className="mt-1">{(selected as any).description}</div>
                )}
                <div className="mt-1 font-mono text-xs opacity-75">
                  Code: {(selected as any).templateCode} | v{(selected as any).version}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
