import { forwardRef, useState, useEffect, useRef, useImperativeHandle, useCallback } from 'react';
import { Pressable, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
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
  const recordingRef = useRef<Audio.Recording | null>(null);
  const streamRecordingRef = useRef<Audio.Recording | null>(null);
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
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    streamRecordingRef.current = recording;
    streamTimerRef.current = setTimeout(() => {
      void enqueueStreamOperation(async () => {
        if (!streamRecordingRef.current || stopRequestedRef.current) {
          return;
        }
        const activeRecording = streamRecordingRef.current;
        streamRecordingRef.current = null;
        const statusBeforeStop = await activeRecording.getStatusAsync();
        await activeRecording.stopAndUnloadAsync();
        const uri = activeRecording.getURI();
        const sequence = streamSequenceRef.current++;
        if (uri) {
          await onAudioFrame?.({
            uri,
            durationMs: typeof statusBeforeStop.durationMillis === 'number' ? statusBeforeStop.durationMillis : 0,
            sequence,
            isFinal: false,
          });
        }
        if (!stopRequestedRef.current) {
          await startStreamSegment();
        }
      });
    }, Math.max(250, frameDurationMs));
  }, [enqueueStreamOperation, frameDurationMs, onAudioFrame]);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('voice.permissionTitle'), t('voice.permissionBody'));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
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

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecordingState(false);
      Alert.alert(t('voice.errorTitle'), t('voice.startFailed'));
    }
  }, [
    maxDurationMs,
    onAudioFrame,
    setRecordingState,
    startStreamSegment,
    streamWhileRecording,
    t,
  ]);

  const stopStreamingRecording = useCallback(async () => {
    stopRequestedRef.current = true;
    clearTrackingTimers();
    await enqueueStreamOperation(async () => {
      const activeRecording = streamRecordingRef.current;
      streamRecordingRef.current = null;
      if (!activeRecording) {
        return;
      }
      const statusBeforeStop = await activeRecording.getStatusAsync();
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      const sequence = streamSequenceRef.current++;
      if (uri) {
        await onAudioFrame?.({
          uri,
          durationMs: typeof statusBeforeStop.durationMillis === 'number' ? statusBeforeStop.durationMillis : 0,
          sequence,
          isFinal: true,
        });
      }
    });
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    setRecordingState(false);
  }, [clearTrackingTimers, enqueueStreamOperation, onAudioFrame, setRecordingState]);

  const stopRecording = useCallback(async () => {
    if (streamWhileRecording && onAudioFrame) {
      await stopStreamingRecording();
      return;
    }

    if (!recordingRef.current) return;

    try {
      clearTrackingTimers();
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
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
      void stopRecording();
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
