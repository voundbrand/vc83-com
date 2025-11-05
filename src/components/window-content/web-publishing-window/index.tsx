"use client";

import { useState } from "react";
import { Globe, FileText, Plus, Settings, BarChart3 } from "lucide-react";
import { PublishedPagesTab } from "./published-pages-tab";
import { CreatePageTab } from "./create-page-tab";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Web Publishing Window - Org Owner Interface
 *
 * This window is available to org owners when the Web Publishing app is enabled.
 * It allows them to create and manage published pages using available templates.
 *
 * Tabs:
 * - Published Pages: List of org's published pages (draft, published, unpublished)
 * - Create/Edit Page: Same UI for creating new or editing existing pages
 * - Settings: Domain configuration, SEO defaults (future)
 * - Analytics: Page views, conversions (future)
 */

type TabType = "pages" | "create" | "settings" | "analytics";

interface EditMode {
  pageId: Id<"objects">;
  pageData: {
    _id: Id<"objects">;
    name: string;
    customProperties?: {
      slug: string;
      metaTitle: string;
      metaDescription?: string;
      templateCode?: string;
      themeCode?: string;
      templateContent?: Record<string, unknown>;
    };
  };
}

export function WebPublishingWindow() {
  const [activeTab, setActiveTab] = useState<TabType>("pages");
  const [editMode, setEditMode] = useState<EditMode | null>(null);

  // Check app availability - returns guard component if unavailable/loading, null if available
  const guard = useAppAvailabilityGuard({
    code: "web-publishing",
    name: "Web Publishing",
    description: "Create and manage public web pages using customizable templates"
  });

  if (guard) return guard;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <Globe size={16} />
          Web Publishing
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          Create and manage public pages with templates
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "pages" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "pages" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("pages")}
        >
          <FileText size={14} />
          Published Pages
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "create" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "create" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => {
            setEditMode(null); // Clear edit mode when creating new page
            setActiveTab("create");
          }}
        >
          <Plus size={14} />
          Create Page
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
      <div className="flex-1 overflow-y-auto">
        {activeTab === "pages" && (
          <PublishedPagesTab
            onEditPage={(page) => {
              setEditMode({
                pageId: page._id,
                pageData: page,
              });
              setActiveTab("create");
            }}
          />
        )}
        {activeTab === "create" && (
          <CreatePageTab
            editMode={editMode}
          />
        )}
        {activeTab === "settings" && <div className="p-4 text-xs text-gray-500">Settings coming soon...</div>}
        {activeTab === "analytics" && <div className="p-4 text-xs text-gray-500">Analytics coming soon...</div>}
      </div>
    </div>
  );
}
