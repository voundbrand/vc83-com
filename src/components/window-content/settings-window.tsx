"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useTheme, themes } from "@/contexts/theme-context";

type TabType = "appearance" | "wallpaper";

export function SettingsWindow() {
  const { closeWindow } = useWindowManager();
  const { currentTheme, setTheme, windowStyle, setWindowStyle } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("appearance");
  const [selectedThemeId, setSelectedThemeId] = useState<string>(currentTheme.id);

  // Sync local state with context theme when it changes externally
  useEffect(() => {
    setSelectedThemeId(currentTheme.id);
  }, [currentTheme.id]);

  const handleApply = () => {
    // Apply theme using unified context
    setTheme(selectedThemeId);
    closeWindow("settings");
  };

  const handleReset = () => {
    setSelectedThemeId("win95-light"); // Reset to default Windows 95 theme
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>Desktop Settings</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>Customize your workspace appearance</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "appearance" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "appearance" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("appearance")}
        >
          Appearance
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "wallpaper" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "wallpaper" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("wallpaper")}
        >
          Wallpaper
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === "appearance" && (
          <>
            {/* Window Style Section */}
            <div>
              <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
                Window Style
              </h3>
              <div className="space-y-2">
                <button
                  className="w-full flex items-center gap-3 p-3 border-2 rounded transition-all"
                  style={{
                    borderColor: windowStyle === "windows" ? 'var(--win95-text)' : 'var(--win95-border)',
                    background: windowStyle === "windows" ? 'var(--win95-bg-light)' : 'transparent'
                  }}
                  onClick={() => setWindowStyle("windows")}
                >
                  <div className="text-2xl">🪟</div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>Classic Windows 95</div>
                    <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>Sharp edges and classic styling</div>
                  </div>
                  {windowStyle === "windows" && <Check size={16} style={{ color: 'var(--win95-text)' }} />}
                </button>
                <button
                  className="w-full flex items-center gap-3 p-3 border-2 rounded transition-all"
                  style={{
                    borderColor: windowStyle === "mac" ? 'var(--win95-text)' : 'var(--win95-border)',
                    background: windowStyle === "mac" ? 'var(--win95-bg-light)' : 'transparent'
                  }}
                  onClick={() => setWindowStyle("mac")}
                >
                  <div className="text-2xl">🍎</div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>Mac OS X Style</div>
                    <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>Rounded edges and smooth design</div>
                  </div>
                  {windowStyle === "mac" && <Check size={16} style={{ color: 'var(--win95-text)' }} />}
                </button>
              </div>
            </div>

            {/* Color Theme Section */}
            <div>
          <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
            Color Scheme
          </h3>
          <div className="space-y-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                disabled={theme.comingSoon}
                className="w-full flex items-center gap-3 p-2 border-2 rounded transition-all"
                style={{
                  borderColor: theme.comingSoon
                    ? 'var(--win95-border-light)'
                    : selectedThemeId === theme.id
                    ? 'var(--win95-text)'
                    : 'var(--win95-border)',
                  background: theme.comingSoon
                    ? 'var(--win95-bg-light)'
                    : selectedThemeId === theme.id
                    ? 'var(--win95-bg-light)'
                    : 'transparent',
                  opacity: theme.comingSoon ? 0.6 : 1,
                  cursor: theme.comingSoon ? 'not-allowed' : 'pointer'
                }}
                onClick={() => !theme.comingSoon && setSelectedThemeId(theme.id)}
              >
                {/* Color Swatches */}
                <div className="flex gap-1">
                  <div
                    className="w-6 h-6 border-2 rounded"
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: 'var(--win95-border)',
                      opacity: theme.comingSoon ? 0.5 : 1
                    }}
                    title="Desktop Background"
                  />
                  <div
                    className="w-6 h-6 border-2 rounded"
                    style={{
                      backgroundColor: theme.colors.win95Bg,
                      borderColor: 'var(--win95-border)',
                      opacity: theme.comingSoon ? 0.5 : 1
                    }}
                    title="Window Background"
                  />
                  <div
                    className="w-6 h-6 border-2 rounded"
                    style={{
                      backgroundColor: theme.colors.win95Highlight,
                      borderColor: 'var(--win95-border)',
                      opacity: theme.comingSoon ? 0.5 : 1
                    }}
                    title="Highlight Color"
                  />
                </div>

                {/* Theme Name */}
                <span className="flex-1 text-left text-sm font-medium" style={{ color: theme.comingSoon ? 'var(--neutral-gray)' : 'var(--win95-text)' }}>
                  {theme.name}
                  {theme.comingSoon && (
                    <span className="ml-2 text-xs italic" style={{ color: 'var(--neutral-gray)' }}>(Coming Soon)</span>
                  )}
                </span>

                {/* Check Icon */}
                {selectedThemeId === theme.id && !theme.comingSoon && (
                  <Check size={16} style={{ color: 'var(--win95-text)' }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Preview Section */}
        <div>
          <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
            Preview
          </h3>
          <div
            className="border-2 rounded p-4"
            style={{
              backgroundColor: themes.find((t) => t.id === selectedThemeId)?.colors.background,
              borderColor: 'var(--win95-border)'
            }}
          >
            <div
              className="p-3 rounded shadow-md border-2"
              style={{
                backgroundColor: themes.find((t) => t.id === selectedThemeId)?.colors.win95Bg,
                borderColor: themes.find((t) => t.id === selectedThemeId)?.colors.win95Border,
              }}
            >
              <div
                className="p-1 text-xs font-bold mb-2"
                style={{
                  backgroundColor: themes.find((t) => t.id === selectedThemeId)?.colors.win95Highlight,
                  color: "#ffffff",
                }}
              >
                Sample Window
              </div>
              <p
                className="text-xs"
                style={{
                  color: themes.find((t) => t.id === selectedThemeId)?.colors.win95Text,
                }}
              >
                This is how your desktop will look with the selected theme.
              </p>
            </div>
          </div>
            </div>
          </>
        )}

        {activeTab === "wallpaper" && (
          <div>
            <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
              Desktop Background
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-video border-2 rounded flex items-center justify-center cursor-pointer transition-colors"
                  style={{
                    borderColor: 'var(--win95-border)',
                    background: 'var(--win95-bg-light)'
                  }}
                >
                  <span className="text-xs italic" style={{ color: 'var(--neutral-gray)' }}>Coming Soon</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end px-4 py-3 border-t-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <RetroButton variant="secondary" onClick={handleReset}>
          Reset
        </RetroButton>
        <RetroButton onClick={handleApply}>
          Apply
        </RetroButton>
      </div>
    </div>
  );
}
