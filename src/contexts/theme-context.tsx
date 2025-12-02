"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";

export type WindowStyle = "mac" | "windows" | "shadcn";

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
    // Hover colors for menus and interactive elements
    win95HoverBg: string;
    win95HoverText: string;
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
      win95HoverBg: "#000080", // Classic Windows 95 blue
      win95HoverText: "#ffffff", // White text on blue
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
      win95HoverBg: "#4169e1", // Royal blue hover
      win95HoverText: "#ffffff", // White text
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
      win95HoverBg: "#6B46C1", // Purple hover
      win95HoverText: "#ffffff", // White text
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
      win95HoverBg: "#0000AA", // Blue hover
      win95HoverText: "#ffffff", // White text
      foreground: "#1f2937",
    },
  },
  {
    id: "win95-purple-dark",
    name: "Windows 95 Purple Dark",
    colors: {
      background: "#2d2d2d", // Dark desktop
      win95Bg: "#3d3d3d",
      win95BgLight: "#4d4d4d",
      win95Border: "#1d1d1d",
      win95BorderLight: "#5d5d5d",
      win95Text: "#ffffff", // White text for dark mode
      win95Highlight: "#9F7AEA", // Lighter purple for dark mode (better visibility)
      win95HoverBg: "#9F7AEA", // Light purple hover
      win95HoverText: "#ffffff", // White text
      foreground: "#ffffff",
    },
  },
  {
    id: "win95-green",
    name: "Windows 95 Green",
    colors: {
      background: "#059669", // Emerald green wallpaper
      win95Bg: "#f0f0f0",
      win95BgLight: "#ffffff",
      win95Border: "#d0d0d0",
      win95BorderLight: "#e8e8e8",
      win95Text: "#1f2937",
      win95Highlight: "#059669", // Emerald green accent
      win95HoverBg: "#059669", // Green hover
      win95HoverText: "#ffffff", // White text
      foreground: "#1f2937",
    },
  },
  {
    id: "win95-green-dark",
    name: "Windows 95 Green Dark",
    colors: {
      background: "#2d2d2d", // Dark desktop
      win95Bg: "#3d3d3d",
      win95BgLight: "#4d4d4d",
      win95Border: "#1d1d1d",
      win95BorderLight: "#5d5d5d",
      win95Text: "#ffffff", // White text for dark mode
      win95Highlight: "#10b981", // Lighter green for dark mode (better visibility)
      win95HoverBg: "#10b981", // Light green hover
      win95HoverText: "#ffffff", // White text
      foreground: "#ffffff",
    },
  },
  {
    id: "glass-light",
    name: "Modern Glass",
    colors: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // Purple gradient wallpaper
      win95Bg: "rgba(255, 255, 255, 0.7)", // Translucent white with blur
      win95BgLight: "rgba(255, 255, 255, 0.85)",
      win95Border: "rgba(255, 255, 255, 0.2)",
      win95BorderLight: "rgba(255, 255, 255, 0.3)",
      win95Text: "#1f2937", // Dark text for light backgrounds
      win95Highlight: "#667eea", // Purple accent
      win95HoverBg: "rgba(102, 126, 234, 0.2)", // Purple tint hover (handled by CSS for glass)
      win95HoverText: "#1f2937", // Dark text
      foreground: "#1f2937",
    },
  },
  {
    id: "glass-dark",
    name: "Modern Glass Dark",
    colors: {
      background: "linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)", // Deep blue gradient wallpaper
      win95Bg: "rgba(30, 30, 30, 0.7)", // Translucent dark with blur
      win95BgLight: "rgba(45, 45, 45, 0.85)",
      win95Border: "rgba(255, 255, 255, 0.1)",
      win95BorderLight: "rgba(255, 255, 255, 0.15)",
      win95Text: "#ffffff", // White text for dark mode
      win95Highlight: "#60a5fa", // Light blue accent
      win95HoverBg: "rgba(96, 165, 250, 0.15)", // Blue tint hover (handled by CSS for glass)
      win95HoverText: "#ffffff", // White text
      foreground: "#ffffff",
    },
  },
  {
    id: "clean-light",
    name: "Clean Light",
    colors: {
      background: "#f8f9fa", // Light gray background
      win95Bg: "#ffffff", // Pure white windows
      win95BgLight: "#f8f9fa", // Very light gray for sections
      win95Border: "#e2e8f0", // Subtle border
      win95BorderLight: "#f1f5f9", // Even lighter border
      win95Text: "#0f172a", // Slate 900 for text
      win95Highlight: "#0f172a", // Slate 900 for accents
      win95HoverBg: "#f1f5f9", // Very subtle light gray hover
      win95HoverText: "#0f172a", // Keep text dark on hover
      foreground: "#0f172a",
    },
  },
  {
    id: "clean-dark",
    name: "Clean Dark",
    colors: {
      background: "#0a0a0a", // Near-black background
      win95Bg: "#171717", // Neutral 900 windows (true dark gray)
      win95BgLight: "#262626", // Neutral 800 for sections
      win95Border: "#404040", // Neutral 700 border
      win95BorderLight: "#525252", // Neutral 600 lighter border
      win95Text: "#fafafa", // Neutral 50 for text
      win95Highlight: "#fafafa", // Neutral 50 for accents
      win95HoverBg: "#262626", // Subtle dark gray hover
      win95HoverText: "#ffffff", // Pure white text on hover
      foreground: "#fafafa",
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
      win95HoverBg: "#2563EB",
      win95HoverText: "#ffffff",
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
      win95HoverBg: "#059669",
      win95HoverText: "#ffffff",
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
      win95HoverBg: "#EA580C",
      win95HoverText: "#ffffff",
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
      win95HoverBg: "#DB2777",
      win95HoverText: "#ffffff",
      foreground: "#831843",
    },
  },
];

