"use client";

/**
 * REVIEW MODE
 *
 * Browse and manage the organization's knowledge base.
 * Shows all extracted knowledge, Content DNA profiles, and uploaded sources.
 */

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Library,
  Search,
  FileText,
  Link2,
  AlignLeft,
  Calendar,
  ChevronRight,
  Loader2,
  Database,
  Sparkles,
  ExternalLink,
  MoreHorizontal,
  AlertCircle,
} from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  InteriorButton,
  InteriorHeader,
  InteriorHelperText,
  InteriorInput,
  InteriorPanel,
  InteriorRoot,
  InteriorSubtitle,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";
import type { BrainTranslate } from "./index";

interface ReviewModeProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  tr: BrainTranslate;
}

type KnowledgeCategory = "all" | "content_dna" | "documents" | "links" | "notes";
type ReviewKnowledgeItem = {
  id: string;
  category: Exclude<KnowledgeCategory, "all">;
  title: string;
  description: string;
  source: string;
  createdAt: number;
  linkUrl?: string;
  sourceObjectIds: string[];
};

type ReviewKnowledgeResponse =
  | {
      status: "ok";
      items: ReviewKnowledgeItem[];
      counts: Record<KnowledgeCategory, number>;
    }
  | {
      status: "error";
      error: string;
      items: ReviewKnowledgeItem[];
      counts: Record<KnowledgeCategory, number>;
    };

const CATEGORY_CONFIG: Record<KnowledgeCategory, { icon: typeof Library; label: string }> = {
  all: { icon: Library, label: "All Knowledge" },
  content_dna: { icon: Sparkles, label: "Content DNA" },
  documents: { icon: FileText, label: "Documents" },
  links: { icon: Link2, label: "Web Links" },
  notes: { icon: AlignLeft, label: "Notes" },
};

