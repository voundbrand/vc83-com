"use client";

import { useAction } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";

// Dynamic require avoids deep instantiation on generated API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../convex/_generated/api") as { api: any };

export type VoiceRuntimeProviderId = "browser" | "elevenlabs";
export type VoiceProviderHealthStatus = "healthy" | "degraded" | "offline";

export interface VoiceProviderHealth {
  providerId: VoiceRuntimeProviderId;
  status: VoiceProviderHealthStatus;
  checkedAt: number;
  reason?: string;
  fallbackProviderId?: VoiceRuntimeProviderId;
}

interface VoiceActionResultBase {
  success: boolean;
  providerId: VoiceRuntimeProviderId;
  requestedProviderId: VoiceRuntimeProviderId;
  fallbackProviderId: VoiceRuntimeProviderId | null;
  health: VoiceProviderHealth;
  error?: string;
}

interface OpenVoiceSessionResult extends VoiceActionResultBase {
  voiceSessionId: string;
}

interface TranscribeVoiceResult extends VoiceActionResultBase {
  text?: string;
}

interface SynthesizeVoiceResult extends VoiceActionResultBase {
  mimeType?: string;
  audioBase64?: string | null;
  fallbackText?: string | null;
}

interface ProbeVoiceHealthResult {
  requestedProviderId: VoiceRuntimeProviderId;
  providerId: VoiceRuntimeProviderId;
  fallbackProviderId: VoiceRuntimeProviderId | null;
  health: VoiceProviderHealth;
}

interface UseVoiceRuntimeArgs {
  authSessionId?: string;
  interviewSessionId?: Id<"agentSessions">;
}

function normalizeProviderId(
  value: VoiceRuntimeProviderId | null | undefined,
): VoiceRuntimeProviderId {
  return value === "elevenlabs" ? "elevenlabs" : "browser";
}

function requireRuntimeContext(args: UseVoiceRuntimeArgs): {
  authSessionId: string;
  interviewSessionId: Id<"agentSessions">;
} {
  if (!args.authSessionId || !args.interviewSessionId) {
    throw new Error(
      "Voice runtime requires auth session and interview session context.",
    );
  }
  return {
    authSessionId: args.authSessionId,
    interviewSessionId: args.interviewSessionId,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return bytesToBase64(new Uint8Array(buffer));
}

function speakBrowserFallback(
  text: string,
  voiceId?: string,
): { usedBrowserSpeechSynthesis: boolean; error?: string } {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return { usedBrowserSpeechSynthesis: false };
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const targetVoiceId = voiceId?.trim();
    if (targetVoiceId) {
      const matchedVoice =
        window.speechSynthesis
          .getVoices()
          .find((voice) => voice.name === targetVoiceId) ?? null;
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }
    window.speechSynthesis.speak(utterance);
    return { usedBrowserSpeechSynthesis: true };
  } catch (error) {
    return {
      usedBrowserSpeechSynthesis: false,
      error:
        error instanceof Error
          ? error.message
          : "Browser speech synthesis failed.",
    };
  }
}

