"use client";

/**
 * FINDER TABS - Tab bar for the integrated editor system
 *
 * Shows open file tabs with dirty indicators, close buttons,
 * and a "Browse" pseudo-tab to return to the file browser view.
 */

import { useRef, useCallback } from "react";
import {
  FileText,
  Image,
  Box,
  Workflow,
  X,
  FolderOpen,
  Code,
  StickyNote,
  FileImage,
  FileType,
} from "lucide-react";
import type { TabState, EditorType } from "./use-finder-tabs";

interface FinderTabsProps {
  tabs: TabState[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onBrowse: () => void;
  isBrowsing: boolean;
}

const EDITOR_ICON: Record<EditorType, React.ReactNode> = {
  markdown: <FileText size={12} />,
  code: <Code size={12} />,
  note: <StickyNote size={12} />,
  image: <FileImage size={12} />,
  pdf: <FileType size={12} />,
  info: <Box size={12} />,
};

const KIND_ICON_SMALL: Record<string, React.ReactNode> = {
  virtual: <FileText size={12} style={{ color: "var(--accent-color)" }} />,
  media_ref: <Image size={12} style={{ color: "var(--success-green)" }} />,
  builder_ref: <Box size={12} style={{ color: "var(--warning-amber)" }} />,
  layer_ref: <Workflow size={12} style={{ color: "var(--info-blue)" }} />,
};

export function FinderTabs({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onBrowse,
  isBrowsing,
}: FinderTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleMiddleClick = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      if (e.button === 1) {
        e.preventDefault();
        onCloseTab(tabId);
      }
    },
    [onCloseTab]
  );

  return (
    <div
      className="flex items-center gap-1 border-b overflow-hidden flex-shrink-0 px-2 py-1"
      style={{
        borderColor: "var(--window-document-border)",
        background: "var(--desktop-shell-accent)",
        minHeight: 40,
      }}
      role="tablist"
      aria-label="Open files"
    >
      {/* Browse tab */}
      <button
        onClick={onBrowse}
        className={`desktop-interior-tab flex items-center gap-1.5 px-3 py-1.5 text-xs flex-shrink-0 ${isBrowsing ? "desktop-interior-tab-active" : ""}`}
        role="tab"
        aria-selected={isBrowsing}
        aria-label="Browse files"
      >
        <FolderOpen size={12} />
        Browse
      </button>

      {/* Scrollable tab area */}
      <div
        ref={scrollRef}
        className="flex items-center overflow-x-auto flex-1 min-w-0"
        style={{ scrollbarWidth: "none" }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId && !isBrowsing;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onMouseDown={(e) => handleMiddleClick(e, tab.id)}
              className={`desktop-interior-tab flex items-center gap-1.5 px-3 py-1.5 text-xs flex-shrink-0 group ${isActive ? "desktop-interior-tab-active" : ""}`}
              style={{
                maxWidth: 180,
              }}
              role="tab"
              aria-selected={isActive}
              aria-label={`${tab.name}${tab.isDirty ? ", unsaved changes" : ""}`}
            >
              {KIND_ICON_SMALL[tab.fileKind] || EDITOR_ICON[tab.editorType]}

              <span className="truncate max-w-[120px]">{tab.name}</span>

              {/* Dirty indicator */}
              {tab.isDirty && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "var(--warning-amber)" }}
                  title="Unsaved changes"
                />
              )}

              {/* Close button */}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }
                }}
                className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex-shrink-0"
                style={{ color: "var(--neutral-gray)" }}
                title={`Close ${tab.name}`}
                aria-label={`Close ${tab.name}`}
                role="button"
                tabIndex={0}
              >
                <X size={10} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
