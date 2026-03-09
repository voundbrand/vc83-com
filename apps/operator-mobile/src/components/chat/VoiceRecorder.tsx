import { forwardRef, useState, useEffect, useRef, useImperativeHandle, useCallback, useMemo } from 'react';
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
import { MOBILE_VOICE_STRUCTURED_TELEMETRY_WINDOW_HOURS } from '../../lib/voice/runtimePolicy';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const DEFAULT_FRAME_DURATION_MS = 420;
const STREAM_METER_SAMPLE_INTERVAL_MS = 80;
const METERING_MIN_DB = -160;

function meteringDbToRms(metering: number | null | undefined): number {
  if (!Number.isFinite(metering)) {
    return 0;
  }
  const clampedDb = Math.max(METERING_MIN_DB, Math.min(0, Number(metering)));
  return Number((10 ** (clampedDb / 20)).toFixed(6));
}

export type VoiceRecorderEnergySample = {
  sequence: number;
  rms: number;
  timestampMs: number;
};

export type VoiceRecorderFrame = {
  uri: string;
  durationMs: number;
  sequence: number;
  isFinal: boolean;
  energyRms: number;
  timestampMs: number;
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
  onAudioEnergySample?: (sample: VoiceRecorderEnergySample) => void;
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
    onAudioEnergySample,
  }: VoiceRecorderProps,
  ref
) {
  const theme = useTheme();
  const { t } = useAppPreferences();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recordingPreset = useMemo(
    () => ({
      ...RecordingPresets.HIGH_QUALITY,
      isMeteringEnabled: true,
    }),
    []
  );
  const recorder = useAudioRecorder(recordingPreset);
  const streamRecorder = useAudioRecorder(recordingPreset);
  const streamRecordingActiveRef = useRef(false);
  const primaryRecordingActiveRef = useRef(false);
  const streamSequenceRef = useRef(0);
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamMeterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamOpRef = useRef<Promise<void>>(Promise.resolve());
  const streamSegmentStartedAtRef = useRef<number | null>(null);
  const streamEnergyStatsRef = useRef({
    sampleCount: 0,
    sumRms: 0,
    peakRms: 0,
    lastRms: 0,
  });
  const onAudioEnergySampleRef = useRef<VoiceRecorderProps['onAudioEnergySample']>(onAudioEnergySample);
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
    if (streamMeterTimerRef.current) {
      clearInterval(streamMeterTimerRef.current);
      streamMeterTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    onAudioEnergySampleRef.current = onAudioEnergySample;
  }, [onAudioEnergySample]);

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

  const resolveStreamSegmentDurationMs = useCallback((fallbackMs: number) => {
    const startedAt = streamSegmentStartedAtRef.current;
    if (!startedAt) {
      return Math.max(250, Math.floor(fallbackMs));
    }
    return Math.max(120, Date.now() - startedAt);
  }, []);

  const resetStreamEnergyStats = useCallback(() => {
    streamEnergyStatsRef.current = {
      sampleCount: 0,
      sumRms: 0,
      peakRms: 0,
      lastRms: 0,
    };
  }, []);

  const recordStreamEnergySample = useCallback((rms: number, timestampMs: number) => {
    const normalizedRms = Math.max(0, Number.isFinite(rms) ? Number(rms) : 0);
    const stats = streamEnergyStatsRef.current;
    stats.sampleCount += 1;
    stats.sumRms += normalizedRms;
    stats.peakRms = Math.max(stats.peakRms, normalizedRms);
    stats.lastRms = normalizedRms;
    onAudioEnergySampleRef.current?.({
      sequence: streamSequenceRef.current,
      rms: normalizedRms,
      timestampMs,
    });
  }, []);

  const sampleStreamEnergyNow = useCallback(() => {
    const status = streamRecorder.getStatus();
    const timestampMs = Date.now();
    const rms = meteringDbToRms(status.metering);
    recordStreamEnergySample(rms, timestampMs);
    return rms;
  }, [recordStreamEnergySample, streamRecorder]);

  const startStreamMetering = useCallback(() => {
    if (streamMeterTimerRef.current) {
      clearInterval(streamMeterTimerRef.current);
      streamMeterTimerRef.current = null;
    }
    resetStreamEnergyStats();
    sampleStreamEnergyNow();
    streamMeterTimerRef.current = setInterval(() => {
      if (!streamRecordingActiveRef.current || stopRequestedRef.current) {
        return;
      }
      sampleStreamEnergyNow();
    }, STREAM_METER_SAMPLE_INTERVAL_MS);
  }, [resetStreamEnergyStats, sampleStreamEnergyNow]);

  const stopStreamMetering = useCallback(() => {
    if (streamMeterTimerRef.current) {
      clearInterval(streamMeterTimerRef.current);
      streamMeterTimerRef.current = null;
    }
  }, []);

  const forceResetRecorderState = useCallback(async () => {
    stopRequestedRef.current = true;
    clearTrackingTimers();
    stopStreamMetering();
    streamSegmentStartedAtRef.current = null;
    try {
      if (streamRecordingActiveRef.current) {
        await enqueueStreamOperation(async () => {
          try {
            await streamRecorder.stop();
          } catch {
            // Best effort during recorder reset.
          } finally {
            streamRecordingActiveRef.current = false;
          }
        });
      }
    } catch {
      // Best effort during recorder reset.
    } finally {
      streamRecordingActiveRef.current = false;
    }

    try {
      if (primaryRecordingActiveRef.current) {
        await recorder.stop();
      }
    } catch {
      // Best effort during recorder reset.
    } finally {
      primaryRecordingActiveRef.current = false;
    }

    try {
      await setAudioModeAsync({
        allowsRecording: false,
      });
    } catch {
      // Best effort during recorder reset.
    }
  }, [clearTrackingTimers, enqueueStreamOperation, recorder, stopStreamMetering, streamRecorder]);

  const resolveStreamSegmentEnergyRms = useCallback(() => {
    const stats = streamEnergyStatsRef.current;
    if (stats.sampleCount > 0) {
      return Number((stats.sumRms / stats.sampleCount).toFixed(6));
    }
    return Number(stats.lastRms.toFixed(6));
  }, []);

  const startStreamSegment = useCallback(async function runStreamSegment() {
    await streamRecorder.prepareToRecordAsync();
    streamRecorder.record();
    streamRecordingActiveRef.current = true;
    streamSegmentStartedAtRef.current = Date.now();
    startStreamMetering();
    console.info('[VoiceFrame] stream segment started');
    streamTimerRef.current = setTimeout(() => {
      void enqueueStreamOperation(async () => {
        if (!streamRecordingActiveRef.current || stopRequestedRef.current) {
          return;
        }
        sampleStreamEnergyNow();
        stopStreamMetering();
        await streamRecorder.stop();
        streamRecordingActiveRef.current = false;
        const durationMs = resolveStreamSegmentDurationMs(frameDurationMs);
        const energyRms = resolveStreamSegmentEnergyRms();
        const timestampMs = Date.now();
        streamSegmentStartedAtRef.current = null;
        const uri = streamRecorder.uri;
        const sequence = streamSequenceRef.current++;
        if (uri) {
          console.info(`[VoiceFrame] emit seq=${sequence} durationMs=${durationMs} energyRms=${energyRms} final=false`);
          console.info('[VoiceTelemetry]', {
            event: 'capture_frame_emitted',
            telemetryWindowHours: MOBILE_VOICE_STRUCTURED_TELEMETRY_WINDOW_HOURS,
            sequence,
            durationMs,
            energyRms,
            isFinal: false,
            timestampMs,
          });
          await onAudioFrame?.({
            uri,
            durationMs,
            sequence,
            isFinal: false,
            energyRms,
            timestampMs,
          });
        }
        if (!stopRequestedRef.current) {
          await runStreamSegment();
        }
      });
    }, Math.max(250, frameDurationMs));
  }, [
    enqueueStreamOperation,
    frameDurationMs,
    onAudioFrame,
    resolveStreamSegmentDurationMs,
    resolveStreamSegmentEnergyRms,
    sampleStreamEnergyNow,
    startStreamMetering,
    stopStreamMetering,
    streamRecorder,
  ]);

  const beginRecording = useCallback(async () => {
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
    streamSegmentStartedAtRef.current = null;
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
  }, [
    maxDurationMs,
    onAudioFrame,
    recorder,
    setRecordingState,
    startStreamSegment,
    streamWhileRecording,
    t,
  ]);

  const startRecording = useCallback(async () => {
    try {
      if (streamRecordingActiveRef.current || primaryRecordingActiveRef.current) {
        await forceResetRecorderState();
      }
      await beginRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      try {
        await forceResetRecorderState();
        await beginRecording();
        return;
      } catch (retryError) {
        console.error('Failed to start recording after reset:', retryError);
      }
      setRecordingState(false);
      Alert.alert(t('voice.errorTitle'), t('voice.startFailed'));
    }
  }, [
    beginRecording,
    forceResetRecorderState,
    setRecordingState,
    t,
  ]);

  const stopStreamingRecording = useCallback(async () => {
    stopRequestedRef.current = true;
    clearTrackingTimers();
    await enqueueStreamOperation(async () => {
      if (!streamRecordingActiveRef.current) {
        streamSegmentStartedAtRef.current = null;
        stopStreamMetering();
        return;
      }
      sampleStreamEnergyNow();
      stopStreamMetering();
      await streamRecorder.stop();
      streamRecordingActiveRef.current = false;
      const durationMs = resolveStreamSegmentDurationMs(frameDurationMs);
      const energyRms = resolveStreamSegmentEnergyRms();
      const timestampMs = Date.now();
      streamSegmentStartedAtRef.current = null;
      const uri = streamRecorder.uri;
      const sequence = streamSequenceRef.current++;
      if (uri) {
        console.info(`[VoiceFrame] emit seq=${sequence} durationMs=${durationMs} energyRms=${energyRms} final=true`);
        console.info('[VoiceTelemetry]', {
          event: 'capture_frame_emitted',
          telemetryWindowHours: MOBILE_VOICE_STRUCTURED_TELEMETRY_WINDOW_HOURS,
          sequence,
          durationMs,
          energyRms,
          isFinal: true,
          timestampMs,
        });
        await onAudioFrame?.({
          uri,
          durationMs,
          sequence,
          isFinal: true,
          energyRms,
          timestampMs,
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
    resolveStreamSegmentDurationMs,
    resolveStreamSegmentEnergyRms,
    sampleStreamEnergyNow,
    setRecordingState,
    stopStreamMetering,
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
      void forceResetRecorderState();
    };
  }, [forceResetRecorderState]);

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