/**
 * Theme Families - Light/Dark pairs for theme toggling
 * Each family has a light and dark variant that users can toggle between
 */
export const themeFamilies = {
  "win95": {
    light: "win95-light",
    dark: "win95-dark",
    name: "Windows 95"
  },
  "win95-purple": {
    light: "win95-purple",
    dark: "win95-purple-dark",
    name: "Windows 95 Purple"
  },
  "win95-green": {
    light: "win95-green",
    dark: "win95-green-dark",
    name: "Windows 95 Green"
  },
  "glass": {
    light: "glass-light",
    dark: "glass-dark",
    name: "Modern Glass"
  },
  "clean": {
    light: "clean-light",
    dark: "clean-dark",
    name: "Clean"
  }
};

/**
 * Get the theme family for a given theme ID
 * Returns the family key or null if theme has no family
 */
export function getThemeFamily(themeId: string): string | null {
  for (const [familyKey, family] of Object.entries(themeFamilies)) {
    if (family.light === themeId || family.dark === themeId) {
      return familyKey;
    }
  }
  return null;
}

/**
 * Check if a theme is a light variant
 */
export function isLightTheme(themeId: string): boolean {
  return Object.values(themeFamilies).some(family => family.light === themeId);
}

/**
 * Get the opposite theme (light ↔ dark) within the same family
 */
export function getOppositeTheme(themeId: string): string | null {
  const familyKey = getThemeFamily(themeId);
  if (!familyKey) return null;

  const family = themeFamilies[familyKey as keyof typeof themeFamilies];
  return isLightTheme(themeId) ? family.dark : family.light;
}

interface ThemeContextValue {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  windowStyle: WindowStyle;
  setWindowStyle: (style: WindowStyle) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "L4YERCAK3-theme";
const WINDOW_STYLE_STORAGE_KEY = "L4YERCAK3-window-style";

/**
 * Adjust color brightness for titlebar gradient
 */
function adjustBrightness(color: string, factor: number): string {
  // Convert hex to RGB
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Adjust brightness
  const newR = Math.min(255, Math.floor(r * factor));
  const newG = Math.min(255, Math.floor(g * factor));
  const newB = Math.min(255, Math.floor(b * factor));

  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { sessionId } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);

