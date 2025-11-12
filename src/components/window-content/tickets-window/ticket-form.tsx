"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
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
  const { t } = useNamespaceTranslations("ui.tickets");
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
        eventId: (existingTicket.customProperties?.eventId as string) || "",
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
          eventId: formData.eventId ? (formData.eventId as Id<"objects">) : undefined,
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
      alert(t("ui.tickets.form.error.save_failed"));
    } finally {
      setSaving(false);
    }
  };

  if (ticketId && !existingTicket) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  if (!ticketId && (products === undefined || events === undefined)) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {/* Product Selection (only for new tickets) */}
      {!ticketId && (
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            {t("ui.tickets.form.product_label")} <span style={{ color: "var(--error)" }}>*</span>
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
            <option value="">{t("ui.tickets.form.product_select")}</option>
            {products?.map((product) => (
              <option key={product._id} value={product._id}>
                {product.name} - {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: product.customProperties?.currency || "EUR",
                }).format((product.customProperties?.price || 0) / 100)}
              </option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.tickets.form.product_help")}
          </p>
        </div>
      )}

      {/* Event Association (only for new tickets) */}
      {!ticketId && (
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            {t("ui.tickets.form.event_label")}
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
            <option value="">{t("ui.tickets.form.event_none")}</option>
            {events?.map((event) => (
              <option key={event._id} value={event._id}>
                {event.name} - {new Date(event.customProperties?.startDate || Date.now()).toLocaleDateString()}
              </option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.tickets.form.event_help")}
          </p>
        </div>
      )}

      {/* Holder Name */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          {t("ui.tickets.form.holder_name_label")} <span style={{ color: "var(--error)" }}>*</span>
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
          {t("ui.tickets.form.holder_email_label")} <span style={{ color: "var(--error)" }}>*</span>
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
          {t("ui.tickets.form.holder_email_help")}
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
          {ticketId ? t("ui.tickets.form.info_edit") : t("ui.tickets.form.info_create")}
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
          {t("ui.tickets.form.button.cancel")}
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
              {t("ui.tickets.form.button.saving")}
            </>
          ) : (
            <>
              <Save size={14} />
              {ticketId ? t("ui.tickets.form.button.update") : t("ui.tickets.form.button.issue")}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
