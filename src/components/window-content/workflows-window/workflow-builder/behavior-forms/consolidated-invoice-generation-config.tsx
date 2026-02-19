/**
 * CONSOLIDATED INVOICE GENERATION CONFIG FORM
 *
 * Configuration UI for the consolidated-invoice-generation behavior.
 * Allows configuring how multiple tickets are consolidated into a single invoice.
 *
 * Use Cases:
 * - Hospital paying for multiple doctor registrations
 * - Company paying for employee conference tickets
 * - Monthly billing consolidation
 */

"use client";

import { DollarSign, Mail, FileCheck } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import type { ConsolidatedInvoiceGenerationConfig } from "@/lib/behaviors/handlers/consolidated-invoice-generation";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface ConsolidatedInvoiceGenerationConfigFormProps {
  config: ConsolidatedInvoiceGenerationConfig;
  onChange: (config: ConsolidatedInvoiceGenerationConfig) => void;
  sessionId: string;
  organizationId: Id<"objects">;
  availableEvents?: Array<{ objectId: string; name?: string }>;
  availableProducts?: Array<{ objectId: string; name?: string }>;
}

export function ConsolidatedInvoiceGenerationConfigForm({
  config,
  onChange,
  sessionId,
  organizationId,
  availableEvents = [],
}: ConsolidatedInvoiceGenerationConfigFormProps) {
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.workflows.consolidated_invoice");

  // Fetch CRM organizations for dropdown
  const crmOrganizations = useQuery(api.crmOntology.getCrmOrganizations, {
    sessionId,
    organizationId: organizationId as unknown as Id<"organizations">,
    status: "active",
  });

  if (translationsLoading) {
    return <div className="p-4" style={{ color: "var(--window-document-text)" }}>Loading...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      {/* SECTION 1: TICKET SELECTION CRITERIA */}
      <div
        className="p-4 border-2 rounded space-y-4"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-bg-elevated)",
        }}
      >
        <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: "var(--window-document-border)" }}>
          <FileCheck className="h-4 w-4" style={{ color: "var(--tone-accent)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            {t("ui.workflows.consolidated_invoice.ticket_selection.title")}
          </h3>
        </div>

        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.workflows.consolidated_invoice.ticket_selection.description")}
        </p>

        {/* Event Selection */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
            {t("ui.workflows.consolidated_invoice.event.label")}
          </label>
          <select
            value={config.eventId || ""}
            onChange={(e) => onChange({ ...config, eventId: e.target.value || undefined })}
            className="retro-input w-full text-xs"
          >
            <option value="">{t("ui.workflows.consolidated_invoice.event.all")}</option>
            {availableEvents.map((event) => (
              <option key={event.objectId} value={event.objectId}>
                {event.name || event.objectId}
              </option>
            ))}
          </select>
          <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.workflows.consolidated_invoice.event.hint")}
          </p>
        </div>

        {/* Organization Selection */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
            {t("ui.workflows.consolidated_invoice.organization.label")}
          </label>
          <select
            value={config.crmOrganizationId || ""}
            onChange={(e) => onChange({ ...config, crmOrganizationId: e.target.value || undefined })}
            className="retro-input w-full text-xs"
          >
            <option value="">{t("ui.workflows.consolidated_invoice.organization.placeholder")}</option>
            {crmOrganizations?.map((org) => (
              <option key={org._id} value={org._id}>
                {org.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.workflows.consolidated_invoice.organization.hint")}
          </p>
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
            {t("ui.workflows.consolidated_invoice.payment_status.label")}
          </label>
          <select
            value={config.paymentStatus || "awaiting_employer_payment"}
            onChange={(e) => onChange({ ...config, paymentStatus: e.target.value as "awaiting_employer_payment" | "paid" | "pending" })}
            className="retro-input w-full text-xs"
          >
            <option value="awaiting_employer_payment">{t("ui.workflows.consolidated_invoice.payment_status.awaiting")}</option>
            <option value="pending">{t("ui.workflows.consolidated_invoice.payment_status.pending")}</option>
            <option value="paid">{t("ui.workflows.consolidated_invoice.payment_status.paid")}</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
              {t("ui.workflows.consolidated_invoice.date_range.start")}
            </label>
            <input
              type="date"
              value={
                config.dateRange?.startDate
                  ? new Date(config.dateRange.startDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                onChange({
                  ...config,
                  dateRange: {
                    ...config.dateRange,
                    startDate: e.target.value ? new Date(e.target.value).getTime() : undefined,
                  },
                })
              }
              className="retro-input w-full text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
              {t("ui.workflows.consolidated_invoice.date_range.end")}
            </label>
            <input
              type="date"
              value={
                config.dateRange?.endDate
                  ? new Date(config.dateRange.endDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                onChange({
                  ...config,
                  dateRange: {
                    ...config.dateRange,
                    endDate: e.target.value ? new Date(e.target.value).getTime() : undefined,
                  },
                })
              }
              className="retro-input w-full text-xs"
            />
          </div>
        </div>

        {/* Minimum Ticket Count */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
            {t("ui.workflows.consolidated_invoice.min_tickets.label")}
          </label>
          <input
            type="number"
            min="1"
            value={config.minimumTicketCount || 1}
            onChange={(e) => onChange({ ...config, minimumTicketCount: parseInt(e.target.value) || 1 })}
            className="retro-input w-full text-xs"
          />
          <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.workflows.consolidated_invoice.min_tickets.hint")}
          </p>
        </div>

        {/* Exclude Already Invoiced */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="excludeInvoiced"
            checked={config.excludeInvoiced !== false}
            onChange={(e) => onChange({ ...config, excludeInvoiced: e.target.checked })}
            className="retro-checkbox"
          />
          <label htmlFor="excludeInvoiced" className="text-xs" style={{ color: "var(--window-document-text)" }}>
            {t("ui.workflows.consolidated_invoice.exclude_invoiced.label")}
          </label>
        </div>
      </div>

      {/* SECTION 2: INVOICE CONFIGURATION */}
      <div
        className="p-4 border-2 rounded space-y-4"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-bg-elevated)",
        }}
      >
        <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: "var(--window-document-border)" }}>
          <DollarSign className="h-4 w-4" style={{ color: "var(--tone-accent)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            {t("ui.workflows.consolidated_invoice.invoice_settings.title")}
          </h3>
        </div>

        {/* Payment Terms */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
            {t("ui.workflows.invoice_mapping.payment_terms.label")}
          </label>
          <select
            value={config.paymentTerms || "net30"}
            onChange={(e) => onChange({ ...config, paymentTerms: e.target.value as "due_on_receipt" | "net7" | "net15" | "net30" | "net60" | "net90" })}
            className="retro-input w-full text-xs"
          >
            <option value="net30">{t("ui.workflows.invoice_mapping.payment_terms.net30")}</option>
            <option value="net60">{t("ui.workflows.invoice_mapping.payment_terms.net60")}</option>
            <option value="net90">{t("ui.workflows.invoice_mapping.payment_terms.net90")}</option>
          </select>
        </div>

        {/* Invoice Prefix */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
            {t("ui.workflows.consolidated_invoice.invoice_prefix.label")}
          </label>
          <input
            type="text"
            value={config.invoicePrefix || "INV"}
            onChange={(e) => onChange({ ...config, invoicePrefix: e.target.value })}
            placeholder={t("ui.workflows.consolidated_invoice.invoice_prefix.placeholder")}
            className="retro-input w-full text-xs"
          />
          <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.workflows.consolidated_invoice.invoice_prefix.hint")}
          </p>
        </div>

        {/* PDF Template */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
            {t("ui.workflows.consolidated_invoice.template.label")}
          </label>
          <select
            value={config.templateId || "b2b_consolidated"}
            onChange={(e) => onChange({ ...config, templateId: e.target.value as "b2b_consolidated" | "b2b_consolidated_detailed" })}
            className="retro-input w-full text-xs"
          >
            <option value="b2b_consolidated">{t("ui.workflows.consolidated_invoice.template.summary")}</option>
            <option value="b2b_consolidated_detailed">{t("ui.workflows.consolidated_invoice.template.detailed")}</option>
          </select>
        </div>

        {/* Invoice Display Options */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeTicketHolderDetails"
              checked={config.includeTicketHolderDetails !== false}
              onChange={(e) => onChange({ ...config, includeTicketHolderDetails: e.target.checked })}
              className="retro-checkbox"
            />
            <label htmlFor="includeTicketHolderDetails" className="text-xs" style={{ color: "var(--window-document-text)" }}>
              {t("ui.workflows.consolidated_invoice.display_options.ticket_holder")}
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="groupByTicketHolder"
              checked={config.groupByTicketHolder !== false}
              onChange={(e) => onChange({ ...config, groupByTicketHolder: e.target.checked })}
              className="retro-checkbox"
            />
            <label htmlFor="groupByTicketHolder" className="text-xs" style={{ color: "var(--window-document-text)" }}>
              {t("ui.workflows.consolidated_invoice.display_options.group_by")}
            </label>
          </div>
        </div>

        {/* Custom Notes */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
            {t("ui.workflows.consolidated_invoice.notes.label")}
          </label>
          <textarea
            value={config.notes || ""}
            onChange={(e) => onChange({ ...config, notes: e.target.value })}
            placeholder={t("ui.workflows.consolidated_invoice.notes.placeholder")}
            rows={3}
            className="retro-input w-full text-xs"
          />
        </div>
      </div>

      {/* SECTION 3: EMAIL NOTIFICATIONS */}
      <div
        className="p-4 border-2 rounded space-y-4"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-bg-elevated)",
        }}
      >
        <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: "var(--window-document-border)" }}>
          <Mail className="h-4 w-4" style={{ color: "var(--tone-accent)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            {t("ui.workflows.consolidated_invoice.email.title")}
          </h3>
        </div>

        {/* Send Email Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sendEmail"
            checked={config.sendEmail !== false}
            onChange={(e) => onChange({ ...config, sendEmail: e.target.checked })}
            className="retro-checkbox"
          />
          <label htmlFor="sendEmail" className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
            {t("ui.workflows.consolidated_invoice.email.send.label")}
          </label>
        </div>

        {config.sendEmail !== false && (
          <>
            {/* Email Subject */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                {t("ui.workflows.consolidated_invoice.email.subject.label")}
              </label>
              <input
                type="text"
                value={config.emailSubject || ""}
                onChange={(e) => onChange({ ...config, emailSubject: e.target.value })}
                placeholder={t("ui.workflows.consolidated_invoice.email.subject.placeholder")}
                className="retro-input w-full text-xs"
              />
              <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.workflows.consolidated_invoice.email.subject.hint")}
              </p>
            </div>

            {/* Email Message */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                {t("ui.workflows.consolidated_invoice.email.message.label")}
              </label>
              <textarea
                value={config.emailMessage || ""}
                onChange={(e) => onChange({ ...config, emailMessage: e.target.value })}
                placeholder={t("ui.workflows.consolidated_invoice.email.message.placeholder")}
                rows={3}
                className="retro-input w-full text-xs"
              />
            </div>

            {/* CC Emails */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                {t("ui.workflows.consolidated_invoice.email.cc.label")}
              </label>
              <input
                type="text"
                value={config.ccEmails?.join(", ") || ""}
                onChange={(e) =>
                  onChange({
                    ...config,
                    ccEmails: e.target.value
                      .split(",")
                      .map((email) => email.trim())
                      .filter(Boolean),
                  })
                }
                placeholder={t("ui.workflows.consolidated_invoice.email.cc.placeholder")}
                className="retro-input w-full text-xs"
              />
              <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.workflows.consolidated_invoice.email.cc.hint")}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Summary Info Box */}
      <div
        className="p-3 border-2 rounded"
        style={{
          borderColor: "var(--tone-accent)",
          background: "#f0f9ff",
        }}
      >
        <p className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
          {t("ui.workflows.consolidated_invoice.summary.title")}
        </p>
        <ul className="text-[10px] space-y-1" style={{ color: "var(--neutral-gray)" }}>
          <li>
             {config.crmOrganizationId ? t("ui.workflows.consolidated_invoice.summary.consolidate") : t("ui.workflows.consolidated_invoice.summary.consolidate_criteria")}
          </li>
          <li> {t("ui.workflows.consolidated_invoice.summary.payment_terms")} {config.paymentTerms || "NET 30"}</li>
          <li> {t("ui.workflows.consolidated_invoice.summary.minimum")} {config.minimumTicketCount || 1} {t("ui.workflows.consolidated_invoice.summary.tickets_required")}</li>
          <li> {config.sendEmail !== false ? t("ui.workflows.consolidated_invoice.summary.email_sent") : t("ui.workflows.consolidated_invoice.summary.no_email")}</li>
        </ul>
      </div>
    </div>
  );
}
