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

import { VoiceRecorder, VoiceRecorderFrame, VoiceRecorderHandle } from './VoiceRecorder';
import { resolveMobileVoiceLiveDuplexSegmentDurationMs } from '../../lib/voice/runtimePolicy';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedYStack = Animated.createAnimatedComponent(YStack);
const LIVE_DUPLEX_FRAME_DURATION_MS = resolveMobileVoiceLiveDuplexSegmentDurationMs('elevenlabs');

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
  onStartConversation: () => void;
  onEndConversation: () => void;
  hudStatusLabel: string;
  onRecordingComplete: (uri: string, duration: number) => void;
  onAudioFrame: (frame: VoiceRecorderFrame) => Promise<void> | void;
  isTranscribing: boolean;
  isLoading: boolean;
  agentName: string;
  latestUserMessage?: string;
  latestAssistantMessage?: string;
  partialTranscript?: string;
  isAssistantSpeaking?: boolean;
  onBeforeCapture?: () => Promise<void> | void;
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
  onStartConversation,
  onEndConversation,
  hudStatusLabel,
  onRecordingComplete,
  onAudioFrame,
  isTranscribing,
  isLoading,
  agentName,
  latestUserMessage,
  latestAssistantMessage,
  partialTranscript,
  isAssistantSpeaking = false,
  onBeforeCapture,
}: VoiceModeModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [liveDuplexEnabled, setLiveDuplexEnabled] = useState(true);
  const [startError, setStartError] = useState<string | null>(null);
  const recorderRef = useRef<VoiceRecorderHandle | null>(null);
  const autoStartInFlightRef = useRef(false);
  const pulse = useSharedValue(1);
  const rotate = useSharedValue(0);

  const isActive = isRecording || isTranscribing || isLoading;

  useEffect(() => {
    rotate.value = withRepeat(withTiming(360, { duration: 9000 }), -1, false);
  }, [rotate]);

  useEffect(() => {
    pulse.value = isActive
      ? withRepeat(withSequence(withTiming(1.1, { duration: 760 }), withTiming(1, { duration: 760 })), -1, false)
      : withTiming(1, { duration: 320 });
  }, [isActive, pulse]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const particlesStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const statusText = useMemo(() => {
    if (!conversationStarted) return 'Tap orb to start';
    if (isRecording) return liveDuplexEnabled ? 'Streaming...' : 'Listening...';
    if (isTranscribing) return 'Transcribing...';
    if (isLoading) return 'Thinking...';
    return liveDuplexEnabled ? 'Live duplex ready' : 'Tap to talk';
  }, [conversationStarted, isLoading, isRecording, isTranscribing, liveDuplexEnabled]);

  const orbState = useMemo(() => {
    if (!conversationStarted) {
      return {
        label: 'START',
        background: 'rgba(34, 197, 94, 0.26)',
        border: 'rgba(34, 197, 94, 0.72)',
        core: 'rgba(34, 197, 94, 0.3)',
      };
    }
    if (isRecording) {
      return {
        label: 'REC',
        background: 'rgba(59, 130, 246, 0.3)',
        border: 'rgba(59, 130, 246, 0.78)',
        core: 'rgba(59, 130, 246, 0.36)',
      };
    }
    if (isAssistantSpeaking) {
      return {
        label: 'TALK',
        background: 'rgba(147, 51, 234, 0.32)',
        border: 'rgba(167, 87, 255, 0.76)',
        core: 'rgba(147, 51, 234, 0.38)',
      };
    }
    if (isTranscribing || isLoading) {
      return {
        label: 'WAIT',
        background: 'rgba(138, 105, 76, 0.34)',
        border: 'rgba(180, 132, 88, 0.72)',
        core: 'rgba(160, 119, 82, 0.3)',
      };
    }
    return {
      label: 'STOP',
      background: 'rgba(220, 38, 38, 0.28)',
      border: 'rgba(220, 38, 38, 0.72)',
      core: 'rgba(220, 38, 38, 0.36)',
    };
  }, [conversationStarted, isAssistantSpeaking, isLoading, isRecording, isTranscribing]);

  const handleOrbPress = () => {
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

  useEffect(() => {
    if (
      !isOpen
      || !conversationStarted
      || !liveDuplexEnabled
      || isRecording
      || isTranscribing
      || isLoading
      || isAssistantSpeaking
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
    };
  }, [
    conversationStarted,
    isAssistantSpeaking,
    isLoading,
    isOpen,
    isRecording,
    isTranscribing,
    liveDuplexEnabled,
    onBeforeCapture,
    recorderRef,
  ]);

  useEffect(() => {
    if (!isOpen && recorderRef.current?.isRecording()) {
      void recorderRef.current.stop();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isAssistantSpeaking || !recorderRef.current?.isRecording()) {
      return;
    }
    void (async () => {
      try {
        await recorderRef.current?.stop();
      } catch (error) {
        console.warn('Failed to pause recorder while assistant speech is active:', error);
      }
    })();
  }, [isAssistantSpeaking, isOpen]);

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
                  onUserStopRecording={() => {
                    // Keep conversation session active after manual stop so
                    // triggered assistant replies can synthesize/play before teardown.
                  }}
                  streamWhileRecording={liveDuplexEnabled}
                  frameDurationMs={LIVE_DUPLEX_FRAME_DURATION_MS}
                  isTranscribing={isTranscribing}
                  size={1}
                  iconSize={0}
                  onRecordingStateChange={setIsRecording}
                  maxDurationMs={liveDuplexEnabled ? undefined : 2800}
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
      </SafeAreaView>
    </Modal>
  );
}

export default VoiceModeModal;
