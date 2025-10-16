/**
 * WEB PUBLISHING THEMES
 *
 * All themes for the web publishing system in one file.
 * This matches the pattern used in src/contexts/theme-context.tsx
 * for the main application themes.
 *
 * Each theme defines a complete visual style that can be applied
 * to any template (landing page, blog post, portfolio, etc.).
 */

import { Theme } from "./types";

/**
 * All available themes for web publishing.
 * Add new themes by adding objects to this array.
 */
export const webPublishingThemes: Theme[] = [
  {
    code: "modern-gradient",
    name: "Modern Gradient",
    colors: {
      primary: "#6B46C1",
      primaryLight: "rgba(107, 70, 193, 0.05)",
      primaryDark: "#5B3AA6",
      secondary: "#9F7AEA",
      accent: "#D946EF",
      background: "#FFFFFF",
      surface: "#F9FAFB",
      surfaceHover: "#F3F4F6",
      text: "#1F2937",
      textLight: "#6B7280",
      textDark: "#111827",
      border: "#E5E7EB",
      borderHover: "#D1D5DB",
      buttonPrimary: "#1F2937",
      buttonPrimaryText: "#FFFFFF",
      buttonPrimaryHover: "#111827",
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#3B82F6",
    },
    typography: {
      fontFamily: {
        heading: "'Inter', sans-serif",
        body: "'Inter', sans-serif",
        mono: "'Fira Code', monospace",
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem",
        h1: "2.5rem",
        h2: "2rem",
        h3: "1.5rem",
        h4: "1.25rem",
        h5: "1.125rem",
        h6: "1rem",
        body: "1rem",
        small: "0.875rem",
      },
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
      "2xl": "3rem",
      "3xl": "4rem",
      "4xl": "6rem",
    },
    borderRadius: {
      none: "0",
      sm: "0.25rem",
      md: "0.5rem",
      lg: "1rem",
      xl: "1.5rem",
      full: "9999px",
    },
    shadows: {
      sm: "0 1px 2px rgba(0,0,0,0.05)",
      md: "0 4px 6px rgba(0,0,0,0.1)",
      lg: "0 10px 15px rgba(0,0,0,0.1)",
      xl: "0 20px 25px rgba(0,0,0,0.1)",
      "2xl": "0 25px 50px rgba(0,0,0,0.15)",
      none: "none",
    },
    layout: {
      maxWidth: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      breakpoints: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
  },
  {
    code: "modern-gradient-dark",
    name: "Modern Gradient Dark",
    colors: {
      primary: "#9F7AEA",
      primaryLight: "rgba(159, 122, 234, 0.1)",
      primaryDark: "#7C3AED",
      secondary: "#6B46C1",
      accent: "#D946EF",
      background: "#0F172A",
      surface: "#1E293B",
      surfaceHover: "#334155",
      text: "#F1F5F9",
      textLight: "#94A3B8",
      textDark: "#FFFFFF",
      border: "#334155",
      borderHover: "#475569",
      buttonPrimary: "#F1F5F9",
      buttonPrimaryText: "#0F172A",
      buttonPrimaryHover: "#FFFFFF",
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#3B82F6",
    },
    typography: {
      fontFamily: {
        heading: "'Inter', sans-serif",
        body: "'Inter', sans-serif",
        mono: "'Fira Code', monospace",
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem",
        h1: "2.5rem",
        h2: "2rem",
        h3: "1.5rem",
        h4: "1.25rem",
        h5: "1.125rem",
        h6: "1rem",
        body: "1rem",
        small: "0.875rem",
      },
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
      "2xl": "3rem",
      "3xl": "4rem",
      "4xl": "6rem",
    },
    borderRadius: {
      none: "0",
      sm: "0.25rem",
      md: "0.5rem",
      lg: "1rem",
      xl: "1.5rem",
      full: "9999px",
    },
    shadows: {
      sm: "0 1px 2px rgba(0,0,0,0.3)",
      md: "0 4px 6px rgba(0,0,0,0.4)",
      lg: "0 10px 15px rgba(0,0,0,0.5)",
      xl: "0 20px 25px rgba(0,0,0,0.5)",
      "2xl": "0 25px 50px rgba(0,0,0,0.6)",
      none: "none",
    },
    layout: {
      maxWidth: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      breakpoints: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
  },
  // Add more themes here as simple objects in this array
];

/**
 * Get a theme by its code.
 * Returns undefined if theme not found.
 */
export function getThemeByCode(code: string): Theme | undefined {
  return webPublishingThemes.find((theme) => theme.code === code);
}

/**
 * Get the default theme (first theme in the array).
 */
export function getDefaultTheme(): Theme {
  return webPublishingThemes[0];
}

/**
 * Check if a theme code exists.
 */
export function isValidThemeCode(code: string): boolean {
  return webPublishingThemes.some((theme) => theme.code === code);
}
