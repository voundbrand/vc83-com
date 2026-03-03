import type { EffectiveVoiceTransportMode } from './transport';

export function shouldReconnectRealtimeSession(args: {
  transportMode: EffectiveVoiceTransportMode;
  websocketReadyState?: number;
}): boolean {
  return args.transportMode === 'websocket' && args.websocketReadyState !== 1;
}

export function shouldCloseVoiceSessionForConversationSwitch(args: {
  activeConversationId?: string;
  currentConversationId?: string;
}): boolean {
  const active = typeof args.activeConversationId === 'string' ? args.activeConversationId.trim() : '';
  const current = typeof args.currentConversationId === 'string' ? args.currentConversationId.trim() : '';
  if (!active || !current) {
    return false;
  }
  return active !== current;
}
