"use client";

import { useState, useMemo, useCallback, type DragEvent } from "react";
import { useMutation, useQuery } from "convex/react";
// Dynamic require avoids TS2589 deep type instantiation on generated Convex API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../convex/_generated/api") as { api: any };
import type { NodeDefinition, NodeCategory } from "../../../convex/layers/types";
import { getAllNodeDefinitions } from "../../../convex/layers/nodeRegistry";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface ToolChestProps {
  onNodeDragStart: (event: DragEvent, definition: NodeDefinition) => void;
  sessionId: string | null;
  placedNodeTypes: Set<string>;
}

const CATEGORY_META: Record<
  NodeCategory,
  { labelKey: string; labelFallback: string; descriptionKey: string; descriptionFallback: string }
> = {
  trigger: {
    labelKey: "ui.app.layers.tool_chest.category.trigger",
    labelFallback: "Triggers",
    descriptionKey: "ui.app.layers.tool_chest.category_description.trigger",
    descriptionFallback: "Start your workflow",
  },
  integration: {
    labelKey: "ui.app.layers.tool_chest.category.integration",
    labelFallback: "Integrations",
    descriptionKey: "ui.app.layers.tool_chest.category_description.integration",
    descriptionFallback: "Third-party services",
  },
  logic: {
    labelKey: "ui.app.layers.tool_chest.category.logic",
    labelFallback: "Logic & Flow",
    descriptionKey: "ui.app.layers.tool_chest.category_description.logic",
    descriptionFallback: "Control flow",
  },
  lc_native: {
    labelKey: "ui.app.layers.tool_chest.category.lc_native",
    labelFallback: "Layer Cake",
    descriptionKey: "ui.app.layers.tool_chest.category_description.lc_native",
    descriptionFallback: "Built-in tools",
  },
};

const CATEGORY_ORDER: NodeCategory[] = [
  "trigger",
  "integration",
  "logic",
  "lc_native",
];

const SUBCATEGORY_LABELS: Record<string, { key: string; fallback: string }> = {
  triggers: { key: "ui.app.layers.tool_chest.subcategory.triggers", fallback: "Triggers" },
  crm: { key: "ui.app.layers.tool_chest.subcategory.crm", fallback: "CRM" },
  email_marketing: { key: "ui.app.layers.tool_chest.subcategory.email_marketing", fallback: "Email Marketing" },
  messaging: { key: "ui.app.layers.tool_chest.subcategory.messaging", fallback: "Messaging" },
  communication: { key: "ui.app.layers.tool_chest.subcategory.communication", fallback: "Communication" },
  email_delivery: { key: "ui.app.layers.tool_chest.subcategory.email_delivery", fallback: "Email Delivery" },
  websites: { key: "ui.app.layers.tool_chest.subcategory.websites", fallback: "Websites" },
  payments: { key: "ui.app.layers.tool_chest.subcategory.payments", fallback: "Payments" },
  automation: { key: "ui.app.layers.tool_chest.subcategory.automation", fallback: "Automation" },
  calendar: { key: "ui.app.layers.tool_chest.subcategory.calendar", fallback: "Calendar" },
  analytics: { key: "ui.app.layers.tool_chest.subcategory.analytics", fallback: "Analytics" },
  dev_deploy: { key: "ui.app.layers.tool_chest.subcategory.dev_deploy", fallback: "Dev / Deploy" },
  office: { key: "ui.app.layers.tool_chest.subcategory.office", fallback: "Office" },
  flow_control: { key: "ui.app.layers.tool_chest.subcategory.flow_control", fallback: "Flow Control" },
  data: { key: "ui.app.layers.tool_chest.subcategory.data", fallback: "Data" },
  forms: { key: "ui.app.layers.tool_chest.subcategory.forms", fallback: "Forms" },
  support: { key: "ui.app.layers.tool_chest.subcategory.support", fallback: "Support" },
  events: { key: "ui.app.layers.tool_chest.subcategory.events", fallback: "Events" },
  email: { key: "ui.app.layers.tool_chest.subcategory.email", fallback: "Email" },
  ai: { key: "ui.app.layers.tool_chest.subcategory.ai", fallback: "AI" },
  storage: { key: "ui.app.layers.tool_chest.subcategory.storage", fallback: "Storage" },
  certificates: { key: "ui.app.layers.tool_chest.subcategory.certificates", fallback: "Certificates" },
};

