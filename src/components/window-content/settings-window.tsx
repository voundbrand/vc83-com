"use client";

import { useEffect, useState } from "react";
import { Check, FolderOpen, Globe, Image, Trash2, X } from "lucide-react";
import { useWindowManager } from "@/hooks/use-window-manager";
import {
  DEFAULT_APPEARANCE_MODE,
  type AppearanceMode,
  useAppearance,
} from "@/contexts/appearance-context";
import { useTranslation } from "@/contexts/translation-context";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import MediaLibraryWindow from "@/components/window-content/media-library-window";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ShellMoonIcon,
  ShellPackageIcon,
  ShellSepiaIcon,
} from "@/components/icons/shell-icons";
import {
  InteriorButton,
  InteriorHeader,
  InteriorHelperText,
  InteriorPanel,
  InteriorRoot,
  InteriorSectionHeader,
  InteriorSubtitle,
  InteriorTabButton,
  InteriorTabRow,
  InteriorTileButton,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";

type TabType = "appearance" | "wallpaper" | "region";

export function SettingsWindow() {
  const { closeWindow } = useWindowManager();
  const { mode, setMode } = useAppearance();
  const { locale, availableLocales, setLocale } = useTranslation();
  const { t } = useNamespaceTranslations("ui.settings");
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();

  const [activeTab, setActiveTab] = useState<TabType>("appearance");
  const [selectedMode, setSelectedMode] = useState<AppearanceMode>(mode);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(locale);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isUpdatingBackground, setIsUpdatingBackground] = useState(false);
  const [backgroundUpdateStatus, setBackgroundUpdateStatus] = useState<string | null>(null);

  const brandingQueryArgs = currentOrg?.id
    ? {
        organizationId: currentOrg.id as Id<"organizations">,
        subtype: "branding" as const,
      }
    : "skip";

  const useQueryUntyped = useQuery as (query: unknown, args: unknown) => unknown;
  // @ts-ignore TS2589: Convex generated type may exceed instantiation depth in this component.
  const getOrganizationSettings = (api as unknown as { organizationOntology: { getOrganizationSettings: unknown } })
    .organizationOntology.getOrganizationSettings;
  const brandingSettings = useQueryUntyped(
    getOrganizationSettings,
    brandingQueryArgs,
  ) as { customProperties?: { desktopBackground?: string } } | null | undefined | unknown[];

  const currentDesktopBackground = brandingSettings && !Array.isArray(brandingSettings)
    ? brandingSettings.customProperties?.desktopBackground
    : undefined;

  const updateOrgSettings = useMutation(api.organizationOntology.updateOrganizationSettings);

  useEffect(() => {
    setSelectedMode(mode);
  }, [mode]);

  useEffect(() => {
    setSelectedLanguage(locale);
  }, [locale]);

  const handleApply = () => {
    setMode(selectedMode);
    setLocale(selectedLanguage);
    closeWindow("settings");
  };

  const handleReset = () => {
    setSelectedMode(DEFAULT_APPEARANCE_MODE);
    setSelectedLanguage("en");
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
          desktopBackground: media.url,
        },
      });

      setBackgroundUpdateStatus("✓ Desktop background updated successfully!");
      setIsMediaLibraryOpen(false);
      setTimeout(() => {
        setBackgroundUpdateStatus(null);
      }, 3000);
    } catch (error) {
      console.error("Failed to update desktop background:", error);
      setBackgroundUpdateStatus("✗ Failed to update desktop background");
      setTimeout(() => {
        setBackgroundUpdateStatus(null);
      }, 5000);
    } finally {
      setIsUpdatingBackground(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!sessionId || !currentOrg?.id) {
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
          desktopBackground: "",
        },
      });

      setBackgroundUpdateStatus("✓ Desktop background removed!");
      setTimeout(() => {
        setBackgroundUpdateStatus(null);
      }, 3000);
    } catch (error) {
      console.error("Failed to remove desktop background:", error);
      setBackgroundUpdateStatus("✗ Failed to remove desktop background");
      setTimeout(() => {
        setBackgroundUpdateStatus(null);
      }, 5000);
    } finally {
      setIsUpdatingBackground(false);
    }
  };

  return (
    <InteriorRoot className="flex min-h-full flex-col">
      <InteriorHeader className="shrink-0 px-4 py-3">
        <InteriorTitle className="text-sm">{t("ui.settings.title")}</InteriorTitle>
        <InteriorSubtitle className="mt-1">{t("ui.settings.subtitle")}</InteriorSubtitle>
      </InteriorHeader>

      <InteriorTabRow className="shrink-0 px-3 py-2">
        <InteriorTabButton
          active={activeTab === "appearance"}
          onClick={() => setActiveTab("appearance")}
          className="flex items-center gap-2"
        >
          <ShellMoonIcon size={16} />
          {t("ui.settings.tab.appearance")}
        </InteriorTabButton>
        <InteriorTabButton
          active={activeTab === "wallpaper"}
          onClick={() => setActiveTab("wallpaper")}
          className="flex items-center gap-2"
        >
          <Image size={14} />
          {t("ui.settings.tab.wallpaper")}
        </InteriorTabButton>
        <InteriorTabButton
          active={activeTab === "region"}
          onClick={() => setActiveTab("region")}
          className="flex items-center gap-2"
        >
          <Globe size={14} />
          {t("ui.settings.tab.region")}
        </InteriorTabButton>
      </InteriorTabRow>

      <div className="flex-1 space-y-6 overflow-y-auto p-4 pb-20">
        {activeTab === "appearance" && (
          <>
            <section className="space-y-3">
              <InteriorSectionHeader>{t("ui.settings.appearance.color_scheme")}</InteriorSectionHeader>
              <div className="space-y-2">
                <InteriorTileButton
                  onClick={() => setSelectedMode("dark")}
                  className="w-full flex-row items-center justify-start gap-3 text-left"
                  style={
                    selectedMode === "dark"
                      ? { borderColor: "var(--tone-accent-strong)", background: "var(--desktop-shell-accent)" }
                      : undefined
                  }
                >
                  <ShellMoonIcon size={20} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                      Dark
                    </div>
                    <InteriorHelperText>High-contrast dark surfaces for the desktop shell.</InteriorHelperText>
                  </div>
                  {selectedMode === "dark" && <Check size={16} style={{ color: "var(--tone-accent-strong)" }} />}
                </InteriorTileButton>

                <InteriorTileButton
                  onClick={() => setSelectedMode("sepia")}
                  className="w-full flex-row items-center justify-start gap-3 text-left"
                  style={
                    selectedMode === "sepia"
                      ? { borderColor: "var(--tone-accent-strong)", background: "var(--desktop-shell-accent)" }
                      : undefined
                  }
                >
                  <ShellSepiaIcon size={20} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                      Sepia
                    </div>
                    <InteriorHelperText>Warm sepia surfaces for a softer reading tone.</InteriorHelperText>
                  </div>
                  {selectedMode === "sepia" && <Check size={16} style={{ color: "var(--tone-accent-strong)" }} />}
                </InteriorTileButton>
              </div>
            </section>

            <section className="space-y-3">
              <InteriorSectionHeader>{t("ui.settings.appearance.preview")}</InteriorSectionHeader>
              <InteriorPanel className="space-y-2 text-xs">
                <p style={{ color: "var(--window-document-text)" }}>
                  Active mode: <strong>{selectedMode === "dark" ? "Dark" : "Sepia"}</strong>
                </p>
                <InteriorHelperText>
                  Wallpaper and region settings continue to work independently of appearance mode.
                </InteriorHelperText>
              </InteriorPanel>
            </section>
          </>
        )}

        {activeTab === "wallpaper" && (
          <section className="space-y-5">
            <InteriorSectionHeader>{t("ui.settings.wallpaper.desktop_background")}</InteriorSectionHeader>

            {backgroundUpdateStatus && (
              <div
                className="rounded-md border px-3 py-2 text-sm"
                style={{
                  borderColor: backgroundUpdateStatus.startsWith("✓") ? "#10b981" : "#ef4444",
                  background: backgroundUpdateStatus.startsWith("✓") ? "#ecfdf5" : "#fee2e2",
                  color: backgroundUpdateStatus.startsWith("✓") ? "#065f46" : "#991b1b",
                }}
              >
                {backgroundUpdateStatus}
              </div>
            )}

            {currentDesktopBackground ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                  Current Background
                </label>
                <div
                  className="aspect-video overflow-hidden rounded-md border bg-cover bg-center"
                  style={{
                    borderColor: "var(--window-document-border)",
                    backgroundImage: `url(${currentDesktopBackground})`,
                  }}
                />
              </div>
            ) : (
              <InteriorPanel className="aspect-video flex items-center justify-center text-center">
                <div>
                  <Image size={40} className="mx-auto mb-2" style={{ color: "var(--desktop-menu-text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    No custom background set
                  </p>
                  <InteriorHelperText className="mt-1">Using theme default</InteriorHelperText>
                </div>
              </InteriorPanel>
            )}

            <div className="flex flex-wrap gap-2">
              <InteriorButton
                onClick={() => setIsMediaLibraryOpen(true)}
                disabled={isUpdatingBackground || !sessionId || !currentOrg?.id}
                className="gap-2"
              >
                <FolderOpen size={14} />
                Browse Media Library
              </InteriorButton>

              {currentDesktopBackground && (
                <InteriorButton
                  variant="danger"
                  onClick={handleRemoveBackground}
                  disabled={isUpdatingBackground || !sessionId || !currentOrg?.id}
                  className="gap-2"
                >
                  <Trash2 size={14} />
                  Remove Background
                </InteriorButton>
              )}
            </div>

            <InteriorPanel>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                <ShellPackageIcon size={14} />
                Tip
              </div>
              <InteriorHelperText>
                Upload images to your Media Library, then select one to use as your desktop background. Recommended
                resolution: 1920x1080 or higher.
              </InteriorHelperText>
            </InteriorPanel>
          </section>
        )}

        {activeTab === "region" && (
          <>
            <section className="space-y-3">
              <InteriorSectionHeader>{t("ui.settings.region.language")}</InteriorSectionHeader>
              <div className="space-y-2">
                {availableLocales.map((lang) => (
                  <InteriorTileButton
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className="w-full flex-row items-center justify-start gap-3 text-left"
                    style={
                      selectedLanguage === lang
                        ? { borderColor: "var(--tone-accent-strong)", background: "var(--desktop-shell-accent)" }
                        : undefined
                    }
                  >
                    <div
                      className="rounded border px-2 py-1 text-[11px] font-semibold"
                      style={{ borderColor: "var(--window-document-border)", color: "var(--desktop-menu-text-muted)" }}
                    >
                      {getLanguageTag(lang)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                        {getLanguageName(lang)}
                      </div>
                      <InteriorHelperText>{getLanguageNativeName(lang)}</InteriorHelperText>
                    </div>
                    {selectedLanguage === lang && <Check size={16} style={{ color: "var(--tone-accent-strong)" }} />}
                  </InteriorTileButton>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <InteriorSectionHeader>{t("ui.settings.region.timezone")}</InteriorSectionHeader>
              <InteriorPanel className="flex items-center justify-center py-5 opacity-70">
                <span className="text-xs italic" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  {t("ui.settings.appearance.coming_soon")}
                </span>
              </InteriorPanel>
            </section>

            <section className="space-y-3">
              <InteriorSectionHeader>{t("ui.settings.region.datetime_format")}</InteriorSectionHeader>
              <InteriorPanel className="flex items-center justify-center py-5 opacity-70">
                <span className="text-xs italic" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  {t("ui.settings.appearance.coming_soon")}
                </span>
              </InteriorPanel>
            </section>
          </>
        )}
      </div>

      <div
        className="sticky bottom-0 z-10 flex shrink-0 justify-end gap-2 border-t px-4 py-3"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
      >
        <InteriorButton variant="subtle" onClick={handleReset}>
          {t("ui.settings.button.reset")}
        </InteriorButton>
        <InteriorButton variant="primary" onClick={handleApply}>
          {t("ui.settings.button.apply")}
        </InteriorButton>
      </div>

      {isMediaLibraryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => setIsMediaLibraryOpen(false)}
        >
          <div
            className="h-[90vh] w-[90vw] overflow-hidden rounded-lg border shadow-lg"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="flex items-center justify-between border-b px-3 py-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--desktop-shell-accent)",
                color: "var(--window-document-text)",
              }}
            >
              <h3 className="text-sm font-semibold">Select Desktop Background</h3>
              <InteriorButton
                variant="ghost"
                size="sm"
                onClick={() => setIsMediaLibraryOpen(false)}
                aria-label="Close media library"
              >
                <X size={14} />
              </InteriorButton>
            </div>
            <div className="h-[calc(90vh-3rem)]">
              <MediaLibraryWindow selectionMode onSelect={handleMediaSelect} />
            </div>
          </div>
        </div>
      )}
    </InteriorRoot>
  );
}

function getLanguageTag(code: string): string {
  return code.toUpperCase();
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
