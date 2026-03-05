export type VoiceSessionLifecycleState = 'idle' | 'opening' | 'open' | 'closing' | 'closed';

export const CONVERSATION_CONTRACT_VERSION = 'conversation_interaction_v1' as const;

export const CONVERSATION_TURN_STATES = [
  'idle',
  'listening',
  'thinking',
  'agent_speaking',
] as const;

export type ConversationTurnState = (typeof CONVERSATION_TURN_STATES)[number];

export const MOBILE_VOICE_VAD_SPEECH_RMS_THRESHOLD = 0.015;
export const MOBILE_VOICE_VAD_ENDPOINT_SILENCE_MS = 320;
export const MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_MIN_MS = 200;
export const MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_MAX_MS = 500;
export const MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_DEFAULT_MS = 320;

export type ConversationTurnStateEvent =
  | {
      type: 'reset';
    }
  | {
      type: 'sync';
      activity: ConversationTurnStateActivity;
    };

export type ConversationTurnStateActivity = {
  conversationStarted: boolean;
  isRecording: boolean;
  isThinking: boolean;
  isAssistantSpeaking: boolean;
};

export const CONVERSATION_REASON_CODES = [
  'permission_denied_mic',
  'permission_denied_camera',
  'device_unavailable',
  'dat_sdk_unavailable',
  'transport_failed',
  'session_auth_failed',
  'session_open_failed',
  'provider_unavailable',
] as const;

export type ConversationReasonCode = (typeof CONVERSATION_REASON_CODES)[number];

export const CONVERSATION_SESSION_STATES = [
  'idle',
  'connecting',
  'live',
  'reconnecting',
  'ending',
  'ended',
  'error',
] as const;
export type ConversationSessionState = (typeof CONVERSATION_SESSION_STATES)[number];

export const CONVERSATION_EVENT_TYPES = [
  'conversation_start_requested',
  'conversation_connecting',
  'conversation_live',
  'conversation_reconnecting',
  'conversation_ending',
  'conversation_ended',
  'conversation_error',
  'conversation_degraded_to_voice',
  'conversation_eyes_source_changed',
  'conversation_permission_denied',
] as const;
export type ConversationEventType = (typeof CONVERSATION_EVENT_TYPES)[number];

export type ConversationEventEnvelope = {
  contractVersion: typeof CONVERSATION_CONTRACT_VERSION;
  eventType: ConversationEventType;
  timestampMs: number;
  liveSessionId?: string;
  conversationId?: string;
  state: ConversationSessionState;
  reasonCode?: ConversationReasonCode;
  payload?: Record<string, unknown>;
};

export type VoiceBargeInState =
  | 'idle'
  | 'assistant_playing'
  | 'interrupting'
  | 'capturing_user'
  | 'recovering';

export type VoiceBargeInEvent =
  | 'assistant_playback_started'
  | 'assistant_playback_stopped'
  | 'user_capture_started'
  | 'user_capture_stopped'
  | 'remote_cancel_ack'
  | 'reset';

export type VoiceBargeInCommand = {
  interruptLocalPlayback: boolean;
  sendRemoteCancel: boolean;
  resetPlaybackQueue: boolean;
};

export type VoiceBargeInTransition = {
  state: VoiceBargeInState;
  command: VoiceBargeInCommand;
};

export type FinalFrameFinalizeGuardReason =
  | 'ready'
  | 'not_final_frame'
  | 'assistant_speaking'
  | 'finalize_mutex_locked'
  | 'duplicate_sequence';

export type FinalFrameFinalizeGuardDecision = {
  allowFinalize: boolean;
  reason: FinalFrameFinalizeGuardReason;
};

export type AssistantAutospeakClaimDecision = {
  claimed: boolean;
  nextConsumedTurnToken: number | null;
};

export function transitionVoiceSessionLifecycle(
  current: VoiceSessionLifecycleState,
  event: 'open_request' | 'open_success' | 'open_failed' | 'close_request' | 'close_success'
): VoiceSessionLifecycleState {
  if (event === 'open_request') {
    return 'opening';
  }
  if (event === 'open_success') {
    return 'open';
  }
  if (event === 'open_failed') {
    return 'idle';
  }
  if (event === 'close_request') {
    return current === 'idle' ? 'closed' : 'closing';
  }
  return 'closed';
}

