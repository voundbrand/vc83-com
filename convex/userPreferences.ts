import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export type AppearanceMode = "dark" | "sepia";
export type VoiceRuntimeProviderPreference = "browser" | "elevenlabs";
export type UserPreferencesResponse = {
  appearanceMode: AppearanceMode;
  themeId: string;
  windowStyle: string;
  language?: string;
  voiceRuntimeProviderId: VoiceRuntimeProviderPreference;
  voiceRuntimeVoiceId?: string;
  voiceRuntimePreviewText: string;
};

export const DEFAULT_APPEARANCE_MODE: AppearanceMode = "dark";
export const DEFAULT_THEME_ID = "win95-light";
export const DEFAULT_WINDOW_STYLE = "windows";
export const DEFAULT_LANGUAGE = "en";
export const DEFAULT_VOICE_RUNTIME_PROVIDER: VoiceRuntimeProviderPreference =
  "browser";
export const DEFAULT_VOICE_PREVIEW_TEXT =
  "Let's build your agent voice together.";

const LEGACY_DARK_THEME_IDS = new Set([
  "clean-dark",
  "glass-dark",
  "win95-dark",
  "win95-purple-dark",
  "win95-green-dark",
]);

type PreferenceSnapshot = {
  appearanceMode?: unknown;
  themeId?: unknown;
  windowStyle?: unknown;
  voiceRuntimeProviderId?: unknown;
  voiceRuntimeVoiceId?: unknown;
  voiceRuntimePreviewText?: unknown;
};

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function isAppearanceMode(value: unknown): value is AppearanceMode {
  return value === "dark" || value === "sepia";
}

export function isVoiceRuntimeProviderPreference(
  value: unknown,
): value is VoiceRuntimeProviderPreference {
  return value === "browser" || value === "elevenlabs";
}

export function mapLegacyThemeToAppearanceMode(themeId: string): AppearanceMode {
  const normalized = themeId.trim().toLowerCase();
  if (LEGACY_DARK_THEME_IDS.has(normalized) || normalized.endsWith("-dark")) {
    return "dark";
  }
  return "dark";
}

export function mapLegacyWindowStyleToAppearanceMode(windowStyle: string): AppearanceMode {
  const normalized = windowStyle.trim().toLowerCase();
  if (normalized === "shadcn") {
    return "dark";
  }
  if (normalized === "windows" || normalized === "mac") return "dark";
  return DEFAULT_APPEARANCE_MODE;
}

export function mapAppearanceModeToLegacyTheme(mode: AppearanceMode): string {
  return mode === "dark" ? "win95-dark" : "win95-light";
}

export function resolveAppearanceMode(snapshot: PreferenceSnapshot): AppearanceMode {
  if (isAppearanceMode(snapshot.appearanceMode)) {
    return snapshot.appearanceMode;
  }

  const themeId = asNonEmptyString(snapshot.themeId);
  if (themeId) {
    return mapLegacyThemeToAppearanceMode(themeId);
  }

  const windowStyle = asNonEmptyString(snapshot.windowStyle);
  if (windowStyle) {
    return mapLegacyWindowStyleToAppearanceMode(windowStyle);
  }

  return DEFAULT_APPEARANCE_MODE;
}

export function resolveVoiceRuntimeProviderPreference(
  value: unknown,
): VoiceRuntimeProviderPreference {
  if (isVoiceRuntimeProviderPreference(value)) {
    return value;
  }
  return DEFAULT_VOICE_RUNTIME_PROVIDER;
}

export function resolveVoiceRuntimeVoiceId(value: unknown): string | undefined {
  return asNonEmptyString(value);
}

export function resolveVoiceRuntimePreviewText(value: unknown): string {
  return asNonEmptyString(value) ?? DEFAULT_VOICE_PREVIEW_TEXT;
}

/**
 * User Preferences - Sync UI settings across devices
 *
 * Simple key-value storage for user UI preferences:
 * - Theme (win95-light, win95-dark, etc.)
 * - Window style (windows, mac)
 * - Appearance mode (dark/sepia)
 * - Future: language, fontSize, etc.
 */

/**
 * Get user preferences by sessionId
 * Returns default values if no preferences exist
 */
export const get = query({
  args: { sessionId: v.string() },
  handler: async (
    ctx,
    { sessionId },
  ): Promise<UserPreferencesResponse | null> => {
    // Get user from session (sessionId is the Convex ID)
    const session = await ctx.db.get(sessionId as Id<"sessions">);

    if (!session) {
      return null;
    }

    // Get preferences (or return defaults)
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (!prefs) {
      return {
        appearanceMode: resolveAppearanceMode({
          themeId: DEFAULT_THEME_ID,
          windowStyle: DEFAULT_WINDOW_STYLE,
        }),
        themeId: DEFAULT_THEME_ID,
        windowStyle: DEFAULT_WINDOW_STYLE,
        language: DEFAULT_LANGUAGE,
        voiceRuntimeProviderId: DEFAULT_VOICE_RUNTIME_PROVIDER,
        voiceRuntimePreviewText: DEFAULT_VOICE_PREVIEW_TEXT,
      };
    }

    // Dual-read compatibility: prefer appearanceMode, derive from legacy fields when missing.
    const appearanceMode = resolveAppearanceMode({
      appearanceMode: (prefs as { appearanceMode?: unknown }).appearanceMode,
      themeId: prefs.themeId,
      windowStyle: prefs.windowStyle,
    });

    return {
      appearanceMode,
      themeId: asNonEmptyString(prefs.themeId) ?? mapAppearanceModeToLegacyTheme(appearanceMode),
      windowStyle: asNonEmptyString(prefs.windowStyle) ?? DEFAULT_WINDOW_STYLE,
      ...(prefs.language !== undefined ? { language: prefs.language } : {}),
      voiceRuntimeProviderId: resolveVoiceRuntimeProviderPreference(
        (prefs as { voiceRuntimeProviderId?: unknown }).voiceRuntimeProviderId,
      ),
      voiceRuntimeVoiceId: resolveVoiceRuntimeVoiceId(
        (prefs as { voiceRuntimeVoiceId?: unknown }).voiceRuntimeVoiceId,
      ),
      voiceRuntimePreviewText: resolveVoiceRuntimePreviewText(
        (prefs as { voiceRuntimePreviewText?: unknown }).voiceRuntimePreviewText,
      ),
    };
  },
});

