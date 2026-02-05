"use client";

/**
 * USE FINDER KEYBOARD - Keyboard shortcuts scoped to Finder window
 *
 * Shortcuts:
 * - Delete/Backspace → delete selected
 * - Enter → inline rename (single selection)
 * - Cmd+C → copy
 * - Cmd+X → cut
 * - Cmd+V → paste
 * - Cmd+A → select all
 * - Escape → clear selection, close context menu
 * - Cmd+Shift+N → new folder
 * - Cmd+F → focus search input
 */

import { useEffect, useCallback } from "react";

interface KeyboardActions {
  onDelete: () => void;
  onRename: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onEscape: () => void;
  onNewFolder: () => void;
  onFocusSearch: () => void;
}

export function useFinderKeyboard(
  containerRef: React.RefObject<HTMLDivElement | null>,
  actions: KeyboardActions,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't capture if the user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Only allow Escape to bubble through from inputs
        if (e.key === "Escape") {
          actions.onEscape();
        }
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      switch (e.key) {
        case "Delete":
        case "Backspace":
          e.preventDefault();
          actions.onDelete();
          break;

        case "Enter":
          e.preventDefault();
          actions.onRename();
          break;

        case "c":
          if (isMeta) {
            e.preventDefault();
            actions.onCopy();
          }
          break;

        case "x":
          if (isMeta) {
            e.preventDefault();
            actions.onCut();
          }
          break;

        case "v":
          if (isMeta) {
            e.preventDefault();
            actions.onPaste();
          }
          break;

        case "a":
          if (isMeta) {
            e.preventDefault();
            actions.onSelectAll();
          }
          break;

        case "Escape":
          actions.onEscape();
          break;

        case "N":
        case "n":
          if (isMeta && e.shiftKey) {
            e.preventDefault();
            actions.onNewFolder();
          }
          break;

        case "f":
          if (isMeta) {
            e.preventDefault();
            actions.onFocusSearch();
          }
          break;
      }
    },
    [enabled, actions]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, handleKeyDown]);
}