export function resolveConversationTurnState(activity: ConversationTurnStateActivity): ConversationTurnState {
  if (!activity.conversationStarted) {
    return 'idle';
  }
  if (activity.isRecording) {
    return 'listening';
  }
  if (activity.isAssistantSpeaking) {
    return 'agent_speaking';
  }
  if (activity.isThinking) {
    return 'thinking';
  }
  return 'idle';
}

export function reduceConversationTurnState(args: {
  state: ConversationTurnState;
  event: ConversationTurnStateEvent;
}): ConversationTurnState {
  if (args.event.type === 'reset') {
    return 'idle';
  }
  const nextState = resolveConversationTurnState(args.event.activity);
  return nextState === args.state ? args.state : nextState;
}

export function shouldBargeInInterruptPlayback(args: {
  turnState: ConversationTurnState;
  isUserCaptureStarting: boolean;
  isAssistantSpeaking?: boolean;
}): boolean {
  const effectiveTurnState =
    args.turnState === 'agent_speaking' || args.isAssistantSpeaking ? 'agent_speaking' : args.turnState;
  return reduceVoiceBargeInState({
    state: effectiveTurnState === 'agent_speaking' ? 'assistant_playing' : 'idle',
    event: args.isUserCaptureStarting ? 'user_capture_started' : 'reset',
  }).command.interruptLocalPlayback;
}

export function normalizeFrameEnergyRms(energyRms: number | null | undefined): number {
  if (!Number.isFinite(energyRms)) {
    return 0;
  }
  return Math.max(0, Number(energyRms));
}

export function isSpeechFrameEnergy(args: {
  energyRms: number | null | undefined;
  speechThresholdRms?: number;
}): boolean {
  const threshold = Number.isFinite(args.speechThresholdRms)
    ? Math.max(0, Number(args.speechThresholdRms))
    : MOBILE_VOICE_VAD_SPEECH_RMS_THRESHOLD;
  return normalizeFrameEnergyRms(args.energyRms) >= threshold;
}

export function hasSilenceEndpointElapsed(args: {
  lastSpeechDetectedAtMs: number | null | undefined;
  nowMs: number;
  endpointSilenceMs?: number;
}): boolean {
  if (!Number.isFinite(args.lastSpeechDetectedAtMs) || !Number.isFinite(args.nowMs)) {
    return false;
  }
  const endpointSilenceMs = Number.isFinite(args.endpointSilenceMs)
    ? Math.max(1, Math.floor(Number(args.endpointSilenceMs)))
    : MOBILE_VOICE_VAD_ENDPOINT_SILENCE_MS;
  const lastSpeechDetectedAtMs = Number(args.lastSpeechDetectedAtMs);
  return args.nowMs - lastSpeechDetectedAtMs >= endpointSilenceMs;
}

export function normalizeRecorderAutoStartDebounceMs(
  debounceMs: number | null | undefined
): number {
  if (!Number.isFinite(debounceMs)) {
    return MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_DEFAULT_MS;
  }
  return Math.min(
    MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_MAX_MS,
    Math.max(
      MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_MIN_MS,
      Math.floor(Number(debounceMs))
    )
  );
}

export function evaluateFinalFrameFinalizeGuard(args: {
  isFinalFrame: boolean;
  frameSequence: number;
  isAssistantSpeaking: boolean;
  finalizeInFlight: boolean;
  lastFinalizedSequence: number | null;
}): FinalFrameFinalizeGuardDecision {
  if (!args.isFinalFrame) {
    return {
      allowFinalize: false,
      reason: 'not_final_frame',
    };
  }
  if (args.isAssistantSpeaking) {
    return {
      allowFinalize: false,
      reason: 'assistant_speaking',
    };
  }
  if (args.finalizeInFlight) {
    return {
      allowFinalize: false,
      reason: 'finalize_mutex_locked',
    };
  }
  if (
    Number.isFinite(args.lastFinalizedSequence)
    && args.frameSequence <= Number(args.lastFinalizedSequence)
  ) {
    return {
      allowFinalize: false,
      reason: 'duplicate_sequence',
    };
  }
  return {
    allowFinalize: true,
    reason: 'ready',
  };
}

