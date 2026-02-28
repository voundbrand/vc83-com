export type VoiceSessionLifecycleState = 'idle' | 'opening' | 'open' | 'closing' | 'closed';

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
  return args.isAssistantSpeaking && args.isUserCaptureStarting;
}
