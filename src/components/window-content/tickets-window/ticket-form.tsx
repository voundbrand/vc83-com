"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, Save, X } from "lucide-react";

interface TicketFormProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  ticketId: Id<"objects"> | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TicketForm({
  sessionId,
  organizationId,
  ticketId,
  onSuccess,
  onCancel,
}: TicketFormProps) {
  const [formData, setFormData] = useState({
    productId: "",
    eventId: "",
    holderName: "",
    holderEmail: "",
  });
  const [saving, setSaving] = useState(false);

  // Get existing ticket if editing
  const existingTicket = useQuery(
    api.ticketOntology.getTicket,
    ticketId ? { sessionId, ticketId } : "skip"
  );

  // Get all products for the dropdown
  const products = useQuery(api.productOntology.getProducts, {
    sessionId,
    organizationId,
  });

  // Get all events for the dropdown
  const events = useQuery(api.eventOntology.getEvents, {
    sessionId,
    organizationId,
  });

  const createTicket = useMutation(api.ticketOntology.createTicket);
  const updateTicket = useMutation(api.ticketOntology.updateTicket);

  // Load existing ticket data
  useEffect(() => {
    if (existingTicket) {
      setFormData({
        productId: (existingTicket.customProperties?.productId as string) || "",
        eventId: "", // Event link is stored in objectLinks, not editable after creation
        holderName: (existingTicket.customProperties?.holderName as string) || "",
        holderEmail: (existingTicket.customProperties?.holderEmail as string) || "",
      });
    }
  }, [existingTicket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (ticketId) {
        // Update existing ticket
        await updateTicket({
          sessionId,
          ticketId,
          holderName: formData.holderName,
          holderEmail: formData.holderEmail,
        });
      } else {
        // Create new ticket
        await createTicket({
          sessionId,
          organizationId,
          productId: formData.productId as Id<"objects">,
          eventId: formData.eventId ? (formData.eventId as Id<"objects">) : undefined,
          holderName: formData.holderName,
          holderEmail: formData.holderEmail,
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Failed to save ticket:", error);
      alert("Failed to save ticket. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (ticketId && !existingTicket) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!ticketId && (products === undefined || events === undefined)) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {/* Product Selection (only for new tickets) */}
      {!ticketId && (
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            Product (Ticket Type) <span style={{ color: "var(--error)" }}>*</span>
          </label>
          <select
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
            required
          >
            <option value="">Select a product...</option>
            {products?.map((product) => (
              <option key={product._id} value={product._id}>
                {product.name} - {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: product.customProperties?.currency || "USD",
                }).format((product.customProperties?.price || 0) / 100)}
              </option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Choose which product/ticket type to issue (e.g., VIP Ticket, Early Bird, etc.)
          </p>
        </div>
      )}

      {/* Event Association (only for new tickets) */}
      {!ticketId && (
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            Event (Optional)
          </label>
          <select
            value={formData.eventId}
            onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          >
            <option value="">No event (standalone ticket)</option>
            {events?.map((event) => (
              <option key={event._id} value={event._id}>
                {event.name} - {new Date(event.customProperties?.startDate || Date.now()).toLocaleDateString()}
              </option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Associate this ticket with an event for check-in tracking
          </p>
        </div>
      )}

      {/* Holder Name */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Holder Name <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <input
          type="text"
          value={formData.holderName}
          onChange={(e) => setFormData({ ...formData, holderName: e.target.value })}
          placeholder="John Doe"
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
          required
        />
      </div>

      {/* Holder Email */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Holder Email <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <input
          type="email"
          value={formData.holderEmail}
          onChange={(e) => setFormData({ ...formData, holderEmail: e.target.value })}
          placeholder="john@example.com"
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
          required
        />
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          Ticket confirmation will be sent to this email
        </p>
      </div>

      {/* Info Box */}
      <div
        className="p-3 border-2 rounded"
        style={{
          background: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          💡 {ticketId ? "Update ticket holder information." : "Tickets are issued with &ldquo;issued&rdquo; status. Use the Redeem button to check in attendees."}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2 transition-colors"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-button-face)",
            color: "var(--win95-text)",
          }}
        >
          <X size={14} />
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2 transition-colors"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-button-face)",
            color: "var(--win95-text)",
          }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={14} />
              {ticketId ? "Update" : "Issue"} Ticket
            </>
          )}
        </button>
      </div>
    </form>
  );
}