export function claimAssistantAutospeakTurn(args: {
  activeTurnToken: number | null;
  candidateTurnToken: number | null;
  consumedTurnToken: number | null;
}): AssistantAutospeakClaimDecision {
  if (!Number.isFinite(args.activeTurnToken) || !Number.isFinite(args.candidateTurnToken)) {
    return {
      claimed: false,
      nextConsumedTurnToken: args.consumedTurnToken,
    };
  }
  const activeTurnToken = Number(args.activeTurnToken);
  const candidateTurnToken = Number(args.candidateTurnToken);
  if (candidateTurnToken !== activeTurnToken || args.consumedTurnToken === candidateTurnToken) {
    return {
      claimed: false,
      nextConsumedTurnToken: args.consumedTurnToken,
    };
  }
  return {
    claimed: true,
    nextConsumedTurnToken: candidateTurnToken,
  };
}

export function resolveCaptureStartBargeInTransition(args: {
  state: VoiceBargeInState;
  turnState: ConversationTurnState;
  isAssistantSpeaking?: boolean;
}): VoiceBargeInTransition {
  const shouldInterrupt = shouldBargeInInterruptPlayback({
    turnState: args.turnState,
    isUserCaptureStarting: true,
    isAssistantSpeaking: args.isAssistantSpeaking,
  });
  const baselineState =
    shouldInterrupt && (args.state === 'idle' || args.state === 'recovering')
      ? 'assistant_playing'
      : args.state;
  return reduceVoiceBargeInState({
    state: baselineState,
    event: 'user_capture_started',
  });
}

export function resolveAssistantPlaybackBargeInTransition(args: {
  state: VoiceBargeInState;
  isAssistantSpeaking: boolean;
}): VoiceBargeInTransition {
  return reduceVoiceBargeInState({
    state: args.state,
    event: args.isAssistantSpeaking ? 'assistant_playback_started' : 'assistant_playback_stopped',
  });
}

export function inferConversationReasonCode(reason: string | null | undefined): ConversationReasonCode {
  const normalized = (reason || '').trim().toLowerCase();
  if (!normalized) {
    return 'session_open_failed';
  }
  if (normalized.includes('camera')) {
    return 'permission_denied_camera';
  }
  if (normalized.includes('notallowederror') || normalized.includes('permission') || normalized.includes('mic')) {
    return 'permission_denied_mic';
  }
  if (normalized.includes('dat_sdk_unavailable')) {
    return 'dat_sdk_unavailable';
  }
  if (normalized.includes('auth')) {
    return 'session_auth_failed';
  }
  if (normalized.includes('transport') || normalized.includes('websocket')) {
    return 'transport_failed';
  }
  if (normalized.includes('provider')) {
    return 'provider_unavailable';
  }
  if (normalized.includes('unavailable')) {
    return 'device_unavailable';
  }
  return 'session_open_failed';
}

function defaultBargeInCommand(): VoiceBargeInCommand {
  return {
    interruptLocalPlayback: false,
    sendRemoteCancel: false,
    resetPlaybackQueue: false,
  };
}

export function reduceVoiceBargeInState(args: {
  state: VoiceBargeInState;
  event: VoiceBargeInEvent;
}): VoiceBargeInTransition {
  const command = defaultBargeInCommand();

  if (args.event === 'reset') {
    return {
      state: 'idle',
      command,
    };
  }

  if (args.event === 'assistant_playback_started') {
    if (args.state === 'capturing_user') {
      return { state: args.state, command };
    }
    return {
      state: 'assistant_playing',
      command,
    };
  }

  if (args.event === 'assistant_playback_stopped') {
    if (args.state === 'capturing_user') {
      return {
        state: 'capturing_user',
        command,
      };
    }
    return {
      state: 'recovering',
      command,
    };
  }

  if (args.event === 'user_capture_started') {
    if (args.state === 'assistant_playing') {
      return {
        state: 'interrupting',
        command: {
          interruptLocalPlayback: true,
          sendRemoteCancel: true,
          resetPlaybackQueue: true,
        },
      };
    }
    if (args.state === 'interrupting' || args.state === 'capturing_user') {
      return {
        state: args.state,
        command,
      };
    }
    return {
      state: 'capturing_user',
      command,
    };
  }

  if (args.event === 'remote_cancel_ack') {
    if (args.state === 'interrupting') {
      return {
        state: 'capturing_user',
        command,
      };
    }
    return {
      state: args.state,
      command,
    };
  }

  if (args.event === 'user_capture_stopped') {
    if (args.state === 'capturing_user' || args.state === 'interrupting') {
      return {
        state: 'recovering',
        command,
      };
    }
    return {
      state: args.state,
      command,
    };
  }

  return {
    state: args.state,
    command,
  };
}
