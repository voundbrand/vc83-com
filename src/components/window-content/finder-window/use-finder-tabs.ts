"use client";

/**
 * USE FINDER TABS - Tab state management for the Finder editor system
 *
 * Manages open tabs, active tab, dirty state, and tab lifecycle.
 */

import { useState, useCallback } from "react";
import type { ProjectFile } from "./finder-types";

export type EditorType = "markdown" | "code" | "note" | "image" | "pdf" | "info";

export interface TabState {
  id: string; // file._id
  name: string;
  fileKind: string;
  isDirty: boolean;
  editorType: EditorType;
  file: ProjectFile;
}

/**
 * Determine which editor to use based on file properties.
 */
export function getEditorType(file: ProjectFile): EditorType {
  if (file.fileKind === "virtual") {
    const mime = file.mimeType || "";
    const lang = file.language || "";
    const name = file.name.toLowerCase();

    // Markdown
    if (
      mime === "text/markdown" ||
      lang === "markdown" ||
      name.endsWith(".md") ||
      name.endsWith(".mdx")
    ) {
      return "markdown";
    }

    // Plain text / notes
    if (mime === "text/plain" || name.endsWith(".txt")) {
      return "note";
    }

    // Code files
    if (
      mime === "application/json" ||
      lang === "json" ||
      lang === "javascript" ||
      lang === "typescript" ||
      lang === "html" ||
      lang === "css" ||
      lang === "yaml" ||
      name.endsWith(".json") ||
      name.endsWith(".yaml") ||
      name.endsWith(".yml") ||
      name.endsWith(".html") ||
      name.endsWith(".css") ||
      name.endsWith(".js") ||
      name.endsWith(".ts") ||
      name.endsWith(".jsx") ||
      name.endsWith(".tsx")
    ) {
      return "code";
    }

    // Fallback for other virtual files
    return "code";
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
          t.id === file._id ? { ...t, file, name: file.name } : t
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
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const closeOtherTabs = useCallback(
    (id: string) => {
      setTabs((prev) => prev.filter((t) => t.id === id));
      setActiveTabId(id);
    },
    []
  );

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  return {
    tabs,
    activeTabId,
    activeTab,
    openTab,
    closeTab,
    setActiveTab: setActiveTabId,
    markDirty,
    markClean,
    closeAllTabs,
    closeOtherTabs,
  };
}
