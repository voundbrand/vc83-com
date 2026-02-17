import { describe, expect, it } from "vitest";
import {
  DEFAULT_APPEARANCE_MODE,
  mapAppearanceModeToLegacyTheme,
  mapLegacyThemeToAppearanceMode,
  mapLegacyWindowStyleToAppearanceMode,
  resolveAppearanceMode,
} from "../../../convex/userPreferences";

describe("userPreferences appearance migration helpers", () => {
  it("prefers an explicit appearanceMode over legacy fields", () => {
    expect(
      resolveAppearanceMode({
        appearanceMode: "sepia",
        themeId: "clean-dark",
        windowStyle: "shadcn",
      }),
    ).toBe("sepia");
  });

  it("maps legacy dark theme IDs to dark mode", () => {
    expect(mapLegacyThemeToAppearanceMode("win95-dark")).toBe("dark");
    expect(mapLegacyThemeToAppearanceMode("custom-dark")).toBe("dark");
  });

  it("maps non-dark theme IDs to dark mode", () => {
    expect(mapLegacyThemeToAppearanceMode("win95-light")).toBe("dark");
  });

  it("uses windowStyle as deterministic fallback when themeId is unavailable", () => {
    expect(mapLegacyWindowStyleToAppearanceMode("shadcn")).toBe("dark");
    expect(mapLegacyWindowStyleToAppearanceMode("windows")).toBe("dark");
    expect(
      resolveAppearanceMode({
        windowStyle: "mac",
      }),
    ).toBe("dark");
  });

  it("falls back to default appearance mode when no legacy fields exist", () => {
    expect(resolveAppearanceMode({})).toBe(DEFAULT_APPEARANCE_MODE);
  });

  it("maps appearance modes back to canonical legacy theme IDs for dual-write compatibility", () => {
    expect(mapAppearanceModeToLegacyTheme("dark")).toBe("win95-dark");
    expect(mapAppearanceModeToLegacyTheme("sepia")).toBe("win95-light");
  });
});
