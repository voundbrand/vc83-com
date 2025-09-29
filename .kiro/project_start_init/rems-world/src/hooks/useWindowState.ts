import { useEffect, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./useAuth";

interface Window {
  id: string;
  title: string;
  content: React.ReactNode;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  zIndex: number;
}

interface UseWindowStateProps {
  windows: Window[];
}

export function useWindowState({ windows }: UseWindowStateProps) {
  const { isAuthenticated } = useAuth();
  const saveDesktopState = useMutation(api.windows.saveDesktopState);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  // Debounced save function
  const debouncedSave = useCallback(async () => {
    if (!isAuthenticated || windows.length === 0) return;

    // Convert window state to Convex format
    const windowData = windows.map((window) => ({
      id: window.id,
      appId: window.id, // Using ID as appId for now
      position: window.position,
      size: window.size,
      minimized: window.isMinimized,
      maximized: false, // Not implemented yet
      zIndex: window.zIndex,
    }));

    // Only save if state has changed
    const currentState = JSON.stringify(windowData);
    if (currentState === lastSavedRef.current) return;

    try {
      await saveDesktopState({ windows: windowData });
      lastSavedRef.current = currentState;
    } catch (error) {
      console.error("Failed to save window state:", error);
    }
  }, [windows, isAuthenticated, saveDesktopState]);

  // Save state with debouncing
  const saveState = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, 1000); // Save after 1 second of inactivity
  }, [debouncedSave]);

  // Watch for window changes
  useEffect(() => {
    if (windows.length > 0) {
      saveState();
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [windows, saveState]);

  // Save immediately on window close
  const saveImmediate = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await debouncedSave();
  }, [debouncedSave]);

  return {
    saveState,
    saveImmediate,
  };
}
