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
  // Fetch CRM organizations for dropdown
  const crmOrganizations = useQuery(api.crmOntology.getCrmOrganizations, {
    sessionId,
    organizationId: organizationId as unknown as Id<"organizations">,
    status: "active",
  });

  // Payment terms options
  const paymentTermsOptions = [
    { value: "due_on_receipt", label: "Due on Receipt" },
    { value: "net7", label: "NET 7 (7 days)" },
    { value: "net15", label: "NET 15 (15 days)" },
    { value: "net30", label: "NET 30 (30 days)" },
    { value: "net60", label: "NET 60 (60 days)" },
    { value: "net90", label: "NET 90 (90 days)" },
  ];

  // Payment status options
  const paymentStatusOptions = [
    { value: "awaiting_employer_payment", label: "Awaiting Employer Payment" },
    { value: "pending", label: "Pending" },
    { value: "paid", label: "Paid" },
  ];

  // Template options
  const templateOptions = [
    { value: "b2b_consolidated", label: "B2B Consolidated (Summary)" },
    { value: "b2b_consolidated_detailed", label: "B2B Consolidated (Detailed)" },
  ];

  return (
    <div className="space-y-6 p-4">
      {/* SECTION 1: TICKET SELECTION CRITERIA */}
      <div
        className="p-4 border-2 rounded space-y-4"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
        }}
      >
        <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
          <FileCheck className="h-4 w-4" style={{ color: "var(--win95-highlight)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            TICKET SELECTION
          </h3>
        </div>

        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Define which tickets to consolidate. At least one criterion should be specified.
        </p>

        {/* Event Selection */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Event (Optional)
          </label>
          <select
            value={config.eventId || ""}
            onChange={(e) => onChange({ ...config, eventId: e.target.value || undefined })}
            className="retro-input w-full text-xs"
          >
            <option value="">-- All Events --</option>
            {availableEvents.map((event) => (
              <option key={event.objectId} value={event.objectId}>
                {event.name || event.objectId}
              </option>
            ))}
          </select>
          <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
            Filter tickets by specific event
          </p>
        </div>

        {/* Organization Selection */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Employer/Organization (Recommended) *
          </label>
          <select
            value={config.crmOrganizationId || ""}
            onChange={(e) => onChange({ ...config, crmOrganizationId: e.target.value || undefined })}
            className="retro-input w-full text-xs"
          >
            <option value="">-- Select Organization --</option>
            {crmOrganizations?.map((org) => (
              <option key={org._id} value={org._id}>
                {org.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
            Which organization to bill (e.g., Hospital, Company)
          </p>
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Payment Status
          </label>
          <select
            value={config.paymentStatus || "awaiting_employer_payment"}
            onChange={(e) => onChange({ ...config, paymentStatus: e.target.value as "awaiting_employer_payment" | "paid" | "pending" })}
            className="retro-input w-full text-xs"
          >
            {paymentStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              Start Date (Optional)
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
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              End Date (Optional)
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
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Minimum Ticket Count
          </label>
          <input
            type="number"
            min="1"
            value={config.minimumTicketCount || 1}
            onChange={(e) => onChange({ ...config, minimumTicketCount: parseInt(e.target.value) || 1 })}
            className="retro-input w-full text-xs"
          />
          <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
            Only generate invoice if at least this many tickets found
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
          <label htmlFor="excludeInvoiced" className="text-xs" style={{ color: "var(--win95-text)" }}>
            Exclude tickets that already have an invoice
          </label>
        </div>
      </div>

      {/* SECTION 2: INVOICE CONFIGURATION */}
      <div
        className="p-4 border-2 rounded space-y-4"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
        }}
      >
        <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
          <DollarSign className="h-4 w-4" style={{ color: "var(--win95-highlight)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            INVOICE SETTINGS
          </h3>
        </div>

        {/* Payment Terms */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Payment Terms
          </label>
          <select
            value={config.paymentTerms || "net30"}
            onChange={(e) => onChange({ ...config, paymentTerms: e.target.value as "due_on_receipt" | "net7" | "net15" | "net30" | "net60" | "net90" })}
            className="retro-input w-full text-xs"
          >
            {paymentTermsOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Invoice Prefix */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Invoice Number Prefix
          </label>
          <input
            type="text"
            value={config.invoicePrefix || "INV"}
            onChange={(e) => onChange({ ...config, invoicePrefix: e.target.value })}
            placeholder="INV"
            className="retro-input w-full text-xs"
          />
          <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
            Example: &quot;INV&quot; → INV-2024-001
          </p>
        </div>

        {/* PDF Template */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            PDF Template
          </label>
          <select
            value={config.templateId || "b2b_consolidated"}
            onChange={(e) => onChange({ ...config, templateId: e.target.value as "b2b_consolidated" | "b2b_consolidated_detailed" })}
            className="retro-input w-full text-xs"
          >
            {templateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
            <label htmlFor="includeTicketHolderDetails" className="text-xs" style={{ color: "var(--win95-text)" }}>
              Include ticket holder details (names, emails)
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
            <label htmlFor="groupByTicketHolder" className="text-xs" style={{ color: "var(--win95-text)" }}>
              Group line items by ticket holder
            </label>
          </div>
        </div>

        {/* Custom Notes */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Invoice Notes (Optional)
          </label>
          <textarea
            value={config.notes || ""}
            onChange={(e) => onChange({ ...config, notes: e.target.value })}
            placeholder="Add custom notes to appear on the invoice..."
            rows={3}
            className="retro-input w-full text-xs"
          />
        </div>
      </div>

      {/* SECTION 3: EMAIL NOTIFICATIONS */}
      <div
        className="p-4 border-2 rounded space-y-4"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
        }}
      >
        <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
          <Mail className="h-4 w-4" style={{ color: "var(--win95-highlight)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            EMAIL NOTIFICATIONS
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
          <label htmlFor="sendEmail" className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
            Send invoice via email
          </label>
        </div>

        {config.sendEmail !== false && (
          <>
            {/* Email Subject */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                Email Subject (Optional)
              </label>
              <input
                type="text"
                value={config.emailSubject || ""}
                onChange={(e) => onChange({ ...config, emailSubject: e.target.value })}
                placeholder="Your Consolidated Invoice"
                className="retro-input w-full text-xs"
              />
              <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                Leave empty for default subject
              </p>
            </div>

            {/* Email Message */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                Email Message (Optional)
              </label>
              <textarea
                value={config.emailMessage || ""}
                onChange={(e) => onChange({ ...config, emailMessage: e.target.value })}
                placeholder="Please find attached your consolidated invoice..."
                rows={3}
                className="retro-input w-full text-xs"
              />
            </div>

            {/* CC Emails */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                CC Emails (Optional)
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
                placeholder="finance@company.com, billing@company.com"
                className="retro-input w-full text-xs"
              />
              <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                Comma-separated list of additional recipients
              </p>
            </div>
          </>
        )}
      </div>

      {/* Summary Info Box */}
      <div
        className="p-3 border-2 rounded"
        style={{
          borderColor: "var(--win95-highlight)",
          background: "#f0f9ff",
        }}
      >
        <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          📋 Configuration Summary
        </p>
        <ul className="text-[10px] space-y-1" style={{ color: "var(--neutral-gray)" }}>
          <li>
            ✓ Will consolidate tickets{" "}
            {config.crmOrganizationId ? "for selected organization" : "matching criteria"}
          </li>
          <li>✓ Payment terms: {config.paymentTerms || "NET 30"}</li>
          <li>✓ Minimum {config.minimumTicketCount || 1} ticket(s) required</li>
          <li>✓ {config.sendEmail !== false ? "Email will be sent" : "No email notification"}</li>
        </ul>
      </div>
    </div>
  );
}
