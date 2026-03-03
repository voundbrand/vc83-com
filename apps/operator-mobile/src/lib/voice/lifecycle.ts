export type VoiceSessionLifecycleState = 'idle' | 'opening' | 'open' | 'closing' | 'closed';

export const CONVERSATION_CONTRACT_VERSION = 'conversation_interaction_v1' as const;

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

export function shouldBargeInInterruptPlayback(args: {
  isAssistantSpeaking: boolean;
  isUserCaptureStarting: boolean;
}): boolean {
  return reduceVoiceBargeInState({
    state: args.isAssistantSpeaking ? 'assistant_playing' : 'idle',
    event: args.isUserCaptureStarting ? 'user_capture_started' : 'reset',
  }).command.interruptLocalPlayback;
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