/**
 * Update user preferences
 * Creates new preferences if they don't exist (upsert pattern)
 */
export const update = mutation({
  args: {
    sessionId: v.string(),
    appearanceMode: v.optional(v.union(v.literal("dark"), v.literal("sepia"))),
    themeId: v.optional(v.string()),
    windowStyle: v.optional(v.string()),
    language: v.optional(v.string()),
    voiceRuntimeProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    voiceRuntimeVoiceId: v.optional(v.string()),
    voiceRuntimePreviewText: v.optional(v.string()),
  },
  handler: async (
    ctx,
    {
      sessionId,
      appearanceMode,
      themeId,
      windowStyle,
      language,
      voiceRuntimeProviderId,
      voiceRuntimeVoiceId,
      voiceRuntimePreviewText,
    },
  ) => {
    // Get user from session (sessionId is the Convex ID)
    const session = await ctx.db.get(sessionId as Id<"sessions">);

    if (!session) {
      throw new Error("Ungültige Sitzung");
    }

    // Find existing preferences
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    const existingSnapshot: PreferenceSnapshot = {
      appearanceMode: existing ? (existing as { appearanceMode?: unknown }).appearanceMode : undefined,
      themeId: existing?.themeId,
      windowStyle: existing?.windowStyle,
      voiceRuntimeProviderId: existing
        ? (existing as { voiceRuntimeProviderId?: unknown })
            .voiceRuntimeProviderId
        : undefined,
      voiceRuntimeVoiceId: existing
        ? (existing as { voiceRuntimeVoiceId?: unknown }).voiceRuntimeVoiceId
        : undefined,
      voiceRuntimePreviewText: existing
        ? (existing as { voiceRuntimePreviewText?: unknown })
            .voiceRuntimePreviewText
        : undefined,
    };

    const resolvedAppearanceMode = resolveAppearanceMode({
      appearanceMode,
      themeId: themeId ?? existingSnapshot.themeId,
      windowStyle: windowStyle ?? existingSnapshot.windowStyle,
    });

    const resolvedThemeId =
      themeId ??
      (appearanceMode
        ? mapAppearanceModeToLegacyTheme(resolvedAppearanceMode)
        : asNonEmptyString(existingSnapshot.themeId) ?? DEFAULT_THEME_ID);

    const resolvedWindowStyle =
      windowStyle ??
      asNonEmptyString(existingSnapshot.windowStyle) ??
      DEFAULT_WINDOW_STYLE;
    const resolvedVoiceRuntimeProviderId =
      resolveVoiceRuntimeProviderPreference(
        voiceRuntimeProviderId ?? existingSnapshot.voiceRuntimeProviderId,
      );
    const resolvedVoiceRuntimeVoiceId =
      voiceRuntimeVoiceId !== undefined
        ? asNonEmptyString(voiceRuntimeVoiceId)
        : resolveVoiceRuntimeVoiceId(existingSnapshot.voiceRuntimeVoiceId);
    const resolvedVoiceRuntimePreviewText = resolveVoiceRuntimePreviewText(
      voiceRuntimePreviewText ?? existingSnapshot.voiceRuntimePreviewText,
    );

    const now = Date.now();

    if (existing) {
      const patchPayload: Record<string, unknown> = {
        appearanceMode: resolvedAppearanceMode,
        themeId: resolvedThemeId,
        windowStyle: resolvedWindowStyle,
        voiceRuntimeProviderId: resolvedVoiceRuntimeProviderId,
        voiceRuntimeVoiceId: resolvedVoiceRuntimeVoiceId ?? "",
        voiceRuntimePreviewText: resolvedVoiceRuntimePreviewText,
        updatedAt: now,
      };

      if (language !== undefined) {
        patchPayload.language = language;
      }

      // Dual-write compatibility: persist canonical mode and legacy fields.
      await ctx.db.patch(existing._id, patchPayload as never);
    } else {
      await ctx.db.insert("userPreferences", {
        userId: session.userId,
        appearanceMode: resolvedAppearanceMode,
        themeId: resolvedThemeId,
        windowStyle: resolvedWindowStyle,
        language: language ?? DEFAULT_LANGUAGE,
        voiceRuntimeProviderId: resolvedVoiceRuntimeProviderId,
        voiceRuntimeVoiceId: resolvedVoiceRuntimeVoiceId ?? "",
        voiceRuntimePreviewText: resolvedVoiceRuntimePreviewText,
        createdAt: now,
        updatedAt: now,
      } as never);
    }

    return { success: true };
  },
});
