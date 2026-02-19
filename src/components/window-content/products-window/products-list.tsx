"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Edit2, Trash2, CheckCircle, Loader2, Copy, Archive, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
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
  const [showArchived, setShowArchived] = useState(false);

  // Get products from Convex
  const products = useQuery(api.productOntology.getProducts, {
    sessionId,
    organizationId,
    ...filter,
  });

  const archiveProduct = useMutation(api.productOntology.archiveProduct);
  const restoreProduct = useMutation(api.productOntology.restoreProduct);
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

  const handleArchive = async (productId: Id<"objects">) => {
    if (confirm(t("ui.products.list.confirm.archive") || "Archive this product? It can be restored later.")) {
      try {
        await archiveProduct({ sessionId, productId });
      } catch (error) {
        console.error("Failed to archive product:", error);
        alert(t("ui.products.list.error.archiveFailed") || "Failed to archive product");
      }
    }
  };

  const handleRestore = async (productId: Id<"objects">) => {
    try {
      await restoreProduct({ sessionId, productId });
    } catch (error) {
      console.error("Failed to restore product:", error);
      alert(t("ui.products.list.error.restoreFailed") || "Failed to restore product");
    }
  };

  const handleDelete = async (productId: Id<"objects">) => {
    if (confirm(t("ui.products.list.confirm.permanentDelete") || "PERMANENTLY delete this product? This cannot be undone!")) {
      try {
        await deleteProduct({ sessionId, productId });
      } catch (error) {
        console.error("Failed to delete product:", error);
        alert(t("ui.products.list.error.deleteFailed") || "Failed to delete product");
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
      ticket: "Ticket",
      physical: "Physical",
      digital: "Digital",
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

  // Separate active and archived products
  const activeProducts = products.filter(p => p.status !== "archived");
  const archivedProducts = products.filter(p => p.status === "archived");

  // Apply filters to active products only (archived shown separately)
  const filteredActiveProducts = activeProducts.filter(p => {
    if (filter.subtype && p.subtype !== filter.subtype) return false;
    if (filter.status && p.status !== filter.status) return false;
    return true;
  });

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

  const renderProductCard = (product: typeof products[0], isArchived: boolean = false) => (
    <div
      key={product._id}
      className="border-2 p-4"
      style={{
        borderColor: isArchived ? "var(--warning)" : "var(--shell-border)",
        background: isArchived ? "rgba(245, 158, 11, 0.05)" : "var(--shell-surface-elevated)",
        opacity: isArchived ? 0.8 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs">{getSubtypeLabel(product.subtype || "")}</span>
            {getStatusBadge(product.status || "draft")}
          </div>
          <h3 className="font-bold text-sm" style={{ color: "var(--shell-text)" }}>
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
          <span className="font-bold" style={{ color: "var(--shell-text)" }}>
            {formatPrice(
              product.customProperties?.price || 0,
              product.customProperties?.currency || "EUR"
            )}
          </span>
        </div>
        {product.customProperties?.inventory !== null && product.customProperties?.inventory !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>{t("ui.products.list.label.inventory")}</span>
            <span className="font-bold" style={{ color: "var(--shell-text)" }}>
              {product.customProperties.inventory} {t("ui.products.list.label.available")}
            </span>
          </div>
        )}
        {product.customProperties?.sold !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>{t("ui.products.list.label.sold")}</span>
            <span className="font-bold" style={{ color: "var(--shell-text)" }}>
              {product.customProperties.sold}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t-2" style={{ borderColor: "var(--shell-border)" }}>
        {isArchived ? (
          // Archived product actions: Restore and Permanent Delete
          <>
            <button
              onClick={() => handleRestore(product._id)}
              className="flex-1 px-2 py-1.5 text-xs font-bold flex items-center justify-center gap-1 border-2 transition-colors hover:brightness-95"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-button-surface)",
                color: "var(--success)",
              }}
              title={t("ui.products.list.button.restore") || "Restore"}
            >
              <RotateCcw size={12} />
              {t("ui.products.list.button.restore") || "Restore"}
            </button>
            <button
              onClick={() => handleDelete(product._id)}
              className="px-2 py-1.5 text-xs font-bold flex items-center justify-center border-2 transition-colors hover:brightness-95"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-button-surface)",
                color: "var(--error)",
              }}
              title={t("ui.products.list.button.permanentDelete") || "Delete Permanently"}
            >
              <Trash2 size={12} />
            </button>
          </>
        ) : (
          // Active product actions: Edit, Publish, Duplicate, Archive
          <>
            <button
              onClick={() => onEdit(product._id)}
              className="px-2 py-1.5 text-xs font-bold flex items-center justify-center border-2 transition-colors hover:brightness-95"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-button-surface)",
                color: "var(--shell-text)",
              }}
              title={t("ui.products.list.button.edit")}
            >
              <Edit2 size={12} />
            </button>

            {product.status === "draft" && (
              <button
                onClick={() => handlePublish(product._id)}
                className="flex-1 px-2 py-1.5 text-xs font-bold flex items-center justify-center gap-1 border-2 transition-colors hover:brightness-95"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-button-surface)",
                  color: "var(--shell-text)",
                }}
                title={t("ui.products.list.button.publish")}
              >
                <CheckCircle size={12} />
                {t("ui.products.list.button.publish")}
              </button>
            )}

            <button
              onClick={() => handleDuplicate(product._id)}
              className="px-2 py-1.5 text-xs font-bold flex items-center justify-center border-2 transition-colors hover:brightness-95"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-button-surface)",
                color: "var(--shell-text)",
              }}
              title={t("ui.products.list.button.duplicate") || "Duplicate"}
            >
              <Copy size={12} />
            </button>

            <button
              onClick={() => handleArchive(product._id)}
              className="px-2 py-1.5 text-xs font-bold flex items-center justify-center border-2 transition-colors hover:brightness-95"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-button-surface)",
                color: "var(--warning)",
              }}
              title={t("ui.products.list.button.archive") || "Archive"}
            >
              <Archive size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4">
      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <select
          value={filter.subtype || ""}
          onChange={(e) => setFilter({ ...filter, subtype: e.target.value || undefined })}
          className="px-3 py-1.5 text-xs border-2"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-surface-elevated)",
            color: "var(--shell-text)",
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
            borderColor: "var(--shell-border)",
            background: "var(--shell-surface-elevated)",
            color: "var(--shell-text)",
          }}
        >
          <option value="">{t("ui.products.list.filter.allStatuses")}</option>
          <option value="draft">{t("ui.products.list.status.draft")}</option>
          <option value="active">{t("ui.products.list.status.active")}</option>
          <option value="sold_out">{t("ui.products.list.status.soldOut")}</option>
        </select>
      </div>

      {/* Active Products Grid */}
      {filteredActiveProducts.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p style={{ color: "var(--neutral-gray)" }} className="text-sm">
              {t("ui.products.list.noMatchingProducts") || "No products match your filters"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActiveProducts.map((product) => renderProductCard(product, false))}
        </div>
      )}

      {/* Archived Section */}
      {archivedProducts.length > 0 && (
        <div className="mt-8 border-t-2 pt-4" style={{ borderColor: "var(--shell-border)" }}>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 mb-4 text-xs font-bold"
            style={{ color: "var(--warning)" }}
          >
            {showArchived ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <Archive size={14} />
            {t("ui.products.list.archivedSection") || "Archived Products"} ({archivedProducts.length})
          </button>

          {showArchived && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedProducts.map((product) => renderProductCard(product, true))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
