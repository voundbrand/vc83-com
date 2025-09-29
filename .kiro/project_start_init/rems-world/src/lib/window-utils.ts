export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface WindowState {
  id: string; // Auto-generated UUID
  pageId: string; // Page identifier (for single-instance enforcement)
  title: string;
  position: Position;
  size: Size;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  meta?: Record<string, unknown>;
}

export const MIN_WINDOW_SIZE = {
  width: 400,
  height: 300,
};

export const DEFAULT_WINDOW_SIZE = {
  width: 600,
  height: 400,
};

// Generate a UUID for window IDs
export function generateWindowId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Calculate centered position for a window
export function getCenteredPosition(size: Size): Position {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 };
  }

  const menuBarHeight = 32;
  const statusBarHeight = 32;
  const availableHeight = window.innerHeight - menuBarHeight - statusBarHeight;

  // Center horizontally, but position higher vertically for better visibility
  const x = Math.max(0, (window.innerWidth - size.width) / 2);
  const y = menuBarHeight + Math.max(20, Math.min(100, (availableHeight - size.height) / 3));

  return { x, y };
}

// Calculate cascade position based on last window
export function getCascadePosition(lastPosition: Position | null, size: Size): Position {
  if (!lastPosition) {
    return getCenteredPosition(size);
  }

  const offset = 30; // Standard cascade offset for visibility
  const menuBarHeight = 32;
  const resetMargin = 100; // Reset when getting close to edge

  let x = lastPosition.x + offset;
  let y = lastPosition.y + offset;

  // Calculate cascade offset from last position

  // Reset cascade if we're getting too close to edges
  if (
    x > window.innerWidth - size.width - resetMargin ||
    y > window.innerHeight - size.height - resetMargin
  ) {
    x = 50;
    y = menuBarHeight + 20;
    // Reset cascade to top-left when near edges
  }

  return { x, y };
}

// Constrain window position to viewport
export function constrainToViewport(position: Position, size: Size): Position {
  if (typeof window === "undefined") {
    return position;
  }

  const menuBarHeight = 32;
  const statusBarHeight = 32; // Bottom status bar height
  const margin = 20; // Keep some margin from edges

  const constrained = {
    // Keep window on screen horizontally
    x: Math.max(margin, Math.min(window.innerWidth - size.width - margin, position.x)),
    // Keep window between menu bar and status bar
    y: Math.max(
      menuBarHeight + margin,
      Math.min(window.innerHeight - size.height - statusBarHeight - margin, position.y),
    ),
  };

  return constrained;
}

// Constrain size to min/max bounds
export function constrainSize(size: Size): Size {
  return {
    width: Math.max(MIN_WINDOW_SIZE.width, size.width),
    height: Math.max(MIN_WINDOW_SIZE.height, size.height),
  };
}

// Storage key for localStorage
export const WINDOW_STORAGE_KEY = "rem-world-windows";

// Serialize window state for storage
export function serializeWindowState(window: WindowState): Record<string, unknown> {
  return {
    id: window.id,
    pageId: window.pageId,
    title: window.title,
    position: window.position,
    size: window.size,
    isMinimized: window.isMinimized,
    isMaximized: window.isMaximized,
    zIndex: window.zIndex,
  };
}

// Deserialize window state from storage
export function deserializeWindowState(data: Record<string, unknown>): WindowState {
  return {
    id: data.id as string,
    pageId: data.pageId as string,
    title: data.title as string,
    position: data.position as Position,
    size: data.size as Size,
    isMinimized: (data.isMinimized as boolean) || false,
    isMaximized: (data.isMaximized as boolean) || false,
    zIndex: (data.zIndex as number) || 1000,
    meta: {},
  };
}
