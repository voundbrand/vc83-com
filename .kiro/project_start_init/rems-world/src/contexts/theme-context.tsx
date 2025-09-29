"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { themes, Theme } from "@/components/ui/theme-menu";

interface ThemeContextValue {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "rem-world-theme";

// Helper function to convert hex to RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return "139, 92, 246"; // Default purple RGB
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to Sunset Orange theme
  const defaultTheme = themes.find(t => t.id === "sunset-orange") || themes[0];
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedThemeId) {
      const savedTheme = themes.find((t) => t.id === savedThemeId);
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      }
    }
  }, []);

  // Apply theme CSS variables
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // Apply theme colors as CSS custom properties
    root.style.setProperty("--theme-primary", currentTheme.colors.primary);
    root.style.setProperty("--theme-secondary", currentTheme.colors.secondary);
    root.style.setProperty("--theme-background", currentTheme.colors.background);
    root.style.setProperty("--theme-window-bg", currentTheme.colors.windowBg);
    root.style.setProperty("--theme-window-border", currentTheme.colors.windowBorder);
    root.style.setProperty("--theme-text-primary", currentTheme.colors.textPrimary);
    root.style.setProperty("--theme-text-secondary", currentTheme.colors.textSecondary);
    root.style.setProperty("--theme-menu-bg", currentTheme.colors.menuBg);
    root.style.setProperty("--theme-glow", currentTheme.colors.glow);

    // Add RGB versions for effects
    root.style.setProperty("--theme-primary-rgb", hexToRgb(currentTheme.colors.primary));

    // Also update the existing CSS variables to use theme colors
    root.style.setProperty("--bg-accent", currentTheme.colors.primary);
    root.style.setProperty("--border-accent", currentTheme.colors.primary);
    root.style.setProperty("--system-purple", currentTheme.colors.primary);
    root.style.setProperty("--system-purple-dark", currentTheme.colors.secondary);
    root.style.setProperty("--text-primary", currentTheme.colors.textPrimary);
    root.style.setProperty("--text-secondary", currentTheme.colors.textSecondary);
    root.style.setProperty("--bg-primary", currentTheme.colors.windowBg);
    root.style.setProperty("--border-primary", currentTheme.colors.windowBorder);
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
