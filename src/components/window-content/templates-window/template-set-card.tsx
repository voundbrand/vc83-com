"use client";

import { useState } from "react";
import { Package, FileText, Receipt, Mail, Eye, CheckCircle, BookOpen, DollarSign, IdCard, Calendar } from "lucide-react";

interface TemplateSetCardProps {
  templateSet: {
    _id: string;
    name: string;
    description: string;
    isDefault: boolean;
    tags: string[];
    ticketTemplateId?: string;
    invoiceTemplateId?: string;
    emailTemplateId?: string;
    version?: string;
    totalEmailTemplates?: number;
    totalPdfTemplates?: number;
  };
  ticketTemplate?: { _id: string; name: string } | null;
  invoiceTemplate?: { _id: string; name: string } | null;
  emailTemplate?: { _id: string; name: string } | null;
  onPreview?: () => void;
  onUseSet?: () => void;
  t: (key: string) => string; // Translation function passed from parent
}

/**
 * Template Set Card
 *
 * Displays a template set with all 3 bundled templates (ticket, invoice, email).
 * Shows thumbnails for each template type and allows previewing all 3 together.
 *
 * Visual Design:
 * ```
 * ┌─────────────────────────────────────────┐
 * │ [Package] VIP Premium Set          [*] │
 * │ #luxury #premium #vip                   │
 * │ ─────────────────────────────────────── │
 * │                                         │
 * │ ┌─────────┐  ┌─────────┐  ┌─────────┐ │
 * │ │ Ticket  │  │Invoice  │  │ Email   │ │
 * │ │ Ticket  │  │ Invoice │  │ Email   │ │
 * │ └─────────┘  └─────────┘  └─────────┘ │
 * │                                         │
 * │ Luxury suite for premium customers      │
 * │                                         │
 * │ [Preview All 3]  [Use This Set]         │
 * └─────────────────────────────────────────┘
 * ```
 */
