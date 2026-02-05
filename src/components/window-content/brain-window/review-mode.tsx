"use client";

/**
 * REVIEW MODE
 *
 * Browse and manage the organization's knowledge base.
 * Shows all extracted knowledge, Content DNA profiles, and uploaded sources.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Library,
  Search,
  Filter,
  FileText,
  Headphones,
  Link2,
  AlignLeft,
  User,
  Calendar,
  ChevronRight,
  Loader2,
  Database,
  Sparkles,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";

interface ReviewModeProps {
  sessionId: string;
  organizationId: Id<"organizations">;
}

type KnowledgeCategory = "all" | "content_dna" | "documents" | "links" | "notes";

const CATEGORY_CONFIG: Record<KnowledgeCategory, { icon: typeof Library; label: string }> = {
  all: { icon: Library, label: "All Knowledge" },
  content_dna: { icon: Sparkles, label: "Content DNA" },
  documents: { icon: FileText, label: "Documents" },
  links: { icon: Link2, label: "Web Links" },
  notes: { icon: AlignLeft, label: "Notes" },
};

// Mock data for demonstration - replace with real Convex queries
const MOCK_KNOWLEDGE_ITEMS = [
  {
    id: "dna-1",
    category: "content_dna",
    title: "Sarah's Content DNA",
    description: "Voice: Professional, warm. Expertise: AI, SaaS. Audience: Tech leaders.",
    createdAt: Date.now() - 86400000 * 2,
    source: "Interview",
  },
  {
    id: "doc-1",
    category: "documents",
    title: "Product Positioning Guide.pdf",
    description: "Internal guide for product messaging and value props",
    createdAt: Date.now() - 86400000 * 5,
    source: "Uploaded PDF",
  },
  {
    id: "link-1",
    category: "links",
    title: "competitor analysis article",
    description: "https://techcrunch.com/2024/competitor-landscape",
    createdAt: Date.now() - 86400000 * 7,
    source: "Web Link",
  },
  {
    id: "note-1",
    category: "notes",
    title: "Brand Voice Guidelines",
    description: "Key phrases to use: 'effortless', 'intelligent', 'trusted partner'",
    createdAt: Date.now() - 86400000 * 10,
    source: "Manual Note",
  },
];

export function ReviewMode({ sessionId, organizationId }: ReviewModeProps) {
  const [category, setCategory] = useState<KnowledgeCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // TODO: Replace with actual Convex query
  // const knowledgeItems = useQuery(api.knowledge.listByOrganization, {
  //   sessionId,
  //   organizationId,
  //   category: category === "all" ? undefined : category,
  // });

  const knowledgeItems = MOCK_KNOWLEDGE_ITEMS;
  const isLoading = false;

  // Filter items
  const filteredItems = knowledgeItems.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Count by category
  const categoryCounts = {
    all: knowledgeItems.length,
    content_dna: knowledgeItems.filter((i) => i.category === "content_dna").length,
    documents: knowledgeItems.filter((i) => i.category === "documents").length,
    links: knowledgeItems.filter((i) => i.category === "links").length,
    notes: knowledgeItems.filter((i) => i.category === "notes").length,
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
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
    <div className="flex h-full">
      {/* Sidebar with categories */}
      <div className="w-56 border-r border-zinc-700 bg-zinc-800/30 flex flex-col">
        <div className="p-3 border-b border-zinc-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {(Object.keys(CATEGORY_CONFIG) as KnowledgeCategory[]).map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const count = categoryCounts[cat];
            const isActive = category === cat;

            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                  isActive
                    ? "bg-purple-900/30 text-purple-200 border-r-2 border-purple-500"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-sm">{config.label}</span>
                <span className="text-xs text-zinc-500">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Stats footer */}
        <div className="p-4 border-t border-zinc-700">
          <div className="text-xs text-zinc-500">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-3 h-3" />
              <span>{knowledgeItems.length} total items</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              {CATEGORY_CONFIG[category].label}
            </h2>
            <p className="text-sm text-zinc-500">
              {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              <span className="ml-2 text-zinc-400">Loading knowledge base...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
              <Library className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm">
                {searchQuery ? "No items match your search." : "No knowledge items yet."}
              </p>
              <p className="text-xs mt-1">
                Use Learn or Teach mode to add knowledge.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-w-3xl">
              {filteredItems.map((item) => {
                const Icon = getCategoryIcon(item.category);
                const isSelected = selectedItem === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(isSelected ? null : item.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-900/20"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded ${
                          item.category === "content_dna"
                            ? "bg-purple-900/30"
                            : "bg-zinc-700"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            item.category === "content_dna"
                              ? "text-purple-400"
                              : "text-zinc-400"
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-zinc-100 truncate">
                            {item.title}
                          </h3>
                          {item.category === "content_dna" && (
                            <span className="px-2 py-0.5 text-xs bg-purple-900/50 text-purple-300 rounded">
                              DNA
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.createdAt)}
                          </span>
                          <span>{item.source}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {item.category === "links" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(item.description, "_blank");
                            }}
                            className="p-1 text-zinc-500 hover:text-zinc-300"
                            title="Open link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-zinc-500 hover:text-zinc-300"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <ChevronRight
                          className={`w-4 h-4 text-zinc-500 transition-transform ${
                            isSelected ? "rotate-90" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expanded view */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-zinc-700">
                        <div className="text-sm text-zinc-300">
                          <p className="mb-2">
                            <strong>Full content:</strong>
                          </p>
                          <p className="text-zinc-400">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <button className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded">
                            Edit
                          </button>
                          <button className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded">
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewMode;
