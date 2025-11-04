"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { Edit2, Trash2, CheckCircle, Loader2, User, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import { TicketDetailModal } from "./ticket-detail-modal";

interface TicketsListProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  onEdit: (ticketId: Id<"objects">) => void;
}

type SortField = "createdAt" | "name" | "status" | "subtype";
type SortDirection = "asc" | "desc";

export function TicketsList({ sessionId, organizationId, onEdit }: TicketsListProps) {
  const [filter, setFilter] = useState<{ subtype?: string; status?: string }>({});
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc"); // Default: newest first
  const [selectedTicket, setSelectedTicket] = useState<Doc<"objects"> | null>(null);

  // Get tickets from Convex
  const tickets = useQuery(api.ticketOntology.getTickets, {
    sessionId,
    organizationId,
    ...filter,
  });

  const cancelTicket = useMutation(api.ticketOntology.cancelTicket);
  const redeemTicket = useMutation(api.ticketOntology.redeemTicket);

  const handleCancel = async (ticketId: Id<"objects">) => {
    if (confirm("Are you sure you want to cancel this ticket?")) {
      try {
        await cancelTicket({ sessionId, ticketId });
      } catch (error) {
        console.error("Failed to cancel ticket:", error);
        alert("Failed to cancel ticket");
      }
    }
  };

  const handleRedeem = async (ticketId: Id<"objects">) => {
    if (confirm("Mark this ticket as redeemed (checked in)?")) {
      try {
        await redeemTicket({ sessionId, ticketId });
      } catch (error) {
        console.error("Failed to redeem ticket:", error);
        alert("Failed to redeem ticket");
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      issued: { label: "Issued", color: "var(--success)" },
      redeemed: { label: "Redeemed", color: "var(--primary)" },
      cancelled: { label: "Cancelled", color: "var(--error)" },
      transferred: { label: "Transferred", color: "var(--warning)" },
    };
    const badge = badges[status as keyof typeof badges] || badges.issued;
    return (
      <span
        className="px-2 py-0.5 text-xs font-bold rounded"
        style={{ background: badge.color, color: "white" }}
      >
        {badge.label}
      </span>
    );
  };

  const getSubtypeLabel = (subtype: string) => {
    const labels: Record<string, string> = {
      standard: "🎫 Standard",
      vip: "⭐ VIP",
      "early-bird": "🐦 Early Bird",
      student: "🎓 Student",
    };
    return labels[subtype] || subtype;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field: default to desc for dates, asc for others
      setSortField(field);
      setSortDirection(field === "createdAt" ? "desc" : "asc");
    }
  };

  // Sort tickets
  const sortedTickets = useMemo(() => {
    if (!tickets) return [];

    const sorted = [...tickets].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "createdAt":
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case "subtype":
          aValue = (a.subtype || "").toLowerCase();
          bValue = (b.subtype || "").toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [tickets, sortField, sortDirection]);

  if (tickets === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p style={{ color: "var(--neutral-gray)" }} className="text-sm">
            No tickets yet. Click &ldquo;Issue Ticket&rdquo; to create one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Filters and Sort */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filter.subtype || ""}
          onChange={(e) => setFilter({ ...filter, subtype: e.target.value || undefined })}
          className="px-3 py-1.5 text-xs border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
            color: "var(--win95-text)",
          }}
        >
          <option value="">All Types</option>
          <option value="standard">Standard</option>
          <option value="vip">VIP</option>
          <option value="early-bird">Early Bird</option>
          <option value="student">Student</option>
        </select>

        <select
          value={filter.status || ""}
          onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
          className="px-3 py-1.5 text-xs border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
            color: "var(--win95-text)",
          }}
        >
          <option value="">All Statuses</option>
          <option value="issued">Issued</option>
          <option value="redeemed">Redeemed</option>
          <option value="cancelled">Cancelled</option>
          <option value="transferred">Transferred</option>
        </select>

        <div className="flex-1" />

        {/* Sort Controls */}
        <div className="flex gap-1 items-center">
          <span className="text-xs" style={{ color: "var(--win95-text)" }}>Sort:</span>
          <button
            onClick={() => handleSort("createdAt")}
            className="px-2 py-1 text-xs border-2 flex items-center gap-1"
            style={{
              borderColor: sortField === "createdAt" ? "var(--primary)" : "var(--win95-border)",
              background: sortField === "createdAt" ? "var(--primary-light)" : "var(--win95-bg-light)",
              color: "var(--win95-text)",
            }}
            title="Sort by date created"
          >
            Date {sortField === "createdAt" && (sortDirection === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => handleSort("name")}
            className="px-2 py-1 text-xs border-2 flex items-center gap-1"
            style={{
              borderColor: sortField === "name" ? "var(--primary)" : "var(--win95-border)",
              background: sortField === "name" ? "var(--primary-light)" : "var(--win95-bg-light)",
              color: "var(--win95-text)",
            }}
            title="Sort by name"
          >
            Name {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => handleSort("status")}
            className="px-2 py-1 text-xs border-2 flex items-center gap-1"
            style={{
              borderColor: sortField === "status" ? "var(--primary)" : "var(--win95-border)",
              background: sortField === "status" ? "var(--primary-light)" : "var(--win95-bg-light)",
              color: "var(--win95-text)",
            }}
            title="Sort by status"
          >
            Status {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
          </button>
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedTickets.map((ticket) => (
          <div
            key={ticket._id}
            className="border-2 p-4 cursor-pointer hover:shadow-lg transition-shadow"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
            }}
            onClick={() => setSelectedTicket(ticket)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs">{getSubtypeLabel(ticket.subtype || "")}</span>
                  {getStatusBadge(ticket.status || "issued")}
                </div>
                <h3 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
                  {ticket.name}
                </h3>
              </div>
            </div>

            {/* Description */}
            {ticket.description && (
              <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
                {ticket.description}
              </p>
            )}

            {/* Holder Info */}
            <div className="mb-3 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <User size={12} style={{ color: "var(--neutral-gray)" }} />
                <span style={{ color: "var(--win95-text)" }} className="font-semibold">
                  {ticket.customProperties?.holderName || "Unknown"}
                </span>
              </div>
              {ticket.customProperties?.holderEmail && (
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {ticket.customProperties.holderEmail}
                </div>
              )}
              {ticket.customProperties?.purchaseDate && (
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Purchased: {formatDate(ticket.customProperties.purchaseDate)}
                </div>
              )}
              {ticket.customProperties?.redeemedAt && (
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Redeemed: {formatDate(ticket.customProperties.redeemedAt)}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(ticket._id);
                }}
                className="flex-1 px-2 py-1.5 text-xs font-bold flex items-center justify-center gap-1 border-2 transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-button-face)",
                  color: "var(--win95-text)",
                }}
                title="Edit"
              >
                <Edit2 size={12} />
                Edit
              </button>

              {ticket.status === "issued" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRedeem(ticket._id);
                  }}
                  className="flex-1 px-2 py-1.5 text-xs font-bold flex items-center justify-center gap-1 border-2 transition-colors"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-button-face)",
                    color: "var(--win95-text)",
                  }}
                  title="Redeem"
                >
                  <CheckCircle size={12} />
                  Redeem
                </button>
              )}

              {ticket.status !== "cancelled" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel(ticket._id);
                  }}
                  className="px-2 py-1.5 text-xs font-bold flex items-center justify-center border-2 transition-colors"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-button-face)",
                    color: "var(--error)",
                  }}
                  title="Cancel"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
}
