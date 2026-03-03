import { forwardRef, useState, useEffect, useRef, useImperativeHandle, useCallback } from 'react';
import { Pressable, Alert, ActivityIndicator } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { Circle, useTheme } from 'tamagui';
import { Mic } from '@tamagui/lucide-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const DEFAULT_FRAME_DURATION_MS = 750;

export type VoiceRecorderFrame = {
  uri: string;
  durationMs: number;
  sequence: number;
  isFinal: boolean;
};

export type VoiceRecorderHandle = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  isRecording: () => boolean;
};

type VoiceRecorderProps = {
  onRecordingComplete: (uri: string, duration: number) => void;
  onAudioFrame?: (frame: VoiceRecorderFrame) => Promise<void> | void;
  onCancel?: () => void;
  onUserStopRecording?: () => void;
  isTranscribing?: boolean;
  size?: number;
  iconSize?: number;
  onRecordingStateChange?: (isRecording: boolean) => void;
  maxDurationMs?: number;
  streamWhileRecording?: boolean;
  frameDurationMs?: number;
};

export const VoiceRecorder = forwardRef<VoiceRecorderHandle, VoiceRecorderProps>(function VoiceRecorder(
  {
    onRecordingComplete,
    onAudioFrame,
    onUserStopRecording,
    isTranscribing = false,
    size = 44,
    iconSize = 20,
    onRecordingStateChange,
    maxDurationMs,
    streamWhileRecording = false,
    frameDurationMs = DEFAULT_FRAME_DURATION_MS,
  }: VoiceRecorderProps,
  ref
) {
  const theme = useTheme();
  const { t } = useAppPreferences();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const streamRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const streamRecordingActiveRef = useRef(false);
  const primaryRecordingActiveRef = useRef(false);
  const streamSequenceRef = useRef(0);
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamOpRef = useRef<Promise<void>>(Promise.resolve());
  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRequestedRef = useRef(false);

  const pulseScale = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const clearTrackingTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
  }, []);

  const setRecordingState = useCallback((next: boolean) => {
    setIsRecording(next);
    onRecordingStateChange?.(next);
  }, [onRecordingStateChange]);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.15, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        false
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1);
    }
  }, [isRecording, pulseScale]);

  const enqueueStreamOperation = useCallback(async (operation: () => Promise<void>) => {
    const task = streamOpRef.current.then(operation);
    streamOpRef.current = task.catch((error) => {
      console.warn('Voice stream operation failed:', error);
    });
    return task;
  }, []);

  const startStreamSegment = useCallback(async () => {
    await streamRecorder.prepareToRecordAsync();
    streamRecorder.record();
    streamRecordingActiveRef.current = true;
    console.info('[VoiceFrame] stream segment started');
    streamTimerRef.current = setTimeout(() => {
      void enqueueStreamOperation(async () => {
        if (!streamRecordingActiveRef.current || stopRequestedRef.current) {
          return;
        }
        await streamRecorder.stop();
        streamRecordingActiveRef.current = false;
        const uri = streamRecorder.uri;
        const sequence = streamSequenceRef.current++;
        if (uri) {
          const durationMs = Math.max(250, frameDurationMs);
          console.info(`[VoiceFrame] emit seq=${sequence} durationMs=${durationMs} final=false`);
          await onAudioFrame?.({
            uri,
            durationMs,
            sequence,
            isFinal: false,
          });
        }
        if (!stopRequestedRef.current) {
          await startStreamSegment();
        }
      });
    }, Math.max(250, frameDurationMs));
  }, [enqueueStreamOperation, frameDurationMs, onAudioFrame, streamRecorder]);

  const startRecording = useCallback(async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('voice.permissionTitle'), t('voice.permissionBody'));
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      stopRequestedRef.current = false;
      streamSequenceRef.current = 0;
      setRecordingState(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      if (maxDurationMs && maxDurationMs > 0) {
        autoStopRef.current = setTimeout(() => {
          void stopRecordingRef.current?.();
        }, maxDurationMs);
      }

      if (streamWhileRecording && onAudioFrame) {
        await startStreamSegment();
        return;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
      primaryRecordingActiveRef.current = true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecordingState(false);
      Alert.alert(t('voice.errorTitle'), t('voice.startFailed'));
    }
  }, [
    maxDurationMs,
    onAudioFrame,
    recorder,
    setRecordingState,
    startStreamSegment,
    streamWhileRecording,
    t,
  ]);

  const stopStreamingRecording = useCallback(async () => {
    stopRequestedRef.current = true;
    clearTrackingTimers();
    await enqueueStreamOperation(async () => {
      if (!streamRecordingActiveRef.current) {
        return;
      }
      await streamRecorder.stop();
      streamRecordingActiveRef.current = false;
      const uri = streamRecorder.uri;
      const sequence = streamSequenceRef.current++;
      if (uri) {
        const durationMs = Math.max(250, frameDurationMs);
        console.info(`[VoiceFrame] emit seq=${sequence} durationMs=${durationMs} final=true`);
        await onAudioFrame?.({
          uri,
          durationMs,
          sequence,
          isFinal: true,
        });
      }
    });
    await setAudioModeAsync({
      allowsRecording: false,
    });
    setRecordingState(false);
  }, [
    clearTrackingTimers,
    enqueueStreamOperation,
    frameDurationMs,
    onAudioFrame,
    setRecordingState,
    streamRecorder,
  ]);

  const stopRecording = useCallback(async () => {
    if (streamWhileRecording && onAudioFrame) {
      await stopStreamingRecording();
      return;
    }

    if (!primaryRecordingActiveRef.current) return;

    try {
      clearTrackingTimers();
      await recorder.stop();
      primaryRecordingActiveRef.current = false;
      await setAudioModeAsync({
        allowsRecording: false,
      });

      const uri = recorder.uri;
      setRecordingState(false);

      if (uri) {
        onRecordingComplete(uri, duration);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setRecordingState(false);
    }
  }, [
    clearTrackingTimers,
    duration,
    onAudioFrame,
    onRecordingComplete,
    recorder,
    setRecordingState,
    stopStreamingRecording,
    streamWhileRecording,
  ]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  useImperativeHandle(ref, () => ({
    start: startRecording,
    stop: stopRecording,
    isRecording: () => isRecording,
  }), [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      clearTrackingTimers();
    };
  }, [clearTrackingTimers]);

  const handlePress = () => {
    if (isTranscribing) return;
    if (isRecording) {
      void (async () => {
        await stopRecording();
        onUserStopRecording?.();
      })();
    } else {
      void startRecording();
    }
  };

  if (isTranscribing) {
    return (
      <Circle
        size={size}
        backgroundColor="$glass"
        borderWidth={1}
        borderColor="$glassBorder"
        alignItems="center"
        justifyContent="center"
      >
        <ActivityIndicator size="small" color={theme.primary?.val || '#E8520A'} />
      </Circle>
    );
  }

  return (
    <Pressable onPress={handlePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <AnimatedCircle
        size={size}
        backgroundColor={isRecording ? '$error' : '$glass'}
        borderWidth={1}
        borderColor={isRecording ? '$error' : '$glassBorder'}
        alignItems="center"
        justifyContent="center"
        style={isRecording ? pulseStyle : undefined}
      >
        <Mic size={iconSize} color={isRecording ? 'white' : '$color'} />
      </AnimatedCircle>
    </Pressable>
  );
});

export default VoiceRecorder;
