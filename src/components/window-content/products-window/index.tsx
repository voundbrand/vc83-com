"use client";

import { useState } from "react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { Package, Plus, List, Loader2, AlertCircle, Building2, ArrowLeft, Maximize2 } from "lucide-react";
import Link from "next/link";
import { Id } from "../../../../convex/_generated/dataModel";
import { ProductsList } from "./products-list";
import { ProductForm } from "./product-form";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

type ViewMode = "list" | "create" | "edit";

interface ProductsWindowProps {
  /** When true, shows back-to-desktop navigation (for /products route) */
  fullScreen?: boolean;
}

export function ProductsWindow({ fullScreen = false }: ProductsWindowProps = {}) {
  const { t } = useNamespaceTranslations("ui.products");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProductId, setSelectedProductId] = useState<Id<"objects"> | null>(null);
  const { user, isLoading, sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organizationId = currentOrganization?.id || user?.defaultOrgId;

  // Check app availability - returns guard component if unavailable/loading, null if available
  const guard = useAppAvailabilityGuard({
    code: "products",
    name: "Products",
    description: "Product catalog management for tickets, merchandise, and digital goods"
  });

  if (guard) return guard;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--shell-surface)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: "var(--primary)" }} />
            <p style={{ color: "var(--shell-text)" }}>{t("ui.products.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--shell-surface)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle size={48} style={{ color: "var(--error)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--shell-text)" }}>{t("ui.products.error.login")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--shell-surface)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Building2 size={48} style={{ color: "var(--warning)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--shell-text)" }} className="font-semibold">
              {t("ui.products.error.noOrg")}
            </p>
            <p style={{ color: "var(--neutral-gray)" }} className="text-sm mt-2">
              {t("ui.products.error.noOrgDescription")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateNew = () => {
    setSelectedProductId(null);
    setViewMode("create");
  };

  const handleEdit = (productId: Id<"objects">) => {
    setSelectedProductId(productId);
    setViewMode("edit");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedProductId(null);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--shell-surface)" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: "var(--shell-border)" }}>
        <div className="flex items-center justify-between">
          {/* Back to desktop link (full-screen mode only) */}
          {fullScreen && (
            <Link
              href="/"
              className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors mr-3"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-button-surface)",
                color: "var(--shell-text)",
              }}
              title="Back to Desktop"
            >
              <ArrowLeft size={14} />
            </Link>
          )}
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--shell-text)" }}>
              <Package size={16} />
              {t("ui.products.header.title")}
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.products.header.description")}
            </p>
          </div>

          {/* Organization Info & Full Screen Toggle */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
                {currentOrganization?.name}
              </p>
            </div>

            {/* Open full screen link (window mode only) */}
            {!fullScreen && (
              <Link
                href="/products"
                className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-button-surface)",
                  color: "var(--shell-text)",
                }}
                title="Open Full Screen"
              >
                <Maximize2 size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b-2"
        style={{ borderColor: "var(--shell-border)", background: "var(--shell-surface-elevated)" }}
      >
        {viewMode === "list" ? (
          <button
            onClick={handleCreateNew}
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-button-surface)",
              color: "var(--shell-text)",
            }}
          >
            <Plus size={14} />
            {t("ui.products.button.createProduct")}
          </button>
        ) : (
          <button
            onClick={handleBackToList}
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-button-surface)",
              color: "var(--shell-text)",
            }}
          >
            <List size={14} />
            {t("ui.products.button.backToList")}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "list" && (
          <ProductsList
            sessionId={sessionId!}
            organizationId={organizationId as Id<"organizations">}
            onEdit={handleEdit}
          />
        )}

        {(viewMode === "create" || viewMode === "edit") && (
          <ProductForm
            sessionId={sessionId!}
            organizationId={organizationId as Id<"organizations">}
            productId={selectedProductId}
            onSuccess={handleBackToList}
            onCancel={handleBackToList}
          />
        )}
      </div>
    </div>
  );
}
