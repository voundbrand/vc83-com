import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Circle, Text, XStack, YStack } from 'tamagui';
import { X } from '@tamagui/lucide-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { VoiceRecorder, VoiceRecorderFrame, VoiceRecorderHandle } from './VoiceRecorder';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedYStack = Animated.createAnimatedComponent(YStack);

type VoiceModeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (uri: string, duration: number) => void;
  onAudioFrame: (frame: VoiceRecorderFrame) => Promise<void> | void;
  isTranscribing: boolean;
  isLoading: boolean;
  agentName: string;
  agentAvatar: string;
  latestUserMessage?: string;
  latestAssistantMessage?: string;
  partialTranscript?: string;
  isAssistantSpeaking?: boolean;
  onBeforeCapture?: () => void;
};

export function VoiceModeModal({
  isOpen,
  onClose,
  onRecordingComplete,
  onAudioFrame,
  isTranscribing,
  isLoading,
  agentName,
  agentAvatar,
  latestUserMessage,
  latestAssistantMessage,
  partialTranscript,
  isAssistantSpeaking = false,
  onBeforeCapture,
}: VoiceModeModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [liveDuplexEnabled, setLiveDuplexEnabled] = useState(true);
  const recorderRef = useRef<VoiceRecorderHandle | null>(null);
  const pulse = useSharedValue(1);
  const rotate = useSharedValue(0);

  const isActive = isRecording || isTranscribing || isLoading;

  useEffect(() => {
    rotate.value = withRepeat(withTiming(360, { duration: 9000 }), -1, false);
  }, [rotate]);

  useEffect(() => {
    pulse.value = isActive
      ? withRepeat(withSequence(withTiming(1.12, { duration: 360 }), withTiming(1, { duration: 360 })), -1, false)
      : withTiming(1, { duration: 240 });
  }, [isActive, pulse]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const particlesStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const statusText = useMemo(() => {
    if (isRecording) return liveDuplexEnabled ? 'Streaming...' : 'Listening...';
    if (isTranscribing) return 'Transcribing...';
    if (isLoading) return 'Thinking...';
    return liveDuplexEnabled ? 'Live duplex ready' : 'Tap to talk';
  }, [isLoading, isRecording, isTranscribing, liveDuplexEnabled]);

  useEffect(() => {
    if (!isOpen || !liveDuplexEnabled || isRecording || isTranscribing || isLoading || isAssistantSpeaking) {
      return;
    }
    onBeforeCapture?.();
    void recorderRef.current?.start();
  }, [
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

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111113' }}>
        <YStack flex={1} backgroundColor="#111113" paddingHorizontal="$5" paddingTop="$3" paddingBottom="$5">
          <XStack justifyContent="space-between" alignItems="center">
            <Text color="#f3efe7" fontSize="$6" fontWeight="700">
              Voice Mode
            </Text>
            <XStack gap="$2" alignItems="center">
              <Pressable onPress={() => setLiveDuplexEnabled((prev) => !prev)}>
                <Circle size={36} backgroundColor={liveDuplexEnabled ? 'rgba(229,149,78,0.28)' : 'rgba(255,255,255,0.08)'} alignItems="center" justifyContent="center">
                  <Text color="#f3efe7" fontSize="$2" fontWeight="700">
                    LIVE
                  </Text>
                </Circle>
              </Pressable>
              <Pressable onPress={onClose}>
                <Circle size={36} backgroundColor="rgba(255,255,255,0.08)" alignItems="center" justifyContent="center">
                  <X size={18} color="#f3efe7" />
                </Circle>
              </Pressable>
            </XStack>
          </XStack>

          <YStack flex={1} justifyContent="center" alignItems="center" gap="$5">
            <AnimatedYStack
              width={260}
              height={260}
              alignItems="center"
              justifyContent="center"
              style={particlesStyle}
            >
              <Circle size={10} backgroundColor="rgba(229, 149, 78, 0.4)" position="absolute" top={16} left={124} />
              <Circle size={8} backgroundColor="rgba(229, 149, 78, 0.34)" position="absolute" top={44} right={32} />
              <Circle size={6} backgroundColor="rgba(229, 149, 78, 0.28)" position="absolute" top={122} right={8} />
              <Circle size={9} backgroundColor="rgba(229, 149, 78, 0.32)" position="absolute" bottom={34} right={36} />
              <Circle size={7} backgroundColor="rgba(229, 149, 78, 0.28)" position="absolute" bottom={18} left={118} />
              <Circle size={8} backgroundColor="rgba(229, 149, 78, 0.34)" position="absolute" top={120} left={8} />
              <Circle size={6} backgroundColor="rgba(229, 149, 78, 0.24)" position="absolute" top={40} left={34} />
            </AnimatedYStack>

            <AnimatedCircle
              size={160}
              backgroundColor={isActive ? 'rgba(229,149,78,0.24)' : 'rgba(255,255,255,0.08)'}
              borderWidth={1}
              borderColor={isActive ? 'rgba(229,149,78,0.65)' : 'rgba(255,255,255,0.22)'}
              alignItems="center"
              justifyContent="center"
              style={orbStyle}
            >
              <Text color="#f3efe7" fontSize={40}>
                {agentAvatar}
              </Text>
            </AnimatedCircle>

            <Text color="#f3efe7" fontSize="$5" fontWeight="600">
              {agentName}
            </Text>
            <Text color="rgba(243,239,231,0.7)" fontSize="$4">
              {statusText}
            </Text>

            <VoiceRecorder
              ref={(instance) => {
                recorderRef.current = instance;
              }}
              onRecordingComplete={onRecordingComplete}
              onAudioFrame={onAudioFrame}
              streamWhileRecording={liveDuplexEnabled}
              frameDurationMs={720}
              isTranscribing={isTranscribing}
              size={78}
              iconSize={30}
              onRecordingStateChange={setIsRecording}
              maxDurationMs={liveDuplexEnabled ? undefined : 2800}
            />
          </YStack>

          <YStack gap="$2">
            <YStack borderWidth={1} borderColor="rgba(255,255,255,0.12)" borderRadius="$4" padding="$3">
              <Text color="rgba(243,239,231,0.6)" fontSize="$2">
                You
              </Text>
              <Text color="#f3efe7" numberOfLines={2}>
                {partialTranscript || latestUserMessage || '...'}
              </Text>
            </YStack>
            <YStack borderWidth={1} borderColor="rgba(229,149,78,0.34)" borderRadius="$4" padding="$3">
              <Text color="rgba(243,239,231,0.6)" fontSize="$2">
                {agentName}
              </Text>
              <Text color="#f3efe7" numberOfLines={3}>
                {latestAssistantMessage || '...'}
              </Text>
            </YStack>
          </YStack>
        </YStack>
      </SafeAreaView>
    </Modal>
  );
}

export default VoiceModeModal;
