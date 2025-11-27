"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { type Id, type Doc } from "../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useOrganizationCurrency } from "@/hooks/use-organization-currency";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import {
  Building2,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  DollarSign,
  Calendar,
  CreditCard,
} from "lucide-react";

/**
 * Create Invoice Tab
 *
 * UI for creating new B2B invoices from CRM organizations.
 * Features:
 * - Select CRM organization with B2B billing info
 * - Add/remove line items
 * - Preview invoice with VAT calculation
 * - Validate against credit limits
 * - Create draft invoice
 */

interface LineItem {
  description: string;
  quantity: number;
  unitPriceInCents: number;
  totalPriceInCents: number;
}

export function CreateInvoiceTab() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.invoicing_window");

  // Form state
  const [selectedCrmOrgId, setSelectedCrmOrgId] = useState<Id<"objects"> | "">("");
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [paymentTermsOverride, setPaymentTermsOverride] = useState<string>("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPriceInCents: 0, totalPriceInCents: 0 },
  ]);
  const [notes, setNotes] = useState("");

  // Fetch CRM organizations with B2B billing info
  const crmOrgs = useQuery(
    api.crmOntology.getCrmOrganizations,
    sessionId && currentOrg
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  );

  // Fetch selected org's B2B billing data
  const b2bData = useQuery(
    api.b2bInvoiceHelper.getB2BInvoiceData,
    sessionId && selectedCrmOrgId
      ? {
          sessionId,
          crmOrganizationId: selectedCrmOrgId as Id<"objects">,
        }
      : "skip"
  );

  // Calculate invoice totals
  const calculateTotals = () => {
    const subtotalInCents = lineItems.reduce((sum, item) => sum + item.totalPriceInCents, 0);
    const taxRate = b2bData?.vatNumber ? 0.21 : 0; // 21% VAT if VAT number exists
    const taxExempt = b2bData?.taxExempt || false;
    const taxInCents = taxExempt ? 0 : Math.round(subtotalInCents * taxRate);
    const totalInCents = subtotalInCents + taxInCents;

    return { subtotalInCents, taxInCents, totalInCents, taxRate };
  };

  // Validate credit limit
  const totals = calculateTotals();
  const creditValidation = useQuery(
    api.b2bInvoiceHelper.validateCreditLimit,
    sessionId && selectedCrmOrgId && b2bData?.creditLimit
      ? {
          sessionId,
          crmOrganizationId: selectedCrmOrgId as Id<"objects">,
          invoiceAmountCents: totals.totalInCents,
        }
      : "skip"
  );

  // Create invoice mutation
  const createInvoiceMutation = useMutation(api.invoicingOntology.createDraftInvoice);

  // Get organization currency settings (SINGLE SOURCE OF TRUTH)
  const { currency: orgCurrency } = useOrganizationCurrency();

  // Currency formatting hook
  const { formatCurrency } = useFormatCurrency({ currency: orgCurrency });

  // Handle line item changes
  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate total for this line
    if (field === "quantity" || field === "unitPriceInCents") {
      updated[index].totalPriceInCents =
        updated[index].quantity * updated[index].unitPriceInCents;
    }

    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, unitPriceInCents: 0, totalPriceInCents: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Handle create invoice
  const handleCreateInvoice = async () => {
    if (!sessionId || !currentOrg || !selectedCrmOrgId || !b2bData) {
      alert(t("ui.invoicing_window.create.errors.missing_data"));
      return;
    }

    // Validate line items
    const validItems = lineItems.filter((item) => item.description.trim() && item.totalPriceInCents > 0);
    if (validItems.length === 0) {
      alert(t("ui.invoicing_window.create.errors.no_items"));
      return;
    }

    // Check credit limit
    if (creditValidation && !creditValidation.valid) {
      const confirmed = window.confirm(
        `${t("ui.invoicing_window.create.warnings.credit_limit_exceeded")}\n\n${creditValidation.message}\n\n${t("ui.invoicing_window.create.warnings.continue_anyway")}`
      );
      if (!confirmed) return;
    }

    try {
      const { subtotalInCents, taxInCents, totalInCents } = calculateTotals();

      // Determine payment terms
      const paymentTerms = paymentTermsOverride || b2bData.paymentTerms || "net30";

      // Calculate due date based on payment terms
      const invoiceDateMs = new Date(invoiceDate).getTime();
      const termsDays = {
        due_on_receipt: 0,
        net15: 15,
        net30: 30,
        net60: 60,
        net90: 90,
      }[paymentTerms] || 30;
      const dueDateMs = invoiceDateMs + termsDays * 24 * 60 * 60 * 1000;

      await createInvoiceMutation({
        sessionId,
        organizationId: currentOrg.id as Id<"organizations">,
        crmOrganizationId: selectedCrmOrgId as Id<"objects">,
        billToName: b2bData.customerName,
        billToEmail: b2bData.billingContactEmail || "",
        billToVatNumber: b2bData.vatNumber || "",
        billToAddress: b2bData.billingAddress || {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        },
        lineItems: validItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceInCents: item.unitPriceInCents,
          totalPriceInCents: item.totalPriceInCents,
        })),
        subtotalInCents,
        taxInCents,
        totalInCents,
        currency: "EUR",
        invoiceDate: invoiceDateMs,
        dueDate: dueDateMs,
        paymentTerms,
        notes: notes.trim() || undefined,
      });

      alert(t("ui.invoicing_window.create.success"));

      // Reset form
      setSelectedCrmOrgId("");
      setLineItems([{ description: "", quantity: 1, unitPriceInCents: 0, totalPriceInCents: 0 }]);
      setNotes("");
      setPaymentTermsOverride("");
    } catch (error) {
      console.error("Failed to create invoice:", error);
      alert(`${t("ui.invoicing_window.create.errors.failed")}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  if (translationsLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p style={{ color: "var(--win95-text)" }}>{t("ui.invoicing_window.footer.loading")}</p>
      </div>
    );
  }

  // Filter CRM orgs that have billing address (indicating B2B setup)
  const b2bCrmOrgs = (crmOrgs || []).filter((org: Doc<"objects">) => {
    const props = org.customProperties || {};
    return props.billingAddress || props.vatNumber || props.paymentTerms;
  });

  return (
    <div className="p-4 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
          <FileText size={16} />
          {t("ui.invoicing_window.create.title")}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.invoicing_window.create.description")}
        </p>
      </div>

      {/* CRM Organization Selection */}
      <div
        className="p-4 border-2 rounded"
        style={{ background: "var(--win95-bg-light)", borderColor: "var(--win95-border)" }}
      >
        <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          <Building2 size={14} className="inline mr-2" />
          {t("ui.invoicing_window.create.select_customer")}
        </label>
        <select
          value={selectedCrmOrgId}
          onChange={(e) => setSelectedCrmOrgId(e.target.value as Id<"objects"> | "")}
          className="w-full px-3 py-2 text-sm border-2 rounded"
          style={{
            background: "var(--win95-bg)",
            borderColor: "var(--win95-border)",
            color: "var(--win95-text)",
          }}
        >
          <option value="">{t("ui.invoicing_window.create.select_customer_placeholder")}</option>
          {b2bCrmOrgs.map((org: Doc<"objects">) => (
            <option key={org._id} value={org._id}>
              {org.name}
            </option>
          ))}
        </select>

        {b2bCrmOrgs.length === 0 && (
          <p className="text-xs mt-2 flex items-center gap-2" style={{ color: "var(--warning)" }}>
            <AlertCircle size={14} />
            {t("ui.invoicing_window.create.no_b2b_orgs")}
          </p>
        )}
      </div>

      {/* B2B Billing Info Display */}
      {b2bData && (
        <div
          className="p-4 border-2 rounded space-y-3"
          style={{ background: "var(--win95-bg-light)", borderColor: "var(--win95-border)" }}
        >
          <h4 className="text-xs font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <CreditCard size={14} />
            {t("ui.invoicing_window.create.billing_info")}
          </h4>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                {t("ui.invoicing_window.create.payment_terms")}
              </p>
              <p style={{ color: "var(--neutral-gray)" }}>
                {b2bData.paymentTerms || "net30"}
              </p>
            </div>

            {b2bData.creditLimit && (
              <div>
                <p className="font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.invoicing_window.create.credit_limit")}
                </p>
                <p style={{ color: "var(--neutral-gray)" }}>
                  {formatCurrency(b2bData.creditLimit)}
                </p>
              </div>
            )}

            {b2bData.vatNumber && (
              <div>
                <p className="font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.invoicing_window.create.vat_number")}
                </p>
                <p style={{ color: "var(--neutral-gray)" }}>{b2bData.vatNumber}</p>
              </div>
            )}

            {b2bData.taxExempt && (
              <div>
                <p className="font-semibold mb-1" style={{ color: "var(--success)" }}>
                  {t("ui.invoicing_window.create.tax_exempt")}
                </p>
              </div>
            )}
          </div>

          {/* Credit Limit Validation */}
          {creditValidation && (
            <div
              className={`p-3 border-2 rounded flex items-start gap-2 text-xs ${
                creditValidation.valid ? "" : ""
              }`}
              style={{
                background: "var(--win95-bg)",
                borderColor: creditValidation.valid ? "var(--success)" : "var(--error)",
              }}
            >
              {creditValidation.valid ? (
                <CheckCircle2 size={14} style={{ color: "var(--success)" }} className="mt-0.5" />
              ) : (
                <AlertCircle size={14} style={{ color: "var(--error)" }} className="mt-0.5" />
              )}
              <div>
                <p
                  className="font-semibold mb-1"
                  style={{ color: creditValidation.valid ? "var(--success)" : "var(--error)" }}
                >
                  {creditValidation.message}
                </p>
                {creditValidation.remainingCredit !== undefined && (
                  <p style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.invoicing_window.create.remaining_credit")}: {formatCurrency(creditValidation.remainingCredit)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invoice Date & Payment Terms Override */}
      <div
        className="p-4 border-2 rounded space-y-4"
        style={{ background: "var(--win95-bg-light)", borderColor: "var(--win95-border)" }}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              <Calendar size={14} className="inline mr-2" />
              {t("ui.invoicing_window.create.invoice_date")}
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 rounded"
              style={{
                background: "var(--win95-bg)",
                borderColor: "var(--win95-border)",
                color: "var(--win95-text)",
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              <DollarSign size={14} className="inline mr-2" />
              {t("ui.invoicing_window.create.payment_terms_override")}
            </label>
            <select
              value={paymentTermsOverride}
              onChange={(e) => setPaymentTermsOverride(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 rounded"
              style={{
                background: "var(--win95-bg)",
                borderColor: "var(--win95-border)",
                color: "var(--win95-text)",
              }}
            >
              <option value="">{t("ui.invoicing_window.create.use_default")}</option>
              <option value="due_on_receipt">{t("ui.invoicing_window.create.due_on_receipt")}</option>
              <option value="net15">{t("ui.invoicing_window.create.net15")}</option>
              <option value="net30">{t("ui.invoicing_window.create.net30")}</option>
              <option value="net60">{t("ui.invoicing_window.create.net60")}</option>
              <option value="net90">{t("ui.invoicing_window.create.net90")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div
        className="p-4 border-2 rounded space-y-3"
        style={{ background: "var(--win95-bg-light)", borderColor: "var(--win95-border)" }}
      >
        <h4 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
          {t("ui.invoicing_window.create.line_items")}
        </h4>

        {lineItems.map((item, index) => (
          <div
            key={index}
            className="p-3 border-2 rounded space-y-2"
            style={{ background: "var(--win95-bg)", borderColor: "var(--win95-border)" }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder={t("ui.invoicing_window.create.description_placeholder")}
                  value={item.description}
                  onChange={(e) => updateLineItem(index, "description", e.target.value)}
                  className="col-span-2 px-2 py-1 text-xs border rounded"
                  style={{
                    background: "var(--win95-bg-light)",
                    borderColor: "var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                />
                <input
                  type="number"
                  placeholder={t("ui.invoicing_window.create.quantity_placeholder")}
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 0)}
                  min="1"
                  className="px-2 py-1 text-xs border rounded"
                  style={{
                    background: "var(--win95-bg-light)",
                    borderColor: "var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                />
                <input
                  type="number"
                  placeholder={t("ui.invoicing_window.create.price_placeholder")}
                  value={(item.unitPriceInCents / 100).toFixed(2)}
                  onChange={(e) =>
                    updateLineItem(index, "unitPriceInCents", Math.round(parseFloat(e.target.value || "0") * 100))
                  }
                  step="0.01"
                  min="0"
                  className="px-2 py-1 text-xs border rounded"
                  style={{
                    background: "var(--win95-bg-light)",
                    borderColor: "var(--win95-border)",
                    color: "var(--win95-text)",
                  }}
                />
              </div>

              <div className="flex flex-col items-end gap-1">
                <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                  {formatCurrency(item.totalPriceInCents)}
                </p>
                <button
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length === 1}
                  className="p-1 rounded hover:bg-opacity-80 transition-colors"
                  style={{
                    color: lineItems.length === 1 ? "var(--neutral-gray)" : "var(--error)",
                  }}
                  title={t("ui.invoicing_window.create.remove_item")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addLineItem}
          className="w-full px-3 py-2 text-xs font-semibold border-2 rounded flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
          style={{
            background: "var(--win95-bg)",
            borderColor: "var(--win95-border)",
            color: "var(--win95-highlight)",
          }}
        >
          <Plus size={14} />
          {t("ui.invoicing_window.create.add_item")}
        </button>
      </div>

      {/* Invoice Totals */}
      <div
        className="p-4 border-2 rounded space-y-2"
        style={{ background: "var(--win95-bg-light)", borderColor: "var(--win95-border)" }}
      >
        <h4 className="text-xs font-bold mb-3" style={{ color: "var(--win95-text)" }}>
          {t("ui.invoicing_window.create.totals")}
        </h4>

        <div className="flex justify-between text-sm">
          <span style={{ color: "var(--neutral-gray)" }}>{t("ui.invoicing_window.create.subtotal")}</span>
          <span style={{ color: "var(--win95-text)" }} className="font-semibold">
            {formatCurrency(totals.subtotalInCents)}
          </span>
        </div>

        {totals.taxInCents > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--neutral-gray)" }}>
              {t("ui.invoicing_window.create.tax")} ({(totals.taxRate * 100).toFixed(0)}%)
            </span>
            <span style={{ color: "var(--win95-text)" }} className="font-semibold">
              {formatCurrency(totals.taxInCents)}
            </span>
          </div>
        )}

        <div
          className="flex justify-between text-base pt-2 border-t-2"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <span className="font-bold" style={{ color: "var(--win95-text)" }}>
            {t("ui.invoicing_window.create.total")}
          </span>
          <span className="font-bold" style={{ color: "var(--win95-text)" }}>
            {formatCurrency(totals.totalInCents)}
          </span>
        </div>
      </div>

      {/* Notes */}
      <div
        className="p-4 border-2 rounded"
        style={{ background: "var(--win95-bg-light)", borderColor: "var(--win95-border)" }}
      >
        <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          {t("ui.invoicing_window.create.notes")}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t("ui.invoicing_window.create.notes_placeholder")}
          className="w-full px-3 py-2 text-sm border-2 rounded"
          style={{
            background: "var(--win95-bg)",
            borderColor: "var(--win95-border)",
            color: "var(--win95-text)",
          }}
        />
      </div>

      {/* Create Button */}
      <button
        onClick={handleCreateInvoice}
        disabled={!selectedCrmOrgId || lineItems.every((item) => !item.description.trim())}
        className="w-full px-4 py-3 text-sm font-bold rounded flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "var(--win95-highlight)",
          color: "var(--win95-titlebar-text)",
          border: "2px solid var(--win95-border)",
        }}
      >
        <FileText size={16} />
        {t("ui.invoicing_window.create.create_invoice")}
      </button>
    </div>
  );
}
