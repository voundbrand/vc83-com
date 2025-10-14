"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Edit2, Trash2, CheckCircle, Loader2, User } from "lucide-react";
import { useState } from "react";

interface TicketsListProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  onEdit: (ticketId: Id<"objects">) => void;
}

export function TicketsList({ sessionId, organizationId, onEdit }: TicketsListProps) {
  const [filter, setFilter] = useState<{ subtype?: string; status?: string }>({});

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
      {/* Filters */}
      <div className="flex gap-2 mb-4">
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
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.map((ticket) => (
          <div
            key={ticket._id}
            className="border-2 p-4"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
            }}
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
                onClick={() => onEdit(ticket._id)}
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
                  onClick={() => handleRedeem(ticket._id)}
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
                  onClick={() => handleCancel(ticket._id)}
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
    </div>
  );
}
