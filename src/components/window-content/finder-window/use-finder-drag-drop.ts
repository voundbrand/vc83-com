"use client";

/**
 * USE FINDER DRAG DROP - HTML5 drag-and-drop for Finder files
 *
 * Supports:
 * - Dragging files to folders (move)
 * - Dragging files to sidebar folders (move)
 * - External file drop (upload via organizationMedia → createMediaRef)
 */

import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { ProjectFile } from "./finder-types";

interface DragState {
  isDragging: boolean;
  draggedFiles: ProjectFile[];
  dropTargetPath: string | null;
}

export function useFinderDragDrop(
  sessionId: string,
  selectedFiles: ProjectFile[]
) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedFiles: [],
    dropTargetPath: null,
  });

  const moveFile = useMutation(api.projectFileSystem.moveFile);
  const dragCounterRef = useRef(0);

  // ---- DRAG SOURCE ----

  const handleDragStart = useCallback(
    (e: React.DragEvent, file: ProjectFile) => {
      // If dragging a selected file, drag all selected. Otherwise just the one.
      const filesToDrag = selectedFiles.some((f) => f._id === file._id)
        ? selectedFiles
        : [file];

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(
        "application/finder-files",
        JSON.stringify(filesToDrag.map((f) => f._id))
      );

      setDragState({
        isDragging: true,
        draggedFiles: filesToDrag,
        dropTargetPath: null,
      });
    },
    [selectedFiles]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedFiles: [],
      dropTargetPath: null,
    });
    dragCounterRef.current = 0;
  }, []);

  // ---- DROP TARGET ----

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetPath: string, targetKind: string) => {
      // Only folders can be drop targets
      if (targetKind !== "folder") return;

      // Don't allow dropping onto self or children
      const isDroppingOnSelf = dragState.draggedFiles.some(
        (f) => f.path === targetPath || targetPath.startsWith(f.path + "/")
      );
      if (isDroppingOnSelf) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragState((prev) => ({ ...prev, dropTargetPath: targetPath }));
    },
    [dragState.draggedFiles]
  );

  const handleDragLeave = useCallback(() => {
    setDragState((prev) => ({ ...prev, dropTargetPath: null }));
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetPath: string) => {
      e.preventDefault();

      // Internal file move
      const fileData = e.dataTransfer.getData("application/finder-files");
      if (fileData) {
        try {
          const fileIds: string[] = JSON.parse(fileData);
          for (const fileId of fileIds) {
            await moveFile({
              sessionId,
              fileId: fileId as Id<"projectFiles">,
              newParentPath: targetPath,
            });
          }
        } catch (err) {
          console.error("Drop move failed:", err);
        }
      }

      setDragState({
        isDragging: false,
        draggedFiles: [],
        dropTargetPath: null,
      });
      dragCounterRef.current = 0;
    },
    [sessionId, moveFile]
  );

  // ---- CONTENT AREA DROP (for background drops) ----

  const handleContentDragOver = useCallback(
    (e: React.DragEvent, currentPath: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragState((prev) => ({ ...prev, dropTargetPath: currentPath }));
    },
    []
  );

  const handleContentDrop = useCallback(
    async (e: React.DragEvent, currentPath: string) => {
      await handleDrop(e, currentPath);
    },
    [handleDrop]
  );

  return {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleContentDragOver,
    handleContentDrop,
    isDropTarget: (path: string) => dragState.dropTargetPath === path,
  };
}
