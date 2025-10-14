"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Id } from "../../../../convex/_generated/dataModel";
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
} from "lucide-react";

interface TransactionsSectionProps {
  organizationId: Id<"organizations">;
}

type TransactionStatus = "all" | "completed" | "pending" | "failed" | "refunded";
type SortField = "date" | "amount" | "customer";
type SortDirection = "asc" | "desc";

export function TransactionsSection({ organizationId }: TransactionsSectionProps) {
  const { sessionId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);

  // TODO: Replace with actual transaction query once checkoutOntology queries are implemented
  const transactions = useQuery(
    api.ontologyHelpers.getObjects,
    organizationId
      ? {
          organizationId,
          type: "payment_transaction",
        }
      : "skip"
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="text-green-500" size={16} />;
      case "pending":
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
      case "completed":
        return { bg: "var(--success-light)", text: "var(--success)" };
      case "pending":
        return { bg: "var(--warning-light)", text: "var(--warning)" };
      case "failed":
      case "cancelled":
        return { bg: "var(--error-light)", text: "var(--error)" };
      default:
        return { bg: "var(--neutral-light)", text: "var(--neutral-gray)" };
    }
  };

  const formatCurrency = (cents: number, currency: string = "usd") => {
    const amount = cents / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
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

  // Filter and sort transactions
  const filteredTransactions = transactions
    ?.filter((tx: { status?: string; customProperties?: { customerEmail?: string; customerName?: string } }) => {
      // Status filter
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const email = (tx.customProperties?.customerEmail || "").toLowerCase();
        const name = (tx.customProperties?.customerName || "").toLowerCase();
        if (!email.includes(query) && !name.includes(query)) return false;
      }
      return true;
    })
    .sort((a: { _creationTime: number; customProperties?: { amountTotal?: number; customerName?: string } }, b: { _creationTime: number; customProperties?: { amountTotal?: number; customerName?: string } }) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      switch (sortField) {
        case "date":
          aValue = a._creationTime;
          bValue = b._creationTime;
          break;
        case "amount":
          aValue = a.customProperties?.amountTotal || 0;
          bValue = b.customProperties?.amountTotal || 0;
          break;
        case "customer":
          aValue = a.customProperties?.customerName || "";
          bValue = b.customProperties?.customerName || "";
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

        {/* Status Filter */}
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
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
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
            {formatCurrency(0)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            0 transactions
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
            {formatCurrency(0)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            0 pending
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
            {formatCurrency(0)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Last 30 days
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
          className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2 border-b-2"
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
            Customer
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
            Status
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
            {filteredTransactions.map((tx: { _id: string; _creationTime: number; status?: string; customProperties?: { customerName?: string; customerEmail?: string; amountTotal?: number; currency?: string; paymentMethod?: string } }) => {
              const statusColors = getStatusBadgeColor(tx.status || "unknown");
              return (
                <button
                  key={tx._id}
                  onClick={() => setSelectedTransaction(tx._id === selectedTransaction ? null : tx._id)}
                  className="w-full grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  {/* Date */}
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {formatDate(tx._creationTime)}
                  </div>

                  {/* Customer */}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                      {tx.customProperties?.customerName || "Unknown Customer"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {tx.customProperties?.customerEmail || "No email"}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                      {formatCurrency(tx.customProperties?.amountTotal || 0, tx.customProperties?.currency)}
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <div
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded"
                      style={{
                        backgroundColor: statusColors.bg,
                        color: statusColors.text,
                      }}
                    >
                      {getStatusIcon(tx.status || "unknown")}
                      {tx.status || "Unknown"}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {tx.customProperties?.paymentMethod || "Card"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