  // Default to Clean Light (shadcn) theme and shadcn window style
  const defaultTheme = themes.find(t => t.id === "clean-light") || themes[0];
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme);
  const [windowStyle, setWindowStyleState] = useState<WindowStyle>("shadcn");

  // Load preferences from Convex (only if signed in)
  const userPrefs = useQuery(
    api.userPreferences.get,
    sessionId ? { sessionId } : "skip"
  );

  const updatePrefs = useMutation(api.userPreferences.update);

  // Load from Convex when available (signed-in users)
  useEffect(() => {
    if (userPrefs && !isHydrated) {
      const theme = themes.find(t => t.id === userPrefs.themeId);
      if (theme) setCurrentTheme(theme);
      if (userPrefs.windowStyle) setWindowStyleState(userPrefs.windowStyle as WindowStyle);
      setIsHydrated(true);
    }
  }, [userPrefs, isHydrated]);

  // Fallback to localStorage if not signed in
  useEffect(() => {
    if (!sessionId && typeof window !== "undefined" && !isHydrated) {
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
      setIsHydrated(true);
    }
  }, [sessionId, isHydrated]);

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
    root.style.setProperty("--win95-hover-bg", currentTheme.colors.win95HoverBg);
    root.style.setProperty("--win95-hover-text", currentTheme.colors.win95HoverText);

    // Update titlebar gradient to match theme highlight color
    // BUT: For glass themes, keep titlebar transparent (handled by CSS)
    const glassThemes = ["glass-light", "glass-dark"];
    if (!glassThemes.includes(currentTheme.id)) {
      const highlightColor = currentTheme.colors.win95Highlight;
      const titlebarGradient = `linear-gradient(180deg, ${highlightColor} 0%, ${adjustBrightness(highlightColor, 1.2)} 100%)`;
      root.style.setProperty("--win95-titlebar", titlebarGradient);
      root.style.setProperty("--modal-header-bg", titlebarGradient);
    } else {
      // Glass themes use transparent titlebar (set by CSS)
      root.style.setProperty("--win95-titlebar", "var(--glass-bg)");
      root.style.setProperty("--modal-header-bg", "var(--glass-bg)");
    }

    // Update dark class for dark themes
    const darkThemes = ["win95-dark", "win95-purple-dark", "win95-green-dark", "glass-dark", "clean-dark"];
    if (darkThemes.includes(currentTheme.id)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Add glass theme class for special styling
    if (glassThemes.includes(currentTheme.id)) {
      root.classList.add("glass-theme");
    } else {
      root.classList.remove("glass-theme");
    }

    // Apply window style data attribute
    root.setAttribute("data-window-style", windowStyle);
  }, [currentTheme, windowStyle]);

  const setTheme = async (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId);
    if (!theme) return;

    setCurrentTheme(theme);

    if (sessionId) {
      // Save to Convex if signed in
      try {
        await updatePrefs({ sessionId, themeId });
      } catch (error) {
        console.error("Failed to save theme preference:", error);
        // Fallback to localStorage on error
        localStorage.setItem(THEME_STORAGE_KEY, themeId);
      }
    } else {
      // Fallback to localStorage if not signed in
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    }
  };

  const setWindowStyle = async (style: WindowStyle) => {
    setWindowStyleState(style);

    if (sessionId) {
      // Save to Convex if signed in
      try {
        await updatePrefs({ sessionId, windowStyle: style });
      } catch (error) {
        console.error("Failed to save window style preference:", error);
        // Fallback to localStorage on error
        localStorage.setItem(WINDOW_STYLE_STORAGE_KEY, style);
      }
    } else {
      // Fallback to localStorage if not signed in
      localStorage.setItem(WINDOW_STYLE_STORAGE_KEY, style);
    }
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
