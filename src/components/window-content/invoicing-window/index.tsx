"use client";

import React, { useState } from "react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { FileText, CreditCard, Palette, X, Download, Mail, Edit, Lock, Calendar, User, History, Plus } from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { type Id, type Doc } from "../../../../convex/_generated/dataModel";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { TemplatesTab } from "./templates-tab";
import { TransactionsSection } from "../payments-window/transactions-section";
import { CreateInvoiceTab } from "./create-invoice-tab";

/**
 * Invoicing Window
 *
 * Comprehensive B2B/B2C invoicing management:
 * - List all invoices (with filters)
 * - Create consolidated B2B invoices from tickets
 * - Manage invoice rules and automation
 * - PDF generation and email delivery
 * - Template management for invoice PDFs
 *
 * Tabs:
 * - Create: Create new B2B invoices from CRM organizations
 * - All Invoices: List of all invoices (B2B consolidated, B2B single, B2C single)
 * - Transactions: Payment transaction history
 * - Templates: View and preview invoice PDF templates
 */

type TabType = "create" | "invoices" | "transactions" | "templates";
type InvoiceSubTab = "draft" | "sealed";

export function InvoicingWindow() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [activeTab, setActiveTab] = useState<TabType>("create");
  const [invoiceSubTab, setInvoiceSubTab] = useState<InvoiceSubTab>("draft");
  const [selectedInvoice, setSelectedInvoice] = useState<Doc<"objects"> | null>(null);
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.invoicing_window");

  // Check app availability - returns guard component if unavailable/loading, null if available
  const guard = useAppAvailabilityGuard({
    code: "app_invoicing",
    name: "B2B/B2C Invoicing",
    description: "Comprehensive invoicing system with B2B consolidation, payment tracking, and automated billing workflows"
  });

  // Fetch invoices for current organization
  const invoices = useQuery(
    api.invoicingOntology.listInvoices,
    sessionId && currentOrg
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  );

  // Separate draft and sealed invoices
  const draftInvoices = invoices?.filter(inv => inv.customProperties?.isDraft === true) || [];
  const sealedInvoices = invoices?.filter(inv => inv.customProperties?.isDraft !== true) || []; // Catches false and undefined

  // Format helpers
  const formatCurrency = (cents: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(timestamp));
  };

  if (guard) return guard;

  if (translationsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p style={{ color: "var(--win95-text)" }}>{t("ui.invoicing_window.footer.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <CreditCard size={16} />
          {t("ui.invoicing_window.header.title")}
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          {t("ui.invoicing_window.header.description")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "create" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "create" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("create")}
        >
          <Plus size={14} />
          {t("ui.invoicing_window.tabs.create")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "invoices" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "invoices" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("invoices")}
        >
          <FileText size={14} />
          {t("ui.invoicing_window.tabs.invoices")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "transactions" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "transactions" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("transactions")}
        >
          <History size={14} />
          {t("ui.invoicing_window.tabs.transactions")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "templates" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "templates" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("templates")}
        >
          <Palette size={14} />
          {t("ui.invoicing_window.tabs.templates")}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "create" && <CreateInvoiceTab />}

        {activeTab === "invoices" && (
          <div className="flex flex-col h-full">
            {/* Sub-tabs for Draft/Sealed */}
            <div className="flex border-b-2 px-4 pt-4" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
              <button
                onClick={() => setInvoiceSubTab("draft")}
                className={`px-4 py-2 text-xs font-semibold border-2 border-b-0 transition-colors flex items-center gap-2 ${
                  invoiceSubTab === "draft" ? "-mb-0.5" : ""
                }`}
                style={{
                  backgroundColor: invoiceSubTab === "draft" ? "var(--win95-bg-light)" : "var(--win95-bg)",
                  color: invoiceSubTab === "draft" ? "var(--win95-highlight)" : "var(--neutral-gray)",
                  borderColor: invoiceSubTab === "draft" ? "var(--win95-border)" : "transparent",
                }}
              >
                <Edit size={12} />
                {t("ui.invoicing_window.subtabs.draft")} ({draftInvoices.length})
              </button>
              <button
                onClick={() => setInvoiceSubTab("sealed")}
                className={`px-4 py-2 text-xs font-semibold border-2 border-b-0 transition-colors flex items-center gap-2 ${
                  invoiceSubTab === "sealed" ? "-mb-0.5" : ""
                }`}
                style={{
                  backgroundColor: invoiceSubTab === "sealed" ? "var(--win95-bg-light)" : "var(--win95-bg)",
                  color: invoiceSubTab === "sealed" ? "var(--win95-highlight)" : "var(--neutral-gray)",
                  borderColor: invoiceSubTab === "sealed" ? "var(--win95-border)" : "transparent",
                }}
              >
                <Lock size={12} />
                {t("ui.invoicing_window.subtabs.sealed")} ({sealedInvoices.length})
              </button>
            </div>

            {/* Invoice Lists */}
            <div className="flex-1 overflow-y-auto p-4">
              {invoiceSubTab === "draft" && (
                <div>
                  {draftInvoices.length === 0 ? (
                    <div className="text-center py-12" style={{ color: "var(--neutral-gray)" }}>
                      <div className="text-4xl mb-4">📝</div>
                      <h3 className="text-sm font-semibold mb-2">{t("ui.invoicing_window.empty.draft.title")}</h3>
                      <p className="text-xs">
                        {t("ui.invoicing_window.empty.draft.description")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {draftInvoices.map((invoice: Doc<"objects">) => {
                        const billToName = invoice.customProperties?.billTo?.name as string;
                        const totalInCents = invoice.customProperties?.totalInCents as number;
                        const invoiceDate = invoice.customProperties?.invoiceDate as number;
                        const lineItems = (invoice.customProperties?.lineItems as unknown[]) || [];
                        const currency = (invoice.customProperties?.currency as string) || "EUR";

                        return (
                          <div
                            key={invoice._id}
                            className="p-3 border-2 rounded hover:shadow-sm transition-shadow cursor-pointer"
                            style={{
                              background: "var(--win95-bg-light)",
                              borderColor: "var(--win95-border)",
                            }}
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-xs font-bold truncate" style={{ color: "var(--win95-text)" }}>
                                    {invoice.name}
                                  </h3>
                                  <span
                                    className="px-2 py-0.5 text-[10px] font-bold rounded border"
                                    style={{
                                      backgroundColor: "var(--win95-bg)",
                                      color: "#f59e0b",
                                      borderColor: "#f59e0b",
                                    }}
                                  >
                                    {t("ui.invoicing_window.status.draft")}
                                  </span>
                                </div>
                                <p className="text-xs mb-2 truncate" style={{ color: "var(--neutral-gray)" }}>
                                  <User size={10} className="inline mr-1" />
                                  {billToName || "Unknown"}
                                </p>
                                <div className="flex gap-3 text-xs flex-wrap">
                                  <span style={{ color: "var(--neutral-gray)" }}>
                                    <Calendar size={10} className="inline mr-1" />
                                    {formatDate(invoiceDate)}
                                  </span>
                                  <span style={{ color: "var(--neutral-gray)" }}>
                                    {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
                                  </span>
                                  <span className="font-semibold" style={{ color: "var(--win95-text)" }}>
                                    {formatCurrency(totalInCents, currency)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {invoiceSubTab === "sealed" && (
                <div>
                  {sealedInvoices.length === 0 ? (
                    <div className="text-center py-12" style={{ color: "var(--neutral-gray)" }}>
                      <div className="text-4xl mb-4">🔒</div>
                      <h3 className="text-sm font-semibold mb-2">{t("ui.invoicing_window.empty.sealed.title")}</h3>
                      <p className="text-xs">
                        {t("ui.invoicing_window.empty.sealed.description")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sealedInvoices.map((invoice: Doc<"objects">) => {
                        const billToName = invoice.customProperties?.billTo?.name as string;
                        const totalInCents = invoice.customProperties?.totalInCents as number;
                        const invoiceDate = invoice.customProperties?.invoiceDate as number;
                        const lineItems = (invoice.customProperties?.lineItems as unknown[]) || [];
                        const currency = (invoice.customProperties?.currency as string) || "EUR";
                        const paymentStatus = invoice.status as string;

                        const statusColors = {
                          paid: { bg: "var(--win95-bg)", text: "var(--success)", border: "var(--success)" },
                          sent: { bg: "var(--win95-bg)", text: "var(--win95-highlight)", border: "var(--win95-highlight)" },
                          overdue: { bg: "var(--win95-bg)", text: "var(--error)", border: "var(--error)" },
                          awaiting_employer_payment: { bg: "var(--win95-bg)", text: "#f59e0b", border: "#f59e0b" },
                        }[paymentStatus] || { bg: "var(--win95-bg)", text: "var(--neutral-gray)", border: "var(--win95-border)" };

                        return (
                          <div
                            key={invoice._id}
                            className="p-3 border-2 rounded hover:shadow-sm transition-shadow cursor-pointer"
                            style={{
                              background: "var(--win95-bg-light)",
                              borderColor: "var(--win95-border)",
                            }}
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-xs font-bold truncate" style={{ color: "var(--win95-text)" }}>
                                    {invoice.name}
                                  </h3>
                                  <span
                                    className="px-2 py-0.5 text-[10px] font-bold rounded border"
                                    style={{
                                      backgroundColor: statusColors.bg,
                                      color: statusColors.text,
                                      borderColor: statusColors.border,
                                    }}
                                  >
                                    {paymentStatus}
                                  </span>
                                </div>
                                <p className="text-xs mb-2 truncate" style={{ color: "var(--neutral-gray)" }}>
                                  <User size={10} className="inline mr-1" />
                                  {billToName || "Unknown"}
                                </p>
                                <div className="flex gap-3 text-xs flex-wrap">
                                  <span style={{ color: "var(--neutral-gray)" }}>
                                    <Calendar size={10} className="inline mr-1" />
                                    {formatDate(invoiceDate)}
                                  </span>
                                  <span style={{ color: "var(--neutral-gray)" }}>
                                    {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
                                  </span>
                                  <span className="font-semibold" style={{ color: "var(--win95-text)" }}>
                                    {formatCurrency(totalInCents, currency)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "transactions" && currentOrg?.id && (
          <div className="p-4">
            <TransactionsSection organizationId={currentOrg.id as Id<"organizations">} />
          </div>
        )}

        {activeTab === "templates" && <TemplatesTab />}
      </div>

      {/* Footer - Status Bar */}
      <div
        className="px-4 py-1 border-t-2 text-xs flex items-center justify-between"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
          color: "var(--neutral-gray)",
        }}
      >
        <span>
          {invoices !== undefined
            ? t("ui.invoicing_window.footer.invoice_count", {
                count: invoices.length,
                plural: invoices.length !== 1 ? "s" : ""
              })
            : t("ui.invoicing_window.footer.loading")}
        </span>
        <span>{currentOrg?.name || ""}</span>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          t={t}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}

/**
 * Invoice Detail Modal
 * Shows detailed view of an invoice with download/email actions
 */
interface InvoiceDetailModalProps {
  invoice: Doc<"objects">;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (cents: number, currency?: string) => string;
}

function InvoiceDetailModal({ invoice, onClose, t, formatCurrency }: InvoiceDetailModalProps) {
  const { sessionId } = useAuth();
  const sealInvoiceMutation = useMutation(api.invoicingOntology.sealInvoice);
  const generatePDFAction = useAction(api.pdfGeneration.generateInvoicePDF);
  const [isSealing, setIsSealing] = React.useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);

  const props = invoice.customProperties || {};
  const billTo = props.billTo as { name?: string; billingEmail?: string; vatNumber?: string; billingAddress?: { city?: string; country?: string } } | undefined;
  const lineItems = (props.lineItems as Array<{ description?: string; totalPriceInCents?: number }>) || [];
  const subtotal = (props.subtotalInCents as number) || 0;
  const tax = (props.taxInCents as number) || 0;
  const total = (props.totalInCents as number) || 0;
  const currency = (props.currency as string) || "EUR";
  const invoiceNumber = props.invoiceNumber as string;
  const invoiceDate = props.invoiceDate as number;
  const dueDate = props.dueDate as number;
  const pdfUrl = props.pdfUrl as string | undefined;
  const isDraft = props.isDraft === true;
  const checkoutSessionId = props.checkoutSessionId as Id<"objects"> | undefined;

  const handleDownloadPDF = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    } else {
      alert(t("ui.invoicing_window.alerts.no_pdf"));
    }
  };

  const handleGeneratePDF = async () => {
    if (!checkoutSessionId) return;

    setIsGeneratingPDF(true);
    try {
      const pdfAttachment = await generatePDFAction({
        checkoutSessionId,
      });

      if (pdfAttachment && pdfAttachment.content) {
        alert("PDF generated successfully!");
        // Convert base64 to blob and open in new tab
        const byteCharacters = atob(pdfAttachment.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        // Close modal to refresh the list
        onClose();
      } else {
        alert("Failed to generate PDF");
      }
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSealInvoice = async () => {
    if (!sessionId) return;

    const confirmed = window.confirm(
      `${t("ui.invoicing_window.confirm.seal_title")}\n\n${t("ui.invoicing_window.confirm.seal_message")}`
    );

    if (!confirmed) return;

    setIsSealing(true);
    try {
      const result = await sealInvoiceMutation({
        sessionId,
        invoiceId: invoice._id,
      });

      alert(t("ui.invoicing_window.success.sealed", { invoiceNumber: result.invoiceNumber }));
      onClose(); // Close modal to refresh the list
    } catch (error) {
      console.error("Failed to seal invoice:", error);
      alert(`Failed to seal invoice: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSealing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="border-2 rounded shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{
          background: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="px-4 py-3 border-b-2 flex items-center justify-between"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <FileText size={16} />
            {invoice.name}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{
              background: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--win95-border)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Invoice Header Info */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold mb-1" style={{ color: "var(--win95-text)" }}>{t("ui.invoicing_window.modal.invoice_number")}</p>
              <p style={{ color: "var(--neutral-gray)" }}>{invoiceNumber}</p>
            </div>
            <div>
              <p className="font-bold mb-1" style={{ color: "var(--win95-text)" }}>{t("ui.invoicing_window.modal.status")}</p>
              <p style={{ color: "var(--neutral-gray)" }}>{invoice.status || "draft"}</p>
            </div>
            <div>
              <p className="font-bold mb-1" style={{ color: "var(--win95-text)" }}>{t("ui.invoicing_window.modal.invoice_date")}</p>
              <p style={{ color: "var(--neutral-gray)" }}>
                {invoiceDate ? new Date(invoiceDate).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div>
              <p className="font-bold mb-1" style={{ color: "var(--win95-text)" }}>{t("ui.invoicing_window.modal.due_date")}</p>
              <p style={{ color: "var(--neutral-gray)" }}>
                {dueDate ? new Date(dueDate).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>

          {/* Bill To */}
          <div
            className="p-3 border-2 rounded"
            style={{ background: "var(--win95-bg-light)", borderColor: "var(--win95-border)" }}
          >
            <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>{t("ui.invoicing_window.modal.bill_to")}</p>
            <div className="text-xs space-y-1" style={{ color: "var(--neutral-gray)" }}>
              <p className="font-semibold">{billTo?.name || "Unknown"}</p>
              {billTo?.vatNumber && <p>VAT: {billTo.vatNumber}</p>}
              {billTo?.billingEmail && <p>{billTo.billingEmail}</p>}
              {billTo?.billingAddress && (
                <p>
                  {billTo.billingAddress.city}, {billTo.billingAddress.country}
                </p>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>{t("ui.invoicing_window.modal.items")}</p>
            <div className="space-y-2">
              {lineItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-xs p-2 border rounded"
                  style={{ borderColor: "var(--win95-border)" }}
                >
                  <span style={{ color: "var(--neutral-gray)" }}>{item.description}</span>
                  <span style={{ color: "var(--win95-text)" }} className="font-semibold">
                    {currency} {((item.totalPriceInCents || 0) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1 text-xs pt-2 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
            <div className="flex justify-between">
              <span style={{ color: "var(--neutral-gray)" }}>{t("ui.invoicing_window.modal.subtotal")}</span>
              <span style={{ color: "var(--win95-text)" }}>
                {currency} {(subtotal / 100).toFixed(2)}
              </span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between">
                <span style={{ color: "var(--neutral-gray)" }}>{t("ui.invoicing_window.modal.tax")}</span>
                <span style={{ color: "var(--win95-text)" }}>
                  {currency} {(tax / 100).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t" style={{ borderColor: "var(--win95-border)" }}>
              <span style={{ color: "var(--win95-text)" }}>{t("ui.invoicing_window.modal.total")}</span>
              <span style={{ color: "var(--win95-text)" }}>
                {currency} {(total / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer - Actions */}
        <div
          className="px-4 py-3 border-t-2 flex items-center justify-between gap-2"
          style={{ borderColor: "var(--win95-border)" }}
        >
          {/* Left side - Seal button (draft only) */}
          <div>
            {isDraft && (
              <button
                className="px-4 py-2 text-xs font-bold rounded hover:opacity-90 transition-opacity flex items-center gap-2"
                style={{
                  background: "var(--win95-highlight)",
                  color: "var(--win95-titlebar-text)",
                  border: "2px solid var(--win95-border)",
                }}
                onClick={handleSealInvoice}
                disabled={isSealing}
              >
                <Lock size={14} />
                {isSealing ? t("ui.invoicing_window.buttons.sealing") : t("ui.invoicing_window.buttons.seal")}
              </button>
            )}
          </div>

          {/* Right side - Download, Email, Close */}
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 text-xs rounded hover:opacity-90 transition-opacity flex items-center gap-2"
              style={{
                background: "var(--win95-bg-light)",
                color: "var(--win95-text)",
                border: "2px solid var(--win95-border)",
              }}
              onClick={handleDownloadPDF}
              disabled={!pdfUrl || isDraft}
              title={isDraft ? t("ui.invoicing_window.alerts.seal_first") : pdfUrl ? t("ui.invoicing_window.buttons.download_pdf") : t("ui.invoicing_window.alerts.no_pdf")}
            >
              <Download size={14} />
              {t("ui.invoicing_window.buttons.download_pdf")}
            </button>
            <button
              className="px-4 py-2 text-xs rounded hover:opacity-90 transition-opacity flex items-center gap-2 opacity-50 cursor-not-allowed"
              style={{
                background: "var(--win95-bg-light)",
                color: "var(--win95-text)",
                border: "2px solid var(--win95-border)",
              }}
              disabled
              title={t("ui.invoicing_window.alerts.coming_soon")}
            >
              <Mail size={14} />
              {t("ui.invoicing_window.buttons.send_email")}
            </button>
            <button
              className="px-4 py-2 text-xs rounded hover:opacity-90 transition-opacity"
              style={{
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
                border: "2px solid var(--win95-border)",
              }}
              onClick={onClose}
            >
              {t("ui.invoicing_window.buttons.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
