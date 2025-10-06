"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type WindowStyle = "mac" | "windows";

export interface Theme {
  id: string;
  name: string;
  comingSoon?: boolean; // Mark themes as coming soon
  colors: {
    // Desktop background
    background: string;
    // Win95 window colors
    win95Bg: string;
    win95BgLight: string;
    win95Border: string;
    win95BorderLight: string;
    win95Text: string;
    win95Highlight: string;
    // Text colors
    foreground: string;
  };
}

export const themes: Theme[] = [
  {
    id: "win95-light",
    name: "Windows 95",
    colors: {
      background: "#008080", // Teal wallpaper
      win95Bg: "#f0f0f0", // Lighter gray (was #c0c0c0)
      win95BgLight: "#ffffff",
      win95Border: "#d0d0d0",
      win95BorderLight: "#e8e8e8",
      win95Text: "#1f2937", // gray-800
      win95Highlight: "#000080",
      foreground: "#1f2937",
    },
  },
  {
    id: "win95-dark",
    name: "Windows 95 Dark",
    colors: {
      background: "#2d2d2d", // Dark desktop
      win95Bg: "#3d3d3d",
      win95BgLight: "#4d4d4d",
      win95Border: "#1d1d1d",
      win95BorderLight: "#5d5d5d",
      win95Text: "#ffffff", // Pure white for better contrast
      win95Highlight: "#4169e1",
      foreground: "#ffffff", // Pure white for better contrast
    },
  },
  {
    id: "win95-purple",
    name: "Windows 95 Purple",
    colors: {
      background: "#6B46C1", // Purple wallpaper
      win95Bg: "#f0f0f0", // Updated to lighter gray
      win95BgLight: "#ffffff",
      win95Border: "#d0d0d0",
      win95BorderLight: "#e8e8e8",
      win95Text: "#1f2937",
      win95Highlight: "#6B46C1",
      foreground: "#1f2937",
    },
  },
  {
    id: "win95-blue",
    name: "Windows 95 Blue",
    colors: {
      background: "#0000AA", // Classic Windows blue
      win95Bg: "#f0f0f0", // Updated to lighter gray
      win95BgLight: "#ffffff",
      win95Border: "#d0d0d0",
      win95BorderLight: "#e8e8e8",
      win95Text: "#1f2937",
      win95Highlight: "#0000AA",
      foreground: "#1f2937",
    },
  },
  // Coming Soon Themes
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    comingSoon: true,
    colors: {
      background: "#3B82F6",
      win95Bg: "#EFF6FF",
      win95BgLight: "#DBEAFE",
      win95Border: "#93C5FD",
      win95BorderLight: "#BFDBFE",
      win95Text: "#1E3A8A",
      win95Highlight: "#2563EB",
      foreground: "#1E3A8A",
    },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    comingSoon: true,
    colors: {
      background: "#10B981",
      win95Bg: "#ECFDF5",
      win95BgLight: "#D1FAE5",
      win95Border: "#6EE7B7",
      win95BorderLight: "#A7F3D0",
      win95Text: "#064E3B",
      win95Highlight: "#059669",
      foreground: "#064E3B",
    },
  },
  {
    id: "sunset-orange",
    name: "Sunset Orange",
    comingSoon: true,
    colors: {
      background: "#F97316",
      win95Bg: "#FFF7ED",
      win95BgLight: "#FFEDD5",
      win95Border: "#FDBA74",
      win95BorderLight: "#FED7AA",
      win95Text: "#7C2D12",
      win95Highlight: "#EA580C",
      foreground: "#7C2D12",
    },
  },
  {
    id: "rose-pink",
    name: "Rose Pink",
    comingSoon: true,
    colors: {
      background: "#EC4899",
      win95Bg: "#FDF2F8",
      win95BgLight: "#FCE7F3",
      win95Border: "#F9A8D4",
      win95BorderLight: "#FBCFE8",
      win95Text: "#831843",
      win95Highlight: "#DB2777",
      foreground: "#831843",
    },
  },
];

interface ThemeContextValue {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  windowStyle: WindowStyle;
  setWindowStyle: (style: WindowStyle) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "L4YERCAK3-theme";
const WINDOW_STYLE_STORAGE_KEY = "L4YERCAK3-window-style";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to Windows 95 light theme and windows style
  const defaultTheme = themes.find(t => t.id === "win95-light") || themes[0];
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme);
  const [windowStyle, setWindowStyleState] = useState<WindowStyle>("windows");

  // Load theme and window style from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedThemeId) {
      const savedTheme = themes.find((t) => t.id === savedThemeId);
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      }
    }

    const savedWindowStyle = localStorage.getItem(WINDOW_STYLE_STORAGE_KEY) as WindowStyle;
    if (savedWindowStyle) {
      setWindowStyleState(savedWindowStyle);
    }
  }, []);

  // Apply theme CSS variables and window style
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // Apply theme colors as CSS custom properties
    root.style.setProperty("--background", currentTheme.colors.background);
    root.style.setProperty("--foreground", currentTheme.colors.foreground);
    root.style.setProperty("--win95-bg", currentTheme.colors.win95Bg);
    root.style.setProperty("--win95-bg-light", currentTheme.colors.win95BgLight);
    root.style.setProperty("--win95-border", currentTheme.colors.win95Border);
    root.style.setProperty("--win95-border-light", currentTheme.colors.win95BorderLight);
    root.style.setProperty("--win95-text", currentTheme.colors.win95Text);
    root.style.setProperty("--win95-highlight", currentTheme.colors.win95Highlight);

    // Update dark class for dark theme
    if (currentTheme.id === "win95-dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Apply window style data attribute
    root.setAttribute("data-window-style", windowStyle);
  }, [currentTheme, windowStyle]);

  const setTheme = (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    }
  };

  const setWindowStyle = (style: WindowStyle) => {
    setWindowStyleState(style);
    localStorage.setItem(WINDOW_STYLE_STORAGE_KEY, style);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, windowStyle, setWindowStyle }}>
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

// Backward compatibility: export useWindowStyle hook
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
