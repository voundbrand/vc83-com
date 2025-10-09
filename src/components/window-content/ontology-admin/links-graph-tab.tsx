"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Network, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { Id } from "../../../../convex/_generated/dataModel";

const TYPE_COLORS: Record<string, string> = {
  translation: "#3B82F6", // blue
  organization_profile: "#10B981", // green
  organization_contact: "#F59E0B", // amber
  organization_social: "#EC4899", // pink
  organization_legal: "#8B5CF6", // purple
  organization_settings: "#6366F1", // indigo
  address: "#EF4444", // red
};

const TYPE_ICONS: Record<string, string> = {
  translation: "🌐",
  organization_profile: "🏢",
  organization_contact: "📧",
  organization_social: "📱",
  organization_legal: "⚖️",
  organization_settings: "⚙️",
  address: "🏠",
};

export function LinksGraphTab() {
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const { sessionId } = useAuth();

  // Get all objects to build the graph
  const objects = useQuery(
    api.ontologyAdmin.getAllObjects,
    sessionId
      ? {
          sessionId,
          limit: 100, // Limit for performance
          offset: 0,
        }
      : "skip"
  );

  // Get details of selected object (if any)
  const selectedObject = useQuery(
    api.ontologyAdmin.getObjectById,
    selectedObjectId && sessionId
      ? { objectId: selectedObjectId as Id<"objects">, sessionId }
      : "skip"
  );

  if (!objects) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
          <Network size={48} className="mx-auto mb-4 animate-pulse" />
          <p className="text-sm">Loading graph data...</p>
        </div>
      </div>
    );
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleFit = () => setZoom(1);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <div className="flex items-center gap-2">
          <RetroButton onClick={handleZoomOut} className="px-2 py-1">
            <ZoomOut size={14} />
          </RetroButton>
          <span className="text-xs font-mono" style={{ color: 'var(--win95-text)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <RetroButton onClick={handleZoomIn} className="px-2 py-1">
            <ZoomIn size={14} />
          </RetroButton>
          <RetroButton onClick={handleFit} className="px-2 py-1">
            <Maximize size={14} />
          </RetroButton>
        </div>

        <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
          {objects.objects.length} objects loaded
          {selectedObjectId && selectedObject && (
            <span className="ml-2 font-bold" style={{ color: 'var(--win95-text)' }}>
              • Selected: {selectedObject.name}
            </span>
          )}
        </div>
      </div>

      {/* Graph Visualization Area */}
      <div className="flex-1 overflow-hidden relative" style={{ background: 'var(--win95-bg)' }}>
        {/* Simple Node-Link Visualization */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}
        >
          <div className="relative w-full h-full p-8">
            {/* Grid Background */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `
                  linear-gradient(var(--win95-border) 1px, transparent 1px),
                  linear-gradient(90deg, var(--win95-border) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
              }}
            />

            {/* Simple Node Grid */}
            <div className="grid grid-cols-4 gap-8 max-w-4xl mx-auto mt-8">
              {objects.objects.slice(0, 12).map((obj) => {
                const icon = TYPE_ICONS[obj.type] || "📦";
                const color = TYPE_COLORS[obj.type] || "#6B7280";
                const isSelected = selectedObjectId === obj._id;

                return (
                  <button
                    key={obj._id}
                    onClick={() => setSelectedObjectId(obj._id)}
                    className="flex flex-col items-center gap-2 p-3 rounded border-2 transition-all hover:shadow-lg"
                    style={{
                      borderColor: isSelected ? color : 'var(--win95-border)',
                      background: isSelected ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <div className="text-2xl">{icon}</div>
                    <div className="text-xs font-bold text-center truncate w-full" style={{ color: 'var(--win95-text)' }}>
                      {obj.name}
                    </div>
                    <div className="text-[10px] text-center truncate w-full" style={{ color: 'var(--neutral-gray)' }}>
                      {obj.type}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Link indicators (simplified) */}
            {selectedObject && (selectedObject.outgoingLinks.length > 0 || selectedObject.incomingLinks.length > 0) && (
              <div className="absolute bottom-8 left-8 right-8 border-2 rounded p-4" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
                <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  {selectedObject.name} - Links
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                      Outgoing ({selectedObject.outgoingLinks.length})
                    </p>
                    {selectedObject.outgoingLinks.slice(0, 3).map((link) => (
                      <div key={link._id} style={{ color: 'var(--neutral-gray)' }}>
                        → {link.targetObject?.name || 'Unknown'} ({link.linkType})
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                      Incoming ({selectedObject.incomingLinks.length})
                    </p>
                    {selectedObject.incomingLinks.slice(0, 3).map((link) => (
                      <div key={link._id} style={{ color: 'var(--neutral-gray)' }}>
                        ← {link.sourceObject?.name || 'Unknown'} ({link.linkType})
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 border-2 rounded p-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
          <h4 className="text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>Legend</h4>
          <div className="space-y-1 text-xs">
            {Object.entries(TYPE_ICONS).map(([type, icon]) => (
              <div key={type} className="flex items-center gap-2">
                <span>{icon}</span>
                <span style={{ color: 'var(--neutral-gray)' }}>{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {objects.objects.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center" style={{ color: 'var(--neutral-gray)' }}>
              <Network size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">No objects to visualize</p>
              <p className="text-xs mt-1">Create some ontology objects to see the graph</p>
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="px-4 py-2 border-t-2 text-xs" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)', color: 'var(--neutral-gray)' }}>
        💡 Tip: Click on a node to see its links. For full interactive graph with drag & drop, use a library like React Flow (future enhancement).
      </div>
    </div>
  );
}
