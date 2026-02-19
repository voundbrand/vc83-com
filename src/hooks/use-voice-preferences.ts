"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";

// Dynamic require avoids deep generated API type instantiation in hooks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../convex/_generated/api") as { api: any };

export type VoiceRuntimeProviderId = "browser" | "elevenlabs";

export type VoicePreferences = {
  providerId: VoiceRuntimeProviderId;
  voiceId: string;
  previewText: string;
};

export const DEFAULT_VOICE_PREVIEW_TEXT =
  "Let's build your agent voice together.";

function normalizeProviderId(value: unknown): VoiceRuntimeProviderId {
  return value === "elevenlabs" ? "elevenlabs" : "browser";
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function useVoicePreferences() {
  const { sessionId } = useAuth();
  const preferences = useQuery(
    apiAny.userPreferences.get,
    sessionId ? { sessionId } : "skip",
  ) as
    | {
        voiceRuntimeProviderId?: unknown;
        voiceRuntimeVoiceId?: unknown;
        voiceRuntimePreviewText?: unknown;
      }
    | null
    | undefined;

  const updatePreferences = useMutation(apiAny.userPreferences.update);

  const isLoading = Boolean(sessionId) && preferences === undefined;

  const voicePreferences = useMemo<VoicePreferences>(() => {
    return {
      providerId: normalizeProviderId(preferences?.voiceRuntimeProviderId),
      voiceId: normalizeString(preferences?.voiceRuntimeVoiceId),
      previewText:
        normalizeString(preferences?.voiceRuntimePreviewText) ||
        DEFAULT_VOICE_PREVIEW_TEXT,
    };
  }, [preferences]);

  const saveVoicePreferences = useCallback(
    async (next: VoicePreferences) => {
      if (!sessionId) {
        throw new Error("Authentication session missing.");
      }

      await updatePreferences({
        sessionId,
        voiceRuntimeProviderId: normalizeProviderId(next.providerId),
        voiceRuntimeVoiceId: normalizeString(next.voiceId),
        voiceRuntimePreviewText: normalizeString(next.previewText),
      });
    },
    [sessionId, updatePreferences],
  );

  return {
    voicePreferences,
    saveVoicePreferences,
    isLoading,
    hasSession: Boolean(sessionId),
  };
}

