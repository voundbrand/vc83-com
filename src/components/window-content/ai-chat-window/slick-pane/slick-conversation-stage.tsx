"use client"

import { useMemo, type RefObject } from "react"
import { Check, X } from "lucide-react"
import type { ConversationReasonCode, ConversationSessionState } from "@/lib/ai/conversation-session-contract"

export type DesktopConversationStageMode = "voice" | "voice_with_eyes"
export type DesktopConversationStageEyesSource = "webcam" | "meta_glasses"

interface DesktopConversationStageCameraSession {
  liveSessionId: string
  sessionState: "capturing" | "stopped" | "error"
  frameCaptureCount: number
  frameCadenceFps?: number
}

interface OrbVisualState {
  label: string
  statusText: string
  background: string
  border: string
  core: string
}

interface SlickConversationStageProps {
  open: boolean
  agentName: string
  conversationMode: DesktopConversationStageMode
  eyesSource: DesktopConversationStageEyesSource
  conversationState: ConversationSessionState
  conversationReasonCode?: ConversationReasonCode
  conversationStateLabel: string
  conversationTurnLabel: string
  liveTranscriptUserText?: string
  liveTranscriptAssistantText?: string
  liveInterruptionMarker?: string
  cameraSession: DesktopConversationStageCameraSession | null
  hasCameraPreviewSignal: boolean
  cameraDiagnosticLabel: string | null
  isConversationEnding: boolean
  isConversationMicMuted: boolean
  isStartingConversation: boolean
  controlDisabled: boolean
  eyesWebcamAvailable: boolean
  metaGlassesAvailable: boolean
  metaGlassesReasonCode?: string | null
  cameraVideoRef: RefObject<HTMLVideoElement | null>
  onClose: () => void
  onConversationModeChange: (mode: DesktopConversationStageMode) => void
  onEyesSourceChange: (source: DesktopConversationStageEyesSource) => void
  onOrbPress: () => void
  onToggleMute: () => void
  onToggleEyes: () => void
  onCameraPreviewSignalChange: (hasSignal: boolean) => void
}

function resolveOrbVisualState(args: {
  conversationState: ConversationSessionState
  conversationTurnLabel: string
  isConversationEnding: boolean
  isStartingConversation: boolean
}): OrbVisualState {
  if (args.isConversationEnding) {
    return {
      label: "END",
      statusText: "Ending conversation...",
      background: "rgba(220, 38, 38, 0.24)",
      border: "rgba(248, 113, 113, 0.72)",
      core: "rgba(220, 38, 38, 0.32)",
    }
  }

  if (args.isStartingConversation || args.conversationState === "connecting") {
    return {
      label: "START",
      statusText: "Connecting...",
      background: "rgba(14, 165, 233, 0.24)",
      border: "rgba(56, 189, 248, 0.72)",
      core: "rgba(14, 165, 233, 0.32)",
    }
  }

  if (args.conversationState === "reconnecting") {
    return {
      label: "RECON",
      statusText: "Reconnecting...",
      background: "rgba(245, 158, 11, 0.24)",
      border: "rgba(251, 191, 36, 0.72)",
      core: "rgba(245, 158, 11, 0.32)",
    }
  }

  if (args.conversationState === "idle" || args.conversationState === "ended") {
    return {
      label: "START",
      statusText: "Tap orb to start",
      background: "rgba(34, 197, 94, 0.24)",
      border: "rgba(74, 222, 128, 0.72)",
      core: "rgba(34, 197, 94, 0.32)",
    }
  }

  if (args.conversationState === "error") {
    return {
      label: "ERR",
      statusText: "Conversation error",
      background: "rgba(220, 38, 38, 0.24)",
      border: "rgba(248, 113, 113, 0.72)",
      core: "rgba(220, 38, 38, 0.32)",
    }
  }

  if (args.conversationTurnLabel === "LISTENING") {
    return {
      label: "REC",
      statusText: "Listening...",
      background: "rgba(59, 130, 246, 0.28)",
      border: "rgba(59, 130, 246, 0.78)",
      core: "rgba(59, 130, 246, 0.36)",
    }
  }

  if (args.conversationTurnLabel === "THINKING") {
    return {
      label: "THINK",
      statusText: "Thinking...",
      background: "rgba(245, 158, 11, 0.28)",
      border: "rgba(245, 158, 11, 0.72)",
      core: "rgba(245, 158, 11, 0.36)",
    }
  }

  return {
    label: "IDLE",
    statusText: "Live duplex ready",
    background: "rgba(16, 185, 129, 0.28)",
    border: "rgba(16, 185, 129, 0.72)",
    core: "rgba(16, 185, 129, 0.36)",
  }
}

