"use client";

/**
 * USE FINDER SELECTION - Multi-select hook for Finder file items
 *
 * Supports:
 * - Click to single select
 * - Cmd/Ctrl+Click to toggle individual items
 * - Shift+Click for range selection
 * - Select all / clear selection
 */

import { useState, useCallback } from "react";
import type { ProjectFile } from "./finder-types";

export function useFinderSelection(files: ProjectFile[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const handleSelect = useCallback(
    (file: ProjectFile, event: React.MouseEvent) => {
      const fileIndex = files.findIndex((f) => f._id === file._id);

      if (event.metaKey || event.ctrlKey) {
        // Toggle individual selection
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(file._id)) {
            next.delete(file._id);
          } else {
            next.add(file._id);
          }
          return next;
        });
        setLastSelectedIndex(fileIndex);
      } else if (event.shiftKey && lastSelectedIndex !== null) {
        // Range selection
        const start = Math.min(lastSelectedIndex, fileIndex);
        const end = Math.max(lastSelectedIndex, fileIndex);
        const rangeIds = files.slice(start, end + 1).map((f) => f._id);
        setSelectedIds(new Set(rangeIds));
      } else {
        // Single select
        setSelectedIds(new Set([file._id]));
        setLastSelectedIndex(fileIndex);
      }
    },
    [files, lastSelectedIndex]
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(files.map((f) => f._id)));
  }, [files]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }, []);

  const isSelected = useCallback(
    (fileId: string) => selectedIds.has(fileId),
    [selectedIds]
  );

  const selectedFiles = files.filter((f) => selectedIds.has(f._id));

  return {
    selectedIds,
    selectedFiles,
    handleSelect,
    selectAll,
    clearSelection,
    isSelected,
  };
}
