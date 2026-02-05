"use client";

/**
 * USE FINDER CLIPBOARD - Cut/Copy/Paste for Finder files
 *
 * Manages a clipboard state with files and mode (cut vs copy).
 * Paste triggers moveFile (cut) or duplicateFile (copy) mutations.
 */

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { ProjectFile, FileClipboard } from "./finder-types";

export function useFinderClipboard(sessionId: string) {
  const [clipboard, setClipboard] = useState<FileClipboard>(null);

  const moveFile = useMutation(api.projectFileSystem.moveFile);
  const duplicateFile = useMutation(api.projectFileSystem.duplicateFile);

  const cut = useCallback((files: ProjectFile[]) => {
    setClipboard({ mode: "cut", files });
  }, []);

  const copy = useCallback((files: ProjectFile[]) => {
    setClipboard({ mode: "copy", files });
  }, []);

  const paste = useCallback(
    async (targetPath: string) => {
      if (!clipboard) return;

      try {
        for (const file of clipboard.files) {
          if (clipboard.mode === "cut") {
            await moveFile({
              sessionId,
              fileId: file._id as Id<"projectFiles">,
              newParentPath: targetPath,
            });
          } else {
            await duplicateFile({
              sessionId,
              fileId: file._id as Id<"projectFiles">,
              targetParentPath: targetPath,
            });
          }
        }

        // Clear clipboard after cut (not after copy)
        if (clipboard.mode === "cut") {
          setClipboard(null);
        }
      } catch (err) {
        console.error("Paste failed:", err);
        throw err;
      }
    },
    [clipboard, moveFile, duplicateFile, sessionId]
  );

  const clear = useCallback(() => {
    setClipboard(null);
  }, []);

  const isCut = useCallback(
    (fileId: string) =>
      clipboard?.mode === "cut" &&
      clipboard.files.some((f) => f._id === fileId),
    [clipboard]
  );

  return { clipboard, cut, copy, paste, clear, isCut };
}
