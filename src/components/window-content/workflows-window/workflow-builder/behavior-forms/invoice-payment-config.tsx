/**
 * INVOICE PAYMENT CONFIG FORM
 *
 * Configuration UI for the invoice-payment behavior.
 * Allows configuring invoice generation, payment terms, and CRM linking.
 */

"use client";

import React from "react";
import type { InvoicePaymentConfig } from "@/lib/behaviors/handlers/invoice-payment";

interface InvoicePaymentConfigFormProps {
  config: InvoicePaymentConfig;
  onChange: (config: InvoicePaymentConfig) => void;
  availableCrmOrganizations?: Array<{ _id: string; name: string }>;
}

const PAYMENT_TERMS = [
  { value: "net30", label: "NET 30 (30 days)" },
  { value: "net60", label: "NET 60 (60 days)" },
  { value: "net90", label: "NET 90 (90 days)" },
];

export function InvoicePaymentConfigForm({
  config,
  onChange,
  availableCrmOrganizations = [],
}: InvoicePaymentConfigFormProps) {
  const handleUpdate = (updates: Partial<InvoicePaymentConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      {/* Payment Terms */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
          📅 Payment Terms <span className="text-red-500">*</span>
        </label>

        <div className="space-y-2">
          <div>
            <label className="text-[10px] block mb-1">Default Payment Terms</label>
            <select
              value={config.defaultPaymentTerms}
              onChange={(e) => handleUpdate({ defaultPaymentTerms: e.target.value as any })}
              className="retro-input w-full px-2 py-1 text-xs"
            >
              {PAYMENT_TERMS.map((term) => (
                <option key={term.value} value={term.value}>
                  {term.label}
                </option>
              ))}
            </select>
          </div>

          {availableCrmOrganizations.length > 0 && (
            <div>
              <label className="text-[10px] block mb-1">Employer-Specific Payment Terms</label>
              <p className="text-[9px] mb-2" style={{ color: "var(--neutral-gray)" }}>
                Override default terms for specific employers
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availableCrmOrganizations.map((org) => (
                  <div key={org._id} className="flex items-center gap-2">
                    <span className="text-[10px] flex-1">{org.name}:</span>
                    <select
                      value={config.employerPaymentTerms?.[org._id] || ""}
                      onChange={(e) => handleUpdate({
                        employerPaymentTerms: {
                          ...config.employerPaymentTerms,
                          [org._id]: e.target.value as any || undefined,
                        },
                      })}
                      className="retro-input px-2 py-1 text-[10px] w-32"
                    >
                      <option value="">Default</option>
                      {PAYMENT_TERMS.map((term) => (
                        <option key={term.value} value={term.value}>
                          {term.value.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.dueDateBusinessDaysOnly ?? false}
                onChange={(e) => handleUpdate({ dueDateBusinessDaysOnly: e.target.checked })}
                className="h-3 w-3"
              />
              <span className="text-xs">Calculate due date using business days only (exclude weekends)</span>
            </label>
          </div>

          <div>
            <label className="text-[10px] block mb-1">Grace Period (days)</label>
            <input
              type="number"
              min="0"
              max="90"
              value={config.gracePeriodDays ?? 0}
              onChange={(e) => handleUpdate({ gracePeriodDays: parseInt(e.target.value) || 0 })}
              className="retro-input w-full px-2 py-1 text-xs"
              placeholder="0"
            />
            <p className="text-[9px] mt-1" style={{ color: "var(--neutral-gray)" }}>
              Extra days before invoice is considered late
            </p>
          </div>
        </div>
      </div>

      {/* CRM Integration */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
          🏢 CRM Integration
        </label>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.requireCrmOrganization ?? false}
              onChange={(e) => handleUpdate({ requireCrmOrganization: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">Require CRM organization for invoices</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.autoCreateCrmOrganization ?? false}
              onChange={(e) => handleUpdate({ autoCreateCrmOrganization: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">Auto-create CRM organization if missing</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.autoFillFromCrm ?? true}
              onChange={(e) => handleUpdate({ autoFillFromCrm: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">Auto-fill billing address from CRM organization</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.requireBillingAddress ?? false}
              onChange={(e) => handleUpdate({ requireBillingAddress: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">Require billing address for invoices</span>
          </label>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
          📄 Invoice Details
        </label>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.includeDetailedLineItems ?? true}
              onChange={(e) => handleUpdate({ includeDetailedLineItems: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">Show each product as separate line item</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.includeTaxBreakdown ?? true}
              onChange={(e) => handleUpdate({ includeTaxBreakdown: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">Show detailed tax breakdown</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.includeAddons ?? true}
              onChange={(e) => handleUpdate({ includeAddons: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">Show add-ons as separate line items</span>
          </label>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
          ✉️ Email Notifications
        </label>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.sendInvoiceEmail ?? true}
              onChange={(e) => handleUpdate({ sendInvoiceEmail: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">Send invoice via email</span>
          </label>

          {config.sendInvoiceEmail !== false && (
            <>
              <div>
                <label className="text-[10px] block mb-1">CC Emails (comma-separated)</label>
                <input
                  type="text"
                  value={config.ccEmails?.join(", ") || ""}
                  onChange={(e) => handleUpdate({
                    ccEmails: e.target.value.split(",").map(s => s.trim()).filter(Boolean),
                  })}
                  className="retro-input w-full px-2 py-1 text-xs"
                  placeholder="accounting@company.com, billing@company.com"
                />
              </div>

              <div>
                <label className="text-[10px] block mb-1">Email Template ID (optional)</label>
                <input
                  type="text"
                  value={config.invoiceEmailTemplate || ""}
                  onChange={(e) => handleUpdate({ invoiceEmailTemplate: e.target.value || undefined })}
                  className="retro-input w-full px-2 py-1 text-xs"
                  placeholder="Leave blank for default template"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
          💳 Payment Instructions
        </label>

        <div className="space-y-2">
          <div>
            <label className="text-[10px] block mb-1">Custom Payment Instructions</label>
            <textarea
              value={config.customPaymentInstructions || ""}
              onChange={(e) => handleUpdate({ customPaymentInstructions: e.target.value || undefined })}
              className="retro-input w-full px-2 py-1 text-xs"
              rows={3}
              placeholder="Payment due within terms. Bank transfer preferred."
            />
          </div>

          <div>
            <label className="text-[10px] block mb-1">Bank Account Details (JSON)</label>
            <textarea
              value={JSON.stringify(config.bankDetails || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleUpdate({ bankDetails: parsed });
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              className="retro-input w-full px-2 py-1 text-xs font-mono"
              rows={8}
              placeholder={'{\n  "accountName": "Company Name",\n  "iban": "DE89...",\n  "swift": "COBADEFFXXX",\n  "bankName": "Bank Name",\n  "bankAddress": "City, Country"\n}'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
