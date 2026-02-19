"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useOrganizationCurrency } from "@/hooks/use-organization-currency";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { Id } from "../../../../convex/_generated/dataModel";
import { TransactionDetailModal } from "./transaction-detail-modal";
import {
  Search,
  Filter,
  Download,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  Receipt,
} from "lucide-react";

interface TransactionsSectionProps {
  organizationId: Id<"organizations">;
}

type TransactionStatus = "all" | "paid" | "pending" | "failed" | "awaiting_employer_payment";
type InvoicingStatus = "all" | "pending" | "on_draft_invoice" | "invoiced";
type SortField = "date" | "amount" | "customer";
type SortDirection = "asc" | "desc";

export function TransactionsSection({ organizationId }: TransactionsSectionProps) {
  const { sessionId } = useAuth();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.payments");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus>("all");
  const [invoicingStatusFilter, setInvoicingStatusFilter] = useState<InvoicingStatus>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedTransaction, setSelectedTransaction] = useState<Id<"objects"> | null>(null);

  // Date range filter (last 30 days by default)
  const [dateRange, setDateRange] = useState<"all" | "7d" | "30d" | "90d" | "custom">("30d");
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");

  // Memoize date range calculation to prevent infinite re-renders
  const dateRangeParams = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    if (dateRange === "custom" && customDateFrom && customDateTo) {
      return {
        dateFrom: new Date(customDateFrom).getTime(),
        dateTo: new Date(customDateTo).getTime() + day - 1, // End of day
      };
    }

    switch (dateRange) {
      case "7d":
        return { dateFrom: now - 7 * day, dateTo: now };
      case "30d":
        return { dateFrom: now - 30 * day, dateTo: now };
      case "90d":
        return { dateFrom: now - 90 * day, dateTo: now };
      default:
        return {};
    }
  }, [dateRange, customDateFrom, customDateTo]);

  // Get transactions from transactionOntology (NEW: using actual transaction objects)
  const transactionsData = useQuery(
    api.transactionOntology.listTransactions,
    organizationId && sessionId
      ? {
          sessionId,
          organizationId,
          paymentStatus: statusFilter === "all" ? undefined : statusFilter,
          ...dateRangeParams,
        }
      : "skip"
  );

  // Get transaction stats (NEW: using actual transaction objects)
  const stats = useQuery(
    api.transactionOntology.getTransactionStatsNew,
    organizationId && sessionId
      ? {
          sessionId,
          organizationId,
          ...dateRangeParams,
        }
      : "skip"
  );

  const transactions = transactionsData?.transactions;

  // Get organization currency settings (SINGLE SOURCE OF TRUTH)
  const { currency: orgCurrency } = useOrganizationCurrency();

  // Currency formatting hook (uses organization's currency)
  const { formatCurrency } = useFormatCurrency({
    currency: orgCurrency,
  });

  // Show loading state while translations load
  if (translationsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
            Loading translations...
          </p>
        </div>
      </div>
    );
  }

  // Show loading state if no session yet
  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.payments.transactions.loading_session")}
          </p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 style={{ color: "var(--success)" }} size={16} />;
      case "pending":
      case "awaiting_employer_payment":
        return <Clock style={{ color: "var(--warning)" }} size={16} />;
      case "failed":
      case "cancelled":
        return <XCircle style={{ color: "var(--error)" }} size={16} />;
      default:
        return <DollarSign style={{ color: "var(--neutral-gray)" }} size={16} />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "paid":
        return { bg: "var(--success-light)", text: "var(--success)" };
      case "pending":
      case "awaiting_employer_payment":
        return { bg: "var(--warning-light)", text: "var(--warning)" };
      case "failed":
      case "cancelled":
        return { bg: "var(--error-light)", text: "var(--error)" };
      default:
        return { bg: "var(--neutral-light)", text: "var(--neutral-gray)" };
    }
  };

  const getInvoicingStatusBadgeColor = (status: string) => {
    switch (status) {
      case "invoiced":
        return { bg: "var(--success-light)", text: "var(--success)" };
      case "on_draft_invoice":
        return { bg: "var(--info-light)", text: "var(--primary)" };
      case "pending":
        return { bg: "var(--neutral-light)", text: "var(--neutral-gray)" };
      default:
        return { bg: "var(--neutral-light)", text: "var(--neutral-gray)" };
    }
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  };

  // Helper: Calculate total from lineItems (NEW format) or use direct field (LEGACY)
  const getTransactionTotal = (tx: { customProperties?: Record<string, unknown> }): number => {
    const lineItems = tx.customProperties?.lineItems;

    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      // NEW format: sum all lineItems
      return (lineItems as Array<{ totalPriceInCents: number }>)
        .reduce((sum, item) => sum + item.totalPriceInCents, 0);
    }

    // LEGACY format: direct field
    return (tx.customProperties?.totalPriceInCents as number) || 0;
  };

  // Helper: Get display name for transaction (product name or "Multiple items")
  const getTransactionDisplayName = (tx: { customProperties?: Record<string, unknown> }): string => {
    const lineItems = tx.customProperties?.lineItems;

    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      // NEW format: show "X items" or single product name
      if (lineItems.length === 1) {
        return (lineItems[0] as { productName: string }).productName || "Unknown Product";
      }
      return `${lineItems.length} items`;
    }

    // LEGACY format: single product name
    return (tx.customProperties?.productName as string) || "Unknown Product";
  };

  // Client-side search and invoicing status filter
  const filteredTransactions = transactions
    ?.filter((tx) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const email = ((tx.customProperties?.customerEmail as string) || "").toLowerCase();
        const name = ((tx.customProperties?.customerName as string) || "").toLowerCase();

        // Check LEGACY format productName
        const legacyProductName = ((tx.customProperties?.productName as string) || "").toLowerCase();

        // Check NEW format lineItems
        const lineItems = tx.customProperties?.lineItems;
        let lineItemsMatch = false;
        if (lineItems && Array.isArray(lineItems)) {
          lineItemsMatch = (lineItems as Array<{ productName?: string }>).some(
            item => (item.productName || "").toLowerCase().includes(query)
          );
        }

        return email.includes(query) || name.includes(query) || legacyProductName.includes(query) || lineItemsMatch;
      }
      return true;
    })
    .filter((tx) => {
      // Invoicing status filter
      if (invoicingStatusFilter !== "all") {
        const txInvoicingStatus = tx.customProperties?.invoicingStatus as string;
        return txInvoicingStatus === invoicingStatusFilter;
      }
      return true;
    })
    .sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      switch (sortField) {
        case "date":
          aValue = a._creationTime;
          bValue = b._creationTime;
          break;
        case "amount":
          // Use helper to calculate totals for both NEW and LEGACY formats
          aValue = getTransactionTotal(a);
          bValue = getTransactionTotal(b);
          break;
        case "customer":
          aValue = (a.customProperties?.customerName as string) || "";
          bValue = (b.customProperties?.customerName as string) || "";
          break;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-4">
      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--neutral-gray)" }}
            />
            <input
              type="text"
              placeholder={t("ui.payments.transactions.search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
                color: "var(--window-document-text)",
              }}
            />
          </div>
        </div>

        {/* Payment Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TransactionStatus)}
            className="px-4 py-2 text-sm border-2 cursor-pointer"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg-elevated)",
              color: "var(--window-document-text)",
            }}
          >
            <option value="all">{t("ui.payments.transactions.filter_all_payment")}</option>
            <option value="paid">{t("ui.payments.transactions.status_paid")}</option>
            <option value="pending">{t("ui.payments.transactions.status_pending")}</option>
            <option value="awaiting_employer_payment">{t("ui.payments.transactions.status_awaiting")}</option>
            <option value="failed">{t("ui.payments.transactions.status_failed")}</option>
          </select>
        </div>

        {/* Invoicing Status Filter */}
        <div>
          <select
            value={invoicingStatusFilter}
            onChange={(e) => setInvoicingStatusFilter(e.target.value as InvoicingStatus)}
            className="px-4 py-2 text-sm border-2 cursor-pointer"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg-elevated)",
              color: "var(--window-document-text)",
            }}
          >
            <option value="all">{t("ui.payments.transactions.filter_all_invoicing")}</option>
            <option value="pending">{t("ui.payments.transactions.invoicing_not_invoiced")}</option>
            <option value="on_draft_invoice">{t("ui.payments.transactions.invoicing_draft")}</option>
            <option value="invoiced">{t("ui.payments.transactions.invoicing_invoiced")}</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="px-4 py-2 text-sm border-2 cursor-pointer"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg-elevated)",
              color: "var(--window-document-text)",
            }}
          >
            <option value="7d">{t("ui.payments.transactions.date_7d")}</option>
            <option value="30d">{t("ui.payments.transactions.date_30d")}</option>
            <option value="90d">{t("ui.payments.transactions.date_90d")}</option>
            <option value="all">{t("ui.payments.transactions.date_all")}</option>
            <option value="custom">{t("ui.payments.transactions.date_custom")}</option>
          </select>
        </div>

        {/* Export Button */}
        <button
          className="beveled-button px-4 py-2 text-sm font-semibold flex items-center gap-2 whitespace-nowrap"
          style={{
            backgroundColor: "var(--window-document-bg-elevated)",
            color: "var(--window-document-text)",
          }}
        >
          <Download size={14} />
          {t("ui.payments.transactions.export")}
        </button>
      </div>

      {/* Custom Date Range Inputs */}
      {dateRange === "custom" && (
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
              {t("ui.payments.transactions.date_from")}:
            </label>
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
                color: "var(--window-document-text)",
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
              {t("ui.payments.transactions.date_to")}:
            </label>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm border-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
                color: "var(--window-document-text)",
              }}
            />
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={20} style={{ color: "var(--success)" }} />
            <span className="text-xs font-bold" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.transactions.stat_revenue")}
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--window-document-text)" }}>
            {formatCurrency(stats?.completedRevenue || 0)} {/* Uses org currency */}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {stats?.completedTransactions || 0} {t("ui.payments.transactions.stat_completed")}
          </p>
        </div>

        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock size={20} style={{ color: "var(--warning)" }} />
            <span className="text-xs font-bold" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.transactions.stat_pending")}
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--window-document-text)" }}>
            {formatCurrency(stats?.pendingRevenue || 0)} {/* Uses org currency */}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {stats?.pendingTransactions || 0} {t("ui.payments.transactions.stat_pending_count")}
          </p>
        </div>

        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={20} style={{ color: "var(--primary)" }} />
            <span className="text-xs font-bold" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.transactions.stat_avg")}
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--window-document-text)" }}>
            {formatCurrency(stats?.averageTransactionValue || 0)} {/* Uses org currency */}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {stats?.b2bTransactions || 0} {t("ui.payments.transactions.stat_b2b")} / {stats?.b2cTransactions || 0} {t("ui.payments.transactions.stat_b2c")}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div
        className="border-2 overflow-hidden"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
      >
        {/* Table Header */}
        <div
          className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-2 border-b-2"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
        >
          <button
            onClick={() => {
              if (sortField === "date") {
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              } else {
                setSortField("date");
                setSortDirection("desc");
              }
            }}
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: "var(--window-document-text)" }}
          >
            <Calendar size={12} />
            {t("ui.payments.transactions.table_date")}
            {sortField === "date" && <ArrowUpDown size={12} />}
          </button>

          <button
            onClick={() => {
              if (sortField === "customer") {
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              } else {
                setSortField("customer");
                setSortDirection("asc");
              }
            }}
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: "var(--window-document-text)" }}
          >
            <User size={12} />
            {t("ui.payments.transactions.table_customer")}
            {sortField === "customer" && <ArrowUpDown size={12} />}
          </button>

          <button
            onClick={() => {
              if (sortField === "amount") {
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              } else {
                setSortField("amount");
                setSortDirection("desc");
              }
            }}
            className="flex items-center gap-1 text-xs font-bold justify-end"
            style={{ color: "var(--window-document-text)" }}
          >
            <DollarSign size={12} />
            {t("ui.payments.transactions.table_amount")}
            {sortField === "amount" && <ArrowUpDown size={12} />}
          </button>

          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
            <Filter size={12} />
            {t("ui.payments.transactions.table_payment")}
          </div>

          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
            <Receipt size={12} />
            {t("ui.payments.transactions.table_invoicing")}
          </div>

          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
            <CreditCard size={12} />
            {t("ui.payments.transactions.table_method")}
          </div>
        </div>

        {/* Table Body */}
        {!filteredTransactions || filteredTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <DollarSign size={48} className="mx-auto mb-4 opacity-50" style={{ color: "var(--neutral-gray)" }} />
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--window-document-text)" }}>
              {t("ui.payments.transactions.empty_title")}
            </p>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {statusFilter !== "all"
                ? t("ui.payments.transactions.empty_filtered", { status: statusFilter })
                : t("ui.payments.transactions.empty_description")}
            </p>
          </div>
        ) : (
          <div className="divide-y-2" style={{ borderColor: "var(--window-document-border)" }}>
            {filteredTransactions.map((tx) => {
              const paymentStatus = (tx.customProperties?.paymentStatus as string) || "pending";
              const invoicingStatus = (tx.customProperties?.invoicingStatus as string) || "pending";
              const paymentColors = getStatusBadgeColor(paymentStatus);
              const invoicingColors = getInvoicingStatusBadgeColor(invoicingStatus);
              const customerName = (tx.customProperties?.customerName as string) || "Unknown";
              const productName = getTransactionDisplayName(tx); // Use helper for NEW/LEGACY
              const totalPriceInCents = getTransactionTotal(tx); // Use helper for NEW/LEGACY
              const txCurrency = (tx.customProperties?.currency as string) || "EUR";
              const paymentMethod = (tx.customProperties?.paymentMethod as string) || "card";
              const payerType = tx.customProperties?.payerType as string;

              return (
                <button
                  key={tx._id}
                  onClick={() => setSelectedTransaction(tx._id === selectedTransaction ? null : tx._id)}
                  className="w-full grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-3 text-left transition-colors"
                  style={{
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--desktop-menu-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Date */}
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {formatDate(tx._creationTime)}
                  </div>

                  {/* Customer & Product */}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                        {customerName}
                      </p>
                      {payerType === "organization" && (
                        <span
                          className="px-1.5 py-0.5 text-[10px] font-bold rounded"
                          style={{
                            backgroundColor: "var(--primary-light)",
                            color: "var(--primary)",
                          }}
                        >
                          {t("ui.payments.transactions.badge_b2b")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {productName}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                      {formatCurrency(totalPriceInCents, txCurrency)}
                    </p>
                  </div>

                  {/* Payment Status */}
                  <div>
                    <div
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded"
                      style={{
                        backgroundColor: paymentColors.bg,
                        color: paymentColors.text,
                      }}
                    >
                      {getStatusIcon(paymentStatus)}
                      {paymentStatus === "awaiting_employer_payment"
                        ? t("ui.payments.transactions.status_awaiting_short")
                        : t(`ui.payments.transactions.status_${paymentStatus}`)}
                    </div>
                  </div>

                  {/* Invoicing Status */}
                  <div>
                    <div
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded"
                      style={{
                        backgroundColor: invoicingColors.bg,
                        color: invoicingColors.text,
                      }}
                    >
                      {invoicingStatus === "on_draft_invoice"
                        ? t("ui.payments.transactions.invoicing_draft_short")
                        : invoicingStatus === "invoiced"
                        ? t("ui.payments.transactions.invoicing_invoiced")
                        : t("ui.payments.transactions.status_pending")}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {paymentMethod}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && sessionId && (
        <TransactionDetailModal
          transactionId={selectedTransaction}
          sessionId={sessionId}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}
