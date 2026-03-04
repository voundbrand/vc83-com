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

interface VoiceRuntimeContextOverride {
  authSessionId?: string;
  interviewSessionId?: Id<"agentSessions">;
}

export interface VoiceTranscriptionTelemetry {
  recorderMimeType?: string;
  captureChunkCount?: number;
  captureChunkBytes?: number;
}

function normalizeProviderId(
  value: VoiceRuntimeProviderId | null | undefined,
): VoiceRuntimeProviderId {
  return value === "elevenlabs" ? "elevenlabs" : "browser";
}

function requireRuntimeContext(
  args: UseVoiceRuntimeArgs,
  override?: VoiceRuntimeContextOverride,
): {
  authSessionId: string;
  interviewSessionId: Id<"agentSessions">;
} {
  const authSessionId = override?.authSessionId ?? args.authSessionId;
  const interviewSessionId =
    override?.interviewSessionId ?? args.interviewSessionId;

  if (!authSessionId || !interviewSessionId) {
    throw new Error(
      "Voice runtime requires auth session and interview session context.",
    );
  }
  return {
    authSessionId,
    interviewSessionId,
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

function shouldRetryTranscriptionAsWav(args: {
  providerId: VoiceRuntimeProviderId;
  error?: string;
}): boolean {
  if (args.providerId !== "elevenlabs") {
    return false;
  }
  const normalized = (args.error || "").toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized.includes("invalid_audio")
    || normalized.includes("corrupt")
    || normalized.includes("unprocessable_audio");
}

function encodeMonoPcm16Wav(audioBuffer: AudioBuffer): Blob {
  const sampleRate = audioBuffer.sampleRate;
  const sampleCount = audioBuffer.length;
  const channelCount = audioBuffer.numberOfChannels;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataByteLength = sampleCount * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(wavBuffer);

  const writeAscii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataByteLength, true);

  const channelData = Array.from({ length: channelCount }, (_, index) =>
    audioBuffer.getChannelData(index)
  );
  let byteOffset = 44;
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    let mixedSample = 0;
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      mixedSample += channelData[channelIndex]?.[sampleIndex] || 0;
    }
    mixedSample /= Math.max(1, channelCount);
    const clamped = Math.max(-1, Math.min(1, mixedSample));
    const int16 = clamped < 0
      ? Math.round(clamped * 0x8000)
      : Math.round(clamped * 0x7fff);
    view.setInt16(byteOffset, int16, true);
    byteOffset += bytesPerSample;
  }

  return new Blob([wavBuffer], { type: "audio/wav" });
}

async function decodeAudioDataCompat(
  audioContext: AudioContext,
  source: ArrayBuffer,
): Promise<AudioBuffer> {
  const cloned = source.slice(0);
  try {
    return await audioContext.decodeAudioData(cloned);
  } catch {
    return await new Promise<AudioBuffer>((resolve, reject) => {
      const fallbackBuffer = source.slice(0);
      audioContext.decodeAudioData(fallbackBuffer, resolve, reject);
    });
  }
}

async function transcodeBlobToWav(blob: Blob): Promise<Blob | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const Ctor = (window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  }).AudioContext || (window as unknown as {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;
  if (!Ctor) {
    return null;
  }

  const audioContext = new Ctor();
  try {
    const sourceBytes = await blob.arrayBuffer();
    const decoded = await decodeAudioDataCompat(audioContext, sourceBytes);
    return encodeMonoPcm16Wav(decoded);
  } catch {
    return null;
  } finally {
    await audioContext.close().catch(() => {});
  }
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
      runtimeContext?: VoiceRuntimeContextOverride;
    },
  ): Promise<OpenVoiceSessionResult> => {
    const runtimeContext = requireRuntimeContext(args, options?.runtimeContext);
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
    runtimeContext?: VoiceRuntimeContextOverride;
  }) => {
    const runtimeContext = requireRuntimeContext(args, options.runtimeContext);
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
    runtimeContext?: VoiceRuntimeContextOverride;
  }): Promise<ProbeVoiceHealthResult> => {
    const runtimeContext = requireRuntimeContext(args, options?.runtimeContext);
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
    telemetry?: VoiceTranscriptionTelemetry;
    runtimeContext?: VoiceRuntimeContextOverride;
  }): Promise<TranscribeVoiceResult> => {
    const runtimeContext = requireRuntimeContext(args, options.runtimeContext);
    const invokeTranscription = async (
      blob: Blob,
      mimeTypeOverride?: string,
      retryPath: "primary" | "client_wav_retry" = "primary",
    ): Promise<TranscribeVoiceResult> => {
      const audioBase64 = await blobToBase64(blob);
      const attemptMimeType = mimeTypeOverride || blob.type || "audio/webm";
      const transcriptionTelemetry = {
        recorderMimeType: options.telemetry?.recorderMimeType,
        captureChunkCount: options.telemetry?.captureChunkCount,
        captureChunkBytes: options.telemetry?.captureChunkBytes,
        blobMimeType: attemptMimeType,
        blobSizeBytes: blob.size,
        retryPath,
        sourceBlobMimeType: options.blob.type || undefined,
        sourceBlobSizeBytes: options.blob.size,
      };
      console.info("[VoiceRuntime] transcribe_blob_attempt", transcriptionTelemetry);
      return (await transcribeVoiceAudioAction({
        sessionId: runtimeContext.authSessionId,
        interviewSessionId: runtimeContext.interviewSessionId,
        voiceSessionId: options.voiceSessionId,
        audioBase64,
        mimeType: attemptMimeType,
        requestedProviderId: normalizeProviderId(options.requestedProviderId),
        requestedVoiceId: options.requestedVoiceId,
        language: options.language,
        transcriptionTelemetry,
      })) as TranscribeVoiceResult;
    };

    const primaryResult = await invokeTranscription(options.blob, undefined, "primary");
    if (
      primaryResult.success
      || !shouldRetryTranscriptionAsWav({
        providerId: primaryResult.providerId,
        error: primaryResult.error,
      })
    ) {
      return primaryResult;
    }

    const wavBlob = await transcodeBlobToWav(options.blob);
    if (!wavBlob || wavBlob.size === 0) {
      return primaryResult;
    }

    const wavRetryResult = await invokeTranscription(
      wavBlob,
      "audio/wav",
      "client_wav_retry",
    );
    if (wavRetryResult.success) {
      return wavRetryResult;
    }

    return {
      ...wavRetryResult,
      error: wavRetryResult.error
        ? `${primaryResult.error || "voice_transcription_failed"}; wav_retry_failed: ${wavRetryResult.error}`
        : primaryResult.error,
    };
  };

  const synthesizePreview = async (options: {
    voiceSessionId: string;
    text: string;
    requestedProviderId?: VoiceRuntimeProviderId;
    requestedVoiceId?: string;
    speakBrowserFallback?: boolean;
    runtimeContext?: VoiceRuntimeContextOverride;
  }): Promise<
    SynthesizeVoiceResult & {
      playbackDataUrl?: string;
      usedBrowserSpeechSynthesis?: boolean;
    }
  > => {
    const runtimeContext = requireRuntimeContext(args, options.runtimeContext);
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
