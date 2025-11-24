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
      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
    >
      {/* New Button with Dropdown */}
      <div className="relative">
        <button
          onClick={onToggleNewMenu}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold border-2 rounded transition-colors"
          style={{
            background: "var(--win95-button-face)",
            borderColor: "var(--win95-border)",
            color: "var(--win95-text)",
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
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg)",
            color: "var(--win95-text)",
          }}
        />
      </div>

      {/* View Toggle */}
      <div className="flex border-2" style={{ borderColor: "var(--win95-border)" }}>
        <button
          onClick={() => onViewModeChange("grid")}
          className="px-3 py-2 border-r-2"
          style={{
            borderColor: "var(--win95-border)",
            background: viewMode === "grid" ? "var(--win95-highlight-bg)" : "transparent",
            color: viewMode === "grid" ? "var(--win95-highlight)" : "var(--win95-text)",
          }}
        >
          <Grid3x3 size={14} />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className="px-3 py-2"
          style={{
            background: viewMode === "list" ? "var(--win95-highlight-bg)" : "transparent",
            color: viewMode === "list" ? "var(--win95-highlight)" : "var(--win95-text)",
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
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg)",
          color: "var(--win95-text)",
        }}
      >
        <option value="name">Name</option>
        <option value="date">Date</option>
        <option value="size">Size</option>
      </select>
    </div>
  );
}
