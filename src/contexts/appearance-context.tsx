"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AppearanceMode = "dark" | "sepia";

export const DEFAULT_APPEARANCE_MODE: AppearanceMode = "dark";
export const APPEARANCE_STORAGE_KEY = "reading-mode";
export const APPEARANCE_EXPLICIT_STORAGE_KEY = "reading-mode-explicit";
export const LEGACY_THEME_STORAGE_KEY = "l4yercak3-theme";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const LEGACY_DARK_THEME_IDS = new Set([
  "clean-dark",
  "glass-dark",
  "win95-dark",
  "win95-purple-dark",
  "win95-green-dark",
]);

interface AppearanceContextValue {
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
  toggleMode: () => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function isAppearanceMode(value: string | null | undefined): value is AppearanceMode {
  return value === "dark" || value === "sepia";
}

export function mapLegacyThemeToAppearanceMode(themeId: string): AppearanceMode {
  if (LEGACY_DARK_THEME_IDS.has(themeId) || themeId.endsWith("-dark")) {
    return "dark";
  }
  return "dark";
}

function hasExplicitAppearanceSelection(storage: StorageLike): boolean {
  return storage.getItem(APPEARANCE_EXPLICIT_STORAGE_KEY) === "1";
}

export function restoreAppearanceModeFromStorage(storage: StorageLike): AppearanceMode {
  const storedMode = storage.getItem(APPEARANCE_STORAGE_KEY);
  if (isAppearanceMode(storedMode)) {
    if (storedMode === "sepia" && !hasExplicitAppearanceSelection(storage)) {
      storage.setItem(APPEARANCE_STORAGE_KEY, DEFAULT_APPEARANCE_MODE);
      return DEFAULT_APPEARANCE_MODE;
    }
    return storedMode;
  }

  // Migration priority: old theme key only applies when reading-mode has no valid value.
  const legacyThemeId = storage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (legacyThemeId) {
    const migratedMode = mapLegacyThemeToAppearanceMode(legacyThemeId);
    storage.setItem(APPEARANCE_STORAGE_KEY, migratedMode);
    return migratedMode;
  }

  return DEFAULT_APPEARANCE_MODE;
}

export function toggleAppearanceMode(mode: AppearanceMode): AppearanceMode {
  return mode === "dark" ? "sepia" : "dark";
}

export function applyAppearanceModeToRoot(mode: AppearanceMode, root: HTMLElement): void {
  root.setAttribute("data-reading-mode", mode);
  root.classList.toggle("dark", mode === "dark");
  // Avoid Tailwind's global `.sepia` filter utility from tinting the full desktop.
  root.classList.remove("sepia");
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppearanceMode>(DEFAULT_APPEARANCE_MODE);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const restoredMode = restoreAppearanceModeFromStorage(window.localStorage);
    setModeState(restoredMode);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    applyAppearanceModeToRoot(mode, document.documentElement);
  }, [mode]);

  const setMode = useCallback((nextMode: AppearanceMode) => {
    setModeState(nextMode);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, nextMode);
      window.localStorage.setItem(APPEARANCE_EXPLICIT_STORAGE_KEY, "1");
    }
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((currentMode) => {
      const nextMode = toggleAppearanceMode(currentMode);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(APPEARANCE_STORAGE_KEY, nextMode);
        window.localStorage.setItem(APPEARANCE_EXPLICIT_STORAGE_KEY, "1");
      }

      return nextMode;
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode],
  );

  return (
    <AppearanceContext.Provider value={contextValue}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }

  return context;
}
