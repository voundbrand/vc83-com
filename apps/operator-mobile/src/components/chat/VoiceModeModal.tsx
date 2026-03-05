import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { AudioModule, setAudioModeAsync } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Circle, Text, XStack, YStack } from 'tamagui';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  VoiceRecorder,
  type VoiceRecorderEnergySample,
  VoiceRecorderFrame,
  VoiceRecorderHandle,
} from './VoiceRecorder';
import { resolveMobileVoiceLiveDuplexSegmentDurationMs } from '../../lib/voice/runtimePolicy';
import {
  type ConversationTurnState,
  MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_DEFAULT_MS,
  normalizeRecorderAutoStartDebounceMs,
} from '../../lib/voice/lifecycle';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedYStack = Animated.createAnimatedComponent(YStack);
const LIVE_DUPLEX_FRAME_DURATION_MS = resolveMobileVoiceLiveDuplexSegmentDurationMs('elevenlabs');
const LIVE_DUPLEX_ENABLED = true;

type VoiceModeTurnVisualState = {
  label: string;
  statusText: string;
  background: string;
  border: string;
  core: string;
  pulseScale: number;
  pulseDurationMs: number;
  rotateDurationMs: number;
};

const VOICE_MODE_TURN_VISUAL_STATE_MAP: Record<ConversationTurnState, VoiceModeTurnVisualState> = {
  idle: {
    label: 'IDLE',
    statusText: 'Live duplex ready',
    background: 'rgba(16, 185, 129, 0.28)',
    border: 'rgba(16, 185, 129, 0.76)',
    core: 'rgba(16, 185, 129, 0.34)',
    pulseScale: 1.04,
    pulseDurationMs: 1200,
    rotateDurationMs: 8400,
  },
  listening: {
    label: 'REC',
    statusText: 'Listening...',
    background: 'rgba(59, 130, 246, 0.3)',
    border: 'rgba(59, 130, 246, 0.78)',
    core: 'rgba(59, 130, 246, 0.36)',
    pulseScale: 1.12,
    pulseDurationMs: 620,
    rotateDurationMs: 3600,
  },
  thinking: {
    label: 'WAIT',
    statusText: 'Thinking...',
    background: 'rgba(245, 158, 11, 0.3)',
    border: 'rgba(245, 158, 11, 0.72)',
    core: 'rgba(245, 158, 11, 0.34)',
    pulseScale: 1.08,
    pulseDurationMs: 900,
    rotateDurationMs: 5600,
  },
  agent_speaking: {
    label: 'TALK',
    statusText: 'Agent speaking...',
    background: 'rgba(168, 85, 247, 0.32)',
    border: 'rgba(168, 85, 247, 0.78)',
    core: 'rgba(168, 85, 247, 0.38)',
    pulseScale: 1.1,
    pulseDurationMs: 700,
    rotateDurationMs: 4200,
  },
};

const VOICE_MODE_PRESTART_VISUAL_STATE: VoiceModeTurnVisualState = {
  label: 'START',
  statusText: 'Tap orb to start',
  background: 'rgba(34, 197, 94, 0.26)',
  border: 'rgba(34, 197, 94, 0.72)',
  core: 'rgba(34, 197, 94, 0.3)',
  pulseScale: 1,
  pulseDurationMs: 320,
  rotateDurationMs: 9000,
};

const VOICE_MODE_ENDING_VISUAL_STATE: VoiceModeTurnVisualState = {
  label: 'END',
  statusText: 'Ending conversation...',
  background: 'rgba(220, 38, 38, 0.28)',
  border: 'rgba(220, 38, 38, 0.72)',
  core: 'rgba(220, 38, 38, 0.36)',
  pulseScale: 1,
  pulseDurationMs: 320,
  rotateDurationMs: 9000,
};

function resolveVoiceModeVisualState(args: {
  conversationStarted: boolean;
  conversationEnding: boolean;
  conversationTurnState: ConversationTurnState;
}): VoiceModeTurnVisualState {
  if (!args.conversationStarted) {
    return VOICE_MODE_PRESTART_VISUAL_STATE;
  }
  if (args.conversationEnding) {
    return VOICE_MODE_ENDING_VISUAL_STATE;
  }
  return VOICE_MODE_TURN_VISUAL_STATE_MAP[args.conversationTurnState];
}

type VoiceModeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  conversationMode: 'voice' | 'voice_with_eyes';
  onConversationModeChange: (mode: 'voice' | 'voice_with_eyes') => void;
  eyesSource: 'iphone' | 'meta_glasses';
  onEyesSourceChange: (source: 'iphone' | 'meta_glasses') => void;
  metaGlassesAvailable: boolean;
  metaGlassesReason?: string;
  conversationStarted: boolean;
  conversationEnding: boolean;
  onStartConversation: () => void;
  onEndConversation: () => void;
  hudStatusLabel: string;
  onRecordingComplete: (uri: string, duration: number) => void;
  onAudioFrame: (frame: VoiceRecorderFrame) => Promise<void> | void;
  onAudioEnergySample?: (sample: VoiceRecorderEnergySample) => void;
  isTranscribing: boolean;
  conversationTurnState: ConversationTurnState;
  onRecordingStateChange?: (isRecording: boolean) => void;
  agentName: string;
  latestUserMessage?: string;
  latestAssistantMessage?: string;
  partialTranscript?: string;
  onBeforeCapture?: () => Promise<void> | void;
  captureStopSignal?: number;
  recorderAutoStartDebounceMs?: number;
};

export function VoiceModeModal({
  isOpen,
  onClose,
  conversationMode,
  onConversationModeChange,
  eyesSource,
  onEyesSourceChange,
  metaGlassesAvailable,
  metaGlassesReason,
  conversationStarted,
  conversationEnding,
  onStartConversation,
  onEndConversation,
  hudStatusLabel,
  onRecordingComplete,
  onAudioFrame,
  onAudioEnergySample,
  isTranscribing,
  conversationTurnState,
  onRecordingStateChange,
  agentName,
  latestUserMessage,
  latestAssistantMessage,
  partialTranscript,
  onBeforeCapture,
  captureStopSignal = 0,
  recorderAutoStartDebounceMs = MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_DEFAULT_MS,
}: VoiceModeModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const liveDuplexEnabled = LIVE_DUPLEX_ENABLED;
  const [startError, setStartError] = useState<string | null>(null);
  const recorderRef = useRef<VoiceRecorderHandle | null>(null);
  const autoStartInFlightRef = useRef(false);
  const autoStartDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousTurnStateRef = useRef<ConversationTurnState>(conversationTurnState);
  const assistantPlaybackStoppedAtRef = useRef<number | null>(null);
  const handledCaptureStopSignalRef = useRef(0);
  const pulse = useSharedValue(1);
  const rotate = useSharedValue(0);
  const normalizedAutoStartDebounceMs = useMemo(
    () => normalizeRecorderAutoStartDebounceMs(recorderAutoStartDebounceMs),
    [recorderAutoStartDebounceMs]
  );
  const voiceModeVisualState = useMemo(
    () =>
      resolveVoiceModeVisualState({
        conversationStarted,
        conversationEnding,
        conversationTurnState,
      }),
    [conversationEnding, conversationStarted, conversationTurnState]
  );

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(360, { duration: voiceModeVisualState.rotateDurationMs }),
      -1,
      false
    );
  }, [rotate, voiceModeVisualState.rotateDurationMs]);

  useEffect(() => {
    if (voiceModeVisualState.pulseScale <= 1) {
      pulse.value = withTiming(1, { duration: voiceModeVisualState.pulseDurationMs });
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(voiceModeVisualState.pulseScale, { duration: voiceModeVisualState.pulseDurationMs }),
        withTiming(1, { duration: voiceModeVisualState.pulseDurationMs })
      ),
      -1,
      false
    );
  }, [pulse, voiceModeVisualState.pulseDurationMs, voiceModeVisualState.pulseScale]);

  useEffect(() => {
    const previousTurnState = previousTurnStateRef.current;
    if (
      previousTurnState === 'agent_speaking'
      && conversationTurnState !== 'agent_speaking'
    ) {
      assistantPlaybackStoppedAtRef.current = Date.now();
    }
    previousTurnStateRef.current = conversationTurnState;
  }, [conversationTurnState]);

  useEffect(
    () => () => {
      if (autoStartDebounceTimeoutRef.current) {
        clearTimeout(autoStartDebounceTimeoutRef.current);
        autoStartDebounceTimeoutRef.current = null;
      }
    },
    []
  );

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const particlesStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const statusText = voiceModeVisualState.statusText;

  const orbState = useMemo(() => {
    return {
      label: voiceModeVisualState.label,
      background: voiceModeVisualState.background,
      border: voiceModeVisualState.border,
      core: voiceModeVisualState.core,
    };
  }, [voiceModeVisualState]);

  const handleManualStop = () => {
    if (conversationEnding || !conversationStarted) {
      return;
    }
    void (async () => {
      try {
        if (recorderRef.current?.isRecording()) {
          await recorderRef.current.stop();
        }
      } catch (error) {
        console.warn('Voice recorder stop before end failed:', error);
      } finally {
        onEndConversation();
      }
    })();
  };

  const handleOrbPress = () => {
    if (conversationEnding) {
      return;
    }
    if (!conversationStarted) {
      void (async () => {
        setStartError(null);
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) {
          setStartError('Microphone permission is required to start conversation.');
          return;
        }
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        onStartConversation();
      })();
      return;
    }
    handleManualStop();
  };

  useEffect(() => {
    if (
      !isOpen
      || !conversationStarted
      || conversationEnding
      || !liveDuplexEnabled
      || isRecording
      || conversationTurnState !== 'idle'
    ) {
      return;
    }
    let cancelled = false;
    void (async () => {
      if (autoStartInFlightRef.current) {
        return;
      }
      autoStartInFlightRef.current = true;
      try {
        const assistantPlaybackStoppedAtMs = assistantPlaybackStoppedAtRef.current;
        if (Number.isFinite(assistantPlaybackStoppedAtMs)) {
          const elapsedSinceAssistantStop = Date.now() - Number(assistantPlaybackStoppedAtMs);
          const remainingDebounceMs = normalizedAutoStartDebounceMs - elapsedSinceAssistantStop;
          if (remainingDebounceMs > 0) {
            await new Promise<void>((resolve) => {
              autoStartDebounceTimeoutRef.current = setTimeout(() => {
                autoStartDebounceTimeoutRef.current = null;
                resolve();
              }, remainingDebounceMs);
            });
          }
        }
        if (cancelled) {
          return;
        }
        await onBeforeCapture?.();
        if (cancelled) return;
        if (!recorderRef.current?.isRecording()) {
          await recorderRef.current?.start();
        }
      } catch (error) {
        if (!cancelled) {
          setStartError(error instanceof Error ? error.message : 'voice_capture_start_failed');
        }
      } finally {
        autoStartInFlightRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
      if (autoStartDebounceTimeoutRef.current) {
        clearTimeout(autoStartDebounceTimeoutRef.current);
        autoStartDebounceTimeoutRef.current = null;
      }
    };
  }, [
    conversationTurnState,
    conversationEnding,
    conversationStarted,
    isOpen,
    isRecording,
    liveDuplexEnabled,
    normalizedAutoStartDebounceMs,
    onBeforeCapture,
    recorderRef,
  ]);

  useEffect(() => {
    if (!conversationEnding) {
      return;
    }
    if (autoStartDebounceTimeoutRef.current) {
      clearTimeout(autoStartDebounceTimeoutRef.current);
      autoStartDebounceTimeoutRef.current = null;
    }
    autoStartInFlightRef.current = false;
    if (!recorderRef.current?.isRecording()) {
      return;
    }
    void (async () => {
      try {
        await recorderRef.current?.stop();
      } catch (error) {
        console.warn('Failed to stop recorder while conversation is ending:', error);
      }
    })();
  }, [conversationEnding]);

  useEffect(() => {
    if (!isOpen && recorderRef.current?.isRecording()) {
      void recorderRef.current.stop();
    }
  }, [isOpen]);

  useEffect(() => {
    if (captureStopSignal <= 0 || captureStopSignal === handledCaptureStopSignalRef.current) {
      return;
    }
    if (!isOpen || !conversationStarted) {
      handledCaptureStopSignalRef.current = captureStopSignal;
      return;
    }
    if (!recorderRef.current?.isRecording()) {
      handledCaptureStopSignalRef.current = captureStopSignal;
      return;
    }
    handledCaptureStopSignalRef.current = captureStopSignal;
    void (async () => {
      try {
        await recorderRef.current?.stop();
      } catch (error) {
        console.warn('Failed to stop recorder from capture stop signal:', error);
      }
    })();
  }, [captureStopSignal, conversationStarted, isOpen]);

  useEffect(() => {
    if (!isOpen || conversationTurnState !== 'agent_speaking' || !recorderRef.current?.isRecording()) {
      return;
    }
    void (async () => {
      try {
        await recorderRef.current?.stop();
      } catch (error) {
        console.warn('Failed to pause recorder while assistant speech is active:', error);
      }
    })();
  }, [conversationTurnState, isOpen]);

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111113' }}>
        <YStack flex={1} backgroundColor="#111113" paddingHorizontal="$5" paddingTop="$3" paddingBottom="$5">
          <YStack flex={1} justifyContent="center" alignItems="center" gap="$5">
            <YStack
              width="100%"
              borderWidth={1}
              borderColor="rgba(255,255,255,0.12)"
              borderRadius="$4"
              padding="$3"
              gap="$2"
            >
              <Text color="#f3efe7" fontSize="$3" fontWeight="700">
                Mode
              </Text>
              <XStack gap="$2">
                <Pressable onPress={() => onConversationModeChange('voice')} style={{ flex: 1 }}>
                  <YStack
                    borderWidth={1}
                    borderColor={conversationMode === 'voice' ? 'rgba(229,149,78,0.7)' : 'rgba(255,255,255,0.16)'}
                    borderRadius="$4"
                    minHeight={64}
                    justifyContent="center"
                    paddingHorizontal="$3"
                    paddingVertical="$3"
                    backgroundColor={conversationMode === 'voice' ? 'rgba(229,149,78,0.18)' : 'rgba(255,255,255,0.06)'}
                  >
                    <Text color="#f3efe7" fontSize="$4" fontWeight="700">
                      Voice only
                    </Text>
                  </YStack>
                </Pressable>
                <Pressable onPress={() => onConversationModeChange('voice_with_eyes')} style={{ flex: 1 }}>
                  <YStack
                    borderWidth={1}
                    borderColor={conversationMode === 'voice_with_eyes' ? 'rgba(229,149,78,0.7)' : 'rgba(255,255,255,0.16)'}
                    borderRadius="$4"
                    minHeight={64}
                    justifyContent="center"
                    paddingHorizontal="$3"
                    paddingVertical="$3"
                    backgroundColor={conversationMode === 'voice_with_eyes' ? 'rgba(229,149,78,0.18)' : 'rgba(255,255,255,0.06)'}
                  >
                    <Text color="#f3efe7" fontSize="$4" fontWeight="700">
                      Voice + Eyes
                    </Text>
                  </YStack>
                </Pressable>
              </XStack>

              {conversationMode === 'voice_with_eyes' ? (
                <YStack gap="$2">
                  <Text color="rgba(243,239,231,0.72)" fontSize="$2">
                    Eyes source
                  </Text>
                  <XStack gap="$2">
                    <Pressable onPress={() => onEyesSourceChange('iphone')} style={{ flex: 1 }}>
                      <YStack
                        borderWidth={1}
                        borderColor={eyesSource === 'iphone' ? 'rgba(229,149,78,0.7)' : 'rgba(255,255,255,0.16)'}
                        borderRadius="$4"
                        minHeight={58}
                        justifyContent="center"
                        paddingHorizontal="$3"
                        paddingVertical="$2.5"
                        backgroundColor={eyesSource === 'iphone' ? 'rgba(229,149,78,0.18)' : 'rgba(255,255,255,0.06)'}
                      >
                        <Text color="#f3efe7" fontSize="$3" fontWeight="700">
                          iPhone Camera
                        </Text>
                      </YStack>
                    </Pressable>
                    <Pressable
                      disabled={!metaGlassesAvailable}
                      onPress={() => onEyesSourceChange('meta_glasses')}
                      style={{ flex: 1, opacity: metaGlassesAvailable ? 1 : 0.55 }}
                    >
                      <YStack
                        borderWidth={1}
                        borderColor={eyesSource === 'meta_glasses' ? 'rgba(229,149,78,0.7)' : 'rgba(255,255,255,0.16)'}
                        borderRadius="$4"
                        minHeight={58}
                        justifyContent="center"
                        paddingHorizontal="$3"
                        paddingVertical="$2.5"
                        backgroundColor={eyesSource === 'meta_glasses' ? 'rgba(229,149,78,0.18)' : 'rgba(255,255,255,0.06)'}
                      >
                        <Text color="#f3efe7" fontSize="$3" fontWeight="700">
                          Meta Glasses
                        </Text>
                      </YStack>
                    </Pressable>
                  </XStack>
                  {!metaGlassesAvailable ? (
                    <Text color="rgba(243,239,231,0.62)" fontSize="$2">
                      {metaGlassesReason || 'Meta glasses unavailable on this build.'}
                    </Text>
                  ) : null}
                </YStack>
              ) : null}

              <YStack gap="$2">
                <Text color="rgba(243,239,231,0.72)" fontSize="$2">
                  Live HUD: {hudStatusLabel}
                </Text>
              </YStack>
            </YStack>

            <YStack width={260} height={260} alignItems="center" justifyContent="center">
              <AnimatedYStack
                width={260}
                height={260}
                position="absolute"
                alignItems="center"
                justifyContent="center"
                style={particlesStyle}
              >
                <Circle size={9} backgroundColor="rgba(229, 149, 78, 0.4)" position="absolute" top={22} left={126} />
                <Circle size={7} backgroundColor="rgba(229, 149, 78, 0.34)" position="absolute" top={52} right={48} />
                <Circle size={6} backgroundColor="rgba(229, 149, 78, 0.3)" position="absolute" top={126} right={24} />
                <Circle size={8} backgroundColor="rgba(229, 149, 78, 0.34)" position="absolute" bottom={50} right={48} />
                <Circle size={7} backgroundColor="rgba(229, 149, 78, 0.3)" position="absolute" bottom={22} left={126} />
                <Circle size={8} backgroundColor="rgba(229, 149, 78, 0.34)" position="absolute" top={126} left={24} />
                <Circle size={6} backgroundColor="rgba(229, 149, 78, 0.24)" position="absolute" top={52} left={48} />
              </AnimatedYStack>

              <Pressable onPress={handleOrbPress}>
                <AnimatedCircle
                  size={166}
                  backgroundColor={orbState.background}
                  borderWidth={1}
                  borderColor={orbState.border}
                  alignItems="center"
                  justifyContent="center"
                  style={orbStyle}
                >
                  <Circle
                    size={74}
                    backgroundColor={orbState.core}
                    borderWidth={1}
                    borderColor={orbState.border}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text color="#f3efe7" fontSize="$3" fontWeight="700">
                      {orbState.label}
                    </Text>
                  </Circle>
                </AnimatedCircle>
              </Pressable>
            </YStack>

            <Text color="#f3efe7" fontSize="$5" fontWeight="600">
              {agentName}
            </Text>
            <Text color="rgba(243,239,231,0.7)" fontSize="$4">
              {statusText}
            </Text>

            {conversationStarted ? (
              <YStack width={1} height={1} opacity={0} overflow="hidden" pointerEvents="none">
                <VoiceRecorder
                  ref={(instance) => {
                    recorderRef.current = instance;
                  }}
                  onRecordingComplete={onRecordingComplete}
                  onAudioFrame={onAudioFrame}
                  onAudioEnergySample={onAudioEnergySample}
                  onUserStopRecording={() => {
                    // Keep conversation session active after manual stop so
                    // triggered assistant replies can synthesize/play before teardown.
                  }}
                  streamWhileRecording={LIVE_DUPLEX_ENABLED}
                  frameDurationMs={LIVE_DUPLEX_FRAME_DURATION_MS}
                  isTranscribing={isTranscribing}
                  size={1}
                  iconSize={0}
                  onRecordingStateChange={(nextIsRecording) => {
                    setIsRecording(nextIsRecording);
                    onRecordingStateChange?.(nextIsRecording);
                  }}
                  maxDurationMs={LIVE_DUPLEX_ENABLED ? undefined : 2800}
                />
              </YStack>
            ) : null}
            {startError ? (
              <Text color="#fca5a5" fontSize="$2">
                {startError}
              </Text>
            ) : null}
          </YStack>

        </YStack>
        {conversationStarted && !conversationEnding ? (
          <Pressable
            onPress={handleManualStop}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ position: 'absolute', right: 16, bottom: 16 }}
          >
            <Circle
              size={52}
              backgroundColor="rgba(220, 38, 38, 0.22)"
              borderWidth={1}
              borderColor="rgba(248, 113, 113, 0.72)"
              alignItems="center"
              justifyContent="center"
            >
              <Text color="#fecaca" fontSize="$1" fontWeight="800">
                STOP
              </Text>
            </Circle>
          </Pressable>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

export default VoiceModeModal;
