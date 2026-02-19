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
 * - Cmd+N → new file
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
  onNewFile: () => void;
  onNewFolder: () => void;
  onFocusSearch: () => void;
  onCloseActiveTab?: () => void;
}

type ShortcutTarget = {
  tagName?: string;
  isContentEditable?: boolean;
} | null;

export interface FinderKeyboardShortcutEvent {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  target?: ShortcutTarget;
}

export type FinderKeyboardAction =
  | "delete"
  | "rename"
  | "copy"
  | "cut"
  | "paste"
  | "select-all"
  | "escape"
  | "new-file"
  | "new-folder"
  | "focus-search"
  | "close-active-tab";

export function isTypingTarget(target: ShortcutTarget): boolean {
  const tagName = target?.tagName?.toUpperCase();
  return tagName === "INPUT" || tagName === "TEXTAREA" || Boolean(target?.isContentEditable);
}

export function resolveFinderKeyboardAction(
  event: FinderKeyboardShortcutEvent,
): FinderKeyboardAction | null {
  const target = event.target ?? null;
  const key = event.key;

  if (isTypingTarget(target)) {
    return key === "Escape" ? "escape" : null;
  }

  const isMeta = Boolean(event.metaKey || event.ctrlKey);
  const normalizedKey = key.toLowerCase();

  if (key === "Delete" || key === "Backspace") return "delete";
  if (key === "Enter") return "rename";
  if (key === "Escape") return "escape";

  if (!isMeta) return null;

  switch (normalizedKey) {
    case "c":
      return "copy";
    case "x":
      return "cut";
    case "v":
      return "paste";
    case "a":
      return "select-all";
    case "n":
      return event.shiftKey ? "new-folder" : "new-file";
    case "f":
      return "focus-search";
    case "w":
      return "close-active-tab";
    default:
      return null;
  }
}

export function useFinderKeyboard(
  containerRef: React.RefObject<HTMLDivElement | null>,
  actions: KeyboardActions,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      const action = resolveFinderKeyboardAction({
        key: e.key,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        target: e.target as ShortcutTarget,
      });

      if (!action) return;

      switch (action) {
        case "delete":
          e.preventDefault();
          actions.onDelete();
          break;
        case "rename":
          e.preventDefault();
          actions.onRename();
          break;
        case "copy":
          e.preventDefault();
          actions.onCopy();
          break;
        case "cut":
          e.preventDefault();
          actions.onCut();
          break;
        case "paste":
          e.preventDefault();
          actions.onPaste();
          break;
        case "select-all":
          e.preventDefault();
          actions.onSelectAll();
          break;
        case "escape":
          actions.onEscape();
          break;
        case "new-file":
          e.preventDefault();
          actions.onNewFile();
          break;
        case "new-folder":
          e.preventDefault();
          actions.onNewFolder();
          break;
        case "focus-search":
          e.preventDefault();
          actions.onFocusSearch();
          break;
        case "close-active-tab":
          e.preventDefault();
          actions.onCloseActiveTab?.();
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
