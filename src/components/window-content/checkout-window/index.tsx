"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { CheckoutProductsTab } from "./checkout-products-tab";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";

/**
 * Checkout Window - Org Owner Interface
 *
 * This window allows org owners to create and manage checkout products.
 * Checkout products wrap any object (product, ticket, event) to make it sellable.
 *
 * Tabs:
 * - Checkout Products: List of all checkout products
 * - Settings: Stripe configuration (future)
 * - Analytics: Sales metrics (future)
 *
 * Note: To create checkout pages, use Web Publishing → Create Page → Link Products
 */

type TabType = "products" | "settings" | "analytics";

export function CheckoutWindow() {
  const [activeTab, setActiveTab] = useState<TabType>("products");

  // Check app availability
  const guard = useAppAvailabilityGuard({
    code: "checkout",
    name: "Checkout",
    description: "Create and manage checkout pages for products, tickets, and services"
  });

  if (guard) return guard;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <ShoppingCart size={16} />
          Checkout
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          Create and manage checkout pages for your products
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "products" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "products" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("products")}
        >
          <ShoppingCart size={14} />
          Checkout Products
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2 opacity-50 cursor-not-allowed"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)',
            color: 'var(--neutral-gray)'
          }}
          disabled
          title="Coming soon"
        >
          Settings
        </button>
        <button
          className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 opacity-50 cursor-not-allowed"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)',
            color: 'var(--neutral-gray)'
          }}
          disabled
          title="Coming soon"
        >
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "products" && <CheckoutProductsTab />}
        {activeTab === "settings" && <div className="p-4 text-xs text-gray-500">Stripe settings coming soon...</div>}
        {activeTab === "analytics" && <div className="p-4 text-xs text-gray-500">Sales analytics coming soon...</div>}
      </div>
    </div>
  );
}
