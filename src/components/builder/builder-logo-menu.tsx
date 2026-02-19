"use client";

/**
 * BUILDER LOGO MENU
 *
 * Dropdown drawer from the logo in BuilderHeader.
 * Shows New Chat, Search, Projects, Recents, Design Systems, Templates, Settings.
 * Fetches real conversation history and saved projects from the database.
 */

import Link from "next/link";
import { useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "@convex/_generated/dataModel";
import {
  Search,
  FolderOpen,
  Clock,
  Palette,
  LayoutTemplate,
  Settings,
  PenSquare,
  Home,
  MessageSquare,
  FileText,
  Loader2,
} from "lucide-react";
const generatedApi = require("@/../convex/_generated/api") as {
  api: {
    ai: {
      conversations: {
        listConversations: unknown;
      };
    };
    pageBuilder: {
      listSavedPages: unknown;
    };
  };
};

interface BuilderLogoMenuProps {
  onClose: () => void;
}

interface RecentConversation {
  _id: string;
  slug?: string | null;
  title?: string | null;
  createdAt: number;
}

interface SavedProject {
  _id: string;
  name?: string | null;
  _creationTime: number;
}

// Format relative time for display
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Extract a title from the first user message or use default
function getConversationTitle(title?: string | null, firstMessage?: string): string {
  if (title) return title;
  if (firstMessage) {
    // Strip any context prefixes and get first 40 chars
    const cleaned = firstMessage
      .replace(/^\[PAGE BUILDER.*?\]\s*/i, "")
      .replace(/^\[PLANNING MODE.*?\]\s*/i, "")
      .trim();
    return cleaned.length > 40 ? cleaned.slice(0, 40) + "..." : cleaned;
  }
  return "Untitled chat";
}

export function BuilderLogoMenu({ onClose }: BuilderLogoMenuProps) {
  const { user } = useAuth();
  const organizationId = user?.defaultOrgId as Id<"organizations"> | undefined;
  const userId = user?.id as Id<"users"> | undefined;
  const { translationsMap } = useNamespaceTranslations("ui.builder");
  const tx = (key: string, fallback: string): string => translationsMap?.[key] ?? fallback;
  const useQueryUnknown = useQuery as (...args: unknown[]) => unknown;

  // Fetch recent conversations (builder chats)
  const recentConversations = useQueryUnknown(
    generatedApi.api.ai.conversations.listConversations,
    organizationId && userId
      ? { organizationId, userId, limit: 10 }
      : "skip"
  ) as RecentConversation[] | undefined;

  // Fetch saved projects (AI-generated pages saved via saveAsProject)
  const savedProjects = useQueryUnknown(
    generatedApi.api.pageBuilder.listSavedPages,
    organizationId
      ? { organizationId, limit: 10 }
      : "skip"
  ) as SavedProject[] | undefined;

  const isLoading = recentConversations === undefined || savedProjects === undefined;

  return (
    <div className="w-64 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden">
      {/* New Chat Button */}
      <div className="p-2">
        <Link
          href="/builder"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-sm font-medium rounded-lg transition-colors"
        >
          <PenSquare className="w-4 h-4" />
          {tx("ui.builder.chrome.logoMenu.newChat", "New Chat")}
        </Link>
      </div>

      {/* Navigation Items */}
      <div className="px-2 pb-2">
        <button
          onClick={() => {
            // TODO: Open command palette
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-md transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>{tx("ui.builder.chrome.logoMenu.search", "Search")}</span>
        </button>

        <Link
          href="/builder/projects"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-md transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          <span>{tx("ui.builder.chrome.logoMenu.projects", "Projects")}</span>
        </Link>

        <Link
          href="/builder/design-systems"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-md transition-colors"
        >
          <Palette className="w-4 h-4" />
          <span>{tx("ui.builder.chrome.logoMenu.designSystems", "Design Systems")}</span>
        </Link>

        <Link
          href="/builder/templates"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-md transition-colors"
        >
          <LayoutTemplate className="w-4 h-4" />
          <span>{tx("ui.builder.chrome.logoMenu.templates", "Templates")}</span>
        </Link>
      </div>

      {/* Saved Projects Section */}
      {savedProjects && savedProjects.length > 0 && (
        <div className="border-t border-neutral-800">
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-neutral-500">
            <FileText className="w-3 h-3" />
            <span>{tx("ui.builder.chrome.logoMenu.savedProjects", "Saved Projects")}</span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {savedProjects.map((project) => (
              <Link
                key={project._id}
                href={`/builder/${project._id}`}
                onClick={onClose}
                className="group flex items-center justify-between px-4 py-2 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="w-3 h-3 flex-shrink-0 text-amber-400" />
                  <span className="truncate">
                    {project.name || tx("ui.builder.chrome.logoMenu.untitledProject", "Untitled")}
                  </span>
                </div>
                <span className="text-xs text-neutral-600 flex-shrink-0 ml-2">
                  {formatRelativeTime(project._creationTime)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Chats Section */}
      <div className="border-t border-neutral-800">
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-neutral-500">
          <Clock className="w-3 h-3" />
          <span>{tx("ui.builder.chrome.logoMenu.recentChats", "Recent Chats")}</span>
          {isLoading && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
        </div>

        <div className="max-h-48 overflow-y-auto">
          {!isLoading && recentConversations && recentConversations.length === 0 && (
            <div className="px-4 py-3 text-xs text-neutral-600 text-center">
              {tx("ui.builder.chrome.logoMenu.noRecentChats", "No recent chats yet")}
            </div>
          )}
          {recentConversations?.map((conv) => {
            // Use slug for pretty URLs if available, fall back to ID
            const href = conv.slug ? `/builder/${conv.slug}` : `/builder/${conv._id}`;
            return (
              <Link
                key={conv._id}
                href={href}
                onClick={onClose}
                className="group flex items-center justify-between px-4 py-2 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare className="w-3 h-3 flex-shrink-0 text-neutral-500" />
                  <span className="truncate">
                    {getConversationTitle(conv.title)}
                  </span>
                </div>
                <span className="text-xs text-neutral-600 flex-shrink-0 ml-2">
                  {formatRelativeTime(conv.createdAt)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom section */}
      <div className="border-t border-neutral-800 p-2">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-md transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>{tx("ui.builder.chrome.logoMenu.backToPlatform", "Back to Platform")}</span>
        </Link>
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 rounded-md transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>{tx("ui.builder.chrome.logoMenu.settings", "Settings")}</span>
        </Link>
      </div>
    </div>
  );
}
