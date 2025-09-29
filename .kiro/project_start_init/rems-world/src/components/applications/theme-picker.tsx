"use client";

import React, { useState } from "react";
import { useWallpaper } from "@/contexts/wallpaper-context";
import { useTheme } from "@/contexts/theme-context";
import { themes } from "@/components/ui/theme-menu";
import { useWindowManager } from "@/components/window-manager/useWindowManager";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Check } from "lucide-react";

interface ThemePickerProps {
  windowId: string;
}

interface WallpaperItem {
  _id: Id<"wallpapers"> | string;
  name: string;
  storageId?: string;
  dominantColor: string;
  isPlaceholder?: boolean;
  url?: string | null;
}

// Define our available wallpapers with storage IDs from environment variables
const availableWallpapers: WallpaperItem[] = [
  {
    _id: "wallpaper1" as Id<"wallpapers">,
    name: "Wallpaper 1",
    storageId: process.env.NEXT_PUBLIC_WALLPAPER_1_STORAGE_ID || "",
    dominantColor: "#6B46C1",
  },
  {
    _id: "wallpaper2" as Id<"wallpapers">,
    name: "Wallpaper 2",
    storageId: process.env.NEXT_PUBLIC_WALLPAPER_2_STORAGE_ID || "",
    dominantColor: "#3B82F6",
  },
  {
    _id: "wallpaper3" as Id<"wallpapers">,
    name: "Wallpaper 3",
    storageId: process.env.NEXT_PUBLIC_WALLPAPER_3_STORAGE_ID || "",
    dominantColor: "#10B981",
  },
];

