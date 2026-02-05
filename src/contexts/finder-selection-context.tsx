"use client";

/**
 * FINDER SELECTION CONTEXT
 *
 * Replaces media-selection-context.tsx.
 * Provides a way for any component to open the Finder picker dialog
 * and receive the selected file.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { FinderPickerDialog, type SelectedFile } from "@/components/window-content/finder-window/finder-picker-dialog";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";

// Re-export for consumers
export type { SelectedFile } from "@/components/window-content/finder-window/finder-picker-dialog";

interface FinderPickerOptions {
  title?: string;
  fileKindFilter?: string[];
  mimeTypeFilter?: string[];
  multiple?: boolean;
}

interface FinderSelectionContextType {
  openFinderPicker: (
    options?: FinderPickerOptions,
    onSelect?: (file: SelectedFile) => void
  ) => void;
}

const FinderSelectionContext = createContext<FinderSelectionContextType | undefined>(undefined);

export function FinderSelectionProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<FinderPickerOptions>({});
  const [onSelectCallback, setOnSelectCallback] = useState<
    ((file: SelectedFile) => void) | null
  >(null);

  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const organizationId = currentOrg?.id || "";

  const openFinderPicker = useCallback(
    (opts?: FinderPickerOptions, onSelect?: (file: SelectedFile) => void) => {
      setOptions(opts || {});
      // Wrap in a function to avoid React setState(function) behavior
      setOnSelectCallback(() => onSelect || null);
      setIsOpen(true);
    },
    []
  );

  const handleSelect = useCallback(
    (file: SelectedFile) => {
      onSelectCallback?.(file);
      setIsOpen(false);
      setOnSelectCallback(null);
    },
    [onSelectCallback]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setOnSelectCallback(null);
  }, []);

  return (
    <FinderSelectionContext.Provider value={{ openFinderPicker }}>
      {children}
      {sessionId && organizationId && (
        <FinderPickerDialog
          open={isOpen}
          onClose={handleClose}
          onSelect={handleSelect}
          sessionId={sessionId}
          organizationId={organizationId}
          title={options.title}
          fileKindFilter={options.fileKindFilter}
          mimeTypeFilter={options.mimeTypeFilter}
          multiple={options.multiple}
        />
      )}
    </FinderSelectionContext.Provider>
  );
}

export function useFinderSelection() {
  const context = useContext(FinderSelectionContext);
  if (context === undefined) {
    throw new Error(
      "useFinderSelection must be used within a FinderSelectionProvider"
    );
  }
  return context;
}
