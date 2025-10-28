"use client";

import { useState } from "react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { FileText, Settings, GitMerge, CreditCard, Palette, X, Download, Mail } from "lucide-react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { type Id, type Doc } from "../../../../convex/_generated/dataModel";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { TemplatesTab } from "./templates-tab";

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
 * - All Invoices: List of all invoices (B2B consolidated, B2B single, B2C single)
 * - Consolidation: Wizard to create consolidated B2B invoices from tickets
 * - Rules: Manage automated consolidation rules
 * - Templates: View and preview invoice PDF templates
 * - Settings: Invoice numbering, email templates, defaults
 */

type TabType = "invoices" | "consolidation" | "rules" | "templates" | "settings";

export function InvoicingWindow() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [activeTab, setActiveTab] = useState<TabType>("invoices");
  const [selectedInvoice, setSelectedInvoice] = useState<Doc<"objects"> | null>(null);

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

  if (guard) return guard;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <CreditCard size={16} />
          B2B/B2C Invoicing
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          Comprehensive invoice management with B2B consolidation
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
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
          All Invoices
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2 opacity-50 cursor-not-allowed"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)',
            color: 'var(--neutral-gray)'
          }}
          disabled
          title="Coming soon"
        >
          <GitMerge size={14} />
          Consolidation
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2 opacity-50 cursor-not-allowed"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)',
            color: 'var(--neutral-gray)'
          }}
          disabled
          title="Coming soon"
        >
          <Settings size={14} />
          Rules
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "templates" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "templates" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("templates")}
        >
          <Palette size={14} />
          Templates
        </button>
        <button
          className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 opacity-50 cursor-not-allowed"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)',
            color: 'var(--neutral-gray)'
          }}
          disabled
          title="Coming soon"
        >
          <Settings size={14} />
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "invoices" && (
          <div className="p-4 space-y-4">
            {/* Invoices List */}
            {invoices && invoices.length > 0 ? (
              <div className="space-y-2">
                {invoices.map((invoice: Doc<"objects">) => (
                  <div
                    key={invoice._id}
                    className="p-3 border-2 rounded hover:shadow-sm transition-shadow"
                    style={{
                      background: "var(--win95-bg-light)",
                      borderColor: "var(--win95-border)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-xs font-bold mb-1 truncate"
                          style={{ color: "var(--win95-text)" }}
                        >
                          {invoice.name}
                        </h3>
                        <p
                          className="text-xs mb-2 truncate"
                          style={{ color: "var(--neutral-gray)" }}
                        >
                          {invoice.customProperties?.billTo?.name || "Unknown"}
                        </p>
                        <div className="flex gap-3 text-xs flex-wrap">
                          <span style={{ color: "var(--neutral-gray)" }}>
                            Status:{" "}
                            <span className="font-semibold">
                              {invoice.status || "draft"}
                            </span>
                          </span>
                          <span style={{ color: "var(--neutral-gray)" }}>
                            Total:{" "}
                            <span className="font-semibold">
                              €
                              {(
                                (invoice.customProperties?.totalInCents || 0) /
                                100
                              ).toFixed(2)}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          className="px-3 py-1 text-xs rounded hover:opacity-90 transition-opacity"
                          style={{
                            background: "var(--win95-bg)",
                            color: "var(--win95-text)",
                            border: "2px solid var(--win95-border)",
                          }}
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: "var(--neutral-gray)" }}>
                <div className="text-4xl mb-4">📄</div>
                <h3 className="text-sm font-semibold mb-2">No Invoices Yet</h3>
                <p className="text-xs">
                  Create your first invoice to get started.
                </p>
                <button
                  className="mt-4 px-4 py-2 text-xs rounded hover:opacity-90 transition-opacity"
                  style={{
                    background: "var(--win95-bg-light)",
                    color: "var(--win95-text)",
                    border: "2px solid var(--win95-border)",
                  }}
                  disabled
                  title="Coming soon"
                >
                  + Create Invoice
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "consolidation" && (
          <div className="p-4 text-xs text-gray-500">
            B2B Invoice Consolidation coming soon...
          </div>
        )}
        {activeTab === "rules" && (
          <div className="p-4 text-xs text-gray-500">
            Consolidation Rules coming soon...
          </div>
        )}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "settings" && (
          <div className="p-4 text-xs text-gray-500">
            Settings coming soon...
          </div>
        )}
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
            ? `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`
            : "Loading..."}
        </span>
        <span>{currentOrg?.name || ""}</span>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
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
}

function InvoiceDetailModal({ invoice, onClose }: InvoiceDetailModalProps) {
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

  const handleDownloadPDF = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    } else {
      alert("PDF not yet generated for this invoice");
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
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Invoice Header Info */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold mb-1" style={{ color: "var(--win95-text)" }}>Invoice Number</p>
              <p style={{ color: "var(--neutral-gray)" }}>{invoiceNumber}</p>
            </div>
            <div>
              <p className="font-bold mb-1" style={{ color: "var(--win95-text)" }}>Status</p>
              <p style={{ color: "var(--neutral-gray)" }}>{invoice.status || "draft"}</p>
            </div>
            <div>
              <p className="font-bold mb-1" style={{ color: "var(--win95-text)" }}>Invoice Date</p>
              <p style={{ color: "var(--neutral-gray)" }}>
                {invoiceDate ? new Date(invoiceDate).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div>
              <p className="font-bold mb-1" style={{ color: "var(--win95-text)" }}>Due Date</p>
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
            <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>Bill To</p>
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
            <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>Items</p>
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
              <span style={{ color: "var(--neutral-gray)" }}>Subtotal:</span>
              <span style={{ color: "var(--win95-text)" }}>
                {currency} {(subtotal / 100).toFixed(2)}
              </span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between">
                <span style={{ color: "var(--neutral-gray)" }}>Tax:</span>
                <span style={{ color: "var(--win95-text)" }}>
                  {currency} {(tax / 100).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t" style={{ borderColor: "var(--win95-border)" }}>
              <span style={{ color: "var(--win95-text)" }}>Total:</span>
              <span style={{ color: "var(--win95-text)" }}>
                {currency} {(total / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer - Actions */}
        <div
          className="px-4 py-3 border-t-2 flex items-center justify-end gap-2"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <button
            className="px-4 py-2 text-xs rounded hover:opacity-90 transition-opacity flex items-center gap-2"
            style={{
              background: "var(--win95-bg-light)",
              color: "var(--win95-text)",
              border: "2px solid var(--win95-border)",
            }}
            onClick={handleDownloadPDF}
            disabled={!pdfUrl}
            title={pdfUrl ? "Download PDF" : "PDF not yet generated"}
          >
            <Download size={14} />
            Download PDF
          </button>
          <button
            className="px-4 py-2 text-xs rounded hover:opacity-90 transition-opacity flex items-center gap-2 opacity-50 cursor-not-allowed"
            style={{
              background: "var(--win95-bg-light)",
              color: "var(--win95-text)",
              border: "2px solid var(--win95-border)",
            }}
            disabled
            title="Coming soon"
          >
            <Mail size={14} />
            Send Email
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
