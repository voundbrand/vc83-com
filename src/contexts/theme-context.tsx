"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  APPEARANCE_EXPLICIT_STORAGE_KEY,
  DEFAULT_APPEARANCE_MODE,
  mapLegacyThemeToAppearanceMode,
  useAppearance,
  type AppearanceMode,
} from "@/contexts/appearance-context";

export type WindowStyle = "mac" | "windows" | "shadcn";

export interface Theme {
  id: string;
  name: string;
  colors: {
    background: string;
    win95Bg: string;
    win95BgLight: string;
    win95Border: string;
    win95BorderLight: string;
    win95Text: string;
    win95Highlight: string;
    win95GradientEnd: string;
    win95HoverBg: string;
    win95HoverText: string;
    foreground: string;
  };
}

const COMPAT_THEME_BY_MODE: Record<AppearanceMode, Theme> = {
  dark: {
    id: "clean-dark",
    name: "Dark",
    colors: {
      background: "var(--background)",
      win95Bg: "var(--win95-bg)",
      win95BgLight: "var(--win95-bg-light)",
      win95Border: "var(--win95-border)",
      win95BorderLight: "var(--win95-border-light)",
      win95Text: "var(--win95-text)",
      win95Highlight: "var(--win95-highlight)",
      win95GradientEnd: "var(--win95-gradient-end)",
      win95HoverBg: "var(--win95-hover-bg)",
      win95HoverText: "var(--win95-hover-text)",
      foreground: "var(--foreground)",
    },
  },
  sepia: {
    id: "clean-light",
    name: "Sepia",
    colors: {
      background: "var(--background)",
      win95Bg: "var(--win95-bg)",
      win95BgLight: "var(--win95-bg-light)",
      win95Border: "var(--win95-border)",
      win95BorderLight: "var(--win95-border-light)",
      win95Text: "var(--win95-text)",
      win95Highlight: "var(--win95-highlight)",
      win95GradientEnd: "var(--win95-gradient-end)",
      win95HoverBg: "var(--win95-hover-bg)",
      win95HoverText: "var(--win95-hover-text)",
      foreground: "var(--foreground)",
    },
  },
};

interface ThemeContextValue {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  windowStyle: WindowStyle;
  setWindowStyle: (style: WindowStyle) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const CANONICAL_WINDOW_STYLE: WindowStyle = "windows";

function isAppearanceMode(value: unknown): value is AppearanceMode {
  return value === "dark" || value === "sepia";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { sessionId } = useAuth();
  const { mode, setMode } = useAppearance();
  const hydratedFromPrefsRef = useRef(false);

  const useQueryUntyped = useQuery as (query: unknown, args: unknown) => unknown;
  const getUserPreferences = (api as unknown as { userPreferences: { get: unknown } }).userPreferences.get;
  const userPrefs = useQueryUntyped(
    getUserPreferences,
    sessionId ? { sessionId } : "skip",
  ) as { appearanceMode?: unknown } | null | undefined;
  const updatePrefs = useMutation(api.userPreferences.update);

  useEffect(() => {
    if (!sessionId || userPrefs === undefined || hydratedFromPrefsRef.current) {
      return;
    }

    if (isAppearanceMode(userPrefs?.appearanceMode)) {
      const hasExplicitSelection =
        typeof window !== "undefined" &&
        window.localStorage.getItem(APPEARANCE_EXPLICIT_STORAGE_KEY) === "1";
      const resolvedMode =
        userPrefs.appearanceMode === "sepia" && !hasExplicitSelection
          ? DEFAULT_APPEARANCE_MODE
          : userPrefs.appearanceMode;

      if (resolvedMode !== mode) {
        setMode(resolvedMode);
      }
    }

    hydratedFromPrefsRef.current = true;
  }, [mode, sessionId, setMode, userPrefs]);

  useEffect(() => {
    if (!sessionId || !hydratedFromPrefsRef.current || userPrefs === undefined) {
      return;
    }

    if (userPrefs?.appearanceMode === mode) {
      return;
    }

    void updatePrefs({ sessionId, appearanceMode: mode });
  }, [mode, sessionId, updatePrefs, userPrefs]);

  const setTheme = useCallback((themeId: string) => {
    const nextMode = mapLegacyThemeToAppearanceMode(themeId);
    setMode(nextMode);
  }, [setMode]);

  const setWindowStyle = useCallback(() => {
    // Canonical shell styling is fixed to Windows semantics.
  }, []);

  const currentTheme = useMemo(() => COMPAT_THEME_BY_MODE[mode], [mode]);

  const contextValue = useMemo(
    () => ({
      currentTheme,
      setTheme,
      windowStyle: CANONICAL_WINDOW_STYLE,
      setWindowStyle,
    }),
    [currentTheme, setTheme, setWindowStyle],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function useWindowStyle() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useWindowStyle must be used within a ThemeProvider");
  }

  return {
    windowStyle: context.windowStyle,
    setWindowStyle: context.setWindowStyle,
  };
}
