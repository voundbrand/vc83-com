"use client";

import { useState } from "react";
import { Database, Network, Settings, List } from "lucide-react";
import { ObjectBrowser } from "./object-browser";
import { ObjectDetail } from "./object-detail";
import { LinksGraphTab } from "./links-graph-tab";
import { TypesTab } from "./types-tab";
import { ConfigTab } from "./config-tab";

type TabType = "objects" | "links" | "types" | "config";

export function OntologyAdminWindow() {
  const [activeTab, setActiveTab] = useState<TabType>("objects");
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2 shrink-0" style={{ borderColor: 'var(--win95-border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥷</span>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>Ontology Admin</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--neutral-gray)' }}>
              Super Admin Interface - Manage Objects, Links & Configuration
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 shrink-0" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <TabButton
          icon={<Database size={14} />}
          label="Objects"
          active={activeTab === "objects"}
          onClick={() => setActiveTab("objects")}
        />
        <TabButton
          icon={<Network size={14} />}
          label="Links Graph"
          active={activeTab === "links"}
          onClick={() => setActiveTab("links")}
        />
        <TabButton
          icon={<List size={14} />}
          label="Types"
          active={activeTab === "types"}
          onClick={() => setActiveTab("types")}
        />
        <TabButton
          icon={<Settings size={14} />}
          label="Config"
          active={activeTab === "config"}
          onClick={() => setActiveTab("config")}
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "objects" && (
          <div className="flex h-full">
            {/* Left Panel: Object Browser (30%) */}
            <div className="w-[30%] border-r-2 flex flex-col" style={{ borderColor: 'var(--win95-border)' }}>
              <ObjectBrowser
                selectedObjectId={selectedObjectId}
                onSelectObject={setSelectedObjectId}
              />
            </div>

            {/* Right Panel: Object Detail (70%) */}
            <div className="flex-1 overflow-auto">
              <ObjectDetail objectId={selectedObjectId} />
            </div>
          </div>
        )}

        {activeTab === "links" && <LinksGraphTab />}

        {activeTab === "types" && <TypesTab />}

        {activeTab === "config" && <ConfigTab />}
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center gap-2 px-4 py-2 text-xs font-bold border-r-2 transition-colors"
      style={{
        borderColor: 'var(--win95-border)',
        background: active ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
        color: active ? 'var(--win95-text)' : 'var(--neutral-gray)',
      }}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