export function ThemePicker({ windowId }: ThemePickerProps) {
  const { selectedWallpaperId, setWallpaper } = useWallpaper();
  const { currentTheme, setTheme } = useTheme();
  const { close } = useWindowManager();

  // Store original values when component mounts
  const [originalWallpaper] = useState<string>(selectedWallpaperId || "wallpaper1");
  const [originalTheme] = useState<string>(currentTheme.id);

  const [selectedWallpaper, setSelectedWallpaper] = useState<string>(
    selectedWallpaperId || "wallpaper1",
  );
  const [selectedThemeId, setSelectedThemeId] = useState<string>(currentTheme.id);

  // Get wallpaper URLs for all three wallpapers
  const wallpaper1Url = useQuery(api.wallpapers.getWallpaperUrl, 
    availableWallpapers[0].storageId ? {
      storageId: availableWallpapers[0].storageId,
    } : "skip"
  );
  const wallpaper2Url = useQuery(api.wallpapers.getWallpaperUrl, 
    availableWallpapers[1].storageId ? {
      storageId: availableWallpapers[1].storageId,
    } : "skip"
  );
  const wallpaper3Url = useQuery(api.wallpapers.getWallpaperUrl, 
    availableWallpapers[2].storageId ? {
      storageId: availableWallpapers[2].storageId,
    } : "skip"
  );

  // Debug: Log storage IDs and URLs
  if (typeof window !== 'undefined') {
    console.log('Wallpaper Storage IDs:', {
      wallpaper1: availableWallpapers[0].storageId,
      wallpaper2: availableWallpapers[1].storageId,
      wallpaper3: availableWallpapers[2].storageId,
    });
    console.log('Wallpaper URLs:', {
      wallpaper1Url,
      wallpaper2Url,
      wallpaper3Url,
    });
  }

  // Update wallpaper URLs
  const wallpapersWithUrls = availableWallpapers.map((wp, index) => ({
    ...wp,
    url: index === 0 ? wallpaper1Url : index === 1 ? wallpaper2Url : wallpaper3Url,
  }));

  const handleApply = () => {
    // Changes are already applied instantly, just close the window
    close(windowId);
  };

  const handleReset = () => {
    // Reset to original values
    setWallpaper(originalWallpaper);
    setTheme(originalTheme);
    setSelectedWallpaper(originalWallpaper);
    setSelectedThemeId(originalTheme);
  };

  // Create wallpaper grid (3 actual + 13 placeholders)
  const wallpaperSlots: WallpaperItem[] = Array.from({ length: 16 }, (_, i) => {
    if (i < wallpapersWithUrls.length) {
      return wallpapersWithUrls[i];
    }
    return {
      _id: `placeholder-${i}`,
      name: "Coming Soon",
      isPlaceholder: true,
      dominantColor: "#1F2937",
    };
  });

  return (
    <div className="theme-picker">
      {/* Header */}
      <div className="theme-header">
        <h2>Choose Theme</h2>
      </div>

      {/* Content */}
      <div className="theme-content">
        {/* Wallpapers Section */}
        <div className="section">
          <h3 className="section-title">Desktop Background</h3>
          <div className="wallpaper-grid">
            {wallpaperSlots.map((wallpaper) => (
              <div
                key={wallpaper._id}
                className={`wallpaper-item ${
                  selectedWallpaper === wallpaper._id ? "selected" : ""
                } ${wallpaper.isPlaceholder ? "placeholder" : ""}`}
                onClick={() => {
                  if (!wallpaper.isPlaceholder) {
                    setSelectedWallpaper(wallpaper._id as string);
                    setWallpaper(wallpaper._id as string); // Apply wallpaper instantly
                  }
                }}
                style={{
                  backgroundColor: wallpaper.dominantColor,
                  backgroundImage:
                    wallpaper.url && !wallpaper.isPlaceholder ? `url(${wallpaper.url})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  cursor: wallpaper.isPlaceholder ? "default" : "pointer",
                }}
              >
                {wallpaper.isPlaceholder && <div className="placeholder-text">Coming Soon</div>}
                {selectedWallpaperId === wallpaper._id && !wallpaper.isPlaceholder && (
                  <div className="current-badge">Current</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Colors Section */}
        <div className="section">
          <h3 className="section-title">Color Theme</h3>
          <div className="color-list">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={`color-item ${selectedThemeId === theme.id ? "selected" : ""}`}
                onClick={() => {
                  setSelectedThemeId(theme.id);
                  setTheme(theme.id); // Apply theme instantly
                }}
              >
                <div className="color-preview">
                  <div
                    className="color-swatch primary"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                  <div
                    className="color-swatch secondary"
                    style={{ backgroundColor: theme.colors.secondary }}
                  />
                  <div
                    className="color-swatch bg"
                    style={{ backgroundColor: theme.colors.background }}
                  />
                </div>
                <span className="color-name">{theme.name}</span>
                {selectedThemeId === theme.id && <Check size={14} className="color-check" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="theme-actions">
        <button
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={selectedWallpaper === originalWallpaper && selectedThemeId === originalTheme}
        >
          Reset
        </button>
        <button
          className="btn btn-primary"
          onClick={handleApply}
        >
          Done
        </button>
      </div>

      <style jsx>{`
        .theme-picker {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--window-bg);
          color: var(--text-primary);
        }

        .theme-header {
          padding: 16px;
          border-bottom: 1px solid var(--border-primary);
        }

        .theme-header h2 {
          font-size: 14px;
          font-weight: 500;
          margin: 0;
          color: var(--text-primary);
        }

        .theme-content {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          margin: 0;
        }

        /* Wallpaper Grid */
        .wallpaper-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          max-width: 600px;
        }

        .wallpaper-item {
          aspect-ratio: 16/10;
          border: 3px solid transparent;
          border-radius: 8px;
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wallpaper-item:hover:not(.placeholder) {
          border-color: rgba(var(--theme-primary-rgb), 0.5);
          transform: scale(1.02);
        }

        .wallpaper-item.selected {
          border-color: var(--theme-primary);
          box-shadow: 0 0 20px rgba(var(--theme-primary-rgb), 0.3);
          transform: scale(1.02);
        }

        .wallpaper-item.placeholder {
          opacity: 0.5;
          border: 2px dashed rgba(255, 255, 255, 0.2);
        }

        .placeholder-text {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
          font-style: italic;
          text-align: center;
        }

        .current-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          background: var(--theme-primary);
          color: white;
          padding: 2px 8px;
          font-size: 9px;
          border-radius: 3px;
          font-weight: 500;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        /* Color Theme List */
        .color-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 600px;
        }

        .color-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border: 2px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .color-item:hover {
          background: var(--bg-secondary);
          border-color: var(--border-primary);
        }

        .color-item.selected {
          background: var(--bg-secondary);
          border-color: var(--theme-primary);
        }

        .color-preview {
          display: flex;
          gap: 4px;
        }

        .color-swatch {
          width: 20px;
          height: 20px;
          border-radius: 3px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .color-swatch.primary {
          width: 24px;
        }

        .color-swatch.secondary,
        .color-swatch.bg {
          width: 16px;
        }

        .color-name {
          flex: 1;
          font-size: 12px;
        }

        .color-check {
          color: var(--theme-primary);
        }

        /* Actions */
        .theme-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding: 16px;
          border-top: 1px solid var(--border-primary);
        }

        .btn {
          padding: 8px 20px;
          border: 1px solid var(--border-primary);
          background: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 12px;
          border-radius: 4px;
          transition: all 0.1s ease;
          font-weight: 500;
        }

        .btn:hover:not(:disabled) {
          background: var(--bg-accent);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: var(--theme-primary);
          color: white;
          border-color: var(--theme-primary);
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--theme-secondary);
          border-color: var(--theme-secondary);
        }

        .btn-secondary {
          background: var(--bg-secondary);
        }

        .btn-secondary:hover {
          background: var(--bg-accent);
        }

        @media (max-width: 640px) {
          .wallpaper-grid {
            gap: 8px;
          }

          .wallpaper-item {
            border-radius: 6px;
          }
        }
      `}</style>
    </div>
  );
}

