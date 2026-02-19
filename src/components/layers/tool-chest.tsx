"use client";

import { useState, useMemo, useCallback, type DragEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { NodeDefinition, NodeCategory } from "../../../convex/layers/types";
import { getAllNodeDefinitions } from "../../../convex/layers/nodeRegistry";

interface ToolChestProps {
  onNodeDragStart: (event: DragEvent, definition: NodeDefinition) => void;
  sessionId: string | null;
}

const CATEGORY_META: Record<
  NodeCategory,
  { label: string; description: string }
> = {
  trigger: { label: "Triggers", description: "Start your workflow" },
  integration: { label: "Integrations", description: "Third-party services" },
  logic: { label: "Logic & Flow", description: "Control flow" },
  lc_native: { label: "Layer Cake", description: "Built-in tools" },
};

const CATEGORY_ORDER: NodeCategory[] = [
  "trigger",
  "integration",
  "logic",
  "lc_native",
];

const SUBCATEGORY_LABELS: Record<string, string> = {
  triggers: "Triggers",
  crm: "CRM",
  email_marketing: "Email Marketing",
  messaging: "Messaging",
  communication: "Communication",
  email_delivery: "Email Delivery",
  websites: "Websites",
  payments: "Payments",
  automation: "Automation",
  calendar: "Calendar",
  analytics: "Analytics",
  dev_deploy: "Dev / Deploy",
  office: "Office",
  flow_control: "Flow Control",
  data: "Data",
  forms: "Forms",
  support: "Support",
  events: "Events",
  email: "Email",
  ai: "AI",
  storage: "Storage",
  certificates: "Certificates",
};

export function ToolChest({ onNodeDragStart, sessionId }: ToolChestProps) {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<
    Set<NodeCategory>
  >(new Set(["trigger"]));

  const allNodes = useMemo(() => getAllNodeDefinitions(), []);

  // Upvote system
  const upvoteIntegration = useMutation(api.layers.layerWorkflowOntology.upvoteIntegration);
  const upvoteCounts = useQuery(
    api.layers.layerWorkflowOntology.getUpvoteCounts,
    sessionId ? { sessionId } : "skip",
  );
  const [votedTypes, setVotedTypes] = useState<Set<string>>(new Set());

  const upvoteCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (upvoteCounts) {
      for (const entry of upvoteCounts) {
        map[entry.nodeType] = entry.count;
      }
    }
    return map;
  }, [upvoteCounts]);

  const handleUpvote = useCallback(
    async (def: NodeDefinition) => {
      if (!sessionId || votedTypes.has(def.type)) return;
      setVotedTypes((prev) => new Set(prev).add(def.type));
      try {
        const result = await upvoteIntegration({
          sessionId,
          integrationType: def.name,
          nodeType: def.type,
        });
        if (result.alreadyVoted) {
          // Already voted server-side, keep in local set
        }
      } catch {
        // Revert optimistic update on error
        setVotedTypes((prev) => {
          const next = new Set(prev);
          next.delete(def.type);
          return next;
        });
      }
    },
    [sessionId, votedTypes, upvoteIntegration],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return allNodes;
    const q = search.toLowerCase();
    return allNodes.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.subcategory.toLowerCase().includes(q),
    );
  }, [allNodes, search]);

  const toggleCategory = (cat: NodeCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col overflow-hidden border-r border-slate-800" style={{ background: "#0f0f12" }}>
      {/* Search */}
      <div className="border-b border-slate-800 p-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search nodes..."
          className="w-full rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          style={{ background: "#18181b" }}
        />
      </div>

      {/* Category sections */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {CATEGORY_ORDER.map((category) => {
            const meta = CATEGORY_META[category];
            const categoryNodes = filtered.filter(
              (n) => n.category === category,
            );
            if (categoryNodes.length === 0) return null;

            const isExpanded = expandedCategories.has(category) || search.trim().length > 0;

            // Group by subcategory
            const subcategories = [
              ...new Set(categoryNodes.map((n) => n.subcategory)),
            ];

            return (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-accent"
                >
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {meta.label}
                    </span>
                    <span className="ml-1.5 text-[10px] text-muted-foreground/60">
                      {categoryNodes.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {isExpanded ? "−" : "+"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="mt-1 space-y-2 pb-2">
                    {subcategories.map((sub) => {
                      const subNodes = categoryNodes.filter(
                        (n) => n.subcategory === sub,
                      );
                      return (
                        <div key={sub}>
                          {subcategories.length > 1 && (
                            <div className="px-2 pb-0.5 pt-1 text-[10px] font-medium text-muted-foreground/50">
                              {SUBCATEGORY_LABELS[sub] ?? sub}
                            </div>
                          )}
                          <div className="space-y-0.5">
                            {subNodes.map((def) => (
                              <DraggableNode
                                key={def.type}
                                definition={def}
                                onDragStart={onNodeDragStart}
                                upvoteCount={upvoteCountMap[def.type] ?? 0}
                                hasVoted={votedTypes.has(def.type)}
                                onUpvote={handleUpvote}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// DRAGGABLE NODE ITEM
// ============================================================================

function DraggableNode({
  definition,
  onDragStart,
  upvoteCount,
  hasVoted,
  onUpvote,
}: {
  definition: NodeDefinition;
  onDragStart: (event: DragEvent, definition: NodeDefinition) => void;
  upvoteCount: number;
  hasVoted: boolean;
  onUpvote: (def: NodeDefinition) => void;
}) {
  const isComingSoon = definition.integrationStatus === "coming_soon";

  return (
    <div
      draggable={!isComingSoon}
      onDragStart={(e) => {
        if (isComingSoon) return;
        onDragStart(e, definition);
      }}
      className={`group flex cursor-grab items-center gap-2 rounded-md border px-2 py-1.5 text-xs text-slate-200 transition-colors active:cursor-grabbing ${
        isComingSoon
          ? "cursor-default border-dashed border-slate-700 opacity-50"
          : "border-slate-700 hover:border-blue-500/40 hover:bg-slate-800"
      }`}
      style={{ background: isComingSoon ? "transparent" : "#18181b" }}
      title={definition.description}
    >
      {/* Color dot */}
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: definition.color }}
      />

      {/* Name */}
      <span className="flex-1 truncate font-medium">{definition.name}</span>

      {/* Status badges */}
      {isComingSoon && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpvote(definition);
            }}
            disabled={hasVoted}
            className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] transition-colors ${
              hasVoted
                ? "text-blue-400"
                : "text-muted-foreground hover:bg-slate-700 hover:text-blue-400"
            }`}
            title={hasVoted ? "You voted for this" : "Vote to prioritize this integration"}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill={hasVoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            {upvoteCount > 0 && <span>{upvoteCount}</span>}
          </button>
          <span className="text-[9px] uppercase text-muted-foreground">soon</span>
        </div>
      )}
      {definition.integrationStatus === "available" &&
        definition.requiresAuth && (
          <span className="shrink-0 text-[9px] text-blue-500">key</span>
        )}
    </div>
  );
}