export function TemplateSetCard({
  templateSet,
  ticketTemplate,
  invoiceTemplate,
  emailTemplate,
  onPreview,
  onUseSet,
  t,
}: TemplateSetCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="border-2 rounded-lg p-4 transition-all cursor-pointer"
      style={{
        borderColor: templateSet.isDefault ? "var(--tone-accent)" : "var(--window-document-border)",
        backgroundColor: isHovered ? "var(--window-document-bg-elevated)" : "var(--window-document-bg)",
        boxShadow: isHovered ? "var(--window-shell-shadow)" : "none",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package size={18} style={{ color: "var(--tone-accent)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            {templateSet.name}
          </h3>
        </div>
        {templateSet.isDefault && (
          <div
            className="px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"
            style={{
              backgroundColor: "color-mix(in srgb, var(--success) 10%, var(--window-document-bg))",
              color: "var(--success)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--success)",
            }}
          >
            <CheckCircle size={12} />
            {t("ui.templates.template_set.badge.default")}
          </div>
        )}
      </div>

      {/* Tags */}
      {templateSet.tags && templateSet.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {templateSet.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded font-mono"
              style={{
                backgroundColor: "color-mix(in srgb, var(--tone-accent) 10%, var(--window-document-bg))",
                color: "var(--tone-accent)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "var(--tone-accent)",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="border-t-2 mb-4" style={{ borderColor: "var(--window-document-border)" }} />

      {/* Comprehensive Template Summary (v2.0+) or Legacy 3-Template View */}
      {templateSet.version && (templateSet.totalEmailTemplates || templateSet.totalPdfTemplates) ? (
        <div className="space-y-4 mb-4">
          {/* Email Templates Section */}
          {templateSet.totalEmailTemplates && (
            <div className="border-2 rounded p-3" style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--window-document-bg-elevated)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mail size={16} style={{ color: "var(--tone-accent)" }} />
                  <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                    Email Templates
                  </span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: "var(--tone-accent)", color: "var(--window-document-text)" }}>
                  {templateSet.totalEmailTemplates}
                </span>
              </div>
              <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Transactional, Marketing, Events, Support
              </div>
            </div>
          )}

          {/* PDF Templates Section */}
          {templateSet.totalPdfTemplates && (
            <div className="border-2 rounded p-3" style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--window-document-bg-elevated)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText size={16} style={{ color: "var(--tone-accent)" }} />
                  <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                    PDF Templates
                  </span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: "var(--tone-accent)", color: "var(--window-document-text)" }}>
                  {templateSet.totalPdfTemplates}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                <div className="flex items-center gap-1">
                  <FileText size={10} />
                  <span>Tickets</span>
                </div>
                <div className="flex items-center gap-1">
                  <Receipt size={10} />
                  <span>Invoices</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign size={10} />
                  <span>Quotes</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen size={10} />
                  <span>Lead Magnets</span>
                </div>
                <div className="flex items-center gap-1">
                  <IdCard size={10} />
                  <span>Badges</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={10} />
                  <span>Programs</span>
                </div>
              </div>
            </div>
          )}

          {/* Version Badge */}
          {templateSet.version && (
            <div className="text-center">
              <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: "color-mix(in srgb, var(--tone-accent) 10%, var(--window-document-bg))", color: "var(--tone-accent)" }}>
                v{templateSet.version}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Legacy 3-Template Thumbnails Grid (v1.0) */
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Ticket Template */}
          <div className="flex flex-col items-center">
            <div
              className="w-full aspect-[3/4] border-2 rounded flex items-center justify-center mb-2"
              style={{
                borderColor: "var(--window-document-border)",
                backgroundColor: "var(--window-document-bg-elevated)",
              }}
            >
              <FileText size={32} style={{ color: "var(--neutral-gray)" }} />
            </div>
            <div className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--window-document-text)" }}>
              <FileText size={12} />
              <span>{t("ui.templates.template_set.label.ticket")}</span>
            </div>
            <div className="text-xs truncate w-full text-center" style={{ color: "var(--neutral-gray)" }}>
              {ticketTemplate?.name || t("ui.templates.template_set.label.not_set")}
            </div>
          </div>

          {/* Invoice Template */}
          <div className="flex flex-col items-center">
            <div
              className="w-full aspect-[3/4] border-2 rounded flex items-center justify-center mb-2"
              style={{
                borderColor: "var(--window-document-border)",
                backgroundColor: "var(--window-document-bg-elevated)",
              }}
            >
              <Receipt size={32} style={{ color: "var(--neutral-gray)" }} />
            </div>
            <div className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--window-document-text)" }}>
              <DollarSign size={12} />
              <span>{t("ui.templates.template_set.label.invoice")}</span>
            </div>
            <div className="text-xs truncate w-full text-center" style={{ color: "var(--neutral-gray)" }}>
              {invoiceTemplate?.name || t("ui.templates.template_set.label.not_set")}
            </div>
          </div>

          {/* Email Template */}
          <div className="flex flex-col items-center">
            <div
              className="w-full aspect-[3/4] border-2 rounded flex items-center justify-center mb-2"
              style={{
                borderColor: "var(--window-document-border)",
                backgroundColor: "var(--window-document-bg-elevated)",
              }}
            >
              <Mail size={32} style={{ color: "var(--neutral-gray)" }} />
            </div>
            <div className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--window-document-text)" }}>
              <Mail size={12} />
              <span>{t("ui.templates.template_set.label.email")}</span>
            </div>
            <div className="text-xs truncate w-full text-center" style={{ color: "var(--neutral-gray)" }}>
              {emailTemplate?.name || t("ui.templates.template_set.label.not_set")}
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {templateSet.description && (
        <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
          {templateSet.description}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-3 border-t-2" style={{ borderColor: "var(--window-document-border)" }}>
        {onPreview && (
          <button
            onClick={onPreview}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded transition-colors"
            style={{
              backgroundColor: "var(--window-document-bg-elevated)",
              color: "var(--window-document-text)",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "var(--window-document-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--window-document-bg-elevated) 95%, black)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--window-document-bg-elevated)";
            }}
          >
            <Eye size={14} />
            {t("ui.templates.template_set.button.preview_all")}
          </button>
        )}
        {onUseSet && (
          <button
            onClick={onUseSet}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded transition-colors"
            style={{
              backgroundColor: "var(--tone-accent)",
              color: "var(--window-document-text)",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "color-mix(in srgb, var(--tone-accent) 80%, black)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--tone-accent) 90%, black)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--tone-accent)";
            }}
          >
            <CheckCircle size={14} />
            {t("ui.templates.template_set.button.use_set")}
          </button>
        )}
      </div>
    </div>
  );
}
