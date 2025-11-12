"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { Edit2, Trash2, CheckCircle, Loader2, User, Ban } from "lucide-react";
import { useState, useMemo } from "react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { TicketDetailModal } from "./ticket-detail-modal";
import { ConfirmationModal } from "@/components/confirmation-modal";

interface TicketsListProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  onEdit: (ticketId: Id<"objects">) => void;
  initialEventId?: Id<"objects">;
}

type SortField = "createdAt" | "name" | "status" | "subtype";
type SortDirection = "asc" | "desc";

export function TicketsList({ sessionId, organizationId, onEdit, initialEventId }: TicketsListProps) {
  const { t } = useNamespaceTranslations("ui.tickets");
  const [filter, setFilter] = useState<{ ticketType?: string; status?: string; eventId?: Id<"objects"> }>(
    initialEventId ? { eventId: initialEventId } : {}
  );
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc"); // Default: newest first
  const [selectedTicket, setSelectedTicket] = useState<Doc<"objects"> | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: "cancel" | "delete" | "redeem" | null;
    ticketId: Id<"objects"> | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    action: null,
    ticketId: null,
    title: "",
    message: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Get tickets from Convex
  const tickets = useQuery(api.ticketOntology.getTickets, {
    sessionId,
    organizationId,
    ...filter,
  });

  // Get all events for the event filter dropdown
  const events = useQuery(api.eventOntology.getEvents, {
    sessionId,
    organizationId,
  });

  const cancelTicket = useMutation(api.ticketOntology.cancelTicket);
  const deleteTicket = useMutation(api.ticketOntology.deleteTicket);
  const redeemTicket = useMutation(api.ticketOntology.redeemTicket);

  const openConfirmModal = (
    action: "cancel" | "delete" | "redeem",
    ticketId: Id<"objects">,
    ticketName: string
  ) => {
    const configs = {
      cancel: {
        title: t("list.confirm_cancel_title"),
        message: t("list.confirm_cancel_message").replace("{name}", ticketName),
      },
      delete: {
        title: t("list.confirm_delete_title"),
        message: t("list.confirm_delete_message").replace("{name}", ticketName),
      },
      redeem: {
        title: t("list.confirm_redeem_title"),
        message: t("list.confirm_redeem_message").replace("{name}", ticketName),
      },
    };

    setConfirmModal({
      isOpen: true,
      action,
      ticketId,
      ...configs[action],
    });
  };

  const handleConfirm = async () => {
    if (!confirmModal.ticketId || !confirmModal.action) return;

    setIsProcessing(true);
    try {
      if (confirmModal.action === "cancel") {
        await cancelTicket({ sessionId, ticketId: confirmModal.ticketId });
      } else if (confirmModal.action === "delete") {
        await deleteTicket({ sessionId, ticketId: confirmModal.ticketId });
      } else if (confirmModal.action === "redeem") {
        await redeemTicket({ sessionId, ticketId: confirmModal.ticketId });
      }

      setConfirmModal({ isOpen: false, action: null, ticketId: null, title: "", message: "" });
    } catch (error) {
      console.error(`Failed to ${confirmModal.action} ticket:`, error);
      // Error is shown via modal, no browser alert
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      issued: { label: t("ui.tickets.status.issued"), color: "var(--success)" },
      redeemed: { label: t("ui.tickets.status.redeemed"), color: "var(--win95-highlight)" },
      cancelled: { label: t("ui.tickets.status.cancelled"), color: "var(--error)" },
      transferred: { label: t("ui.tickets.status.transferred"), color: "var(--win95-highlight)" },
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

  const getTicketTypeLabel = (ticketType: string) => {
    const labels: Record<string, string> = {
      standard: t("ui.tickets.type.standard"),
      vip: t("ui.tickets.type.vip"),
      "early-bird": t("ui.tickets.type.early_bird"),
      student: t("ui.tickets.type.student"),
    };
    return labels[ticketType] || ticketType;
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
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Filters and Sort */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Event Filter */}
        <select
          value={filter.eventId || ""}
          onChange={(e) => setFilter({ ...filter, eventId: (e.target.value as Id<"objects">) || undefined })}
          className="px-3 py-1.5 text-xs border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
            color: "var(--win95-text)",
          }}
        >
          <option value="">{t("ui.tickets.list.filter.all_events")}</option>
          {events?.map((event) => (
            <option key={event._id} value={event._id}>
              {event.name}
            </option>
          ))}
        </select>

        {/* Ticket Type Filter */}
        <select
          value={filter.ticketType || ""}
          onChange={(e) => setFilter({ ...filter, ticketType: e.target.value || undefined })}
          className="px-3 py-1.5 text-xs border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
            color: "var(--win95-text)",
          }}
        >
          <option value="">{t("ui.tickets.list.filter.all_types")}</option>
          <option value="standard">{t("ui.tickets.type.standard")}</option>
          <option value="vip">{t("ui.tickets.type.vip")}</option>
          <option value="early-bird">{t("ui.tickets.type.early_bird")}</option>
          <option value="student">{t("ui.tickets.type.student")}</option>
        </select>

        {/* Status Filter */}
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
          <option value="">{t("ui.tickets.list.filter.all_statuses")}</option>
          <option value="issued">{t("ui.tickets.status.issued")}</option>
          <option value="redeemed">{t("ui.tickets.status.redeemed")}</option>
          <option value="cancelled">{t("ui.tickets.status.cancelled")}</option>
          <option value="transferred">{t("ui.tickets.status.transferred")}</option>
        </select>

        <div className="flex-1" />

        {/* Sort Controls */}
        <div className="flex gap-1 items-center">
          <span className="text-xs" style={{ color: "var(--win95-text)" }}>{t("ui.tickets.list.sort.label")}</span>
          <button
            onClick={() => handleSort("createdAt")}
            className="px-2 py-1 text-xs border-2 flex items-center gap-1"
            style={{
              borderColor: sortField === "createdAt" ? "var(--win95-highlight)" : "var(--win95-border)",
              background: sortField === "createdAt" ? "var(--win95-hover-light)" : "var(--win95-bg-light)",
              color: "var(--win95-text)",
            }}
            title="Sort by date created"
          >
            {t("ui.tickets.list.sort.date")} {sortField === "createdAt" && (sortDirection === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => handleSort("name")}
            className="px-2 py-1 text-xs border-2 flex items-center gap-1"
            style={{
              borderColor: sortField === "name" ? "var(--win95-highlight)" : "var(--win95-border)",
              background: sortField === "name" ? "var(--win95-hover-light)" : "var(--win95-bg-light)",
              color: "var(--win95-text)",
            }}
            title="Sort by name"
          >
            {t("ui.tickets.list.sort.name")} {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => handleSort("status")}
            className="px-2 py-1 text-xs border-2 flex items-center gap-1"
            style={{
              borderColor: sortField === "status" ? "var(--win95-highlight)" : "var(--win95-border)",
              background: sortField === "status" ? "var(--win95-hover-light)" : "var(--win95-bg-light)",
              color: "var(--win95-text)",
            }}
            title="Sort by status"
          >
            {t("ui.tickets.list.sort.status")} {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
          </button>
        </div>
      </div>

      {/* Tickets Grid or Empty State */}
      {sortedTickets.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p style={{ color: "var(--neutral-gray)" }} className="text-sm">
              {tickets.length === 0
                ? t("ui.tickets.list.no_tickets_yet")
                : t("ui.tickets.list.no_matches")}
            </p>
          </div>
        </div>
      ) : (
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
                  <span className="text-xs">{getTicketTypeLabel(ticket.subtype || "standard")}</span>
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
              {/* Event Association */}
              {ticket.customProperties?.eventId && events ? (
                <div className="text-xs font-semibold" style={{ color: "var(--win95-highlight)" }}>
                  🎟️ {events.find(e => e._id === ticket.customProperties?.eventId)?.name || "Event"}
                </div>
              ) : (
                <div className="text-xs italic" style={{ color: "var(--neutral-gray)" }}>
                  {t("list.no_event")}
                </div>
              )}
              {ticket.customProperties?.purchaseDate && (
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("list.purchased")} {formatDate(ticket.customProperties.purchaseDate)}
                </div>
              )}
              {ticket.customProperties?.redeemedAt && (
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("list.redeemed")} {formatDate(ticket.customProperties.redeemedAt)}
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
                title={t("ui.tickets.list.button.edit")}
              >
                <Edit2 size={12} />
                {t("ui.tickets.list.button.edit")}
              </button>

              {ticket.status === "issued" && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openConfirmModal("redeem", ticket._id, ticket.name);
                    }}
                    className="flex-1 px-2 py-1.5 text-xs font-bold flex items-center justify-center gap-1 border-2 transition-colors"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-button-face)",
                      color: "var(--win95-text)",
                    }}
                    title={t("ui.tickets.list.button.redeem")}
                  >
                    <CheckCircle size={12} />
                    {t("ui.tickets.list.button.redeem")}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openConfirmModal("cancel", ticket._id, ticket.name);
                    }}
                    className="px-2 py-1.5 text-xs font-bold flex items-center justify-center border-2 transition-colors"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-button-face)",
                      color: "var(--warning)",
                    }}
                    title={t("ui.tickets.list.button.cancel")}
                  >
                    <Ban size={12} />
                  </button>
                </>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openConfirmModal("delete", ticket._id, ticket.name);
                }}
                className="px-2 py-1.5 text-xs font-bold flex items-center justify-center border-2 transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-button-face)",
                  color: "var(--error)",
                }}
                title={t("ui.tickets.list.button.delete")}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          ))}
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null, ticketId: null, title: "", message: "" })}
        onConfirm={handleConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.action === "delete" ? "danger" : "warning"}
        confirmText={confirmModal.action === "delete" ? t("list.button.delete") : "OK"}
        isLoading={isProcessing}
      />
    </div>
  );
}
