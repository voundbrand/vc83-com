"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Edit2, Trash2, CheckCircle, Loader2, Copy } from "lucide-react";
import { useState } from "react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface ProductsListProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  onEdit: (productId: Id<"objects">) => void;
}

export function ProductsList({ sessionId, organizationId, onEdit }: ProductsListProps) {
  const { t } = useNamespaceTranslations("ui.products");
  const [filter, setFilter] = useState<{ subtype?: string; status?: string }>({});

  // Get products from Convex
  const products = useQuery(api.productOntology.getProducts, {
    sessionId,
    organizationId,
    ...filter,
  });

  const deleteProduct = useMutation(api.productOntology.deleteProduct);
  const publishProduct = useMutation(api.productOntology.publishProduct);
  const duplicateProduct = useMutation(api.productOntology.duplicateProduct);

  const handleDuplicate = async (productId: Id<"objects">) => {
    try {
      await duplicateProduct({ sessionId, productId });
    } catch (error) {
      console.error("Failed to duplicate product:", error);
      alert("Failed to duplicate product");
    }
  };

  const handleDelete = async (productId: Id<"objects">) => {
    if (confirm(t("ui.products.list.confirm.delete"))) {
      try {
        await deleteProduct({ sessionId, productId });
      } catch (error) {
        console.error("Failed to delete product:", error);
        alert(t("ui.products.list.error.deleteFailed"));
      }
    }
  };

  const handlePublish = async (productId: Id<"objects">) => {
    try {
      await publishProduct({ sessionId, productId });
    } catch (error) {
      console.error("Failed to publish product:", error);
      alert(t("ui.products.list.error.publishFailed"));
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
      draft: { label: t("ui.products.list.status.draft"), color: "var(--neutral-gray)" },
      active: { label: t("ui.products.list.status.active"), color: "var(--success)" },
      sold_out: { label: t("ui.products.list.status.soldOut"), color: "var(--error)" },
      archived: { label: t("ui.products.list.status.archived"), color: "var(--warning)" },
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
            {t("ui.products.list.empty")}
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
          <option value="">{t("ui.products.list.filter.allTypes")}</option>
          <option value="ticket">{t("ui.products.list.filter.tickets")}</option>
          <option value="physical">{t("ui.products.list.filter.physical")}</option>
          <option value="digital">{t("ui.products.list.filter.digital")}</option>
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
          <option value="">{t("ui.products.list.filter.allStatuses")}</option>
          <option value="draft">{t("ui.products.list.status.draft")}</option>
          <option value="active">{t("ui.products.list.status.active")}</option>
          <option value="sold_out">{t("ui.products.list.status.soldOut")}</option>
          <option value="archived">{t("ui.products.list.status.archived")}</option>
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
                <span style={{ color: "var(--neutral-gray)" }}>{t("ui.products.list.label.price")}</span>
                <span className="font-bold" style={{ color: "var(--win95-text)" }}>
                  {formatPrice(
                    product.customProperties?.price || 0,
                    product.customProperties?.currency || "EUR"
                  )}
                </span>
              </div>
              {product.customProperties?.inventory !== null && product.customProperties?.inventory !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--neutral-gray)" }}>{t("ui.products.list.label.inventory")}</span>
                  <span className="font-bold" style={{ color: "var(--win95-text)" }}>
                    {product.customProperties.inventory} {t("ui.products.list.label.available")}
                  </span>
                </div>
              )}
              {product.customProperties?.sold !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--neutral-gray)" }}>{t("ui.products.list.label.sold")}</span>
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
                title={t("ui.products.list.button.edit")}
              >
                <Edit2 size={12} />
                {t("ui.products.list.button.edit")}
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
                  title={t("ui.products.list.button.publish")}
                >
                  <CheckCircle size={12} />
                  {t("ui.products.list.button.publish")}
                </button>
              )}

              <button
                onClick={() => handleDuplicate(product._id)}
                className="px-2 py-1.5 text-xs font-bold flex items-center justify-center border-2 transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-button-face)",
                  color: "var(--win95-text)",
                }}
                title="Duplicate"
              >
                <Copy size={12} />
              </button>

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
