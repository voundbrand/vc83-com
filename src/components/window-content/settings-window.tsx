"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useTheme, themes } from "@/contexts/theme-context";
import { useTranslation } from "@/contexts/translation-context";
import { useIsSuperAdmin } from "@/hooks/use-auth";
import { OntologyAdminWindow } from "./ontology-admin";

type TabType = "appearance" | "wallpaper" | "region" | "admin";

export function SettingsWindow() {
  const { closeWindow, openWindow } = useWindowManager();
  const { currentTheme, setTheme, windowStyle, setWindowStyle } = useTheme();
  const { locale, availableLocales, setLocale, t } = useTranslation();
  const isSuperAdmin = useIsSuperAdmin();
  const [activeTab, setActiveTab] = useState<TabType>("appearance");
  const [selectedThemeId, setSelectedThemeId] = useState<string>(currentTheme.id);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(locale);

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
    setSelectedThemeId("win95-light"); // Reset to default Windows 95 theme
    setSelectedLanguage("en"); // Reset to default language
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
          {t('ui.settings.tab_appearance')}
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
          {t('ui.settings.tab_wallpaper')}
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
          🌍 {t('ui.settings.tab_region')}
        </button>
        {isSuperAdmin && (
          <button
            className="px-4 py-2 text-xs font-bold border-r-2 transition-colors"
            style={{
              borderColor: 'var(--win95-border)',
              background: activeTab === "admin" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
              color: activeTab === "admin" ? 'var(--win95-text)' : 'var(--neutral-gray)'
            }}
            onClick={() => setActiveTab("admin")}
          >
            🥷 {t('ui.settings.tab_admin')}
          </button>
        )}
      </div>

      {/* Tab Content - Add padding bottom for mobile buttons */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-6">
        {activeTab === "appearance" && (
          <>
            {/* Window Style Section */}
            <div>
              <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
                {t('ui.settings.section_window_style')}
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
                    <div className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>{t('ui.settings.window_style_windows_title')}</div>
                    <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>{t('ui.settings.window_style_windows_desc')}</div>
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
                    <div className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>{t('ui.settings.window_style_mac_title')}</div>
                    <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>{t('ui.settings.window_style_mac_desc')}</div>
                  </div>
                  {windowStyle === "mac" && <Check size={16} style={{ color: 'var(--win95-text)' }} />}
                </button>
              </div>
            </div>

            {/* Color Theme Section */}
            <div>
          <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
            {t('ui.settings.section_color_theme')}
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
                    <span className="ml-2 text-xs italic" style={{ color: 'var(--neutral-gray)' }}>({t('ui.settings.coming_soon')})</span>
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
            {t('ui.settings.section_preview')}
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
                {t('ui.settings.preview_window_title')}
              </div>
              <p
                className="text-xs"
                style={{
                  color: themes.find((t) => t.id === selectedThemeId)?.colors.win95Text,
                }}
              >
                {t('ui.settings.preview_window_desc')}
              </p>
            </div>
          </div>
            </div>
          </>
        )}

        {activeTab === "wallpaper" && (
          <div>
            <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
              {t('ui.settings.section_wallpaper')}
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
                  <span className="text-xs italic" style={{ color: 'var(--neutral-gray)' }}>{t('ui.settings.coming_soon')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "region" && (
          <>
            {/* Language Section */}
            <div>
              <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
                {t('ui.settings.section_language')}
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
                {t('ui.settings.section_timezone')}
              </h3>
              <div
                className="p-4 border-2 rounded flex items-center justify-center opacity-50"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)'
                }}
              >
                <span className="text-xs italic" style={{ color: 'var(--neutral-gray)' }}>{t('ui.settings.coming_soon')}</span>
              </div>
            </div>

            {/* Date & Time Format Section (Coming Soon) */}
            <div>
              <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
                {t('ui.settings.section_datetime_format')}
              </h3>
              <div
                className="p-4 border-2 rounded flex items-center justify-center opacity-50"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)'
                }}
              >
                <span className="text-xs italic" style={{ color: 'var(--neutral-gray)' }}>{t('ui.settings.coming_soon')}</span>
              </div>
            </div>
          </>
        )}

        {activeTab === "admin" && isSuperAdmin && (
          <div>
            <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
              🥷 Super Admin Tools
            </h3>
            <div className="space-y-3">
              {/* Ontology Admin */}
              <button
                className="w-full flex items-center gap-3 p-4 border-2 rounded transition-all hover:shadow-md"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)',
                }}
                onClick={() => {
                  // Open full-screen ontology admin window
                  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
                  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
                  openWindow(
                    "ontology-admin",
                    "Ontology Admin",
                    <OntologyAdminWindow />,
                    { x: 20, y: 20 },
                    { width: screenWidth - 40, height: screenHeight - 40 }
                  );
                  closeWindow("settings");
                }}
              >
                <div className="text-3xl">🥷</div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                    {t('ui.settings.admin_ontology_title')}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                    {t('ui.settings.admin_ontology_desc')}
                  </div>
                </div>
              </button>

              {/* Future Admin Tools */}
              <div
                className="w-full flex items-center gap-3 p-4 border-2 rounded opacity-50"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)',
                }}
              >
                <div className="text-3xl">👥</div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                    {t('ui.settings.admin_user_management_title')}
                  </div>
                  <div className="text-xs mt-1 italic" style={{ color: 'var(--neutral-gray)' }}>
                    {t('ui.settings.coming_soon')}
                  </div>
                </div>
              </div>

              <div
                className="w-full flex items-center gap-3 p-4 border-2 rounded opacity-50"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)',
                }}
              >
                <div className="text-3xl">📊</div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                    {t('ui.settings.admin_system_analysis_title')}
                  </div>
                  <div className="text-xs mt-1 italic" style={{ color: 'var(--neutral-gray)' }}>
                    {t('ui.settings.coming_soon')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons - Fixed at bottom on mobile with sticky positioning */}
      <div className="flex gap-2 justify-end px-4 py-3 border-t-2 shrink-0 sticky bottom-0 z-10" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <RetroButton variant="secondary" onClick={handleReset}>
          {t('ui.settings.button_reset')}
        </RetroButton>
        <RetroButton onClick={handleApply}>
          {t('ui.settings.button_apply')}
        </RetroButton>
      </div>
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
