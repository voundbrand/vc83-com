"use client";

import { useState, useEffect } from "react";
import { Check, Image } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useTheme, themes } from "@/contexts/theme-context";
import { useTranslation } from "@/contexts/translation-context";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import MediaLibraryWindow from "@/components/window-content/media-library-window";
import type { Id } from "../../../convex/_generated/dataModel";

type TabType = "appearance" | "wallpaper" | "region";

export function SettingsWindow() {
  const { closeWindow } = useWindowManager();
  const { currentTheme, setTheme, windowStyle, setWindowStyle } = useTheme();
  const { locale, availableLocales, setLocale } = useTranslation(); // For locale management only
  const { t } = useNamespaceTranslations("ui.settings"); // For translations
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [activeTab, setActiveTab] = useState<TabType>("appearance");
  const [selectedThemeId, setSelectedThemeId] = useState<string>(currentTheme.id);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(locale);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isUpdatingBackground, setIsUpdatingBackground] = useState(false);
  const [backgroundUpdateStatus, setBackgroundUpdateStatus] = useState<string | null>(null);

  // Query current desktop background
  const brandingSettings = useQuery(
    api.organizationOntology.getOrganizationSettings,
    currentOrg?.id ? {
      organizationId: currentOrg.id as Id<"organizations">,
      subtype: "branding"
    } : "skip"
  );

  const currentDesktopBackground = brandingSettings && !Array.isArray(brandingSettings)
    ? (brandingSettings.customProperties as { desktopBackground?: string })?.desktopBackground
    : undefined;

  // Mutation to update desktop background
  const updateOrgSettings = useMutation(api.organizationOntology.updateOrganizationSettings);

  // Sync local state with context theme when it changes externally
  useEffect(() => {
    setSelectedThemeId(currentTheme.id);
  }, [currentTheme.id]);

  // Sync local state with context locale when it changes externally
  useEffect(() => {
    setSelectedLanguage(locale);
  }, [locale]);

  const handleApply = () => {
    // Apply theme using unified context
    setTheme(selectedThemeId);
    // Apply language using translation context
    setLocale(selectedLanguage);
    closeWindow("settings");
  };

  const handleReset = () => {
    setSelectedThemeId("clean-light"); // Reset to default Clean Light theme
    setSelectedLanguage("en"); // Reset to default language
  };

  const handleBrowseMediaLibrary = () => {
    setIsMediaLibraryOpen(true);
  };

  const handleMediaSelect = async (media: {
    _id: Id<"organizationMedia">;
    url?: string | null;
    filename: string;
    mimeType?: string;
  }) => {
    if (!media.url || !sessionId || !currentOrg?.id) {
      console.error("Missing required data for desktop background update");
      return;
    }

    setIsUpdatingBackground(true);
    setBackgroundUpdateStatus(null);

    try {
      await updateOrgSettings({
        sessionId,
        organizationId: currentOrg.id as Id<"organizations">,
        subtype: "branding",
        settings: {
          desktopBackground: media.url
        }
      });

      setBackgroundUpdateStatus("✓ Desktop background updated successfully!");
      setIsMediaLibraryOpen(false);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setBackgroundUpdateStatus(null);
      }, 3000);
    } catch (error) {
      console.error("Failed to update desktop background:", error);
      setBackgroundUpdateStatus("✗ Failed to update desktop background");

      // Clear error message after 5 seconds
      setTimeout(() => {
        setBackgroundUpdateStatus(null);
      }, 5000);
    } finally {
      setIsUpdatingBackground(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!sessionId || !currentOrg?.id) return;

    setIsUpdatingBackground(true);
    setBackgroundUpdateStatus(null);

    try {
      await updateOrgSettings({
        sessionId,
        organizationId: currentOrg.id as Id<"organizations">,
        subtype: "branding",
        settings: {
          desktopBackground: ""
        }
      });

      setBackgroundUpdateStatus("✓ Desktop background removed!");

      // Clear success message after 3 seconds
      setTimeout(() => {
        setBackgroundUpdateStatus(null);
      }, 3000);
    } catch (error) {
      console.error("Failed to remove desktop background:", error);
      setBackgroundUpdateStatus("✗ Failed to remove desktop background");

      // Clear error message after 5 seconds
      setTimeout(() => {
        setBackgroundUpdateStatus(null);
      }, 5000);
    } finally {
      setIsUpdatingBackground(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2 shrink-0" style={{ borderColor: 'var(--win95-border)' }}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>{t('ui.settings.title')}</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>{t('ui.settings.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 shrink-0" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "appearance" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "appearance" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("appearance")}
        >
          {t('ui.settings.tab.appearance')}
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
          {t('ui.settings.tab.wallpaper')}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors"
          style={{
            borderColor: 'var(--win95-border)',
            background: activeTab === "region" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
            color: activeTab === "region" ? 'var(--win95-text)' : 'var(--neutral-gray)'
          }}
          onClick={() => setActiveTab("region")}
        >
          🌍 {t('ui.settings.tab.region')}
        </button>
      </div>

      {/* Tab Content - Add padding bottom for mobile buttons */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-6">
        {activeTab === "appearance" && (
          <>
            {/* Window Style Section */}
            <div>
              <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
                {t('ui.settings.appearance.window_style')}
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
                    <div className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>{t('ui.settings.appearance.windows95_title')}</div>
                    <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>{t('ui.settings.appearance.windows95_description')}</div>
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
                    <div className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>{t('ui.settings.appearance.macos_title')}</div>
                    <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>{t('ui.settings.appearance.macos_description')}</div>
                  </div>
                  {windowStyle === "mac" && <Check size={16} style={{ color: 'var(--win95-text)' }} />}
                </button>
                <button
                  className="w-full flex items-center gap-3 p-3 border-2 rounded transition-all"
                  style={{
                    borderColor: windowStyle === "shadcn" ? 'var(--win95-text)' : 'var(--win95-border)',
                    background: windowStyle === "shadcn" ? 'var(--win95-bg-light)' : 'transparent'
                  }}
                  onClick={() => setWindowStyle("shadcn")}
                >
                  <div className="text-2xl">✨</div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>Shadcn UI</div>
                    <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>Modern, clean design with subtle shadows</div>
                  </div>
                  {windowStyle === "shadcn" && <Check size={16} style={{ color: 'var(--win95-text)' }} />}
                </button>
              </div>
            </div>

            {/* Color Theme Section */}
            <div>
          <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
            {t('ui.settings.appearance.color_scheme')}
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
                {/* Color Swatches - 5 colors for complete theme representation */}
                <div className="flex gap-0.5">
                  <div
                    className="w-5 h-5 border rounded-sm"
                    style={{
                      backgroundColor: theme.colors.background,
                      borderColor: 'var(--win95-border)',
                      opacity: theme.comingSoon ? 0.5 : 1
                    }}
                    title="Desktop Background"
                  />
                  <div
                    className="w-5 h-5 border rounded-sm"
                    style={{
                      backgroundColor: theme.colors.win95Bg,
                      borderColor: 'var(--win95-border)',
                      opacity: theme.comingSoon ? 0.5 : 1
                    }}
                    title="Window Background"
                  />
                  <div
                    className="w-5 h-5 border rounded-sm"
                    style={{
                      backgroundColor: theme.colors.win95Border,
                      borderColor: 'var(--win95-border)',
                      opacity: theme.comingSoon ? 0.5 : 1
                    }}
                    title="Border Color"
                  />
                  <div
                    className="w-5 h-5 border rounded-sm"
                    style={{
                      backgroundColor: theme.colors.win95Text,
                      borderColor: 'var(--win95-border)',
                      opacity: theme.comingSoon ? 0.5 : 1
                    }}
                    title="Text Color"
                  />
                  <div
                    className="w-5 h-5 border rounded-sm"
                    style={{
                      backgroundColor: theme.colors.win95Highlight,
                      borderColor: 'var(--win95-border)',
                      opacity: theme.comingSoon ? 0.5 : 1
                    }}
                    title="Accent Color"
                  />
                </div>

                {/* Theme Name */}
                <span className="flex-1 text-left text-sm font-medium" style={{ color: theme.comingSoon ? 'var(--neutral-gray)' : 'var(--win95-text)' }}>
                  {theme.name}
                  {theme.comingSoon && (
                    <span className="ml-2 text-xs italic" style={{ color: 'var(--neutral-gray)' }}>({t('ui.settings.appearance.coming_soon')})</span>
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

        {/* Preview Section - Comprehensive UI Preview */}
        <div>
          <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
            {t('ui.settings.appearance.preview')}
          </h3>

          {/* Desktop Preview Container */}
          <div
            className="border-2 rounded p-4"
            style={{
              background: themes.find((t) => t.id === selectedThemeId)?.colors.background,
              borderColor: 'var(--win95-border)',
              minHeight: '280px'
            }}
          >
            {/* Mini Window Preview */}
            <div
              className="shadow-lg"
              style={{
                backgroundColor: themes.find((t) => t.id === selectedThemeId)?.colors.win95Bg,
                borderWidth: windowStyle === 'shadcn' ? '1px' : '4px',
                borderStyle: 'solid',
                borderColor: themes.find((t) => t.id === selectedThemeId)?.colors.win95Border,
                borderRadius: windowStyle === 'shadcn' ? '12px' : windowStyle === 'mac' ? '8px' : '0px',
                overflow: 'hidden'
              }}
            >
              {/* Titlebar */}
              <div
                className="px-3 py-2 flex items-center justify-between"
                style={{
                  background: windowStyle === 'shadcn'
                    ? (selectedThemeId.includes('dark') ? '#1f2937' : '#ffffff')
                    : windowStyle === 'mac'
                    ? (selectedThemeId.includes('dark')
                        ? 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)'
                        : 'linear-gradient(180deg, #e8e8e8 0%, #d0d0d0 100%)')
                    : `linear-gradient(90deg, ${themes.find((t) => t.id === selectedThemeId)?.colors.win95Highlight} 0%, ${themes.find((t) => t.id === selectedThemeId)?.colors.win95GradientEnd} 100%)`,
                  borderBottom: windowStyle === 'shadcn' || windowStyle === 'mac'
                    ? `1px solid ${themes.find((t) => t.id === selectedThemeId)?.colors.win95Border}`
                    : 'none',
                  borderTopLeftRadius: windowStyle === 'shadcn' ? '12px' : windowStyle === 'mac' ? '8px' : '0px',
                  borderTopRightRadius: windowStyle === 'shadcn' ? '12px' : windowStyle === 'mac' ? '8px' : '0px',
                }}
              >
                {/* Window Title */}
                <span
                  className="text-xs font-bold"
                  style={{
                    color: windowStyle === 'windows'
                      ? '#ffffff'
                      : (selectedThemeId.includes('dark') ? '#ffffff' : '#1f2937')
                  }}
                >
                  Preview Window
                </span>

                {/* Control Buttons */}
                <div className="flex gap-1">
                  {windowStyle === 'mac' ? (
                    <>
                      {/* Mac style traffic lights */}
                      <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, #00ca56 0%, #00a846 100%)' }} />
                      <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, #ffbd2e 0%, #ffaa00 100%)' }} />
                      <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, #ff5f56 0%, #ff3b30 100%)' }} />
                    </>
                  ) : windowStyle === 'shadcn' ? (
                    <>
                      {/* Shadcn style buttons */}
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-xs"
                        style={{
                          color: selectedThemeId.includes('dark') ? '#ffffff' : '#1f2937',
                          background: 'transparent'
                        }}
                      >_</div>
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-xs"
                        style={{
                          color: selectedThemeId.includes('dark') ? '#ffffff' : '#1f2937',
                          background: 'transparent'
                        }}
                      >□</div>
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-xs"
                        style={{ color: '#ef4444' }}
                      >✕</div>
                    </>
                  ) : (
                    <>
                      {/* Windows 95 style buttons */}
                      <div className="w-5 h-4 rounded flex items-center justify-center text-xs text-white">_</div>
                      <div className="w-5 h-4 rounded flex items-center justify-center text-xs text-white">□</div>
                      <div className="w-5 h-4 rounded flex items-center justify-center text-xs text-white">✕</div>
                    </>
                  )}
                </div>
              </div>

              {/* Window Content */}
              <div className="p-4 space-y-3">
                {/* Sample Text */}
                <p
                  className="text-xs"
                  style={{ color: themes.find((t) => t.id === selectedThemeId)?.colors.win95Text }}
                >
                  This is how your windows will look with this theme.
                </p>

                {/* Sample Input */}
                <input
                  type="text"
                  placeholder="Sample input field"
                  className="w-full px-2 py-1 text-xs"
                  style={{
                    background: selectedThemeId.includes('dark') ? '#2d2d2d' : '#ffffff',
                    color: themes.find((t) => t.id === selectedThemeId)?.colors.win95Text,
                    border: `1px solid ${themes.find((t) => t.id === selectedThemeId)?.colors.win95Border}`,
                    borderRadius: windowStyle === 'shadcn' ? '6px' : windowStyle === 'mac' ? '4px' : '0px',
                  }}
                  readOnly
                />

                {/* Sample Buttons */}
                <div className="flex gap-2">
                  {/* Primary Button */}
                  <button
                    className="px-3 py-1 text-xs font-bold"
                    style={{
                      background: windowStyle === 'shadcn'
                        ? (selectedThemeId.includes('dark') ? '#374151' : '#ffffff')
                        : windowStyle === 'mac'
                        ? (selectedThemeId.includes('dark')
                            ? 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)'
                            : 'linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%)')
                        : `linear-gradient(135deg, ${themes.find((t) => t.id === selectedThemeId)?.colors.win95Highlight} 0%, ${themes.find((t) => t.id === selectedThemeId)?.colors.win95GradientEnd} 100%)`,
                      color: windowStyle === 'windows'
                        ? '#ffffff'
                        : (selectedThemeId.includes('dark') ? '#ffffff' : '#1f2937'),
                      border: `1px solid ${themes.find((t) => t.id === selectedThemeId)?.colors.win95Border}`,
                      borderRadius: windowStyle === 'shadcn' ? '6px' : windowStyle === 'mac' ? '4px' : '0px',
                    }}
                  >
                    Primary
                  </button>

                  {/* Secondary Button */}
                  <button
                    className="px-3 py-1 text-xs font-bold"
                    style={{
                      background: themes.find((t) => t.id === selectedThemeId)?.colors.win95Bg,
                      color: themes.find((t) => t.id === selectedThemeId)?.colors.win95Text,
                      border: `1px solid ${themes.find((t) => t.id === selectedThemeId)?.colors.win95Border}`,
                      borderRadius: windowStyle === 'shadcn' ? '6px' : windowStyle === 'mac' ? '4px' : '0px',
                    }}
                  >
                    Secondary
                  </button>
                </div>

                {/* Highlight Color Indicator */}
                <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: themes.find((t) => t.id === selectedThemeId)?.colors.win95Border }}>
                  <div
                    className="w-4 h-4 rounded"
                    style={{ background: themes.find((t) => t.id === selectedThemeId)?.colors.win95Highlight }}
                  />
                  <span className="text-xs" style={{ color: themes.find((t) => t.id === selectedThemeId)?.colors.win95Text }}>
                    Accent Color
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            <span>🪟 Window Style: <strong style={{ color: 'var(--win95-text)' }}>{windowStyle === 'windows' ? 'Windows 95' : windowStyle === 'mac' ? 'Mac OS X' : 'Shadcn UI'}</strong></span>
            <span>🎨 Theme: <strong style={{ color: 'var(--win95-text)' }}>{themes.find((t) => t.id === selectedThemeId)?.name}</strong></span>
          </div>
            </div>
          </>
        )}

        {activeTab === "wallpaper" && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
              {t('ui.settings.wallpaper.desktop_background')}
            </h3>

            {/* Status Message */}
            {backgroundUpdateStatus && (
              <div
                className="p-3 border-2 rounded text-sm"
                style={{
                  borderColor: backgroundUpdateStatus.startsWith('✓') ? '#10b981' : '#ef4444',
                  background: backgroundUpdateStatus.startsWith('✓') ? '#ecfdf5' : '#fee2e2',
                  color: backgroundUpdateStatus.startsWith('✓') ? '#065f46' : '#991b1b'
                }}
              >
                {backgroundUpdateStatus}
              </div>
            )}

            {/* Current Background Preview */}
            {currentDesktopBackground ? (
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--win95-text)' }}>
                  Current Background
                </label>
                <div
                  className="aspect-video border-2 rounded overflow-hidden bg-cover bg-center"
                  style={{
                    borderColor: 'var(--win95-border)',
                    backgroundImage: `url(${currentDesktopBackground})`
                  }}
                />
              </div>
            ) : (
              <div
                className="aspect-video border-2 rounded flex items-center justify-center"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)'
                }}
              >
                <div className="text-center">
                  <Image size={48} style={{ color: 'var(--neutral-gray)', margin: '0 auto 0.5rem' }} />
                  <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>No custom background set</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>Using theme default</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <RetroButton
                onClick={handleBrowseMediaLibrary}
                disabled={isUpdatingBackground || !sessionId || !currentOrg?.id}
              >
                📁 Browse Media Library
              </RetroButton>

              {currentDesktopBackground && (
                <RetroButton
                  variant="secondary"
                  onClick={handleRemoveBackground}
                  disabled={isUpdatingBackground || !sessionId || !currentOrg?.id}
                >
                  🗑️ Remove Background
                </RetroButton>
              )}
            </div>

            {/* Help Text */}
            <div
              className="p-3 border-2 rounded text-xs"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-bg-light)',
                color: 'var(--neutral-gray)'
              }}
            >
              <p className="font-bold mb-1" style={{ color: 'var(--win95-text)' }}>💡 Tip:</p>
              <p>Upload images to your Media Library, then select one to use as your desktop background. Recommended resolution: 1920x1080 or higher.</p>
            </div>
          </div>
        )}

        {activeTab === "region" && (
          <>
            {/* Language Section */}
            <div>
              <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
                {t('ui.settings.region.language')}
              </h3>
              <div className="space-y-2">
                {availableLocales.map((lang) => (
                  <button
                    key={lang}
                    className="w-full flex items-center gap-3 p-3 border-2 rounded transition-all"
                    style={{
                      borderColor: selectedLanguage === lang ? 'var(--win95-text)' : 'var(--win95-border)',
                      background: selectedLanguage === lang ? 'var(--win95-bg-light)' : 'transparent'
                    }}
                    onClick={() => setSelectedLanguage(lang)}
                  >
                    <div className="text-2xl">{getLanguageEmoji(lang)}</div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                        {getLanguageName(lang)}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                        {getLanguageNativeName(lang)}
                      </div>
                    </div>
                    {selectedLanguage === lang && <Check size={16} style={{ color: 'var(--win95-text)' }} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Timezone Section (Coming Soon) */}
            <div>
              <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
                {t('ui.settings.region.timezone')}
              </h3>
              <div
                className="p-4 border-2 rounded flex items-center justify-center opacity-50"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)'
                }}
              >
                <span className="text-xs italic" style={{ color: 'var(--neutral-gray)' }}>{t('ui.settings.appearance.coming_soon')}</span>
              </div>
            </div>

            {/* Date & Time Format Section (Coming Soon) */}
            <div>
              <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
                {t('ui.settings.region.datetime_format')}
              </h3>
              <div
                className="p-4 border-2 rounded flex items-center justify-center opacity-50"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)'
                }}
              >
                <span className="text-xs italic" style={{ color: 'var(--neutral-gray)' }}>{t('ui.settings.appearance.coming_soon')}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons - Fixed at bottom on mobile with sticky positioning */}
      <div className="flex gap-2 justify-end px-4 py-3 border-t-2 shrink-0 sticky bottom-0 z-10" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <RetroButton variant="secondary" onClick={handleReset}>
          {t('ui.settings.button.reset')}
        </RetroButton>
        <RetroButton onClick={handleApply}>
          {t('ui.settings.button.apply')}
        </RetroButton>
      </div>

      {/* Media Library Modal for Desktop Background Selection */}
      {isMediaLibraryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setIsMediaLibraryOpen(false)}
        >
          <div
            className="w-[90vw] h-[90vh] border-2 rounded shadow-lg overflow-hidden"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-3 py-2 border-b-2 flex items-center justify-between"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-highlight)',
                color: '#ffffff'
              }}
            >
              <h3 className="text-sm font-bold">Select Desktop Background</h3>
              <button
                onClick={() => setIsMediaLibraryOpen(false)}
                className="text-white hover:bg-black/20 px-2 py-1 rounded transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="h-[calc(90vh-3rem)]">
              <MediaLibraryWindow
                selectionMode={true}
                onSelect={handleMediaSelect}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Language display helpers
function getLanguageEmoji(code: string): string {
  const emojiMap: Record<string, string> = {
    en: "🇺🇸",
    de: "🇩🇪",
    pl: "🇵🇱",
    es: "🇪🇸",
    fr: "🇫🇷",
    ja: "🇯🇵",
  };
  return emojiMap[code] || "🌐";
}

function getLanguageName(code: string): string {
  const nameMap: Record<string, string> = {
    en: "English",
    de: "German",
    pl: "Polish",
    es: "Spanish",
    fr: "French",
    ja: "Japanese",
  };
  return nameMap[code] || code.toUpperCase();
}

function getLanguageNativeName(code: string): string {
  const nativeNameMap: Record<string, string> = {
    en: "English",
    de: "Deutsch",
    pl: "Polski",
    es: "Español",
    fr: "Français",
    ja: "日本語",
  };
  return nativeNameMap[code] || code;
}
