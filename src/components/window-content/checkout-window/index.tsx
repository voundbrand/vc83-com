"use client";

import { useState } from "react";
import { FileText, ShoppingCart, Settings, BarChart3 } from "lucide-react";
import { CheckoutTemplatesTab } from "./checkout-templates-tab";
import { CheckoutsListTab } from "./checkouts-list-tab";
import { CreateCheckoutTab } from "./create-checkout-tab";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { Id } from "../../../../convex/_generated/dataModel";

/**
 * Checkout Window - Complete Checkout Management
 *
 * Tabs:
 * - Checkouts: List of all checkout instances (like Pages in Web Publishing)
 * - Create: Template selector + editor for creating/editing checkouts
 * - Templates: Browse available templates
 * - Settings: Stripe configuration (future)
 * - Analytics: Sales metrics (future)
 *
 * Workflow:
 * 1. User clicks "Create Checkout" → Goes to Create tab
 * 2. Selects template → Opens editor
 * 3. Configures checkout (payment, products, branding)
 * 4. Saves → Appears in Checkouts tab
 * 5. Can embed in Web Publishing or use standalone
 */

type TabType = "checkouts" | "create" | "templates" | "settings" | "analytics";

export function CheckoutWindow() {
  const [activeTab, setActiveTab] = useState<TabType>("checkouts");
  const [editingInstanceId, setEditingInstanceId] = useState<Id<"objects"> | null>(null);

  // Check app availability
  const guard = useAppAvailabilityGuard({
    code: "checkout",
    name: "Checkout",
    description: "Create and manage checkout pages for products, tickets, and services"
  });

  if (guard) return guard;

  // Handle navigation
  const handleCreateNew = () => {
    setEditingInstanceId(null);
    setActiveTab("create");
  };

  const handleEdit = (instanceId: Id<"objects">) => {
    setEditingInstanceId(instanceId);
    setActiveTab("create");
  };

  const handleSaveComplete = () => {
    setEditingInstanceId(null);
    setActiveTab("checkouts");
  };

  const handleCancel = () => {
    setEditingInstanceId(null);
    setActiveTab("checkouts");
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <ShoppingCart size={16} />
          Checkout Manager
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          Create and manage checkout pages for your products and events
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "checkouts" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "checkouts" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("checkouts")}
        >
          <ShoppingCart size={14} />
          Checkouts
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "create" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "create" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={handleCreateNew}
        >
          <FileText size={14} />
          Create
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "templates" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "templates" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("templates")}
        >
          <FileText size={14} />
          Templates
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
          <Settings size={14} />
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
          <BarChart3 size={14} />
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "checkouts" && (
          <CheckoutsListTab
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
          />
        )}
        {activeTab === "create" && (
          <CreateCheckoutTab
            editingInstanceId={editingInstanceId}
            onSaveComplete={handleSaveComplete}
            onCancel={handleCancel}
          />
        )}
        {activeTab === "templates" && <CheckoutTemplatesTab onCreateNew={handleCreateNew} />}
        {activeTab === "settings" && (
          <div className="p-8 text-center">
            <Settings size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="font-bold text-sm mb-2">Settings Coming Soon</h3>
            <p className="text-xs text-gray-500">Configure Stripe integration and checkout options</p>
          </div>
        )}
        {activeTab === "analytics" && (
          <div className="p-8 text-center">
            <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="font-bold text-sm mb-2">Analytics Coming Soon</h3>
            <p className="text-xs text-gray-500">Track sales, conversions, and revenue metrics</p>
          </div>
        )}
      </div>
    </div>
  );
}
