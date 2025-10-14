"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Id } from "../../convex/_generated/dataModel";

interface SelectedMedia {
  _id: Id<"organizationMedia">;
  url: string;
  filename: string;
  mimeType: string;
}

interface MediaSelectionContextType {
  onMediaSelect: ((media: SelectedMedia) => void) | null;
  setOnMediaSelect: (callback: ((media: SelectedMedia) => void) | null) => void;
}

const MediaSelectionContext = createContext<MediaSelectionContextType | undefined>(
  undefined
);

export function MediaSelectionProvider({ children }: { children: ReactNode }) {
  const [onMediaSelect, setOnMediaSelect] = useState<
    ((media: SelectedMedia) => void) | null
  >(null);

  return (
    <MediaSelectionContext.Provider value={{ onMediaSelect, setOnMediaSelect }}>
      {children}
    </MediaSelectionContext.Provider>
  );
}

export function useMediaSelection() {
  const context = useContext(MediaSelectionContext);
  if (context === undefined) {
    throw new Error(
      "useMediaSelection must be used within a MediaSelectionProvider"
    );
  }
  return context;
}

export type { SelectedMedia };
