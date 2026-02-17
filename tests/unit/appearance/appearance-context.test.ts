import {
  APPEARANCE_EXPLICIT_STORAGE_KEY,
  APPEARANCE_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
  mapLegacyThemeToAppearanceMode,
  restoreAppearanceModeFromStorage,
  toggleAppearanceMode,
} from "@/contexts/appearance-context";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map<string, string>(Object.entries(initial));

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    snapshot() {
      return Object.fromEntries(values.entries());
    },
  };
}

describe("appearance context migration helpers", () => {
  it("normalizes legacy sepia reading-mode values to dark when no explicit selection marker exists", () => {
    const storage = createStorage({
      [APPEARANCE_STORAGE_KEY]: "sepia",
      [LEGACY_THEME_STORAGE_KEY]: "clean-dark",
    });

    const restored = restoreAppearanceModeFromStorage(storage);

    expect(restored).toBe("dark");
    expect(storage.snapshot()[APPEARANCE_STORAGE_KEY]).toBe("dark");
  });

  it("preserves sepia when an explicit user selection marker exists", () => {
    const storage = createStorage({
      [APPEARANCE_STORAGE_KEY]: "sepia",
      [APPEARANCE_EXPLICIT_STORAGE_KEY]: "1",
    });

    const restored = restoreAppearanceModeFromStorage(storage);

    expect(restored).toBe("sepia");
    expect(storage.snapshot()[APPEARANCE_STORAGE_KEY]).toBe("sepia");
  });

  it("migrates known dark legacy themes to dark mode", () => {
    const storage = createStorage({
      [LEGACY_THEME_STORAGE_KEY]: "win95-dark",
    });

    const restored = restoreAppearanceModeFromStorage(storage);

    expect(restored).toBe("dark");
    expect(storage.snapshot()[APPEARANCE_STORAGE_KEY]).toBe("dark");
  });

  it("migrates non-dark legacy themes to dark mode", () => {
    const storage = createStorage({
      [LEGACY_THEME_STORAGE_KEY]: "clean-light",
    });

    const restored = restoreAppearanceModeFromStorage(storage);

    expect(restored).toBe("dark");
    expect(storage.snapshot()[APPEARANCE_STORAGE_KEY]).toBe("dark");
  });

  it("falls back to dark when no persisted mode exists", () => {
    const storage = createStorage();

    const restored = restoreAppearanceModeFromStorage(storage);

    expect(restored).toBe("dark");
  });

  it("maps legacy theme ids to appearance modes consistently", () => {
    expect(mapLegacyThemeToAppearanceMode("glass-dark")).toBe("dark");
    expect(mapLegacyThemeToAppearanceMode("win95-light")).toBe("dark");
    expect(mapLegacyThemeToAppearanceMode("custom-theme")).toBe("dark");
  });

  it("toggles between dark and sepia", () => {
    expect(toggleAppearanceMode("dark")).toBe("sepia");
    expect(toggleAppearanceMode("sepia")).toBe("dark");
  });
});
