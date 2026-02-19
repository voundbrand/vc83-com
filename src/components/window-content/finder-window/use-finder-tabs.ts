"use client";

/**
 * USE FINDER TABS - Tab state management for the Finder editor system
 *
 * Manages open tabs, active tab, dirty state, and tab lifecycle.
 */

import { useState, useCallback } from "react";
import { resolveVirtualFileType } from "./file-type-registry";
import type { EditorType, ProjectFile } from "./finder-types";

export type { EditorType } from "./finder-types";

export interface TabState {
  id: string; // file._id
  name: string;
  fileKind: string;
  isDirty: boolean;
  editorType: EditorType;
  file: ProjectFile;
}

type ConfirmCloseFn = (message: string) => boolean;

const UNSAVED_TAB_CLOSE_PREFIX = "has unsaved changes. Discard them and close this tab?";

function getWindowConfirm(): ConfirmCloseFn {
  if (typeof window === "undefined" || typeof window.confirm !== "function") {
    return () => false;
  }
  return (message: string) => window.confirm(message);
}

export function getDirtyTabCloseMessage(tabName: string): string {
  return `"${tabName}" ${UNSAVED_TAB_CLOSE_PREFIX}`;
}

export function getDirtyTabsCloseMessage(dirtyTabCount: number): string {
  const plural = dirtyTabCount === 1 ? "tab has" : "tabs have";
  return `${dirtyTabCount} open ${plural} unsaved changes. Discard changes and continue?`;
}

export function confirmTabClose(tab: Pick<TabState, "name" | "isDirty">, confirmClose: ConfirmCloseFn): boolean {
  if (!tab.isDirty) return true;
  return confirmClose(getDirtyTabCloseMessage(tab.name));
}

export function confirmBulkTabClose(
  tabs: Array<Pick<TabState, "name" | "isDirty">>,
  confirmClose: ConfirmCloseFn,
): boolean {
  const dirtyTabCount = tabs.filter((tab) => tab.isDirty).length;
  if (dirtyTabCount === 0) return true;
  return confirmClose(getDirtyTabsCloseMessage(dirtyTabCount));
}

/**
 * Determine which editor to use based on file properties.
 */
export function getEditorType(file: ProjectFile): EditorType {
  if (file.fileKind === "virtual") {
    return resolveVirtualFileType(file).editorType;
  }

  if (file.fileKind === "media_ref") {
    const mime = file.mimeType || "";
    if (mime.startsWith("image/")) return "image";
    if (mime === "application/pdf") return "pdf";
    return "info";
  }

  // builder_ref, layer_ref — show info panel (these redirect to their apps)
  return "info";
}

export function useFinderTabs() {
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openTab = useCallback((file: ProjectFile) => {
    // Don't open tabs for folders
    if (file.fileKind === "folder") return;

    setTabs((prev) => {
      const existing = prev.find((t) => t.id === file._id);
      if (existing) {
        // Tab already open — just focus it, update file ref
        return prev.map((t) =>
          t.id === file._id
            ? {
                ...t,
                file,
                name: file.name,
                editorType: getEditorType(file),
              }
            : t
        );
      }

      // Create new tab
      const newTab: TabState = {
        id: file._id,
        name: file.name,
        fileKind: file.fileKind,
        isDirty: false,
        editorType: getEditorType(file),
        file,
      };
      return [...prev, newTab];
    });

    setActiveTabId(file._id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const tabToClose = prev.find((tab) => tab.id === id);
        if (!tabToClose) return prev;
        if (!confirmTabClose(tabToClose, getWindowConfirm())) {
          return prev;
        }

        const idx = prev.findIndex((t) => t.id === id);
        const filtered = prev.filter((t) => t.id !== id);

        // If closing active tab, activate adjacent tab
        if (activeTabId === id && filtered.length > 0) {
          const newIdx = Math.min(idx, filtered.length - 1);
          setActiveTabId(filtered[newIdx].id);
        } else if (filtered.length === 0) {
          setActiveTabId(null);
        }

        return filtered;
      });
    },
    [activeTabId]
  );

  const markDirty = useCallback((id: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDirty: true } : t))
    );
  }, []);

  const markClean = useCallback((id: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDirty: false } : t))
    );
  }, []);

  const closeAllTabs = useCallback(() => {
    setTabs((prev) => {
      if (!confirmBulkTabClose(prev, getWindowConfirm())) {
        return prev;
      }

      setActiveTabId(null);
      return [];
    });
  }, []);

  const closeOtherTabs = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const tabsToClose = prev.filter((tab) => tab.id !== id);
        if (!confirmBulkTabClose(tabsToClose, getWindowConfirm())) {
          return prev;
        }

        setActiveTabId(id);
        return prev.filter((tab) => tab.id === id);
      });
    },
    []
  );

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;
  const hasDirtyTabs = tabs.some((tab) => tab.isDirty);

  return {
    tabs,
    activeTabId,
    activeTab,
    hasDirtyTabs,
    openTab,
    closeTab,
    setActiveTab: setActiveTabId,
    markDirty,
    markClean,
    closeAllTabs,
    closeOtherTabs,
  };
}
