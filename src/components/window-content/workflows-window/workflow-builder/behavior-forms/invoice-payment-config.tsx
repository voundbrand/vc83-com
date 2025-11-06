/**
 * INVOICE PAYMENT CONFIG FORM
 *
 * Configuration UI for the invoice-payment behavior.
 * Allows configuring invoice generation, payment terms, and CRM linking.
 */

"use client";

import React from "react";
import type { InvoicePaymentConfig } from "@/lib/behaviors/handlers/invoice-payment";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface InvoicePaymentConfigFormProps {
  config: InvoicePaymentConfig;
  onChange: (config: InvoicePaymentConfig) => void;
  availableCrmOrganizations?: Array<{ _id: string; name: string }>;
}

export function InvoicePaymentConfigForm({
  config,
  onChange,
  availableCrmOrganizations = [],
}: InvoicePaymentConfigFormProps) {
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.workflows.invoice_payment");

  const handleUpdate = (updates: Partial<InvoicePaymentConfig>) => {
    onChange({ ...config, ...updates });
  };

  if (translationsLoading) {
    return <div className="p-4" style={{ color: "var(--win95-text)" }}>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Payment Terms */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
          {t("ui.workflows.invoice_payment.payment_terms.title")} <span className="text-red-500">{t("ui.workflows.invoice_payment.payment_terms.required")}</span>
        </label>

        <div className="space-y-2">
          <div>
            <label className="text-[10px] block mb-1">{t("ui.workflows.invoice_payment.payment_terms.default.label")}</label>
            <select
              value={config.defaultPaymentTerms}
              onChange={(e) => handleUpdate({ defaultPaymentTerms: e.target.value as "net30" | "net60" | "net90" })}
              className="retro-input w-full px-2 py-1 text-xs"
            >
              <option value="net30">{t("ui.workflows.invoice_payment.payment_terms.net30")}</option>
              <option value="net60">{t("ui.workflows.invoice_payment.payment_terms.net60")}</option>
              <option value="net90">{t("ui.workflows.invoice_payment.payment_terms.net90")}</option>
            </select>
          </div>

          {availableCrmOrganizations.length > 0 && (
            <div>
              <label className="text-[10px] block mb-1">{t("ui.workflows.invoice_payment.payment_terms.employer_specific.label")}</label>
              <p className="text-[9px] mb-2" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.workflows.invoice_payment.payment_terms.employer_specific.description")}
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
                          [org._id]: (e.target.value as "net30" | "net60" | "net90") || undefined,
                        },
                      })}
                      className="retro-input px-2 py-1 text-[10px] w-32"
                    >
                      <option value="">{t("ui.workflows.invoice_payment.payment_terms.default_option")}</option>
                      <option value="net30">NET30</option>
                      <option value="net60">NET60</option>
                      <option value="net90">NET90</option>
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
              <span className="text-xs">{t("ui.workflows.invoice_payment.payment_terms.business_days.label")}</span>
            </label>
          </div>

          <div>
            <label className="text-[10px] block mb-1">{t("ui.workflows.invoice_payment.payment_terms.grace_period.label")}</label>
            <input
              type="number"
              min="0"
              max="90"
              value={config.gracePeriodDays ?? 0}
              onChange={(e) => handleUpdate({ gracePeriodDays: parseInt(e.target.value) || 0 })}
              className="retro-input w-full px-2 py-1 text-xs"
              placeholder={t("ui.workflows.invoice_payment.payment_terms.grace_period.placeholder")}
            />
            <p className="text-[9px] mt-1" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.workflows.invoice_payment.payment_terms.grace_period.hint")}
            </p>
          </div>
        </div>
      </div>

      {/* CRM Integration */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
          {t("ui.workflows.invoice_payment.crm.title")}
        </label>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.requireCrmOrganization ?? false}
              onChange={(e) => handleUpdate({ requireCrmOrganization: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">{t("ui.workflows.invoice_payment.crm.require_org.label")}</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.autoCreateCrmOrganization ?? false}
              onChange={(e) => handleUpdate({ autoCreateCrmOrganization: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">{t("ui.workflows.invoice_payment.crm.auto_create.label")}</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.autoFillFromCrm ?? true}
              onChange={(e) => handleUpdate({ autoFillFromCrm: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">{t("ui.workflows.invoice_payment.crm.auto_fill.label")}</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.requireBillingAddress ?? false}
              onChange={(e) => handleUpdate({ requireBillingAddress: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">{t("ui.workflows.invoice_payment.crm.require_address.label")}</span>
          </label>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
          {t("ui.workflows.invoice_payment.details.title")}
        </label>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.includeDetailedLineItems ?? true}
              onChange={(e) => handleUpdate({ includeDetailedLineItems: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">{t("ui.workflows.invoice_payment.details.line_items.label")}</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.includeTaxBreakdown ?? true}
              onChange={(e) => handleUpdate({ includeTaxBreakdown: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">{t("ui.workflows.invoice_payment.details.tax_breakdown.label")}</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.includeAddons ?? true}
              onChange={(e) => handleUpdate({ includeAddons: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">{t("ui.workflows.invoice_payment.details.addons.label")}</span>
          </label>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
          {t("ui.workflows.invoice_payment.email.title")}
        </label>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.sendInvoiceEmail ?? true}
              onChange={(e) => handleUpdate({ sendInvoiceEmail: e.target.checked })}
              className="h-3 w-3"
            />
            <span className="text-xs">{t("ui.workflows.invoice_payment.email.send.label")}</span>
          </label>

          {config.sendInvoiceEmail !== false && (
            <>
              <div>
                <label className="text-[10px] block mb-1">{t("ui.workflows.invoice_payment.email.cc.label")}</label>
                <input
                  type="text"
                  value={config.ccEmails?.join(", ") || ""}
                  onChange={(e) => handleUpdate({
                    ccEmails: e.target.value.split(",").map(s => s.trim()).filter(Boolean),
                  })}
                  className="retro-input w-full px-2 py-1 text-xs"
                  placeholder={t("ui.workflows.invoice_payment.email.cc.placeholder")}
                />
              </div>

              <div>
                <label className="text-[10px] block mb-1">{t("ui.workflows.invoice_payment.email.template.label")}</label>
                <input
                  type="text"
                  value={config.invoiceEmailTemplate || ""}
                  onChange={(e) => handleUpdate({ invoiceEmailTemplate: e.target.value || undefined })}
                  className="retro-input w-full px-2 py-1 text-xs"
                  placeholder={t("ui.workflows.invoice_payment.email.template.placeholder")}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="p-3 rounded border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
          {t("ui.workflows.invoice_payment.payment_instructions.title")}
        </label>

        <div className="space-y-2">
          <div>
            <label className="text-[10px] block mb-1">{t("ui.workflows.invoice_payment.payment_instructions.custom.label")}</label>
            <textarea
              value={config.customPaymentInstructions || ""}
              onChange={(e) => handleUpdate({ customPaymentInstructions: e.target.value || undefined })}
              className="retro-input w-full px-2 py-1 text-xs"
              rows={3}
              placeholder={t("ui.workflows.invoice_payment.payment_instructions.custom.placeholder")}
            />
          </div>

          <div>
            <label className="text-[10px] block mb-1">{t("ui.workflows.invoice_payment.payment_instructions.bank_details.label")}</label>
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
              placeholder={t("ui.workflows.invoice_payment.payment_instructions.bank_details.placeholder")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
