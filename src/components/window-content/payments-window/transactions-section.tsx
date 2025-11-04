"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
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

  // Show loading state if no session yet
  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
            Loading session...
          </p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="text-green-500" size={16} />;
      case "pending":
      case "awaiting_employer_payment":
        return <Clock className="text-yellow-500" size={16} />;
      case "failed":
      case "cancelled":
        return <XCircle className="text-red-500" size={16} />;
      default:
        return <DollarSign className="text-gray-400" size={16} />;
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

  const formatCurrency = (cents: number, currency?: string) => {
    const amount = cents / 100;
    // Use organization currency for stats, or specific currency for transactions
    const displayCurrency = currency || stats?.currency || "EUR";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: displayCurrency.toUpperCase(),
    }).format(amount);
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

  // Client-side search and invoicing status filter
  const filteredTransactions = transactions
    ?.filter((tx) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const email = ((tx.customProperties?.customerEmail as string) || "").toLowerCase();
        const name = ((tx.customProperties?.customerName as string) || "").toLowerCase();
        const productName = ((tx.customProperties?.productName as string) || "").toLowerCase();
        return email.includes(query) || name.includes(query) || productName.includes(query);
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
          aValue = (a.customProperties?.totalPriceInCents as number) || 0;
          bValue = (b.customProperties?.totalPriceInCents as number) || 0;
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
              placeholder="Search by customer name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "white",
                color: "var(--win95-text)",
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
              borderColor: "var(--win95-border)",
              background: "white",
              color: "var(--win95-text)",
            }}
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="awaiting_employer_payment">Awaiting Employer</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Invoicing Status Filter */}
        <div>
          <select
            value={invoicingStatusFilter}
            onChange={(e) => setInvoicingStatusFilter(e.target.value as InvoicingStatus)}
            className="px-4 py-2 text-sm border-2 cursor-pointer"
            style={{
              borderColor: "var(--win95-border)",
              background: "white",
              color: "var(--win95-text)",
            }}
          >
            <option value="all">All Invoicing Statuses</option>
            <option value="pending">Not Invoiced</option>
            <option value="on_draft_invoice">On Draft Invoice</option>
            <option value="invoiced">Invoiced</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="px-4 py-2 text-sm border-2 cursor-pointer"
            style={{
              borderColor: "var(--win95-border)",
              background: "white",
              color: "var(--win95-text)",
            }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Export Button */}
        <button
          className="px-4 py-2 text-sm font-semibold flex items-center gap-2 whitespace-nowrap"
          style={{
            backgroundColor: "var(--win95-button-face)",
            color: "var(--win95-text)",
            border: "2px solid",
            borderTopColor: "var(--win95-button-light)",
            borderLeftColor: "var(--win95-button-light)",
            borderBottomColor: "var(--win95-button-dark)",
            borderRightColor: "var(--win95-button-dark)",
          }}
        >
          <Download size={14} />
          Export
        </button>
      </div>

      {/* Custom Date Range Inputs */}
      {dateRange === "custom" && (
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
              From:
            </label>
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "white",
                color: "var(--win95-text)",
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
              To:
            </label>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "white",
                color: "var(--win95-text)",
              }}
            />
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={20} style={{ color: "var(--success)" }} />
            <span className="text-xs font-bold" style={{ color: "var(--neutral-gray)" }}>
              Total Revenue
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--win95-text)" }}>
            {formatCurrency(stats?.completedRevenue || 0)} {/* Uses org currency */}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {stats?.completedTransactions || 0} completed
          </p>
        </div>

        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock size={20} style={{ color: "var(--warning)" }} />
            <span className="text-xs font-bold" style={{ color: "var(--neutral-gray)" }}>
              Pending
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--win95-text)" }}>
            {formatCurrency(stats?.pendingRevenue || 0)} {/* Uses org currency */}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {stats?.pendingTransactions || 0} pending
          </p>
        </div>

        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={20} style={{ color: "var(--primary)" }} />
            <span className="text-xs font-bold" style={{ color: "var(--neutral-gray)" }}>
              Avg. Transaction
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--win95-text)" }}>
            {formatCurrency(stats?.averageTransactionValue || 0)} {/* Uses org currency */}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {stats?.b2bTransactions || 0} B2B / {stats?.b2cTransactions || 0} B2C
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div
        className="border-2 overflow-hidden"
        style={{ borderColor: "var(--win95-border)", background: "white" }}
      >
        {/* Table Header */}
        <div
          className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-2 border-b-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
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
            style={{ color: "var(--win95-text)" }}
          >
            <Calendar size={12} />
            Date
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
            style={{ color: "var(--win95-text)" }}
          >
            <User size={12} />
            Customer / Product
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
            style={{ color: "var(--win95-text)" }}
          >
            <DollarSign size={12} />
            Amount
            {sortField === "amount" && <ArrowUpDown size={12} />}
          </button>

          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--win95-text)" }}>
            <Filter size={12} />
            Payment
          </div>

          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--win95-text)" }}>
            <Receipt size={12} />
            Invoicing
          </div>

          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--win95-text)" }}>
            <CreditCard size={12} />
            Method
          </div>
        </div>

        {/* Table Body */}
        {!filteredTransactions || filteredTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <DollarSign size={48} className="mx-auto mb-4 opacity-50" style={{ color: "var(--neutral-gray)" }} />
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
              No Transactions Yet
            </p>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {statusFilter !== "all"
                ? `No ${statusFilter} transactions found`
                : "Transactions will appear here once you start accepting payments"}
            </p>
          </div>
        ) : (
          <div className="divide-y-2" style={{ borderColor: "var(--win95-border)" }}>
            {filteredTransactions.map((tx) => {
              const paymentStatus = (tx.customProperties?.paymentStatus as string) || "pending";
              const invoicingStatus = (tx.customProperties?.invoicingStatus as string) || "pending";
              const paymentColors = getStatusBadgeColor(paymentStatus);
              const invoicingColors = getInvoicingStatusBadgeColor(invoicingStatus);
              const customerName = (tx.customProperties?.customerName as string) || "Unknown";
              const productName = (tx.customProperties?.productName as string) || "Unknown Product";
              const totalPriceInCents = (tx.customProperties?.totalPriceInCents as number) || 0;
              const currency = (tx.customProperties?.currency as string) || "EUR";
              const paymentMethod = (tx.customProperties?.paymentMethod as string) || "card";
              const payerType = tx.customProperties?.payerType as string;

              return (
                <button
                  key={tx._id}
                  onClick={() => setSelectedTransaction(tx._id === selectedTransaction ? null : tx._id)}
                  className="w-full grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  {/* Date */}
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {formatDate(tx._creationTime)}
                  </div>

                  {/* Customer & Product */}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
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
                          B2B
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {productName}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                      {formatCurrency(totalPriceInCents, currency)}
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
                      {paymentStatus === "awaiting_employer_payment" ? "Awaiting" : paymentStatus}
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
                      {invoicingStatus === "on_draft_invoice" ? "Draft" : invoicingStatus === "invoiced" ? "Invoiced" : "Pending"}
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
