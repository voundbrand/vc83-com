"use client";

/**
 * TOP BAR - Search, view controls, and new button
 */

import { Search, Grid3x3, List, Plus } from "lucide-react";
import { NewDropdownMenu } from "../dropbox-components";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  sortBy: string;
  onSortChange: (sort: "name" | "date" | "size") => void;
  showNewMenu: boolean;
  onToggleNewMenu: () => void;
  onCreateFolder: () => void;
  onCreateDocument: () => void;
  onUpload: () => void;
}

export function TopBar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  showNewMenu,
  onToggleNewMenu,
  onCreateFolder,
  onCreateDocument,
  onUpload,
}: TopBarProps) {

  return (
    <div
      className="flex items-center gap-4 p-4 border-b-2"
      style={{ borderColor: "var(--shell-border)", background: "var(--shell-surface-elevated)" }}
    >
      {/* New Button with Dropdown */}
      <div className="relative">
        <button
          onClick={onToggleNewMenu}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold border-2 rounded transition-colors"
          style={{
            background: "var(--shell-button-surface)",
            borderColor: "var(--shell-border)",
            color: "var(--shell-text)",
          }}
        >
          <Plus size={14} />
          New
        </button>

        {showNewMenu && (
          <NewDropdownMenu
            onCreateFolder={onCreateFolder}
            onCreateDocument={onCreateDocument}
            onUpload={onUpload}
            onClose={onToggleNewMenu}
          />
        )}
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--neutral-gray)" }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search files..."
          className="w-full pl-9 pr-3 py-2 text-xs border-2"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-surface)",
            color: "var(--shell-text)",
          }}
        />
      </div>

      {/* View Toggle */}
      <div className="flex border-2" style={{ borderColor: "var(--shell-border)" }}>
        <button
          onClick={() => onViewModeChange("grid")}
          className="px-3 py-2 border-r-2"
          style={{
            borderColor: "var(--shell-border)",
            background: viewMode === "grid" ? "var(--shell-accent-soft)" : "transparent",
            color: viewMode === "grid" ? "var(--shell-accent)" : "var(--shell-text)",
          }}
        >
          <Grid3x3 size={14} />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className="px-3 py-2"
          style={{
            background: viewMode === "list" ? "var(--shell-accent-soft)" : "transparent",
            color: viewMode === "list" ? "var(--shell-accent)" : "var(--shell-text)",
          }}
        >
          <List size={14} />
        </button>
      </div>

      {/* Sort Dropdown */}
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as "name" | "date" | "size")}
        className="px-3 py-2 text-xs border-2"
        style={{
          borderColor: "var(--shell-border)",
          background: "var(--shell-surface)",
          color: "var(--shell-text)",
        }}
      >
        <option value="name">Name</option>
        <option value="date">Date</option>
        <option value="size">Size</option>
      </select>
    </div>
  );
}
