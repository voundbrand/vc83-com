"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, Save, X } from "lucide-react";
import { useAppAvailability } from "@/hooks/use-app-availability";
import { AppUnavailableInline } from "@/components/app-unavailable";

interface ProductFormProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  productId: Id<"objects"> | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({
  sessionId,
  organizationId,
  productId,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const [formData, setFormData] = useState({
    subtype: "ticket",
    name: "",
    description: "",
    price: "",
    currency: "USD",
    inventory: "",
    eventId: "",
  });
  const [saving, setSaving] = useState(false);

  // Check if Events app is available (determines if we show event association)
  const { isAvailable: isEventsAppAvailable, organizationName } = useAppAvailability("events");

  // Get existing product if editing
  const existingProduct = useQuery(
    api.productOntology.getProduct,
    productId ? { sessionId, productId } : "skip"
  );

  const createProduct = useMutation(api.productOntology.createProduct);
  const updateProduct = useMutation(api.productOntology.updateProduct);

  // Get events for dropdown (only if Events app is available)
  const events = useQuery(
    api.eventOntology.getEvents,
    isEventsAppAvailable && sessionId
      ? { sessionId, organizationId }
      : "skip"
  );

  // Load existing product data
  useEffect(() => {
    if (existingProduct) {
      setFormData({
        subtype: existingProduct.subtype || "ticket",
        name: existingProduct.name || "",
        description: existingProduct.description || "",
        price: ((existingProduct.customProperties?.price || 0) / 100).toString(),
        currency: existingProduct.customProperties?.currency || "USD",
        inventory: existingProduct.customProperties?.inventory?.toString() || "",
        eventId: "", // Event association is create-only, not shown in edit mode
      });
    }
  }, [existingProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const priceInCents = Math.round(parseFloat(formData.price) * 100);
      const inventory = formData.inventory ? parseInt(formData.inventory, 10) : null;

      if (productId) {
        // Update existing product
        await updateProduct({
          sessionId,
          productId,
          name: formData.name,
          description: formData.description,
          price: priceInCents,
          inventory: inventory || undefined,
        });
      } else {
        // Create new product
        await createProduct({
          sessionId,
          organizationId,
          subtype: formData.subtype,
          name: formData.name,
          description: formData.description,
          price: priceInCents,
          currency: formData.currency,
          inventory: inventory || undefined,
          eventId: formData.eventId ? (formData.eventId as Id<"objects">) : undefined,
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Failed to save product:", error);
      alert("Failed to save product. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (productId && !existingProduct) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {/* Product Type */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Product Type <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <select
          value={formData.subtype}
          onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
          disabled={!!productId}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
          required
        >
          <option value="ticket">Ticket - Event tickets (VIP, standard, early-bird)</option>
          <option value="physical">Physical - Merchandise, swag, physical goods</option>
          <option value="digital">Digital - Downloads, access codes, digital content</option>
        </select>
        {productId && (
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Product type cannot be changed after creation
          </p>
        )}
      </div>

      {/* Product Name */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Product Name <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="VIP Ticket, T-Shirt, Digital Album, etc."
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the product features, benefits, and details..."
          rows={4}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
        />
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Price <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="49.99"
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
              }}
              required
            />
          </div>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
          </select>
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          Enter price in dollars/euros (e.g., 49.99 for $49.99)
        </p>
      </div>

      {/* Inventory */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Inventory (Optional)
        </label>
        <input
          type="number"
          min="0"
          value={formData.inventory}
          onChange={(e) => setFormData({ ...formData, inventory: e.target.value })}
          placeholder="Leave empty for unlimited"
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
        />
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          Available quantity. Leave empty for unlimited inventory.
        </p>
      </div>

      {/* Event Association (only shown when Events app is available and creating new product) */}
      {!productId && (
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            Associate with Event (Optional)
          </label>
          {isEventsAppAvailable ? (
            <>
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
                <option value="">-- No Event --</option>
                {events?.map((event) => (
                  <option key={event._id} value={event._id}>
                    {event.name} ({event.subtype})
                  </option>
                ))}
              </select>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Link this product to an event. The event will &quot;offer&quot; this product.
              </p>
            </>
          ) : (
            <AppUnavailableInline
              appName="Events"
              organizationName={organizationName}
            />
          )}
        </div>
      )}

      {/* Info Box */}
      <div
        className="p-3 border-2 rounded"
        style={{
          background: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          💡 Products start in &ldquo;Draft&rdquo; status. Click &ldquo;Publish&rdquo; to make them available for sale.
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
              {productId ? "Update" : "Create"} Product
            </>
          )}
        </button>
      </div>
    </form>
  );
}
