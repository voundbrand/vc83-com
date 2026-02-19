"use client";

import { useEffect } from "react";

export const BEFORE_UNLOAD_WARNING =
  "You have unsaved changes. Leave this page and discard them?";

export interface BeforeUnloadLikeEvent {
  preventDefault: () => void;
  returnValue?: string;
}

export function shouldBlockBeforeUnload(hasDirtyTabs: boolean): boolean {
  return hasDirtyTabs;
}

export function applyBeforeUnloadGuard(
  event: BeforeUnloadLikeEvent,
  hasDirtyTabs: boolean,
): boolean {
  if (!shouldBlockBeforeUnload(hasDirtyTabs)) return false;
  event.preventDefault();
  event.returnValue = BEFORE_UNLOAD_WARNING;
  return true;
}

export function useUnsavedChangesGuard(hasDirtyTabs: boolean) {
  useEffect(() => {
    if (!hasDirtyTabs || typeof window === "undefined") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      applyBeforeUnloadGuard(event, hasDirtyTabs);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasDirtyTabs]);
}