export function SlickConversationStage({
  open,
  agentName,
  conversationMode,
  eyesSource,
  conversationState,
  conversationReasonCode,
  conversationStateLabel,
  conversationTurnLabel,
  liveTranscriptUserText,
  liveTranscriptAssistantText,
  liveInterruptionMarker,
  cameraSession,
  hasCameraPreviewSignal,
  cameraDiagnosticLabel,
  isConversationEnding,
  isConversationMicMuted,
  isStartingConversation,
  controlDisabled,
  eyesWebcamAvailable,
  metaGlassesAvailable,
  metaGlassesReasonCode,
  cameraVideoRef,
  onClose,
  onConversationModeChange,
  onEyesSourceChange,
  onOrbPress,
  onToggleMute,
  onToggleEyes,
  onCameraPreviewSignalChange,
}: SlickConversationStageProps) {
  const hasActiveConversationSession =
    isStartingConversation
    || isConversationEnding
    || conversationState === "connecting"
    || conversationState === "live"
    || conversationState === "reconnecting"
    || conversationState === "ending"
  const allowStageDismiss = !hasActiveConversationSession

  const orbVisual = useMemo(
    () =>
      resolveOrbVisualState({
        conversationState,
        conversationTurnLabel,
        isConversationEnding,
        isStartingConversation,
      }),
    [conversationState, conversationTurnLabel, isConversationEnding, isStartingConversation]
  )

  if (!open) {
    return null
  }

  if (hasActiveConversationSession) {
    return (
      <div className="flex max-h-[70vh] flex-col rounded-3xl border p-4 sm:p-5" style={{
        borderColor: "var(--shell-border-strong)",
        background: "var(--shell-surface)",
        boxShadow: "var(--window-shell-shadow)",
      }}>
        <div className="mb-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--shell-text-dim)" }}>
              Conversation
            </p>
            <p className="truncate text-sm font-semibold" style={{ color: "var(--shell-text)" }}>
              {conversationMode === "voice_with_eyes" ? "Voice + Eyes" : "Voice only"} • {conversationStateLabel}
              {conversationReasonCode ? ` • ${conversationReasonCode}` : ""}
            </p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--shell-text-dim)" }}>
            Active
          </p>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto rounded-2xl border p-3 sm:p-4" style={{
          borderColor: "var(--shell-border-soft)",
          background: "var(--shell-surface-elevated)",
        }}>
          <div className="w-full max-w-md rounded-2xl border p-3" style={{
            borderColor: "var(--shell-border-strong)",
            background: "var(--shell-surface)",
            boxShadow: "var(--window-shell-shadow)",
          }}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--shell-text-dim)" }}>
                Live transcript
              </p>
              <p className="text-[11px]" style={{ color: "var(--shell-text-dim)" }}>
                interrupt:{liveInterruptionMarker || "idle"}
              </p>
            </div>
            <p className="text-xs" style={{ color: "var(--shell-accent)" }}>
              USER {liveTranscriptUserText?.trim() || "..."}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--shell-text)" }}>
              AGENT {liveTranscriptAssistantText?.trim() || "..."}
            </p>
          </div>

          {conversationMode === "voice_with_eyes" && cameraSession ? (
            <div
              className="mt-3 w-full max-w-md rounded-2xl border p-2"
              style={{
                borderColor:
                  cameraSession.sessionState === "capturing"
                    ? "var(--success)"
                    : "var(--shell-border-soft)",
                background: "var(--shell-surface)",
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
                  Vision • {cameraSession.liveSessionId}
                </div>
                <div className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
                  Frames {cameraSession.frameCaptureCount}
                  {cameraSession.frameCadenceFps ? ` • ${cameraSession.frameCadenceFps} fps` : ""}
                </div>
              </div>
              <div className="relative h-32 w-full overflow-hidden rounded-xl" style={{ background: "var(--shell-surface-elevated)" }}>
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedData={() => onCameraPreviewSignalChange(true)}
                  onPlaying={() => onCameraPreviewSignalChange(true)}
                  onEmptied={() => onCameraPreviewSignalChange(false)}
                  onEnded={() => onCameraPreviewSignalChange(false)}
                  onError={() => onCameraPreviewSignalChange(false)}
                  className="h-full w-full object-cover"
                />
                {!hasCameraPreviewSignal ? (
                  <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs" style={{ color: "var(--shell-text-dim)" }}>
                    {cameraSession.sessionState === "capturing"
                      ? "Waiting for camera preview signal..."
                      : "Vision stream is stopped. Tap Eyes to restart."}
                  </div>
                ) : null}
              </div>
              {cameraDiagnosticLabel ? (
                <p className="mt-2 text-xs" style={{ color: "var(--error)" }}>
                  camera: {cameraDiagnosticLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-auto flex justify-end pt-3">
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    borderColor: "var(--shell-border-soft)",
                    background: isConversationMicMuted ? "var(--error-bg)" : "var(--shell-surface-elevated)",
                    color: isConversationMicMuted ? "var(--error)" : "var(--shell-text)",
                  }}
                >
                  {isConversationMicMuted ? "Unmute mic" : "Mute mic"}
                </button>
                {conversationMode === "voice_with_eyes" ? (
                  <button
                    type="button"
                    onClick={onToggleEyes}
                    className="rounded-full border px-3 py-1 text-xs font-semibold"
                    style={{
                      borderColor: "var(--shell-border-soft)",
                      background: "var(--shell-surface-elevated)",
                      color: "var(--shell-text)",
                    }}
                  >
                    {cameraSession?.sessionState === "capturing" ? "Eyes off" : "Eyes on"}
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-3 rounded-2xl border px-3 py-2" style={{
                borderColor: "var(--shell-border-strong)",
                background: "var(--shell-surface)",
                boxShadow: "var(--window-shell-shadow)",
              }}>
                <div className="min-w-0 text-right">
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--shell-text)" }}>
                    {agentName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
                    {orbVisual.statusText}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--shell-text-dim)" }}>
                    Tap orb to stop
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOrbPress}
                  disabled={isConversationEnding || controlDisabled}
                  className="h-20 w-20 rounded-full border transition-transform duration-300 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{
                    background: orbVisual.background,
                    borderColor: orbVisual.border,
                    color: "var(--shell-text)",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset",
                  }}
                >
                  <span
                    className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-[10px] font-semibold"
                    style={{
                      background: orbVisual.core,
                      borderColor: orbVisual.border,
                      color: "var(--shell-text)",
                    }}
                  >
                    {orbVisual.label}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border p-4 sm:p-5" style={{
      borderColor: "var(--shell-border-strong)",
      background: "var(--shell-surface)",
      boxShadow: "var(--window-shell-shadow)",
    }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--shell-text-dim)" }}>
            Conversation
          </p>
          <p className="truncate text-sm font-semibold" style={{ color: "var(--shell-text)" }}>
            {conversationMode === "voice_with_eyes" ? "Voice + Eyes" : "Voice only"} • {conversationStateLabel}
            {conversationReasonCode ? ` • ${conversationReasonCode}` : ""}
          </p>
        </div>
        {allowStageDismiss ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border"
            style={{
              borderColor: "var(--shell-border-soft)",
              color: "var(--shell-text-dim)",
              background: "var(--shell-surface-elevated)",
            }}
            aria-label="Close conversation stage"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onConversationModeChange("voice")}
          className="relative flex min-h-[64px] items-end rounded-2xl border px-3 py-2 text-left text-xs"
          style={{
            borderColor:
              conversationMode === "voice"
                ? "var(--shell-neutral-active-border)"
                : "var(--shell-border-soft)",
            background:
              conversationMode === "voice"
                ? "var(--shell-neutral-hover-surface)"
                : "var(--shell-surface-elevated)",
            color: "var(--shell-text)",
          }}
        >
          <span className="font-semibold">Voice only</span>
          {conversationMode === "voice" ? (
            <span className="absolute right-2 top-2">
              <Check size={14} />
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => onConversationModeChange("voice_with_eyes")}
          className="relative flex min-h-[64px] items-end rounded-2xl border px-3 py-2 text-left text-xs"
          style={{
            borderColor:
              conversationMode === "voice_with_eyes"
                ? "var(--shell-neutral-active-border)"
                : "var(--shell-border-soft)",
            background:
              conversationMode === "voice_with_eyes"
                ? "var(--shell-neutral-hover-surface)"
                : "var(--shell-surface-elevated)",
            color: "var(--shell-text)",
          }}
        >
          <span className="font-semibold">Voice + Eyes</span>
          {conversationMode === "voice_with_eyes" ? (
            <span className="absolute right-2 top-2">
              <Check size={14} />
            </span>
          ) : null}
        </button>
      </div>

      {conversationMode === "voice_with_eyes" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onEyesSourceChange("webcam")}
            className="relative flex min-h-[58px] items-end rounded-2xl border px-3 py-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor:
                eyesSource === "webcam"
                  ? "var(--shell-neutral-active-border)"
                  : "var(--shell-border-soft)",
              background:
                eyesSource === "webcam"
                  ? "var(--shell-neutral-hover-surface)"
                  : "var(--shell-surface-elevated)",
              color: "var(--shell-text)",
            }}
            disabled={!eyesWebcamAvailable}
          >
            <span className="font-semibold">Webcam</span>
            {eyesSource === "webcam" ? (
              <span className="absolute right-2 top-2">
                <Check size={14} />
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => onEyesSourceChange("meta_glasses")}
            className="relative flex min-h-[58px] items-end rounded-2xl border px-3 py-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor:
                eyesSource === "meta_glasses"
                  ? "var(--shell-neutral-active-border)"
                  : "var(--shell-border-soft)",
              background:
                eyesSource === "meta_glasses"
                  ? "var(--shell-neutral-hover-surface)"
                  : "var(--shell-surface-elevated)",
              color: "var(--shell-text)",
            }}
            disabled={!metaGlassesAvailable}
            title={metaGlassesReasonCode || undefined}
          >
            <span className="font-semibold">Meta Glasses</span>
            {eyesSource === "meta_glasses" ? (
              <span className="absolute right-2 top-2">
                <Check size={14} />
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      {conversationMode === "voice_with_eyes" && !metaGlassesAvailable ? (
        <p className="mt-2 text-[11px]" style={{ color: "var(--shell-text-dim)" }}>
          {metaGlassesReasonCode || "Meta glasses unavailable on this build."}
        </p>
      ) : null}

      <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border px-4 py-5" style={{
        borderColor: "var(--shell-border-soft)",
        background: "var(--shell-surface-elevated)",
      }}>
        <div className="flex flex-col items-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--shell-text-dim)" }}>
            Turn {conversationTurnLabel}
          </p>

          <div className="relative mt-4 h-64 w-64 max-w-full">
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: "8.4s" }}>
              <span className="absolute left-1/2 top-3 h-2 w-2 -translate-x-1/2 rounded-full bg-[color:var(--shell-accent)] opacity-70" />
              <span className="absolute right-6 top-10 h-1.5 w-1.5 rounded-full bg-[color:var(--shell-accent)] opacity-60" />
              <span className="absolute bottom-8 right-5 h-2 w-2 rounded-full bg-[color:var(--shell-accent)] opacity-60" />
              <span className="absolute bottom-4 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[color:var(--shell-accent)] opacity-55" />
              <span className="absolute left-5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[color:var(--shell-accent)] opacity-50" />
              <span className="absolute left-10 top-6 h-1.5 w-1.5 rounded-full bg-[color:var(--shell-accent)] opacity-45" />
            </div>

            <button
              type="button"
              onClick={onOrbPress}
              disabled={isConversationEnding || controlDisabled}
              className="absolute inset-0 m-auto h-40 w-40 rounded-full border transition-transform duration-300 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: orbVisual.background,
                borderColor: orbVisual.border,
                color: "var(--shell-text)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset",
              }}
            >
              <span
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border text-xs font-semibold"
                style={{
                  background: orbVisual.core,
                  borderColor: orbVisual.border,
                  color: "var(--shell-text)",
                }}
              >
                {orbVisual.label}
              </span>
            </button>
          </div>

          <p className="mt-4 text-lg font-semibold" style={{ color: "var(--shell-text)" }}>
            {agentName}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--shell-text-dim)" }}>
            {orbVisual.statusText}
          </p>

          {conversationMode === "voice_with_eyes" && cameraSession ? (
            <div
              className="mt-4 w-full max-w-xl rounded-2xl border p-2"
              style={{
                borderColor:
                  cameraSession.sessionState === "capturing"
                    ? "var(--success)"
                    : "var(--shell-border-soft)",
                background: "var(--shell-surface)",
              }}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
                  Vision • {cameraSession.liveSessionId}
                </div>
                <div className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
                  Frames {cameraSession.frameCaptureCount}
                  {cameraSession.frameCadenceFps ? ` • ${cameraSession.frameCadenceFps} fps` : ""}
                </div>
              </div>
              <div className="relative h-40 w-full overflow-hidden rounded-xl" style={{ background: "var(--shell-surface-elevated)" }}>
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedData={() => onCameraPreviewSignalChange(true)}
                  onPlaying={() => onCameraPreviewSignalChange(true)}
                  onEmptied={() => onCameraPreviewSignalChange(false)}
                  onEnded={() => onCameraPreviewSignalChange(false)}
                  onError={() => onCameraPreviewSignalChange(false)}
                  className="h-full w-full object-cover"
                />
                {!hasCameraPreviewSignal ? (
                  <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs" style={{ color: "var(--shell-text-dim)" }}>
                    {cameraSession.sessionState === "capturing"
                      ? "Waiting for camera preview signal..."
                      : "Vision stream is stopped. Tap Eyes to restart."}
                  </div>
                ) : null}
              </div>
              {cameraDiagnosticLabel ? (
                <p className="mt-2 text-xs" style={{ color: "var(--error)" }}>
                  camera: {cameraDiagnosticLabel}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className="rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              borderColor: "var(--shell-border-soft)",
              background: isConversationMicMuted ? "var(--error-bg)" : "var(--shell-surface-elevated)",
              color: isConversationMicMuted ? "var(--error)" : "var(--shell-text)",
            }}
          >
            {isConversationMicMuted ? "Unmute mic" : "Mute mic"}
          </button>
          {conversationMode === "voice_with_eyes" ? (
            <button
              type="button"
              onClick={onToggleEyes}
              className="rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                borderColor: "var(--shell-border-soft)",
                background: "var(--shell-surface-elevated)",
                color: "var(--shell-text)",
              }}
            >
              {cameraSession?.sessionState === "capturing" ? "Eyes off" : "Eyes on"}
            </button>
          ) : null}
        </div>
        <p className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
          Start and stop from the orb
        </p>
      </div>
    </div>
  )
}
