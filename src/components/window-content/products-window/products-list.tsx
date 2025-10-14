"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Edit2, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";

interface ProductsListProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  onEdit: (productId: Id<"objects">) => void;
}

export function ProductsList({ sessionId, organizationId, onEdit }: ProductsListProps) {
  const [filter, setFilter] = useState<{ subtype?: string; status?: string }>({});

  // Get products from Convex
  const products = useQuery(api.productOntology.getProducts, {
    sessionId,
    organizationId,
    ...filter,
  });

  const deleteProduct = useMutation(api.productOntology.deleteProduct);
  const publishProduct = useMutation(api.productOntology.publishProduct);

  const handleDelete = async (productId: Id<"objects">) => {
    if (confirm("Are you sure you want to archive this product?")) {
      try {
        await deleteProduct({ sessionId, productId });
      } catch (error) {
        console.error("Failed to delete product:", error);
        alert("Failed to delete product");
      }
    }
  };

  const handlePublish = async (productId: Id<"objects">) => {
    try {
      await publishProduct({ sessionId, productId });
    } catch (error) {
      console.error("Failed to publish product:", error);
      alert("Failed to publish product");
    }
  };

  const formatPrice = (cents: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { label: "Draft", color: "var(--neutral-gray)" },
      active: { label: "Active", color: "var(--success)" },
      sold_out: { label: "Sold Out", color: "var(--error)" },
      archived: { label: "Archived", color: "var(--warning)" },
    };
    const badge = badges[status as keyof typeof badges] || badges.draft;
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
      ticket: "🎟️ Ticket",
      physical: "📦 Physical",
      digital: "💾 Digital",
    };
    return labels[subtype] || subtype;
  };

  if (products === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p style={{ color: "var(--neutral-gray)" }} className="text-sm">
            No products yet. Click &ldquo;Create Product&rdquo; to get started.
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
          <option value="ticket">Tickets</option>
          <option value="physical">Physical</option>
          <option value="digital">Digital</option>
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
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="sold_out">Sold Out</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div
            key={product._id}
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
                  <span className="text-xs">{getSubtypeLabel(product.subtype || "")}</span>
                  {getStatusBadge(product.status || "draft")}
                </div>
                <h3 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
                  {product.name}
                </h3>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
                {product.description}
              </p>
            )}

            {/* Price & Inventory */}
            <div className="mb-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--neutral-gray)" }}>Price:</span>
                <span className="font-bold" style={{ color: "var(--win95-text)" }}>
                  {formatPrice(
                    product.customProperties?.price || 0,
                    product.customProperties?.currency || "USD"
                  )}
                </span>
              </div>
              {product.customProperties?.inventory !== null && product.customProperties?.inventory !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--neutral-gray)" }}>Inventory:</span>
                  <span className="font-bold" style={{ color: "var(--win95-text)" }}>
                    {product.customProperties.inventory} available
                  </span>
                </div>
              )}
              {product.customProperties?.sold !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--neutral-gray)" }}>Sold:</span>
                  <span className="font-bold" style={{ color: "var(--win95-text)" }}>
                    {product.customProperties.sold}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
              <button
                onClick={() => onEdit(product._id)}
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

              {product.status === "draft" && (
                <button
                  onClick={() => handlePublish(product._id)}
                  className="flex-1 px-2 py-1.5 text-xs font-bold flex items-center justify-center gap-1 border-2 transition-colors"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-button-face)",
                    color: "var(--win95-text)",
                  }}
                  title="Publish"
                >
                  <CheckCircle size={12} />
                  Publish
                </button>
              )}

              <button
                onClick={() => handleDelete(product._id)}
                className="px-2 py-1.5 text-xs font-bold flex items-center justify-center border-2 transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-button-face)",
                  color: "var(--error)",
                }}
                title="Archive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
