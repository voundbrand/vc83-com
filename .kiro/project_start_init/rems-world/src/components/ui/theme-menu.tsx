"use client";

import React from "react";
import { Check } from "lucide-react";

export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    windowBg: string;
    windowBorder: string;
    textPrimary: string;
    textSecondary: string;
    menuBg: string;
    glow: string;
  };
}

export const themes: Theme[] = [
  {
    id: "classic-purple",
    name: "Classic Purple",
    colors: {
      primary: "#8B5CF6",
      secondary: "#7C3AED",
      background: "#0A0118",
      windowBg: "#1A0F2E",
      windowBorder: "#4C1D95",
      textPrimary: "#E9D5FF",
      textSecondary: "#C4B5FD",
      menuBg: "#1A0F2E",
      glow: "rgba(139, 92, 246, 0.5)",
    },
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    colors: {
      primary: "#3B82F6",
      secondary: "#2563EB",
      background: "#010A18",
      windowBg: "#0F1A2E",
      windowBorder: "#1D4C95",
      textPrimary: "#D5E9FF",
      textSecondary: "#B5C4FD",
      menuBg: "#0F1A2E",
      glow: "rgba(59, 130, 246, 0.5)",
    },
  },
  {
    id: "sunset-orange",
    name: "Sunset Orange",
    colors: {
      primary: "#F97316",
      secondary: "#EA580C",
      background: "#180A01",
      windowBg: "#2E1A0F",
      windowBorder: "#954C1D",
      textPrimary: "#FFE9D5",
      textSecondary: "#FDC4B5",
      menuBg: "#2E1A0F",
      glow: "rgba(249, 115, 22, 0.5)",
    },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    colors: {
      primary: "#10B981",
      secondary: "#059669",
      background: "#011808",
      windowBg: "#0F2E1A",
      windowBorder: "#1D954C",
      textPrimary: "#D5FFE9",
      textSecondary: "#B5FDC4",
      menuBg: "#0F2E1A",
      glow: "rgba(16, 185, 129, 0.5)",
    },
  },
  {
    id: "midnight-dark",
    name: "Midnight Dark",
    colors: {
      primary: "#6B7280",
      secondary: "#4B5563",
      background: "#0A0A0A",
      windowBg: "#1A1A1A",
      windowBorder: "#4B4B4B",
      textPrimary: "#E5E5E5",
      textSecondary: "#B5B5B5",
      menuBg: "#1A1A1A",
      glow: "rgba(107, 114, 128, 0.5)",
    },
  },
  {
    id: "rose-gold",
    name: "Rose Gold",
    colors: {
      primary: "#EC4899",
      secondary: "#DB2777",
      background: "#180118",
      windowBg: "#2E0F2E",
      windowBorder: "#951D95",
      textPrimary: "#FFD5FF",
      textSecondary: "#FDB5FD",
      menuBg: "#2E0F2E",
      glow: "rgba(236, 72, 153, 0.5)",
    },
  },
  {
    id: "monochrome",
    name: "Monochrome",
    colors: {
      primary: "#FFFFFF",
      secondary: "#E5E5E5",
      background: "#000000",
      windowBg: "#111111",
      windowBorder: "#333333",
      textPrimary: "#FFFFFF",
      textSecondary: "#AAAAAA",
      menuBg: "#111111",
      glow: "rgba(255, 255, 255, 0.3)",
    },
  },
];

interface ThemeMenuProps {
  currentThemeId: string;
  onThemeSelect: (themeId: string) => void;
}

export function ThemeMenu({ currentThemeId, onThemeSelect }: ThemeMenuProps) {
  return (
    <div className="theme-menu">
      {themes.map((theme) => (
        <button
          key={theme.id}
          className={`theme-item ${currentThemeId === theme.id ? "active" : ""}`}
          onClick={() => onThemeSelect(theme.id)}
        >
          <span className="theme-swatch" style={{ background: theme.colors.primary }} />
          <span className="theme-name">{theme.name}</span>
          {currentThemeId === theme.id && <Check size={12} className="theme-check" />}
        </button>
      ))}

      <style jsx>{`
        .theme-menu {
          padding: 4px 0;
        }

        .theme-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 6px 12px;
          border: none;
          background: none;
          color: var(--text-primary);
          font-size: 12px;
          text-align: left;
          cursor: pointer;
          transition: all 0.1s ease;
          gap: 8px;
        }

        .theme-item:hover {
          background: var(--bg-accent);
          color: var(--text-inverse);
        }

        .theme-item.active {
          background: var(--bg-secondary);
        }

        .theme-swatch {
          width: 16px;
          height: 16px;
          border-radius: 2px;
          border: 1px solid var(--border-primary);
        }

        .theme-name {
          flex: 1;
        }

        .theme-check {
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}
