"use client";

import { useState } from "react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { Ticket, Plus, List, Loader2, AlertCircle, Building2 } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { TicketsList } from "./tickets-list";
import { TicketForm } from "./ticket-form";

type ViewMode = "list" | "create" | "edit";

export function TicketsWindow() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTicketId, setSelectedTicketId] = useState<Id<"objects"> | null>(null);
  const { user, isLoading, sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organizationId = currentOrganization?.id || user?.defaultOrgId;

  // Check app availability - returns guard component if unavailable/loading, null if available
  const guard = useAppAvailabilityGuard({
    code: "tickets",
    name: "Tickets",
    description: "Ticket management for events - issue, track, and redeem tickets"
  });

  if (guard) return guard;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: "var(--primary)" }} />
            <p style={{ color: "var(--win95-text)" }}>Loading tickets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle size={48} style={{ color: "var(--error)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--win95-text)" }}>Please log in to access tickets</p>
          </div>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Building2 size={48} style={{ color: "var(--warning)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--win95-text)" }} className="font-semibold">
              No Organization Selected
            </p>
            <p style={{ color: "var(--win95-text-secondary)" }} className="text-sm mt-2">
              Please select an organization to manage tickets
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateNew = () => {
    setSelectedTicketId(null);
    setViewMode("create");
  };

  const handleEdit = (ticketId: Id<"objects">) => {
    setSelectedTicketId(ticketId);
    setViewMode("edit");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedTicketId(null);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <Ticket size={16} />
              Tickets
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Issue and manage tickets for events - track redemptions and transfers
            </p>
          </div>

          {/* Organization Info */}
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
              {currentOrganization?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        {viewMode === "list" ? (
          <button
            onClick={handleCreateNew}
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            <Plus size={14} />
            Issue Ticket
          </button>
        ) : (
          <button
            onClick={handleBackToList}
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            <List size={14} />
            Back to List
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "list" && (
          <TicketsList
            sessionId={sessionId!}
            organizationId={organizationId as Id<"organizations">}
            onEdit={handleEdit}
          />
        )}

        {(viewMode === "create" || viewMode === "edit") && (
          <TicketForm
            sessionId={sessionId!}
            organizationId={organizationId as Id<"organizations">}
            ticketId={selectedTicketId}
            onSuccess={handleBackToList}
            onCancel={handleBackToList}
          />
        )}
      </div>
    </div>
  );
}