export function ReviewMode({ sessionId, organizationId, tr }: ReviewModeProps) {
  const [category, setCategory] = useState<KnowledgeCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const { t } = useNamespaceTranslations("ui.brain");
  const trLocal = useMemo(
    () =>
      (key: string, fallback: string, params?: Record<string, string | number>) => {
        const value = t(key, params);
        return value === key ? fallback : value;
      },
    [t],
  );
  const tx = tr ?? trLocal;

  const listReviewKnowledgeQuery = api.brainKnowledge.listReviewKnowledge;
  const reviewData = useQuery(listReviewKnowledgeQuery, {
    sessionId,
    organizationId,
    category,
    searchQuery: searchQuery.trim() || undefined,
    refreshToken,
  }) as ReviewKnowledgeResponse | undefined;

  const isLoading = reviewData === undefined;
  const isError = reviewData?.status === "error";
  const errorMessage = reviewData?.status === "error"
    ? reviewData.error
    : "Unable to load knowledge items.";

  const filteredItems = useMemo(
    () => (reviewData?.status === "ok" ? reviewData.items : []),
    [reviewData],
  );
  const categoryCounts = useMemo(
    () =>
      reviewData?.status === "ok"
        ? reviewData.counts
        : { all: 0, content_dna: 0, documents: 0, links: 0, notes: 0 },
    [reviewData],
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return tx("ui.brain.review.date.today", "Today");
    if (diffDays === 1) return tx("ui.brain.review.date.yesterday", "Yesterday");
    if (diffDays < 7) {
      return tx("ui.brain.review.date.days_ago", `${diffDays} days ago`, { count: diffDays });
    }
    return date.toLocaleDateString();
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "content_dna":
        return Sparkles;
      case "documents":
        return FileText;
      case "links":
        return Link2;
      case "notes":
        return AlignLeft;
      default:
        return Database;
    }
  };

  return (
    <InteriorRoot className="flex h-full">
      <div
        className="flex w-60 flex-col border-r"
        style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
      >
        <div className="border-b p-3" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--desktop-menu-text-muted)" }} />
            <InteriorInput
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tx("ui.brain.review.search.placeholder", "Search knowledge...")}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {(Object.keys(CATEGORY_CONFIG) as KnowledgeCategory[]).map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const count = categoryCounts[cat];
            const isActive = category === cat;
            const label = tx(`ui.brain.review.category.${cat}`, config.label);
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                style={{
                  color: isActive ? "var(--window-document-text)" : "var(--desktop-menu-text-muted)",
                  background: isActive ? "var(--window-document-bg)" : "transparent",
                  borderRight: isActive ? "2px solid var(--tone-accent-strong)" : "2px solid transparent",
                }}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 truncate">{label}</span>
                <span className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="border-t px-3 py-2" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
            <Database className="h-3.5 w-3.5" />
            <span>
              {tx("ui.brain.review.stats.total_items", "{count} total items", {
                count: categoryCounts.all,
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <InteriorHeader className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <InteriorTitle className="text-base">
                {tx(`ui.brain.review.category.${category}`, CATEGORY_CONFIG[category].label)}
              </InteriorTitle>
              <InteriorSubtitle className="mt-1">
                {tx(
                  "ui.brain.review.stats.visible_items",
                  `${filteredItems.length} item${filteredItems.length !== 1 ? "s" : ""}`,
                  { count: filteredItems.length },
                )}
                {searchQuery
                  ? ` ${tx("ui.brain.review.stats.matching", `matching "${searchQuery}"`, {
                      query: searchQuery,
                    })}`
                  : ""}
              </InteriorSubtitle>
            </div>

            <InteriorButton onClick={() => setRefreshToken((value) => value + 1)} variant="subtle" size="sm">
              {tx("ui.brain.review.actions.refresh", "Refresh")}
            </InteriorButton>
          </div>
        </InteriorHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tone-accent-strong)" }} />
              <InteriorHelperText>
                {tx("ui.brain.review.state.loading", "Loading knowledge base...")}
              </InteriorHelperText>
            </div>
          ) : isError ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <AlertCircle className="mb-3 h-10 w-10" style={{ color: "var(--error)" }} />
              <InteriorTitle className="text-sm">
                {tx("ui.brain.review.state.error.title", "Could not load the knowledge base.")}
              </InteriorTitle>
              <InteriorHelperText className="mt-1">{errorMessage}</InteriorHelperText>
              <InteriorButton
                onClick={() => setRefreshToken((value) => value + 1)}
                variant="subtle"
                size="sm"
                className="mt-3"
              >
                {tx("ui.brain.review.actions.retry", "Retry")}
              </InteriorButton>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Library className="mb-3 h-10 w-10" style={{ color: "var(--desktop-menu-text-muted)" }} />
              <InteriorTitle className="text-sm">
                {searchQuery
                  ? tx("ui.brain.review.state.empty_search", "No items match your search.")
                  : tx("ui.brain.review.state.empty", "No knowledge items yet.")}
              </InteriorTitle>
              <InteriorHelperText className="mt-1">
                {tx("ui.brain.review.state.empty_hint", "Use Learn or Teach mode to add knowledge.")}
              </InteriorHelperText>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-2">
              {filteredItems.map((item) => {
                const Icon = getCategoryIcon(item.category);
                const isSelected = selectedItem === item.id;
                return (
                  <InteriorPanel
                    key={item.id}
                    className="cursor-pointer p-4 transition-colors"
                    style={isSelected ? { borderColor: "var(--tone-accent-strong)" } : undefined}
                    onClick={() => setSelectedItem(isSelected ? null : item.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="rounded border p-2"
                        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                      >
                        <Icon className="h-4 w-4" style={{ color: "var(--tone-accent-strong)" }} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                            {item.title}
                          </h3>
                          {item.category === "content_dna" && (
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{ border: "1px solid var(--window-document-border)", color: "var(--desktop-menu-text-muted)" }}
                            >
                              {tx("ui.brain.review.badge.dna", "DNA")}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm" style={{ color: "var(--desktop-menu-text-muted)" }}>
                          {item.description}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(item.createdAt)}
                          </span>
                          <span>{item.source}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {item.category === "links" && item.linkUrl && (
                          <InteriorButton
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(item.linkUrl, "_blank");
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            title={tx("ui.brain.review.actions.open_link", "Open link")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </InteriorButton>
                        )}
                        <InteriorButton
                          onClick={(e) => e.stopPropagation()}
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </InteriorButton>
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${isSelected ? "rotate-90" : ""}`}
                          style={{ color: "var(--desktop-menu-text-muted)" }}
                        />
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--window-document-border)" }}>
                        <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                          {tx("ui.brain.review.expanded.full_content", "Full content:")}
                        </p>
                        <p className="mt-1 text-sm" style={{ color: "var(--desktop-menu-text-muted)" }}>
                          {item.description}
                        </p>
                        {item.sourceObjectIds.length > 0 && (
                          <p className="mt-2 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                            {tx(
                              "ui.brain.review.expanded.source_ids",
                              `Source IDs: ${item.sourceObjectIds.join(", ")}`,
                              { ids: item.sourceObjectIds.join(", ") },
                            )}
                          </p>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <InteriorButton size="sm" variant="subtle">
                            {tx("ui.brain.review.actions.edit", "Edit")}
                          </InteriorButton>
                          <InteriorButton size="sm" variant="danger">
                            {tx("ui.brain.review.actions.delete", "Delete")}
                          </InteriorButton>
                        </div>
                      </div>
                    )}
                  </InteriorPanel>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </InteriorRoot>
  );
}

export default ReviewMode;