export function useVoiceRuntime(args: UseVoiceRuntimeArgs) {
  const openVoiceSessionAction = useAction(
    api.ai.voiceRuntime.openVoiceSession as any,
  );
  const closeVoiceSessionAction = useAction(
    api.ai.voiceRuntime.closeVoiceSession as any,
  );
  const transcribeVoiceAudioAction = useAction(
    api.ai.voiceRuntime.transcribeVoiceAudio as any,
  );
  const synthesizeVoicePreviewAction = useAction(
    api.ai.voiceRuntime.synthesizeVoicePreview as any,
  );
  const probeVoiceProviderHealthAction = useAction(
    api.ai.voiceRuntime.probeVoiceProviderHealth as any,
  );

  const openSession = async (
    options?: {
      requestedProviderId?: VoiceRuntimeProviderId;
      requestedVoiceId?: string;
      voiceSessionId?: string;
    },
  ): Promise<OpenVoiceSessionResult> => {
    const runtimeContext = requireRuntimeContext(args);
    return (await openVoiceSessionAction({
      sessionId: runtimeContext.authSessionId,
      interviewSessionId: runtimeContext.interviewSessionId,
      requestedProviderId: normalizeProviderId(options?.requestedProviderId),
      requestedVoiceId: options?.requestedVoiceId,
      voiceSessionId: options?.voiceSessionId,
    })) as OpenVoiceSessionResult;
  };

  const closeSession = async (options: {
    voiceSessionId: string;
    activeProviderId?: VoiceRuntimeProviderId;
    reason?: string;
  }) => {
    const runtimeContext = requireRuntimeContext(args);
    return (await closeVoiceSessionAction({
      sessionId: runtimeContext.authSessionId,
      interviewSessionId: runtimeContext.interviewSessionId,
      voiceSessionId: options.voiceSessionId,
      activeProviderId: normalizeProviderId(options.activeProviderId),
      reason: options.reason,
    })) as VoiceActionResultBase;
  };

  const probeProviderHealth = async (options?: {
    requestedProviderId?: VoiceRuntimeProviderId;
  }): Promise<ProbeVoiceHealthResult> => {
    const runtimeContext = requireRuntimeContext(args);
    return (await probeVoiceProviderHealthAction({
      sessionId: runtimeContext.authSessionId,
      interviewSessionId: runtimeContext.interviewSessionId,
      requestedProviderId: normalizeProviderId(options?.requestedProviderId),
    })) as ProbeVoiceHealthResult;
  };

  const transcribeAudioBlob = async (options: {
    voiceSessionId: string;
    blob: Blob;
    requestedProviderId?: VoiceRuntimeProviderId;
    requestedVoiceId?: string;
    language?: string;
  }): Promise<TranscribeVoiceResult> => {
    const runtimeContext = requireRuntimeContext(args);
    const audioBase64 = await blobToBase64(options.blob);
    return (await transcribeVoiceAudioAction({
      sessionId: runtimeContext.authSessionId,
      interviewSessionId: runtimeContext.interviewSessionId,
      voiceSessionId: options.voiceSessionId,
      audioBase64,
      mimeType: options.blob.type,
      requestedProviderId: normalizeProviderId(options.requestedProviderId),
      requestedVoiceId: options.requestedVoiceId,
      language: options.language,
    })) as TranscribeVoiceResult;
  };

  const synthesizePreview = async (options: {
    voiceSessionId: string;
    text: string;
    requestedProviderId?: VoiceRuntimeProviderId;
    requestedVoiceId?: string;
    speakBrowserFallback?: boolean;
  }): Promise<
    SynthesizeVoiceResult & {
      playbackDataUrl?: string;
      usedBrowserSpeechSynthesis?: boolean;
    }
  > => {
    const runtimeContext = requireRuntimeContext(args);
    const synthesis = (await synthesizeVoicePreviewAction({
      sessionId: runtimeContext.authSessionId,
      interviewSessionId: runtimeContext.interviewSessionId,
      voiceSessionId: options.voiceSessionId,
      text: options.text,
      requestedProviderId: normalizeProviderId(options.requestedProviderId),
      requestedVoiceId: options.requestedVoiceId,
    })) as SynthesizeVoiceResult;

    if (!synthesis.success) {
      return synthesis;
    }

    if (synthesis.audioBase64) {
      const mimeType = synthesis.mimeType ?? "audio/mpeg";
      return {
        ...synthesis,
        playbackDataUrl: `data:${mimeType};base64,${synthesis.audioBase64}`,
      };
    }

    if (
      synthesis.providerId === "browser" &&
      options.speakBrowserFallback !== false &&
      synthesis.fallbackText
    ) {
      const browserSpeakResult = speakBrowserFallback(
        synthesis.fallbackText,
        options.requestedVoiceId,
      );
      return {
        ...synthesis,
        usedBrowserSpeechSynthesis: browserSpeakResult.usedBrowserSpeechSynthesis,
        ...(browserSpeakResult.error
          ? { error: browserSpeakResult.error }
          : {}),
      };
    }

    return synthesis;
  };

  return {
    openSession,
    closeSession,
    probeProviderHealth,
    transcribeAudioBlob,
    synthesizePreview,
  };
}
