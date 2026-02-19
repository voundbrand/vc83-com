"use client";

/**
 * GITHUB REPO PICKER
 *
 * Modal for selecting a GitHub repository to import into the builder.
 * Shows the user's repos with search, pagination, and branch selection.
 */

import { useState, useEffect, useMemo } from "react";
import { useAction } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import {
  X,
  Search,
  Lock,
  Globe,
  Loader2,
  GitBranch,
  ChevronDown,
  AlertCircle,
  FolderGit2,
  ArrowRight,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface RepoInfo {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string;
  language: string;
  defaultBranch: string;
  isPrivate: boolean;
  pushedAt: string;
}

interface TreeInfo {
  branch: string;
  totalFiles: number;
  totalSize: number;
}

interface GitHubRepoPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (repo: RepoInfo) => Promise<void>;
  organizationId: Id<"organizations">;
  sessionId: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-500",
  Python: "bg-green-500",
  Go: "bg-cyan-500",
  Rust: "bg-orange-500",
  CSS: "bg-amber-500",
  HTML: "bg-red-500",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function GitHubRepoPicker({
  isOpen,
  onClose,
  onImport,
  organizationId,
  sessionId,
}: GitHubRepoPickerProps) {
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Selection state
  const [selectedRepo, setSelectedRepo] = useState<RepoInfo | null>(null);
  const [treeInfo, setTreeInfo] = useState<TreeInfo | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [importing, setImporting] = useState(false);

  // @ts-expect-error - listUserRepos not yet implemented in convex/integrations/github
  const listUserRepos = useAction(api.integrations.github.listUserRepos);
  // @ts-expect-error - fetchRepoTree not yet implemented in convex/integrations/github
  const fetchRepoTree = useAction(api.integrations.github.fetchRepoTree);

  // Load repos on open
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setRepos([]);
    setPage(1);
    setSelectedRepo(null);
    setTreeInfo(null);

    listUserRepos({ sessionId, organizationId, page: 1, perPage: 30 })
      .then((result) => {
        setRepos(result.repos);
        setHasMore(result.hasMore);
        setLoading(false);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to load repositories";
        setError(msg);
        setLoading(false);
      });
  }, [isOpen, sessionId, organizationId, listUserRepos]);

  // Load more repos
  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await listUserRepos({ sessionId, organizationId, page: nextPage, perPage: 30 });
      setRepos((prev) => [...prev, ...result.repos]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch {
      // Silently fail on load more
    } finally {
      setLoadingMore(false);
    }
  };

  // Filter repos by search
  const filteredRepos = useMemo(() => {
    if (!search.trim()) return repos;
    const q = search.toLowerCase();
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
    );
  }, [repos, search]);

  // Select repo and fetch tree info
  const handleSelectRepo = async (repo: RepoInfo) => {
    if (selectedRepo?.id === repo.id) {
      setSelectedRepo(null);
      setTreeInfo(null);
      return;
    }

    setSelectedRepo(repo);
    setTreeInfo(null);
    setLoadingTree(true);

    try {
      const tree = await fetchRepoTree({
        sessionId,
        organizationId,
        repoFullName: repo.fullName,
        branch: repo.defaultBranch,
      });
      setTreeInfo({
        branch: tree.branch,
        totalFiles: tree.totalFiles,
        totalSize: tree.totalSize,
      });
    } catch {
      setTreeInfo(null);
    } finally {
      setLoadingTree(false);
    }
  };

  // Import selected repo
  const handleImport = async () => {
    if (!selectedRepo) return;
    setImporting(true);
    try {
      await onImport(selectedRepo);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-medium text-neutral-100">Import from GitHub</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-neutral-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
              <span className="ml-2 text-sm text-neutral-500">Loading repositories...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
              <p className="text-sm text-neutral-300 mb-1">Failed to load repositories</p>
              <p className="text-xs text-neutral-500">{error}</p>
              {error.includes("not connected") && (
                <p className="text-xs text-emerald-400 mt-3">
                  Connect GitHub in Integrations settings first.
                </p>
              )}
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderGit2 className="w-8 h-8 text-neutral-600 mb-3" />
              <p className="text-sm text-neutral-400">
                {search ? "No repositories match your search" : "No repositories found"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {filteredRepos.map((repo) => {
                const isSelected = selectedRepo?.id === repo.id;
                return (
                  <div key={repo.id}>
                    <button
                      onClick={() => handleSelectRepo(repo)}
                      className={`w-full px-5 py-3 text-left hover:bg-neutral-800/50 transition-colors ${
                        isSelected ? "bg-neutral-800/70" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {repo.isPrivate ? (
                            <Lock className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                          ) : (
                            <Globe className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-neutral-200 truncate">
                            {repo.name}
                          </span>
                          {repo.language && (
                            <span className="flex items-center gap-1 text-xs text-neutral-500">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  LANGUAGE_COLORS[repo.language] || "bg-neutral-500"
                                }`}
                              />
                              {repo.language}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-600 flex-shrink-0 ml-2">
                          {formatRelativeTime(repo.pushedAt)}
                        </span>
                      </div>
                      {repo.description && (
                        <p className="text-xs text-neutral-500 mt-1 truncate">{repo.description}</p>
                      )}
                    </button>

                    {/* Expanded selection details */}
                    {isSelected && (
                      <div className="px-5 py-3 bg-neutral-800/40 border-t border-neutral-800">
                        <div className="flex items-center gap-4 text-xs text-neutral-400">
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3.5 h-3.5" />
                            {repo.defaultBranch}
                          </span>
                          {loadingTree ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Scanning...
                            </span>
                          ) : treeInfo ? (
                            <>
                              <span>{treeInfo.totalFiles} files</span>
                              <span>{formatBytes(treeInfo.totalSize)}</span>
                              {treeInfo.totalFiles > 200 && (
                                <span className="text-yellow-500">
                                  (first 200 will be imported)
                                </span>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Load more */}
              {hasMore && !search && (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full px-5 py-3 text-center text-xs text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    "Load more repositories"
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-neutral-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedRepo || importing || loadingTree}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                Import Repository
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
