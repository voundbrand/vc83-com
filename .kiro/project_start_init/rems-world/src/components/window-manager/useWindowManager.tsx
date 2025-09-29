"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import {
  WindowState,
  Position,
  Size,
  generateWindowId,
  getCenteredPosition,
  getCascadePosition,
  constrainToViewport,
  constrainSize,
  WINDOW_STORAGE_KEY,
  serializeWindowState,
  deserializeWindowState,
} from "@/lib/window-utils";

interface WindowOpenParams {
  pageId: string;
  title?: string;
  position?: Position;
  size?: Size;
  meta?: Record<string, unknown>;
}

interface WindowManagerContextValue {
  windows: WindowState[];
  activeWindowId: string | null;
  open: (params: WindowOpenParams) => string | null;
  close: (id: string) => void;
  focus: (id: string) => void;
  move: (id: string, pos: Position) => void;
  resize: (id: string, size: Size) => void;
  minimize: (id: string) => void;
  maximize: (id: string) => void;
  restore: (id: string) => void;
}

const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);

export function WindowManagerProvider({ children }: { children: React.ReactNode }) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const nextZIndexRef = useRef(1000);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef<Position | null>(null);

  // Load windows from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(WINDOW_STORAGE_KEY);
      if (saved) {
        const savedWindows = JSON.parse(saved);
        const restoredWindows = savedWindows.map(deserializeWindowState);
        setWindows(restoredWindows);

        // Update nextZIndex based on loaded windows
        const maxZ = Math.max(...restoredWindows.map((w: WindowState) => w.zIndex), 1000);
        nextZIndexRef.current = maxZ + 1;
      }
    } catch (error) {
      console.error("Failed to load windows from localStorage:", error);
    }
  }, []);

  // Save windows to localStorage (debounced)
  const saveToLocalStorage = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const toSave = windows.map(serializeWindowState);
        localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify(toSave));
      } catch (error) {
        console.error("Failed to save windows to localStorage:", error);
      }
    }, 100); // 100ms debounce
  }, [windows]);

  // Save whenever windows change
  useEffect(() => {
    saveToLocalStorage();
  }, [windows, saveToLocalStorage]);

  const open = useCallback(
    (params: WindowOpenParams): string | null => {
      const { pageId, title = pageId, position, size, meta } = params;

      // Check if window with this pageId already exists (single-instance enforcement)
      const existingWindow = windows.find((w) => w.pageId === pageId);
      if (existingWindow) {
        // Focus existing window instead of creating new one
        const newZIndex = nextZIndexRef.current++;
        setWindows((prev) =>
          prev.map((w) => (w.id === existingWindow.id ? { ...w, zIndex: newZIndex } : w)),
        );
        setActiveWindowId(existingWindow.id);
        return existingWindow.id;
      }

      // Generate new window ID
      const id = generateWindowId();

      // Determine window size
      const windowSize = size || { width: 600, height: 400 };
      const constrainedSize = constrainSize(windowSize);

      // Determine window position
      let windowPosition: Position;
      if (position) {
        windowPosition = position;
      } else {
        // Use cascade positioning
        windowPosition = getCascadePosition(lastPositionRef.current, constrainedSize);
      }

      // Constrain to viewport
      const constrainedPosition = constrainToViewport(windowPosition, constrainedSize);

      // Position has been constrained to viewport

      // Store the constrained position for next cascade
      lastPositionRef.current = constrainedPosition;

      // Create new window
      const newWindow: WindowState = {
        id,
        pageId,
        title,
        position: constrainedPosition,
        size: constrainedSize,
        isMinimized: false,
        isMaximized: false,
        zIndex: nextZIndexRef.current++,
        meta,
      };

      setWindows((prev) => [...prev, newWindow]);
      setActiveWindowId(id);

      return id;
    },
    [windows],
  );

  const close = useCallback(
    (id: string) => {
      setWindows((prev) => prev.filter((w) => w.id !== id));
      if (activeWindowId === id) {
        // Find next window to focus
        const remainingWindows = windows.filter((w) => w.id !== id);
        const topWindow = remainingWindows.reduce(
          (top, w) => (!top || w.zIndex > top.zIndex ? w : top),
          null as WindowState | null,
        );
        setActiveWindowId(topWindow?.id || null);
      }
    },
    [activeWindowId, windows],
  );

  const focus = useCallback(
    (id: string) => {
      const window = windows.find((w) => w.id === id);
      if (!window) return;

      // Update z-index and bring to front
      const newZIndex = nextZIndexRef.current++;
      setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, zIndex: newZIndex } : w)));
      setActiveWindowId(id);
    },
    [windows],
  );

  const move = useCallback((id: string, position: Position) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const constrainedPos = constrainToViewport(position, w.size);

        // Apply viewport constraints to the new position

        return { ...w, position: constrainedPos };
      }),
    );
  }, []);

  const resize = useCallback((id: string, size: Size) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const constrainedSize = constrainSize(size);
        // Adjust position if needed to keep window in viewport
        const constrainedPos = constrainToViewport(w.position, constrainedSize);
        return { ...w, size: constrainedSize, position: constrainedPos };
      }),
    );
  }, []);

  const minimize = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)));
  }, []);

  const maximize = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;

        if (w.isMaximized) {
          // Already maximized, do nothing
          return w;
        }

        // Store current position and size in meta for restoration
        const meta = {
          ...w.meta,
          preMaximizePosition: w.position,
          preMaximizeSize: w.size,
        };

        return {
          ...w,
          isMaximized: true,
          position: { x: 0, y: 32 }, // Below menu bar
          size: {
            width: window.innerWidth,
            height: window.innerHeight - 32,
          },
          meta,
        };
      }),
    );
  }, []);

  const restore = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;

        if (w.isMinimized) {
          return { ...w, isMinimized: false };
        }

        if (w.isMaximized) {
          const { preMaximizePosition, preMaximizeSize, ...restMeta } = w.meta || {};
          return {
            ...w,
            isMaximized: false,
            position: (preMaximizePosition as Position | undefined) || getCenteredPosition(w.size),
            size: (preMaximizeSize as Size | undefined) || w.size,
            meta: restMeta,
          };
        }

        return w;
      }),
    );
  }, []);

  const value: WindowManagerContextValue = {
    windows,
    activeWindowId,
    open,
    close,
    focus,
    move,
    resize,
    minimize,
    maximize,
    restore,
  };

  return <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>;
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error("useWindowManager must be used within WindowManagerProvider");
  }
  return context;
}