export function ToolChest({ onNodeDragStart, sessionId, placedNodeTypes }: ToolChestProps) {
  const { tWithFallback } = useNamespaceTranslations("ui.app.layers")
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<
    Set<NodeCategory>
  >(new Set(["trigger"]));

  const allNodes = useMemo(() => getAllNodeDefinitions(), []);

  // Upvote system
  const useMutationUntyped = useMutation as (mutation: unknown) => any;
  const useQueryUntyped = useQuery as (query: unknown, args: unknown) => any;
  const upvoteIntegration = useMutationUntyped(
    (api as any).layers.layerWorkflowOntology.upvoteIntegration,
  ) as (args: { sessionId: string; integrationType: string; nodeType: string }) => Promise<{
    alreadyVoted?: boolean;
  }>;
  const upvoteCounts = useQueryUntyped(
    (api as any).layers.layerWorkflowOntology.getUpvoteCounts,
    sessionId ? { sessionId } : "skip",
  ) as Array<{ nodeType: string; count: number }> | undefined;
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
    <aside className="flex w-56 shrink-0 flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Search */}
      <div className="border-b border-[var(--color-border)] p-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tWithFallback("ui.app.layers.tool_chest.search_placeholder", "Search nodes...")}
          aria-label={tWithFallback("ui.app.layers.tool_chest.search_aria_label", "Search nodes")}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-border-focus)]"
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
                      {tWithFallback(meta.labelKey, meta.labelFallback)}
                    </span>
                    <span className="ml-1.5 text-xs text-muted-foreground/60">
                      {categoryNodes.length}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
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
                            <div className="px-2 pb-0.5 pt-1 text-xs font-medium text-muted-foreground/50">
                              {SUBCATEGORY_LABELS[sub]
                                ? tWithFallback(
                                    SUBCATEGORY_LABELS[sub].key,
                                    SUBCATEGORY_LABELS[sub].fallback,
                                  )
                                : sub}
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
                                isSingletonPlaced={Boolean(def.singleton && placedNodeTypes.has(def.type))}
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
  isSingletonPlaced,
}: {
  definition: NodeDefinition;
  onDragStart: (event: DragEvent, definition: NodeDefinition) => void;
  upvoteCount: number;
  hasVoted: boolean;
  onUpvote: (def: NodeDefinition) => void;
  isSingletonPlaced: boolean;
}) {
  const { tWithFallback } = useNamespaceTranslations("ui.app.layers");
  const isComingSoon = definition.integrationStatus === "coming_soon";
  const isDisabled = isComingSoon || isSingletonPlaced;
  const disabledTitle = isSingletonPlaced
    ? tWithFallback(
        "ui.app.layers.tool_chest.singleton_disabled_title",
        "{name} is already placed in this workflow. Only one is allowed.",
        { name: definition.name },
      )
    : definition.description;

  return (
    <div
      draggable={!isDisabled}
      onDragStart={(e) => {
        if (isDisabled) return;
        onDragStart(e, definition);
      }}
      className={`group flex cursor-grab items-center gap-2 rounded-md border px-2 py-1.5 text-xs text-[var(--color-text)] transition-colors active:cursor-grabbing ${
        isDisabled
          ? "cursor-default border-dashed border-[var(--color-border)] opacity-50"
          : "border-[var(--color-border)] hover:border-[var(--color-info)] hover:bg-[var(--color-surface-hover)]"
      }`}
      style={{ background: isDisabled ? "transparent" : "var(--color-surface-raised)" }}
      title={disabledTitle}
      aria-disabled={isDisabled}
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
            className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-xs transition-colors ${
              hasVoted
                ? "text-blue-400"
                : "text-muted-foreground hover:bg-slate-700 hover:text-blue-400"
            }`}
            title={
              hasVoted
                ? tWithFallback("ui.app.layers.tool_chest.upvote.already_voted", "You voted for this")
                : tWithFallback("ui.app.layers.tool_chest.upvote.vote", "Vote to prioritize this integration")
            }
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill={hasVoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            {upvoteCount > 0 && <span>{upvoteCount}</span>}
          </button>
          <span className="text-xs uppercase text-muted-foreground">
            {tWithFallback("ui.app.layers.tool_chest.badge.soon", "soon")}
          </span>
        </div>
      )}
      {!isComingSoon && isSingletonPlaced && (
        <>
          <span className="shrink-0 text-xs uppercase text-amber-300">placed</span>
          <span className="sr-only">
            {tWithFallback("ui.app.layers.tool_chest.badge.placed", "placed")}
          </span>
        </>
      )}
      {definition.integrationStatus === "available" &&
        definition.requiresAuth && (
          <span className="shrink-0 text-xs text-blue-500">
            {tWithFallback("ui.app.layers.tool_chest.badge.key", "key")}
          </span>
        )}
    </div>
  );
}
