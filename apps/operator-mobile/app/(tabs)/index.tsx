import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  Linking,
  TextInput,
  View,
  Image,
  Modal,
  Switch,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  YStack,
  XStack,
  Text,
  useTheme,
  Circle,
} from 'tamagui';
import { ArrowUp, AudioWaveform, Ghost, Menu, Mic, Plus, Sparkles } from '@tamagui/lucide-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';

import { useAuth } from '../../src/hooks/useAuth';
import { useChatStore, Message, Attachment } from '../../src/stores/chat';
import {
  AttachmentMenu,
  MessageActions,
  VoiceRecorder,
  type VoiceRecorderFrame,
  VoiceModeModal,
  ChatDrawer,
  PendingApprovalsPanel,
} from '../../src/components/chat';
import { ModelSelector, type RuntimeModelAvailability } from '../../src/components/chat/ModelSelector';
import { ENV } from '../../src/config/env';
import { useAppPreferences } from '../../src/contexts/AppPreferencesContext';
import type { TranslationKey } from '../../src/i18n/translations';
import { l4yercak3Client } from '../../src/api/client';
import { useMobileVoiceRuntime } from '../../src/hooks/useMobileVoiceRuntime';
import { useMobileVideoRuntime } from '../../src/hooks/useMobileVideoRuntime';
import {
  CONVERSATION_CONTRACT_VERSION,
  type ConversationEventType,
  type ConversationReasonCode,
  type ConversationSessionState,
  inferConversationReasonCode,
  shouldBargeInInterruptPlayback,
} from '../../src/lib/voice/lifecycle';
import { shouldCloseVoiceSessionForConversationSwitch } from '../../src/lib/voice/continuity';
import {
  createMobileAvSourceRegistry,
  createNodeCommandGatePolicy,
  evaluateNodeCommandGate,
  buildSignedMobileSourceAttestation,
  buildMobileNodeCommandPolicyContract,
  buildGeminiLiveMetadata,
  buildMetaBridgeDiagnostics,
  createDefaultMetaBridgeSnapshot,
  evaluateVisionSourceReadiness,
  mapVisionReadinessReasonToConversationReason,
  negotiateVisionSource,
  metaBridge,
  type VisionSourceMode,
  type MetaBridgeConnectionState,
  type MetaBridgeSnapshot,
} from '../../src/lib/av';
import {
  buildMobileToolBoundaryIntakeKickoff,
  shouldShowMobileToolBoundaryCta,
} from '../../src/lib/chat/frontlineFeatureIntake';

const getGreetingKey = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'chat.greeting.morning';
  if (hour < 18) return 'chat.greeting.afternoon';
  return 'chat.greeting.evening';
};

function resolveCreditActionUrl(actionUrl: string | undefined): string | null {
  if (typeof actionUrl !== 'string' || actionUrl.trim().length === 0) {
    return null;
  }

  const normalized = actionUrl.trim();
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const appBase = ENV.L4YERCAK3_APP_URL.replace(/\/$/, '');
  if (normalized.startsWith('/')) {
    return `${appBase}${normalized}`;
  }

  return `${appBase}/${normalized}`;
}

export default function ConversationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
    t,
    resolvedTheme,
    agentName,
    agentVoiceId,
    autoSpeakReplies,
  } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user, currentOrganization } = useAuth();

  // Chat store
  const {
    conversations,
    currentConversationId,
    selectedModel,
    isIncognitoMode,
    isSyncing,
    createConversation,
    setCurrentConversation,
    updateMessageFeedback,
    setSelectedModel,
    setIncognitoMode,
    getCurrentConversation,
    getConversationById,
    syncConversations,
    loadConversation,
    sendMessageToBackend,
    archiveConversation,
    getPendingApprovals,
    approvePendingTool,
    rejectPendingTool,
  } = useChatStore();

  const currentConversation = getCurrentConversation();
  const pendingApprovals = getPendingApprovals(currentConversationId);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [conversationMode, setConversationMode] = useState<'voice' | 'voice_with_eyes'>('voice');
  const [conversationEyesSource, setConversationEyesSource] = useState<'iphone' | 'meta_glasses'>('iphone');
  const [hasConversationStarted, setHasConversationStarted] = useState(false);
  const [isConversationEnding, setIsConversationEnding] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationSessionState>('idle');
  const [conversationReasonCode, setConversationReasonCode] =
    useState<ConversationReasonCode | undefined>(undefined);
  const [availableModels, setAvailableModels] = useState<RuntimeModelAvailability[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [cameraRuntime, setCameraRuntime] = useState<Record<string, unknown> | undefined>(undefined);
  const [voiceRuntime, setVoiceRuntime] = useState<Record<string, unknown> | undefined>(undefined);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [approvalActionId, setApprovalActionId] = useState<string | null>(null);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const awaitingAssistantSpeechRef = useRef(false);
  const lastSpokenAssistantMessageIdRef = useRef<string | null>(null);
  const endConversationInFlightRef = useRef(false);
  const starterKickoffPendingRef = useRef(false);
  const starterKickoffInFlightRef = useRef(false);
  const starterKickoffCompletedRef = useRef(false);
  const liveSessionIdRef = useRef(`mobile_live_${Date.now().toString(36)}`);
  const avRegistryRef = useRef(createMobileAvSourceRegistry());
  const cameraSourceIdRef = useRef<string>('');
  const voiceSourceIdRef = useRef<string>('');
  const metaGlassesSourceIdRef = useRef<string>('');
  const [visionSourceMode, setVisionSourceMode] = useState<VisionSourceMode>('iphone');
  const [metaBridgeStatus, setMetaBridgeStatus] = useState<MetaBridgeSnapshot>(
    createDefaultMetaBridgeSnapshot()
  );
  const metaBridgeConnectionState: MetaBridgeConnectionState = metaBridgeStatus.connectionState;
  const commandGatePolicy = useMemo(
    () =>
      createNodeCommandGatePolicy({
        allowlistCsv: ENV.AV_ALLOWED_NODE_COMMANDS,
        blockedPatternsCsv: ENV.AV_BLOCKED_NODE_COMMAND_PATTERNS,
      }),
    []
  );
  const avSourceScope = useMemo(() => {
    const organizationId = currentOrganization?.id?.trim() || undefined;
    const tenantId = organizationId || ENV.L4YERCAK3_ORGANIZATION_ID.trim() || undefined;
    return {
      organizationId,
      tenantId,
    };
  }, [currentOrganization?.id]);

  const messages = useMemo(
    () =>
      (currentConversation?.messages || []).filter((message) => {
        const hasContent = message.content.trim().length > 0;
        const hasAttachments = Array.isArray(message.attachments) && message.attachments.length > 0;
        return hasContent || hasAttachments || message.role === 'system';
      }),
    [currentConversation?.messages]
  );
  const latestUserMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'user')?.content || '',
    [messages]
  );
  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant')?.content || '',
    [messages]
  );
  const greeting = useMemo(
    () =>
      t(
        getGreetingKey() as
          | 'chat.greeting.morning'
          | 'chat.greeting.afternoon'
          | 'chat.greeting.evening'
      ),
    [t]
  );
  const welcomeText = useMemo(() => {
    const options = [t('chat.welcome.one'), t('chat.welcome.two'), t('chat.welcome.three')];
    return options[Math.floor(Math.random() * options.length)] || t('chat.welcome.one');
  }, [t]);
  const conversationStarterText = useMemo(() => {
    const firstName = user?.firstName?.trim();
    const greetingLine = firstName ? `${greeting}, ${firstName}.` : `${greeting}.`;
    return `${greetingLine} I am ${agentName}. I am live and listening. What would you like to work on first?`;
  }, [agentName, greeting, user?.firstName]);
  const isDark = resolvedTheme === 'dark';
  const chromeSurface = isDark ? 'rgba(20, 20, 21, 0.82)' : 'rgba(255, 255, 255, 0.82)';
  const chromeBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(23, 23, 24, 0.08)';
  const userBubble = isDark ? '#0b0c10' : '#f4f1eb';
  const assistantCard = isDark ? 'rgba(10, 10, 11, 0.28)' : 'rgba(255, 255, 255, 0.5)';
  const composerSurface = isDark ? 'rgba(18, 18, 20, 0.92)' : 'rgba(255, 255, 255, 0.9)';
  const menuIconColor = isDark ? '#f5efe4' : '#191713';

  useEffect(() => {
    const registry = avRegistryRef.current;
    const cameraSource = registry.registerSource({
      sourceClass: 'iphone_camera',
      providerId: 'ios_avfoundation',
      deviceLabel: 'iphone_primary_camera',
      transport: 'native',
      scope: avSourceScope,
      capabilities: { camera: true },
      metadata: { platform: Platform.OS },
    });
    const voiceSource = registry.registerSource({
      sourceClass: 'iphone_microphone',
      providerId: 'ios_avfoundation',
      deviceLabel: 'iphone_primary_mic',
      transport: 'native',
      scope: avSourceScope,
      capabilities: { microphone: true },
      metadata: { platform: Platform.OS },
    });
    const metaGlassesSource = registry.registerSource({
      sourceClass: 'meta_glasses',
      providerId: 'meta_dat_bridge',
      deviceLabel: 'meta_glasses_primary',
      transport: 'native_companion',
      scope: avSourceScope,
      capabilities: { camera: true, microphone: true },
      metadata: {
        platform: Platform.OS,
        integrationMode: 'companion_bridge',
        nativeModuleAvailable: metaBridge.isNativeAvailable(),
      },
    });
    cameraSourceIdRef.current = cameraSource.sourceId;
    voiceSourceIdRef.current = voiceSource.sourceId;
    metaGlassesSourceIdRef.current = metaGlassesSource.sourceId;
  }, [avSourceScope]);

  useEffect(() => {
    const activeDevice = metaBridgeStatus.activeDevice;
    if (!activeDevice) {
      return;
    }

    const updatedMetaSource = avRegistryRef.current.registerSource({
      sourceId: activeDevice.sourceId,
      sourceClass: 'meta_glasses',
      providerId: activeDevice.providerId,
      deviceLabel: activeDevice.deviceLabel,
      transport: 'native_companion',
      scope: avSourceScope,
      capabilities: { camera: true, microphone: true },
      metadata: {
        platform: Platform.OS,
        integrationMode: 'companion_bridge',
        bridgeDeviceId: activeDevice.deviceId,
      },
    });
    metaGlassesSourceIdRef.current = updatedMetaSource.sourceId;
  }, [avSourceScope, metaBridgeStatus.activeDevice]);

  const getActiveCameraSourceId = useCallback(() => {
    if (visionSourceMode === 'meta_glasses' && metaGlassesSourceIdRef.current) {
      return metaGlassesSourceIdRef.current;
    }
    return cameraSourceIdRef.current;
  }, [visionSourceMode]);

  const getActiveVoiceSourceId = useCallback(() => {
    if (visionSourceMode === 'meta_glasses' && metaGlassesSourceIdRef.current) {
      return metaGlassesSourceIdRef.current;
    }
    return voiceSourceIdRef.current;
  }, [visionSourceMode]);

  useEffect(() => {
    const unsubscribe = metaBridge.subscribe((snapshot) => {
      setMetaBridgeStatus(snapshot);
    });
    void (async () => {
      const status = await metaBridge.getStatus();
      setMetaBridgeStatus(status);
    })();
    return () => {
      unsubscribe();
    };
  }, []);

  const isMetaBridgeConnected = visionSourceMode !== 'meta_glasses'
    || metaBridgeConnectionState === 'connected';
  const metaVisionReadiness = useMemo(() => evaluateVisionSourceReadiness({
    sourceMode: 'meta_glasses',
    bridge: metaBridgeStatus,
  }), [metaBridgeStatus]);
  const isMetaVisionConfigured =
    metaBridge.isNativeAvailable()
    && metaBridgeStatus.datSdkAvailable
    && metaVisionReadiness.ready;

  const formatVisionReadinessMessage = useCallback((reasonCode: string): string => {
    const mappedReasonCode = mapVisionReadinessReasonToConversationReason(reasonCode);
    if (mappedReasonCode === 'dat_sdk_unavailable') {
      return 'Meta glasses require a DAT-enabled native build and are unavailable on this simulator/build. Switch to iPhone source.';
    }
    return `Meta glasses bridge unavailable (${reasonCode}). Connect bridge first or switch to iPhone source.`;
  }, []);

  const ensureVisionSourceReady = useCallback(() => {
    const readiness = evaluateVisionSourceReadiness({
      sourceMode: visionSourceMode,
      bridge: metaBridgeStatus,
    });
    if (readiness.ready) {
      return true;
    }
    setConversationReasonCode(mapVisionReadinessReasonToConversationReason(readiness.reasonCode));
    setPolicyError(formatVisionReadinessMessage(readiness.reasonCode));
    return false;
  }, [formatVisionReadinessMessage, metaBridgeStatus, visionSourceMode]);

  useEffect(() => {
    if (visionSourceMode !== 'meta_glasses') {
      return;
    }
    const readiness = evaluateVisionSourceReadiness({
      sourceMode: 'meta_glasses',
      bridge: metaBridgeStatus,
    });
    if (!readiness.ready) {
      setPolicyError(formatVisionReadinessMessage(readiness.reasonCode));
    }
  }, [formatVisionReadinessMessage, metaBridgeStatus, visionSourceMode]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void syncConversations();
  }, [isAuthenticated, syncConversations]);

  useEffect(() => {
    if (!isAuthenticated || !currentConversationId) {
      return;
    }
    void loadConversation(currentConversationId);
  }, [isAuthenticated, currentConversationId, loadConversation]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAvailableModels([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await l4yercak3Client.ai.getModels();
        if (!response.success || cancelled) {
          if (!cancelled) {
            setSelectedModel('');
          }
          return;
        }
        setAvailableModels(response.models);

        const selectedIsAvailable = response.models.some((model) => model.modelId === selectedModel);
        if (!selectedIsAvailable) {
          const fallbackModelId = response.models.find((model) => model.isDefault)?.modelId || response.models[0]?.modelId;
          if (fallbackModelId) {
            setSelectedModel(fallbackModelId);
          }
        }
      } catch (error) {
        console.warn('Failed to load model availability:', error);
        if (!cancelled) {
          // Defer to backend routing fallback when model availability cannot be resolved locally.
          setSelectedModel('');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, selectedModel, setSelectedModel]);

  const mobileVoiceRuntime = useMobileVoiceRuntime({
    conversationId: currentConversationId || undefined,
    liveSessionId: liveSessionIdRef.current,
    requestedProviderId: 'elevenlabs',
    requestedVoiceId: agentVoiceId || undefined,
    sourceMode: visionSourceMode,
    sourceRuntime: (() => {
      const activeVoiceSourceId = getActiveVoiceSourceId();
      const activeVoiceSource = activeVoiceSourceId
        ? avRegistryRef.current.getSource(activeVoiceSourceId)
        : null;
      const metaActiveDevice = metaBridgeStatus.activeDevice;
      return {
        sourceId:
          visionSourceMode === 'meta_glasses'
            ? (metaActiveDevice?.sourceId || activeVoiceSource?.sourceId)
            : (activeVoiceSource?.sourceId || undefined),
        sourceClass:
          visionSourceMode === 'meta_glasses'
            ? (metaActiveDevice?.sourceClass || 'meta_glasses')
            : activeVoiceSource?.sourceClass,
        providerId:
          visionSourceMode === 'meta_glasses'
            ? (metaActiveDevice?.providerId || activeVoiceSource?.providerId)
            : activeVoiceSource?.providerId,
        sourceScope: activeVoiceSource?.scope || avSourceScope,
      };
    })(),
    avObservability: {
      bridgeConnectionState: metaBridgeConnectionState,
      ingressSurface: 'operator_mobile_voice_mode',
    },
  });
  const mobileVideoRuntime = useMobileVideoRuntime({
    conversationId: currentConversationId || undefined,
    liveSessionId: liveSessionIdRef.current,
  });
  const stopVoicePlayback = mobileVoiceRuntime.stopPlayback;
  const closeVoiceSession = mobileVoiceRuntime.closeSession;
  const suspendVoiceSession = mobileVoiceRuntime.suspendSession;
  const openVoiceSession = mobileVoiceRuntime.openSession;
  const getActiveVoiceSession = mobileVoiceRuntime.getActiveSession;
  const closeVoiceSessionRef = useRef(closeVoiceSession);
  const stopVoicePlaybackRef = useRef(stopVoicePlayback);
  const isVoiceModeOpenRef = useRef(isVoiceModeOpen);
  const hasConversationStartedRef = useRef(hasConversationStarted);
  const isConversationEndingRef = useRef(isConversationEnding);
  const currentConversationIdRef = useRef<string | null>(currentConversationId);
  const closedModeSuspendIssuedRef = useRef(false);
  const shouldSpeakReplies = autoSpeakReplies || isVoiceModeOpen;
  const liveHudStatusLabel = t(`chat.conversation.state.${conversationState}` as TranslationKey);
  const lastConversationEventRef = useRef<string>('');
  const logVoiceLifecycle = useCallback((event: string, details?: Record<string, unknown>) => {
    console.info('[VoiceLifecycle]', {
      event,
      timestampMs: Date.now(),
      liveSessionId: liveSessionIdRef.current,
      conversationId: currentConversationIdRef.current || undefined,
      isVoiceModeOpen: isVoiceModeOpenRef.current,
      hasConversationStarted: hasConversationStartedRef.current,
      isConversationEnding: isConversationEndingRef.current,
      ...(details || {}),
    });
  }, []);
  const emitConversationEvent = useCallback((
    eventType: ConversationEventType,
    eventPayload?: Record<string, unknown>,
    reasonCodeOverride?: ConversationReasonCode
  ) => {
    const envelope = {
      contractVersion: CONVERSATION_CONTRACT_VERSION,
      eventType,
      timestampMs: Date.now(),
      liveSessionId: liveSessionIdRef.current,
      conversationId: currentConversationId || undefined,
      state: conversationState,
      reasonCode: reasonCodeOverride || conversationReasonCode,
      payload: eventPayload,
    };
    const eventKey = `${envelope.eventType}:${envelope.state}:${envelope.reasonCode || 'none'}:${visionSourceMode}`;
    if (lastConversationEventRef.current === eventKey && !envelope.payload) {
      return;
    }
    lastConversationEventRef.current = eventKey;
    console.info('[conversation_event]', envelope);
  }, [conversationReasonCode, conversationState, currentConversationId, visionSourceMode]);

  useEffect(() => {
    const transportMode =
      (mobileVoiceRuntime.transportRuntime as { mode?: string })?.mode ?? 'chunked_fallback';
    const realtimeConnected = Boolean(
      (mobileVoiceRuntime.transportRuntime as { realtimeConnected?: boolean })?.realtimeConnected
    );
    const requiresRealtimeTransport = transportMode === 'websocket' || transportMode === 'webrtc';
    const transportReady = requiresRealtimeTransport ? realtimeConnected : true;
    const nextState: ConversationSessionState =
      !isVoiceModeOpen
        ? 'idle'
        : isConversationEnding
          ? 'ending'
          : !hasConversationStarted
            ? 'idle'
            : policyError || mobileVoiceRuntime.lastSessionErrorReason
              ? 'error'
              : isLoading || isTranscribing || mobileVoiceRuntime.isSessionOpening
                ? 'connecting'
                : transportReady
                  ? 'live'
                  : 'reconnecting';

    let nextReasonCode: ConversationReasonCode | undefined = undefined;
    if (nextState === 'error') {
      nextReasonCode = inferConversationReasonCode(policyError || mobileVoiceRuntime.lastSessionErrorReason);
    } else if (nextState === 'reconnecting') {
      nextReasonCode = 'transport_failed';
    }

    setConversationState((current) => (current === nextState ? current : nextState));
    setConversationReasonCode((current) => (current === nextReasonCode ? current : nextReasonCode));
  }, [
    hasConversationStarted,
    isConversationEnding,
    isLoading,
    isTranscribing,
    isVoiceModeOpen,
    mobileVoiceRuntime.isSessionOpening,
    mobileVoiceRuntime.lastSessionErrorReason,
    mobileVoiceRuntime.transportRuntime,
    policyError,
  ]);

  useEffect(() => {
    if (conversationState === 'idle') {
      return;
    }
    if (conversationState === 'connecting') {
      emitConversationEvent('conversation_connecting');
      return;
    }
    if (conversationState === 'live') {
      emitConversationEvent('conversation_live');
      return;
    }
    if (conversationState === 'reconnecting') {
      emitConversationEvent('conversation_reconnecting');
      return;
    }
    if (conversationState === 'ending') {
      emitConversationEvent('conversation_ending');
      return;
    }
    if (conversationState === 'ended') {
      emitConversationEvent('conversation_ended');
      return;
    }
    emitConversationEvent('conversation_error');
    if (conversationReasonCode === 'permission_denied_mic' || conversationReasonCode === 'permission_denied_camera') {
      emitConversationEvent('conversation_permission_denied');
    }
  }, [conversationReasonCode, conversationState, emitConversationEvent]);

  useEffect(() => {
    if (
      !isVoiceModeOpen
      || !hasConversationStarted
      || conversationMode !== 'voice_with_eyes'
    ) {
      return;
    }
    const readiness = evaluateVisionSourceReadiness({
      sourceMode: visionSourceMode,
      bridge: metaBridgeStatus,
    });
    if (readiness.ready) {
      return;
    }
    const reasonCode = mapVisionReadinessReasonToConversationReason(readiness.reasonCode);
    setConversationMode('voice');
    setVisionSourceMode('iphone');
    setConversationEyesSource('iphone');
    setConversationReasonCode(reasonCode);
    setPolicyError(formatVisionReadinessMessage(readiness.reasonCode));
    emitConversationEvent(
      'conversation_degraded_to_voice',
      {
        fromSourceMode: visionSourceMode,
        readinessReasonCode: readiness.reasonCode,
      },
      reasonCode
    );
  }, [
    conversationMode,
    emitConversationEvent,
    formatVisionReadinessMessage,
    hasConversationStarted,
    isVoiceModeOpen,
    metaBridgeStatus,
    visionSourceMode,
  ]);
  useEffect(() => {
    closeVoiceSessionRef.current = closeVoiceSession;
    stopVoicePlaybackRef.current = stopVoicePlayback;
    isVoiceModeOpenRef.current = isVoiceModeOpen;
    hasConversationStartedRef.current = hasConversationStarted;
    isConversationEndingRef.current = isConversationEnding;
    currentConversationIdRef.current = currentConversationId;
  }, [
    closeVoiceSession,
    currentConversationId,
    hasConversationStarted,
    isConversationEnding,
    isVoiceModeOpen,
    stopVoicePlayback,
  ]);

  useEffect(() => {
    return () => {
      logVoiceLifecycle('screen_unmount_cleanup');
      void stopVoicePlaybackRef.current();
      void closeVoiceSessionRef.current('screen_unmount');
      setIsAssistantSpeaking(false);
    };
  }, [logVoiceLifecycle]);

  useEffect(() => {
    return () => {
      closedModeSuspendIssuedRef.current = false;
    };
  }, []);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Animation for typing indicator
  const opacity1 = useSharedValue(0.3);
  const opacity2 = useSharedValue(0.3);
  const opacity3 = useSharedValue(0.3);

  useEffect(() => {
    if (isLoading) {
      opacity1.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
      setTimeout(() => {
        opacity2.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
      }, 150);
      setTimeout(() => {
        opacity3.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
      }, 300);
    } else {
      opacity1.value = withTiming(0.3);
      opacity2.value = withTiming(0.3);
      opacity3.value = withTiming(0.3);
    }
  }, [isLoading, opacity1, opacity2, opacity3]);

  const animatedStyle1 = useAnimatedStyle(() => ({ opacity: opacity1.value }));
  const animatedStyle2 = useAnimatedStyle(() => ({ opacity: opacity2.value }));
  const animatedStyle3 = useAnimatedStyle(() => ({ opacity: opacity3.value }));

  // Auto-focus input when screen comes into focus (e.g., after login)
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        return;
      }

      void syncConversations();
      if (currentConversationId) {
        void loadConversation(currentConversationId);
      }

      // Longer delay to ensure screen transition is complete
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 500);

      return () => clearTimeout(timer);
    }, [isAuthenticated, currentConversationId, loadConversation, syncConversations])
  );

  useEffect(() => {
    const lastAssistantMessage =
      [...messages].reverse().find((message) => message.role === 'assistant') || null;
    lastSpokenAssistantMessageIdRef.current = lastAssistantMessage?.id || null;
    console.info('[VoiceReply] conversation_context_updated', {
      conversationId: currentConversationId || undefined,
      lastAssistantMessageId: lastAssistantMessage?.id || undefined,
      awaitingAssistantSpeech: awaitingAssistantSpeechRef.current,
    });
  }, [currentConversationId]);

  useEffect(() => {
    if (!shouldSpeakReplies || !awaitingAssistantSpeechRef.current) {
      return;
    }
    const lastAssistantMessage =
      [...messages].reverse().find((message) => message.role === 'assistant') || null;
    if (!lastAssistantMessage || !lastAssistantMessage.content.trim()) {
      return;
    }
    if (lastSpokenAssistantMessageIdRef.current === lastAssistantMessage.id) {
      return;
    }

    console.info('[VoiceReply] autospeak_from_messages', {
      messageId: lastAssistantMessage.id,
      awaitingAssistantSpeech: awaitingAssistantSpeechRef.current,
    });
    setIsAssistantSpeaking(true);
    void (async () => {
      try {
        await mobileVoiceRuntime.synthesizeAndPlay(lastAssistantMessage.content);
      } catch {
        Speech.stop();
        Speech.speak(lastAssistantMessage.content);
      } finally {
        setIsAssistantSpeaking(false);
        lastSpokenAssistantMessageIdRef.current = lastAssistantMessage.id;
      }
    })();
    awaitingAssistantSpeechRef.current = false;
  }, [agentVoiceId, messages, mobileVoiceRuntime, shouldSpeakReplies]);

  const runCommandGate = useCallback(
    (command: string, sourceId?: string) => {
      if (!ensureVisionSourceReady()) {
        return false;
      }
      const decision = evaluateNodeCommandGate({
        command,
        sourceId,
        expectedScope: ENV.AV_REQUIRE_REGISTERED_SOURCE_SCOPE ? avSourceScope : undefined,
        sourceRegistry: avRegistryRef.current,
        policy: commandGatePolicy,
      });
      if (!decision.allowed) {
        setPolicyError(t('chat.policyBlocked', { command, reason: decision.reason }));
        return false;
      }
      setPolicyError(null);
      return true;
    },
    [avSourceScope, commandGatePolicy, ensureVisionSourceReady, t]
  );

  const buildSourceAttestation = useCallback((sourceId: string | undefined) => {
    if (!sourceId) {
      return undefined;
    }
    const source = avRegistryRef.current.getSource(sourceId);
    if (!source) {
      return undefined;
    }
    return buildSignedMobileSourceAttestation({
      secret: ENV.AV_ATTESTATION_SECRET,
      liveSessionId: liveSessionIdRef.current,
      sourceId: source.sourceId,
      sourceClass: source.sourceClass,
      providerId: source.providerId,
    });
  }, []);

  const resolveImageAttachmentDimensions = useCallback(async (
    attachment: { type: 'image' | 'file'; uri: string; width?: number; height?: number }
  ) => {
    if (attachment.type !== 'image') {
      return undefined;
    }
    if (
      typeof attachment.width === 'number'
      && attachment.width > 0
      && typeof attachment.height === 'number'
      && attachment.height > 0
    ) {
      return {
        width: Math.floor(attachment.width),
        height: Math.floor(attachment.height),
      };
    }
    return await new Promise<{ width: number; height: number } | undefined>((resolve) => {
      Image.getSize(
        attachment.uri,
        (width, height) => {
          if (width > 0 && height > 0) {
            resolve({
              width: Math.floor(width),
              height: Math.floor(height),
            });
            return;
          }
          resolve(undefined);
        },
        () => resolve(undefined),
      );
    });
  }, []);

  const resolveAttachmentPayloadBase64 = useCallback(async (
    attachment: { type: 'image' | 'file'; uri: string }
  ) => {
    if (attachment.type !== 'image') {
      return undefined;
    }
    try {
      const response = await fetch(attachment.uri);
      const blob = await response.blob();
      return await new Promise<string | undefined>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = typeof reader.result === 'string' ? reader.result : '';
          const payload = result.includes(',') ? result.split(',', 2)[1] || '' : result;
          resolve(payload.trim() || undefined);
        };
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  }, []);

  const sendTextMessage = useCallback(async (
    messageText: string,
    options?: { restoreInputOnFail?: boolean; bypassCommandGate?: boolean }
  ) => {
    if (!messageText.trim() || isLoading) return false;

    const isExecuteIntent = /\b(confirm|book it|proceed|schedule it|go ahead|yes,? book)\b/i.test(
      messageText
    );
    const conciergeCommand = isExecuteIntent
      ? 'execute_meeting_concierge'
      : 'preview_meeting_concierge';
    const activeCameraSourceId = getActiveCameraSourceId();
    const activeVoiceSourceId = getActiveVoiceSourceId();
    if (!options?.bypassCommandGate) {
      if (
        !runCommandGate('assemble_concierge_payload', activeCameraSourceId) ||
        !runCommandGate(conciergeCommand, activeCameraSourceId)
      ) {
        return false;
      }
    }

    setIsLoading(true);
    const cameraSource = avRegistryRef.current.getSource(activeCameraSourceId);
    const voiceSource = avRegistryRef.current.getSource(activeVoiceSourceId);
    const bridgeDiagnostics = buildMetaBridgeDiagnostics(metaBridgeStatus);
    const metaActiveDevice = metaBridgeStatus.activeDevice;
    const activeVoiceSession = mobileVoiceRuntime.getActiveSession();
    const correlatedSession = {
      liveSessionId: liveSessionIdRef.current,
      interviewSessionId: activeVoiceSession?.interviewSessionId,
      voiceSessionId: activeVoiceSession?.voiceSessionId,
    };
    const sourceScope = cameraSource?.scope || avSourceScope;

    const outboundCameraRuntime: Record<string, unknown> = {
      sourceId:
        visionSourceMode === 'meta_glasses'
          ? (metaActiveDevice?.sourceId || activeCameraSourceId || undefined)
          : (activeCameraSourceId || undefined),
      sourceClass:
        visionSourceMode === 'meta_glasses'
          ? (metaActiveDevice?.sourceClass || 'meta_glasses')
          : cameraSource?.sourceClass,
      providerId:
        visionSourceMode === 'meta_glasses'
          ? (metaActiveDevice?.providerId || cameraSource?.providerId)
          : cameraSource?.providerId,
      sourceMode: visionSourceMode,
      bridgeConnectionState: metaBridgeConnectionState,
      sourceScope,
      liveSessionId: liveSessionIdRef.current,
      correlatedSession,
      sessionState: pendingAttachments.length > 0 ? 'capturing' : 'idle',
      frameCaptureCount: pendingAttachments.filter((attachment) => attachment.type === 'image').length,
      attachmentCount: pendingAttachments.length,
      lastFrameCapturedAt: Date.now(),
      sourceHealth: {
        status: policyError ? 'policy_restricted' : 'healthy',
        policyRestricted: Boolean(policyError),
      },
      commandGatePolicy: 'allowlist',
      commandAllowlistCount: commandGatePolicy.allowlist.size,
      sourceAttestation: buildSourceAttestation(
        visionSourceMode === 'meta_glasses'
          ? (metaActiveDevice?.sourceId || activeCameraSourceId)
          : activeCameraSourceId
      ),
      cameraSignals:
        pendingAttachments.length > 0
          ? pendingAttachments.map((attachment) => attachment.name || attachment.uri).slice(0, 8)
          : undefined,
      ...(visionSourceMode === 'meta_glasses'
        ? {
            bridgeDiagnostics,
            deviceId: metaActiveDevice?.deviceId,
            deviceLabel: metaActiveDevice?.deviceLabel,
            frameCadenceFps: metaBridgeStatus.frameIngress.fps,
            frameCaptureCount: metaBridgeStatus.frameIngress.totalFrames,
            droppedFrames: metaBridgeStatus.frameIngress.droppedFrames,
            lastFrameCapturedAt:
              metaBridgeStatus.frameIngress.lastFrameTs || Date.now(),
          }
        : {}),
      ...(cameraRuntime || {}),
    };
    const outboundVoiceRuntime: Record<string, unknown> = {
      sourceId:
        visionSourceMode === 'meta_glasses'
          ? (metaActiveDevice?.sourceId || activeVoiceSourceId || undefined)
          : (activeVoiceSourceId || undefined),
      sourceClass:
        visionSourceMode === 'meta_glasses'
          ? (metaActiveDevice?.sourceClass || 'meta_glasses')
          : voiceSource?.sourceClass,
      providerId:
        visionSourceMode === 'meta_glasses'
          ? (metaActiveDevice?.providerId || voiceSource?.providerId)
          : voiceSource?.providerId,
      sourceMode: visionSourceMode,
      bridgeConnectionState: metaBridgeConnectionState,
      sourceScope: voiceSource?.scope || sourceScope,
      liveSessionId: liveSessionIdRef.current,
      correlatedSession,
      sessionState: voiceRuntime ? 'transcribed' : 'idle',
      sourceAttestation: buildSourceAttestation(
        visionSourceMode === 'meta_glasses'
          ? (metaActiveDevice?.sourceId || activeVoiceSourceId)
          : activeVoiceSourceId
      ),
      ...(visionSourceMode === 'meta_glasses'
        ? {
            bridgeDiagnostics,
            sampleRate: metaBridgeStatus.audioIngress.sampleRate,
            packetCount: metaBridgeStatus.audioIngress.packetCount,
            lastPacketTs: metaBridgeStatus.audioIngress.lastPacketTs,
            deviceId: metaActiveDevice?.deviceId,
            deviceLabel: metaActiveDevice?.deviceLabel,
          }
        : {}),
      ...(voiceRuntime || {}),
    };
    const commandPolicy = {
      ...buildMobileNodeCommandPolicyContract({
        attemptedCommands: ['assemble_concierge_payload', conciergeCommand],
        sourceId: activeCameraSourceId || undefined,
        sourceClass: cameraSource?.sourceClass,
      }),
      sourceScope,
    };
    const outboundTransportRuntime: Record<string, unknown> = {
      transport: mobileVoiceRuntime.transportSelection.effectiveMode,
      requestedTransport: mobileVoiceRuntime.transportSelection.requestedMode,
      sourceMode: visionSourceMode,
      bridgeConnectionState: metaBridgeConnectionState,
      liveSessionId: liveSessionIdRef.current,
      correlatedSession,
      sourceScope,
      sourceRuntime: {
        cameraSourceId: activeCameraSourceId || undefined,
        voiceSourceId: activeVoiceSourceId || undefined,
      },
      voiceTransportRuntime: mobileVoiceRuntime.transportRuntime,
      videoTransportRuntime: mobileVideoRuntime.transportRuntime,
      observability: {
        liveSessionId: liveSessionIdRef.current,
        fallbackReason:
          mobileVoiceRuntime.transportSelection.fallbackReason ||
          (policyError ? 'command_policy_blocked' : undefined),
        diagnostics: {
          attachmentCount: pendingAttachments.length,
          imageAttachmentCount: pendingAttachments.filter((attachment) => attachment.type === 'image').length,
          policyError: policyError || undefined,
          videoSessionId: mobileVideoRuntime.runtimeSnapshot.videoSessionId,
          videoPacketSequence: mobileVideoRuntime.runtimeSnapshot.packetSequence,
          videoAcceptedFrames: mobileVideoRuntime.runtimeSnapshot.acceptedFrames,
          videoDroppedFrames: mobileVideoRuntime.runtimeSnapshot.droppedFrames,
          videoFallbackReason: mobileVideoRuntime.runtimeSnapshot.fallbackReason,
          ...(visionSourceMode === 'meta_glasses'
            ? { bridgeDiagnostics }
            : {}),
        },
      },
    };
    const outboundAvObservability: Record<string, unknown> = {
      ingressSurface: 'operator_mobile_chat',
      liveSessionId: liveSessionIdRef.current,
      sourceMode: visionSourceMode,
      bridgeConnectionState: metaBridgeConnectionState,
      cameraSourceId: activeCameraSourceId || undefined,
      voiceSourceId: activeVoiceSourceId || undefined,
      sourceScope,
      correlatedSession,
      attachmentCount: pendingAttachments.length,
      imageAttachmentCount: pendingAttachments.filter((attachment) => attachment.type === 'image').length,
      fallbackReason: policyError ? 'command_policy_blocked' : undefined,
      transport: mobileVoiceRuntime.transportSelection.effectiveMode,
      requestedTransport: mobileVoiceRuntime.transportSelection.requestedMode,
      transportFallbackReason: mobileVoiceRuntime.transportSelection.fallbackReason,
      videoRuntime: mobileVideoRuntime.transportRuntime,
      ...(visionSourceMode === 'meta_glasses'
        ? { bridgeDiagnostics }
        : {}),
    };
    const outboundGeminiLive: Record<string, unknown> = buildGeminiLiveMetadata({
      sourceMode: visionSourceMode,
      bridge: metaBridgeStatus,
    });

    const sendResult = await sendMessageToBackend({
      message: messageText,
      liveSessionId: liveSessionIdRef.current,
      cameraRuntime: outboundCameraRuntime,
      voiceRuntime: outboundVoiceRuntime,
      attachments: pendingAttachments,
      commandPolicy: commandPolicy as unknown as Record<string, unknown>,
      transportRuntime: outboundTransportRuntime,
      avObservability: outboundAvObservability,
      geminiLive: outboundGeminiLive,
    });

    if (!sendResult.success) {
      if (options?.restoreInputOnFail !== false) {
        setInputText(messageText);
      }
      awaitingAssistantSpeechRef.current = false;
      const alertMessage = sendResult.error || t('chat.sendFailedBody');
      const creditActionUrl = resolveCreditActionUrl(sendResult.actionUrl);
      if (creditActionUrl) {
        Alert.alert(
          t('chat.sendFailedTitle'),
          alertMessage,
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: sendResult.actionLabel || 'Buy Credits',
              onPress: () => {
                void Linking.openURL(creditActionUrl).catch((error) => {
                  console.warn('Failed to open credit purchase URL:', error);
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(t('chat.sendFailedTitle'), alertMessage);
      }
      setIsLoading(false);
      return false;
    }

    awaitingAssistantSpeechRef.current = shouldSpeakReplies;
    setPendingAttachments([]);
    setCameraRuntime(undefined);
    setIsLoading(false);
    return true;
  }, [
    isLoading,
    pendingAttachments,
    cameraRuntime,
    voiceRuntime,
    sendMessageToBackend,
    runCommandGate,
    policyError,
    commandGatePolicy.allowlist.size,
    avSourceScope,
    buildSourceAttestation,
    getActiveCameraSourceId,
    getActiveVoiceSourceId,
    visionSourceMode,
    metaBridgeConnectionState,
    metaBridgeStatus,
    shouldSpeakReplies,
    mobileVoiceRuntime,
    mobileVideoRuntime,
    t,
  ]);

  const handleSend = useCallback(async () => {
    const messageText = inputText.trim();
    if (!messageText || isLoading) return;
    setInputText('');
    await sendTextMessage(messageText);
  }, [inputText, isLoading, sendTextMessage]);

  const handleStartToolBoundaryIntake = useCallback(async () => {
    const kickoff = buildMobileToolBoundaryIntakeKickoff({
      policyError,
      lastUserMessage: latestUserMessage || inputText,
    });
    if (!kickoff || isLoading) {
      return;
    }

    const sent = await sendTextMessage(kickoff, {
      restoreInputOnFail: false,
      bypassCommandGate: true,
    });
    if (sent) {
      setPolicyError(null);
      setInputText('');
    }
  }, [inputText, isLoading, latestUserMessage, policyError, sendTextMessage]);

  const handleNewChat = () => {
    void closeVoiceSession('new_chat');
    const nextLiveSessionId = `mobile_live_${Date.now().toString(36)}`;
    liveSessionIdRef.current = nextLiveSessionId;
    mobileVideoRuntime.resetSession(nextLiveSessionId);
    setPendingAttachments([]);
    setCameraRuntime(undefined);
    setVoiceRuntime(undefined);
    if (isIncognitoMode) {
      setCurrentConversation(null);
    } else {
      void (async () => {
        try {
          if (l4yercak3Client.hasAuth()) {
            const created = await l4yercak3Client.ai.createConversation();
            if (created.success && created.conversationId) {
              await loadConversation(created.conversationId, { allowUnknownId: true });
              return;
            }
          }
        } catch (error) {
          console.warn('Failed to create backend conversation, falling back to local draft:', error);
        }
        createConversation();
      })();
    }
    setIsRightDrawerOpen(false);
  };

  const handleOpenSettings = () => {
    setIsRightDrawerOpen(false);
    setTimeout(() => {
      router.push('/(tabs)/settings');
    }, 120);
  };

  const handleOpenVoiceMode = () => {
    setIsRightDrawerOpen(false);
    setTimeout(() => {
      logVoiceLifecycle('voice_mode_open');
      setHasConversationStarted(false);
      setIsVoiceModeOpen(true);
    }, 120);
  };

  const handleStartConversation = useCallback(() => {
    emitConversationEvent('conversation_start_requested');
    if (conversationMode === 'voice_with_eyes') {
      const preferredSourceMode: VisionSourceMode =
        conversationEyesSource === 'meta_glasses'
          ? 'meta_glasses'
          : (metaVisionReadiness.ready ? 'meta_glasses' : 'iphone');
      const negotiation = negotiateVisionSource({
        preferredSourceMode,
        bridge: metaBridgeStatus,
      });
      if (!negotiation.ready || !negotiation.selectedSourceMode) {
        const reasonCode = negotiation.conversationReasonCode || 'session_open_failed';
        setConversationReasonCode(reasonCode);
        setConversationState('error');
        setPolicyError(formatVisionReadinessMessage(negotiation.readinessReasonCode));
        emitConversationEvent(
          'conversation_error',
          {
            sourceMode: preferredSourceMode,
            readinessReasonCode: negotiation.readinessReasonCode,
          },
          reasonCode
        );
        return;
      }

      setVisionSourceMode(negotiation.selectedSourceMode);
      if (negotiation.selectedSourceMode !== conversationEyesSource) {
        setConversationEyesSource(negotiation.selectedSourceMode);
        emitConversationEvent('conversation_eyes_source_changed', {
          from: conversationEyesSource,
          to: negotiation.selectedSourceMode,
        });
      }
    } else {
      setVisionSourceMode('iphone');
    }
    setIsConversationEnding(false);
    setPolicyError(null);
    setConversationReasonCode(undefined);
    starterKickoffPendingRef.current = true;
    starterKickoffInFlightRef.current = false;
    starterKickoffCompletedRef.current = false;
    setHasConversationStarted(true);
  }, [
    conversationEyesSource,
    conversationMode,
    emitConversationEvent,
    formatVisionReadinessMessage,
    metaBridgeStatus,
    metaVisionReadiness.ready,
  ]);

  const handleEndConversation = useCallback((reason: string = 'explicit_stop') => {
    if (endConversationInFlightRef.current) {
      logVoiceLifecycle('conversation_end_ignored_duplicate', { reason });
      return;
    }
    endConversationInFlightRef.current = true;
    const activeConversationId =
      getActiveVoiceSession()?.conversationId || currentConversationId || undefined;
    logVoiceLifecycle('conversation_end_requested', {
      reason,
      activeConversationId,
    });
    setIsConversationEnding(true);
    setHasConversationStarted(false);
    void (async () => {
      try {
        await closeVoiceSession(`conversation_end:${reason}`);
        await stopVoicePlayback();
        setIsAssistantSpeaking(false);
        if (activeConversationId) {
          if (activeConversationId !== currentConversationId) {
            setCurrentConversation(activeConversationId);
          }
          await loadConversation(activeConversationId, { allowUnknownId: true });
        } else {
          await syncConversations();
        }
        setConversationState('ended');
        setConversationReasonCode(undefined);
        logVoiceLifecycle('conversation_end_completed', { reason, activeConversationId });
      } catch (error) {
        const reasonText = error instanceof Error ? error.message : 'conversation_end_failed';
        setConversationReasonCode(inferConversationReasonCode(reasonText));
        setConversationState('error');
        console.warn('[VoiceLifecycle] conversation_end_failed', { reason, reasonText });
      } finally {
        starterKickoffPendingRef.current = false;
        starterKickoffInFlightRef.current = false;
        starterKickoffCompletedRef.current = true;
        endConversationInFlightRef.current = false;
        setIsConversationEnding(false);
      }
    })();
  }, [
    closeVoiceSession,
    currentConversationId,
    getActiveVoiceSession,
    logVoiceLifecycle,
    loadConversation,
    setCurrentConversation,
    stopVoicePlayback,
    syncConversations,
  ]);

  useEffect(() => {
    if (!isVoiceModeOpen) {
      if (closedModeSuspendIssuedRef.current) {
        return;
      }
      closedModeSuspendIssuedRef.current = true;
      logVoiceLifecycle('voice_session_suspend_trigger', {
        reason: 'voice_mode_closed',
      });
      void suspendVoiceSession();
      return;
    }
    closedModeSuspendIssuedRef.current = false;
    if (!hasConversationStarted) {
      logVoiceLifecycle('voice_session_suspend_skipped', {
        reason: 'conversation_not_started_but_modal_open',
      });
      return;
    }
    const activeSession = getActiveVoiceSession();
    if (
      activeSession?.voiceSessionId
      && (!currentConversationId || activeSession.conversationId === currentConversationId)
    ) {
      return;
    }
    void (async () => {
      try {
        logVoiceLifecycle('voice_session_open_start');
        const opened = await openVoiceSession();
        logVoiceLifecycle('voice_session_open_ok', {
          openedConversationId: opened.conversationId,
          voiceSessionId: opened.voiceSessionId,
        });
        if (opened.conversationId && opened.conversationId !== currentConversationId) {
          setCurrentConversation(opened.conversationId);
        }
      } catch (error) {
        console.warn('Voice session open failed:', error);
        const reasonText = error instanceof Error ? error.message : 'voice_session_open_failed';
        const retryAfterMatch = reasonText.match(/voice_session_open_rate_limited:(\d+)/i);
        const retryAfterMs = retryAfterMatch ? Number(retryAfterMatch[1]) : 0;
        if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
          setPolicyError(
            `Voice session is cooling down. Retry in ${Math.max(1, Math.ceil(retryAfterMs / 1000))}s.`
          );
        }
        logVoiceLifecycle('voice_session_open_failed', {
          reasonText,
          retryAfterMs,
        });
        setConversationReasonCode(inferConversationReasonCode(reasonText));
        setConversationState('error');
        setHasConversationStarted(false);
      }
    })();
  }, [
    currentConversationId,
    getActiveVoiceSession,
    hasConversationStarted,
    isVoiceModeOpen,
    logVoiceLifecycle,
    openVoiceSession,
    setCurrentConversation,
    suspendVoiceSession,
  ]);

  useEffect(() => {
    if (
      !isVoiceModeOpen
      || !hasConversationStarted
      || isConversationEnding
      || !shouldSpeakReplies
      || !starterKickoffPendingRef.current
      || starterKickoffInFlightRef.current
      || starterKickoffCompletedRef.current
    ) {
      return;
    }
    const activeSession = getActiveVoiceSession();
    if (!activeSession?.voiceSessionId) {
      return;
    }
    starterKickoffInFlightRef.current = true;
    void (async () => {
      console.info('[VoiceReply] starter_kickoff_begin', {
        conversationId: activeSession.conversationId,
        voiceSessionId: activeSession.voiceSessionId,
      });
      setIsAssistantSpeaking(true);
      try {
        await mobileVoiceRuntime.synthesizeAndPlay(conversationStarterText);
        console.info('[VoiceReply] starter_kickoff_spoken');
      } catch (error) {
        console.warn('[VoiceReply] starter_kickoff_fallback', {
          error: error instanceof Error ? error.message : String(error),
        });
        Speech.stop();
        Speech.speak(conversationStarterText);
      } finally {
        setIsAssistantSpeaking(false);
        starterKickoffInFlightRef.current = false;
        starterKickoffPendingRef.current = false;
        starterKickoffCompletedRef.current = true;
      }
    })();
  }, [
    conversationStarterText,
    getActiveVoiceSession,
    hasConversationStarted,
    isConversationEnding,
    isVoiceModeOpen,
    mobileVoiceRuntime,
    shouldSpeakReplies,
  ]);

  useEffect(() => {
    if (isVoiceModeOpen && hasConversationStarted) {
      logVoiceLifecycle('voice_session_close_for_switch_skipped', {
        reason: 'active_voice_mode',
      });
      return;
    }
    const activeSession = getActiveVoiceSession();
    if (shouldCloseVoiceSessionForConversationSwitch({
      activeConversationId: activeSession?.conversationId,
      currentConversationId: currentConversationId || undefined,
    })) {
      logVoiceLifecycle('voice_session_close_for_switch', {
        activeConversationId: activeSession?.conversationId,
        currentConversationId: currentConversationId || undefined,
      });
      void closeVoiceSession('conversation_switched');
    }
  }, [
    closeVoiceSession,
    currentConversationId,
    getActiveVoiceSession,
    hasConversationStarted,
    isVoiceModeOpen,
    logVoiceLifecycle,
  ]);

  const handleAttachment = async (
    attachment: {
      type: 'image' | 'file';
      uri: string;
      name?: string;
      mimeType?: string;
      width?: number;
      height?: number;
    }
  ) => {
    if (!ensureVisionSourceReady()) {
      return;
    }
    const activeCameraSourceId = getActiveCameraSourceId();
    const activeCameraSource = activeCameraSourceId
      ? avRegistryRef.current.getSource(activeCameraSourceId)
      : null;
    if (!runCommandGate('capture_frame', activeCameraSourceId)) {
      return;
    }

    const imageDimensions = await resolveImageAttachmentDimensions(attachment);
    const framePayloadBase64 = await resolveAttachmentPayloadBase64(attachment);
    const nextAttachment: Attachment = {
      type: attachment.type,
      uri: attachment.uri,
      name: attachment.name,
      mimeType: attachment.mimeType,
      sourceId: activeCameraSourceId || undefined,
      width: imageDimensions?.width,
      height: imageDimensions?.height,
    };
    if (visionSourceMode === 'meta_glasses') {
      const status = await metaBridge.recordFrameIngress({
        timestampMs: Date.now(),
        droppedFrames: 0,
      });
      setMetaBridgeStatus(status);
    }
    setPendingAttachments((prev) => [...prev, nextAttachment].slice(-8));
    setCameraRuntime((prev) => {
      const frameCaptureCount =
        typeof prev?.frameCaptureCount === 'number'
          ? (prev.frameCaptureCount as number) + 1
          : 1;
      return {
        ...(prev || {}),
        sourceId: activeCameraSourceId || undefined,
        videoSessionId: mobileVideoRuntime.runtimeSnapshot.videoSessionId,
        sourceMode: visionSourceMode,
        bridgeConnectionState: metaBridgeConnectionState,
        sourceScope: avSourceScope,
        liveSessionId: liveSessionIdRef.current,
        sessionState: 'capturing',
        frameCaptureCount,
        lastFrameCapturedAt: Date.now(),
        captureMode: 'camera_attachment',
        resolution: imageDimensions,
        ...(visionSourceMode === 'meta_glasses'
          ? {
              bridgeDiagnostics: buildMetaBridgeDiagnostics(metaBridgeStatus),
              frameCadenceFps: metaBridgeStatus.frameIngress.fps,
              droppedFrames: metaBridgeStatus.frameIngress.droppedFrames,
            }
          : {}),
      };
    });
    if (attachment.type === 'image' && activeCameraSourceId) {
      const voiceTransportRuntime = mobileVoiceRuntime.transportRuntime as {
        realtimeConnected?: boolean;
      };
      void mobileVideoRuntime.ingestCapturedFrame({
        sourceId: activeCameraSourceId,
        sourceProviderId: activeCameraSource?.providerId || 'ios_avfoundation',
        sourceMode: visionSourceMode,
        voiceTransportSelection: mobileVoiceRuntime.transportSelection,
        voiceRealtimeConnected: Boolean(voiceTransportRuntime.realtimeConnected),
        interviewSessionId: mobileVoiceRuntime.getActiveSession()?.interviewSessionId,
        mimeType: attachment.mimeType,
        framePayloadBase64,
        width: imageDimensions?.width,
        height: imageDimensions?.height,
        policyRestricted: Boolean(policyError),
        deviceAvailable: isMetaBridgeConnected,
      });
    }
  };

  const handleVoiceRecording = async (
    uri: string,
    duration: number,
    options?: { autoSend?: boolean }
  ) => {
    if (
      shouldBargeInInterruptPlayback({
        isAssistantSpeaking,
        isUserCaptureStarting: true,
      })
    ) {
      await mobileVoiceRuntime.stopPlayback();
      setIsAssistantSpeaking(false);
    }
    if (!ensureVisionSourceReady()) {
      return;
    }
    const activeVoiceSourceId = getActiveVoiceSourceId();
    if (
      !runCommandGate('capture_audio', activeVoiceSourceId) ||
      !runCommandGate('transcribe_audio', activeVoiceSourceId)
    ) {
      return;
    }

    setIsTranscribing(true);

    try {
      if (visionSourceMode === 'meta_glasses') {
        const bridgeStatus = await metaBridge.recordAudioIngress({
          timestampMs: Date.now(),
          sampleRate: 16_000,
          packets: 1,
        });
        setMetaBridgeStatus(bridgeStatus);
      }
      const result = await mobileVoiceRuntime.transcribeRecording({
        uri,
        mimeType: 'audio/m4a',
        onPartial: (partial) => {
          setVoiceRuntime((prev) => ({
            ...(prev || {}),
            partialTranscript: partial,
          }));
        },
      });
      if (result.text) {
        if (!options?.autoSend) {
          setInputText(result.text);
        }
        const activeVoiceSession = mobileVoiceRuntime.getActiveSession();
        if (
          activeVoiceSession?.conversationId &&
          activeVoiceSession.conversationId !== currentConversationId
        ) {
          setCurrentConversation(activeVoiceSession.conversationId);
        }
        setVoiceRuntime({
          sourceId: activeVoiceSourceId || undefined,
          sourceMode: visionSourceMode,
          bridgeConnectionState: metaBridgeConnectionState,
          sourceScope: avSourceScope,
          liveSessionId: liveSessionIdRef.current,
          correlatedSession: {
            liveSessionId: liveSessionIdRef.current,
            interviewSessionId: activeVoiceSession?.interviewSessionId,
            voiceSessionId: activeVoiceSession?.voiceSessionId,
          },
          interviewSessionId: activeVoiceSession?.interviewSessionId,
          voiceSessionId: activeVoiceSession?.voiceSessionId || `voice_${Date.now().toString(36)}`,
          sessionState: 'transcribed',
          transcript: result.text,
          partialTranscript: mobileVoiceRuntime.partialTranscript || undefined,
          startedAt: Date.now() - duration * 1000,
          stoppedAt: Date.now(),
          durationSeconds: duration,
          mimeType: 'audio/m4a',
          providerId: result.providerId,
          nativeBridge: result.nativeBridge,
          transport: mobileVoiceRuntime.transportSelection.effectiveMode,
          requestedTransport: mobileVoiceRuntime.transportSelection.requestedMode,
          transportFallbackReason: mobileVoiceRuntime.transportSelection.fallbackReason,
          ...(visionSourceMode === 'meta_glasses'
            ? {
                bridgeDiagnostics: buildMetaBridgeDiagnostics(metaBridgeStatus),
                sampleRate: metaBridgeStatus.audioIngress.sampleRate,
                packetCount: metaBridgeStatus.audioIngress.packetCount,
                lastPacketTs: metaBridgeStatus.audioIngress.lastPacketTs,
              }
            : {}),
        });

        if (options?.autoSend) {
          await sendTextMessage(result.text, { restoreInputOnFail: false });
        } else {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }
      }
    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert(t('chat.transcriptionFailedTitle'), t('chat.transcriptionFailedBody'));
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleLiveVoiceFrame = useCallback(async (frame: VoiceRecorderFrame) => {
    if (
      shouldBargeInInterruptPlayback({
        isAssistantSpeaking,
        isUserCaptureStarting: true,
      })
    ) {
      await mobileVoiceRuntime.stopPlayback();
      setIsAssistantSpeaking(false);
    }
    if (!ensureVisionSourceReady()) {
      return;
    }
    const activeVoiceSourceId = getActiveVoiceSourceId();
    if (
      !runCommandGate('capture_audio', activeVoiceSourceId) ||
      !runCommandGate('transcribe_audio', activeVoiceSourceId)
    ) {
      return;
    }

    const startedAt = Date.now() - frame.durationMs;
    let ingestResult: Awaited<ReturnType<typeof mobileVoiceRuntime.ingestStreamingFrame>> | null = null;
    try {
      ingestResult = await mobileVoiceRuntime.ingestStreamingFrame({
        uri: frame.uri,
        mimeType: 'audio/m4a',
        frameDurationMs: frame.durationMs,
        sequence: frame.sequence,
        isFinal: frame.isFinal,
        onPartial: (partial) => {
          setVoiceRuntime((prev) => ({
            ...(prev || {}),
            partialTranscript: partial,
            sessionState: 'streaming',
            frameSequence: frame.sequence,
            frameDurationMs: frame.durationMs,
            startedAt,
            stoppedAt: Date.now(),
          }));
        },
      });
    } catch (error) {
      console.warn('Live voice frame ingest failed:', error);
      if (!frame.isFinal) {
        return;
      }
    }

    const activeVoiceSession = mobileVoiceRuntime.getActiveSession();
    if (
      activeVoiceSession?.conversationId &&
      activeVoiceSession.conversationId !== currentConversationId
    ) {
      setCurrentConversation(activeVoiceSession.conversationId);
    }
    setVoiceRuntime((prev) => ({
      ...(prev || {}),
      sourceId: activeVoiceSourceId || undefined,
      sourceMode: visionSourceMode,
      bridgeConnectionState: metaBridgeConnectionState,
      sourceScope: avSourceScope,
      liveSessionId: liveSessionIdRef.current,
      interviewSessionId: activeVoiceSession?.interviewSessionId,
      voiceSessionId: activeVoiceSession?.voiceSessionId,
      sessionState: frame.isFinal ? 'stream_finalized' : 'streaming',
      partialTranscript: mobileVoiceRuntime.partialTranscript || undefined,
      frameSequence: frame.sequence,
      frameDurationMs: frame.durationMs,
      startedAt,
      stoppedAt: Date.now(),
      transport: mobileVoiceRuntime.transportSelection.effectiveMode,
      requestedTransport: mobileVoiceRuntime.transportSelection.requestedMode,
      transportFallbackReason: mobileVoiceRuntime.transportSelection.fallbackReason,
      ...(visionSourceMode === 'meta_glasses'
        ? {
            bridgeDiagnostics: buildMetaBridgeDiagnostics(metaBridgeStatus),
            sampleRate: metaBridgeStatus.audioIngress.sampleRate,
            packetCount: metaBridgeStatus.audioIngress.packetCount,
            lastPacketTs: metaBridgeStatus.audioIngress.lastPacketTs,
          }
        : {}),
    }));

    if (frame.isFinal) {
      const finalization = mobileVoiceRuntime.finalizeStreamingUtterance({
        sequence: frame.sequence,
      });
      if (finalization?.text) {
        setVoiceRuntime((prev) => ({
          ...(prev || {}),
          transcript: finalization.text,
          partialTranscript: finalization.text,
          sessionState: 'stream_committed',
          finalizedSequence: finalization.sequence,
          committedAt: Date.now(),
        }));
        if (ingestResult?.orchestration?.status === 'triggered') {
          const realtimeAssistantText = ingestResult.orchestration.assistantText?.trim();
          const resolvedConversationId =
            activeVoiceSession?.conversationId || currentConversationId || undefined;
          console.info('[VoiceReply] orchestration_triggered', {
            hasInlineAssistantText: Boolean(realtimeAssistantText),
            resolvedConversationId,
          });
          if (shouldSpeakReplies && realtimeAssistantText) {
            setIsAssistantSpeaking(true);
            try {
              await mobileVoiceRuntime.synthesizeAndPlay(realtimeAssistantText);
            } catch {
              Speech.stop();
              Speech.speak(realtimeAssistantText);
            } finally {
              setIsAssistantSpeaking(false);
            }
          }
          if (shouldSpeakReplies && !realtimeAssistantText) {
            awaitingAssistantSpeechRef.current = true;
            console.info('[VoiceReply] awaiting_assistant_text_refresh', {
              resolvedConversationId,
            });
          }
          try {
            if (resolvedConversationId) {
              await loadConversation(resolvedConversationId, { allowUnknownId: true });
            } else {
              await syncConversations();
            }
            if (shouldSpeakReplies && !realtimeAssistantText && resolvedConversationId) {
              const refreshedConversation = getConversationById(resolvedConversationId);
              const refreshedAssistantMessage =
                [...(refreshedConversation?.messages || [])]
                  .reverse()
                  .find((message) => message.role === 'assistant') || null;
              const refreshedAssistantText = refreshedAssistantMessage?.content?.trim() || '';
              if (refreshedAssistantText) {
                console.info('[VoiceReply] autospeak_from_refreshed_conversation', {
                  resolvedConversationId,
                  messageId: refreshedAssistantMessage?.id || undefined,
                });
                setIsAssistantSpeaking(true);
                try {
                  await mobileVoiceRuntime.synthesizeAndPlay(refreshedAssistantText);
                } catch {
                  Speech.stop();
                  Speech.speak(refreshedAssistantText);
                } finally {
                  setIsAssistantSpeaking(false);
                  awaitingAssistantSpeechRef.current = false;
                  if (refreshedAssistantMessage?.id) {
                    lastSpokenAssistantMessageIdRef.current = refreshedAssistantMessage.id;
                  }
                }
              }
            }
          } catch (error) {
            console.warn('Failed to refresh conversation after realtime voice turn:', error);
          }
          return;
        }
        if (frame.isFinal && !ingestResult) {
          await sendTextMessage(finalization.text);
          return;
        }
        await sendTextMessage(finalization.text);
      }
    }
  }, [
    isAssistantSpeaking,
    mobileVoiceRuntime,
    ensureVisionSourceReady,
    getActiveVoiceSourceId,
    getConversationById,
    runCommandGate,
    currentConversationId,
    loadConversation,
    setCurrentConversation,
    syncConversations,
    visionSourceMode,
    metaBridgeConnectionState,
    avSourceScope,
    metaBridgeStatus,
    shouldSpeakReplies,
    sendTextMessage,
  ]);

  const handleBeforeVoiceCapture = useCallback(async () => {
    logVoiceLifecycle('voice_capture_before_start');
    if (!mobileVoiceRuntime.getActiveSession()) {
      await openVoiceSession();
    }
    if (
      shouldBargeInInterruptPlayback({
        isAssistantSpeaking,
        isUserCaptureStarting: true,
      })
    ) {
      await mobileVoiceRuntime.stopPlayback();
      setIsAssistantSpeaking(false);
    }
  }, [isAssistantSpeaking, logVoiceLifecycle, mobileVoiceRuntime, openVoiceSession]);

  const handleApprovePending = useCallback(async (executionId: string) => {
    setApprovalActionId(executionId);
    const result = await approvePendingTool(executionId);
    if (!result.success) {
      Alert.alert(t('common.retry'), result.error || t('common.retry'));
    }
    setApprovalActionId(null);
  }, [approvePendingTool, t]);

  const handleRejectPending = useCallback(async (executionId: string) => {
    setApprovalActionId(executionId);
    const result = await rejectPendingTool(executionId);
    if (!result.success) {
      Alert.alert(t('common.retry'), result.error || t('common.retry'));
    }
    setApprovalActionId(null);
  }, [rejectPendingTool, t]);

  const handleMessageFeedback = (type: 'positive' | 'negative') => {
    if (selectedMessage && currentConversationId) {
      updateMessageFeedback(currentConversationId, selectedMessage.id, type);
    }
  };

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const getImageAttachments = (attachments?: Attachment[]) => {
    return (attachments || []).filter((attachment) => attachment.type === 'image');
  };

  const getNonImageAttachments = (attachments?: Attachment[]) => {
    return (attachments || []).filter((attachment) => attachment.type !== 'image');
  };

  const renderImageAttachments = (attachments?: Attachment[]) => {
    const imageAttachments = getImageAttachments(attachments);
    if (imageAttachments.length === 0) {
      return null;
    }

    return (
      <YStack marginBottom="$3" gap="$2">
        {imageAttachments.map((attachment, index) => (
          <YStack
            key={`${attachment.uri}-${index}`}
            borderRadius={16}
            borderWidth={1}
            borderColor="$glassBorder"
            overflow="hidden"
            backgroundColor="$surface"
          >
            <Image
              source={{ uri: attachment.uri }}
              alt={attachment.name || t('chat.imageAttachment')}
              style={{ width: '100%', height: 156 }}
              resizeMode="cover"
            />
            <XStack paddingHorizontal="$2" paddingVertical="$2">
              <Text color="$colorTertiary" fontSize="$1" numberOfLines={1}>
                {attachment.name || t('chat.imageAttachment')}
              </Text>
            </XStack>
          </YStack>
        ))}
      </YStack>
    );
  };

  const renderNonImageAttachments = (attachments?: Attachment[]) => {
    const nonImageAttachments = getNonImageAttachments(attachments);
    if (nonImageAttachments.length === 0) {
      return null;
    }

    return (
      <YStack marginBottom="$2" gap="$2">
        {nonImageAttachments.map((attachment, index) => (
          <XStack
            key={`${attachment.uri}-${index}`}
            alignItems="center"
            borderRadius={12}
            borderWidth={1}
            borderColor={chromeBorder}
            backgroundColor={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(23, 23, 24, 0.04)'}
            paddingHorizontal="$3"
            paddingVertical="$2"
          >
            <Text color="$colorTertiary" fontSize="$2" numberOfLines={1}>
              {attachment.name || attachment.mimeType || attachment.type}
            </Text>
          </XStack>
        ))}
      </YStack>
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    if (item.role === 'system') {
      return (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(250)}>
          <YStack marginBottom="$3" alignItems="center">
            <Text
              fontSize="$2"
              color="$colorTertiary"
              paddingHorizontal="$3"
              paddingVertical="$1"
              borderWidth={1}
              borderColor="$glassBorder"
              borderRadius={999}
              backgroundColor="$backgroundStrong"
            >
              {item.content}
            </Text>
          </YStack>
        </Animated.View>
      );
    }

    if (item.role === 'user') {
      const hasMessageText = item.content.trim().length > 0;
      const hasImageAttachments = getImageAttachments(item.attachments).length > 0;
      const hasNonImageAttachments = getNonImageAttachments(item.attachments).length > 0;
      if (!hasMessageText && !hasImageAttachments && !hasNonImageAttachments) {
        return null;
      }

      return (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(250)}>
          <Pressable onLongPress={() => setSelectedMessage(item)}>
            <YStack marginBottom="$4" alignItems="flex-end">
              <YStack
                maxWidth="82%"
                borderRadius={26}
                borderWidth={1}
                borderColor={chromeBorder}
                backgroundColor={userBubble}
                paddingHorizontal="$4"
                paddingVertical="$3.5"
              >
                {renderImageAttachments(item.attachments)}
                {renderNonImageAttachments(item.attachments)}
                {hasMessageText ? (
                  <Text color={isDark ? '#f2eee7' : '#1f1b17'} fontSize={17} lineHeight={27}>
                    {item.content}
                  </Text>
                ) : null}
              </YStack>
            </YStack>
          </Pressable>
        </Animated.View>
      );
    }

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(250)}>
        <Pressable onLongPress={() => setSelectedMessage(item)}>
          <YStack marginBottom="$4" alignItems="flex-start">
            <YStack maxWidth="92%" paddingHorizontal="$1">
                <XStack alignItems="center" gap="$2" marginBottom="$1">
                <Circle
                  size={16}
                  backgroundColor="$primary"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="white" fontSize={10} lineHeight={12}>
                    ✨
                  </Text>
                </Circle>
                <Text color="$colorTertiary" fontSize="$2" fontWeight="600">
                  {agentName}
                </Text>
              </XStack>
              <YStack
                borderRadius={20}
                borderWidth={1}
                borderColor={chromeBorder}
                backgroundColor={assistantCard}
                paddingHorizontal="$4"
                paddingVertical="$3.5"
              >
                <Text color={isDark ? '#f3efe7' : '#1f1b17'} fontSize={18} lineHeight={31}>
                  {item.content}
                </Text>
              </YStack>
            </YStack>
          </YStack>
        </Pressable>
      </Animated.View>
    );
  };

  const TypingIndicator = () => (
    <YStack marginBottom="$4" alignItems="flex-start">
      <YStack
        width="100%"
        maxWidth={440}
        borderRadius={20}
        borderWidth={1}
        borderColor={chromeBorder}
        backgroundColor={assistantCard}
        paddingHorizontal="$4"
        paddingVertical="$3"
      >
        <XStack alignItems="center" gap="$2">
          <Sparkles size={14} color="$primary" />
          <Text color="$color" fontSize="$3" fontWeight="600">
            {t('chat.thinking')}
          </Text>
        </XStack>
        <XStack marginTop="$2" gap="$2">
          <Animated.View style={animatedStyle1}>
            <Circle size={7} backgroundColor="$colorTertiary" />
          </Animated.View>
          <Animated.View style={animatedStyle2}>
            <Circle size={7} backgroundColor="$colorTertiary" />
          </Animated.View>
          <Animated.View style={animatedStyle3}>
            <Circle size={7} backgroundColor="$colorTertiary" />
          </Animated.View>
        </XStack>
      </YStack>
    </YStack>
  );

  const WelcomeScreen = () => {
    const firstName = user?.firstName?.trim();
    const hasValidFirstName = Boolean(firstName);
    const fullGreeting = hasValidFirstName ? `${greeting}, ${firstName}!` : `${greeting}!`;

    return (
      <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal="$6" paddingBottom="$10">
        <Image
          source={require('../../assets/splash-icon.png')}
          alt="Operator mobile logo"
          style={{ width: 36, height: 36, marginBottom: 14, opacity: 0.95 }}
          resizeMode="contain"
        />
        <Text
          color="$color"
          fontSize={34}
          fontWeight="700"
          textAlign="center"
          marginBottom="$3"
        >
          {fullGreeting}
        </Text>
        <Text color="$colorSecondary" fontSize="$4" textAlign="center">
          {welcomeText}
        </Text>
      </YStack>
    );
  };

  // Prepare conversations for drawer
  const drawerConversations = conversations.map((conv) => ({
    id: conv.id,
    title: conv.title,
    preview: conv.messages[conv.messages.length - 1]?.content.substring(0, 50) || t('drawer.noMessages'),
    updatedAt: new Date(conv.updatedAt),
  }));

  return (
    <>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <YStack flex={1} backgroundColor={resolvedTheme === 'dark' ? '#1f1c17' : '$background'}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <XStack
            paddingHorizontal="$4"
            paddingTop={insets.top + 10}
            paddingBottom="$3"
            alignItems="center"
            justifyContent="space-between"
            gap="$3"
          >
            <Pressable onPress={() => setIsLeftDrawerOpen(true)}>
              <Circle
                size={50}
                backgroundColor={chromeSurface}
                borderWidth={1}
                borderColor={chromeBorder}
                alignItems="center"
                justifyContent="center"
              >
                <Menu size={22} color={menuIconColor} />
              </Circle>
            </Pressable>

            <XStack flex={1} alignItems="center" justifyContent="center">
              <Image
                source={require('../../assets/splash-icon.png')}
                alt="Operator mobile logo"
                style={{ width: 30, height: 30, borderRadius: 15, opacity: 0.98 }}
                resizeMode="contain"
              />
            </XStack>

            <Pressable
              onPress={handleNewChat}
              onLongPress={() => setIsRightDrawerOpen(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Circle
                size={50}
                backgroundColor={chromeSurface}
                borderWidth={1}
                borderColor={chromeBorder}
                alignItems="center"
                justifyContent="center"
              >
                <Plus size={22} color={theme.primary?.val || '#d68958'} />
              </Circle>
            </Pressable>
          </XStack>

          {isIncognitoMode && (
            <XStack
              backgroundColor="rgba(232, 82, 10, 0.12)"
              paddingVertical={8}
              paddingHorizontal={16}
              alignItems="center"
              justifyContent="center"
              gap={8}
            >
              <Ghost size={14} color="$primary" />
              <Text color="$primary" fontSize={12} fontWeight="500">
                {t('chat.privateMode')}
              </Text>
            </XStack>
          )}

            {isSyncing && (
              <XStack
                backgroundColor="rgba(20, 184, 166, 0.12)"
                paddingVertical={8}
                paddingHorizontal={16}
                alignItems="center"
                justifyContent="center"
              >
                <Text color="$info" fontSize={12} fontWeight="500">
                  {t('chat.syncing')}
                </Text>
              </XStack>
            )}

            {policyError && (
              <YStack
                backgroundColor="rgba(239, 68, 68, 0.12)"
                paddingVertical={8}
                paddingHorizontal={16}
                gap="$2"
              >
                <XStack alignItems="center" justifyContent="center">
                  <Text color="$error" fontSize={12} fontWeight="600">
                    {policyError}
                  </Text>
                </XStack>
                {shouldShowMobileToolBoundaryCta(policyError) ? (
                  <XStack alignItems="center" justifyContent="center">
                    <Pressable
                      onPress={() => {
                        void handleStartToolBoundaryIntake();
                      }}
                      disabled={isLoading}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <View
                        style={{
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: chromeBorder,
                          backgroundColor: isLoading
                            ? (theme.surface4?.val || chromeBorder)
                            : (theme.primary?.val || chromeBorder),
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          opacity: isLoading ? 0.7 : 1,
                        }}
                      >
                        <Text color="white" fontSize={12} fontWeight="700">
                          {t('chat.toolBoundaryCta')}
                        </Text>
                      </View>
                    </Pressable>
                  </XStack>
                ) : null}
              </YStack>
            )}

            {pendingAttachments.length > 0 && (
              <XStack
                backgroundColor="rgba(59, 130, 246, 0.10)"
                paddingVertical={8}
                paddingHorizontal={16}
                alignItems="center"
                justifyContent="center"
              >
                <Text color="$info" fontSize={12} fontWeight="500">
                  {t('chat.attachmentsQueued', { count: pendingAttachments.length })}
                </Text>
              </XStack>
            )}

            {isVoiceModeOpen && (
              <XStack
                backgroundColor="rgba(229, 149, 78, 0.12)"
                paddingVertical={8}
                paddingHorizontal={16}
                alignItems="center"
                justifyContent="space-between"
                gap="$2"
              >
                <Text color="$color" fontSize="$2" fontWeight="700">
                  Conversation {hasConversationStarted ? 'live' : 'idle'}
                </Text>
                <Text color="$colorTertiary" fontSize="$2">
                  {conversationMode === 'voice_with_eyes' ? 'Voice + Eyes' : 'Voice only'} • {liveHudStatusLabel}
                </Text>
              </XStack>
            )}

            <PendingApprovalsPanel
              approvals={pendingApprovals}
              actionInFlightId={approvalActionId}
              onApprove={(executionId) => {
                void handleApprovePending(executionId);
              }}
              onReject={(executionId) => {
                void handleRejectPending(executionId);
              }}
            />

            <YStack flex={1}>
              {messages.length === 0 ? (
                <WelcomeScreen />
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'flex-end',
                    paddingHorizontal: 16,
                    paddingTop: 8,
                    paddingBottom: 52,
                  }}
                  showsVerticalScrollIndicator={false}
                  ListFooterComponent={isLoading ? <TypingIndicator /> : null}
                />
              )}
            </YStack>

          <YStack
            paddingHorizontal="$4"
            paddingTop="$2"
            paddingBottom={Math.max(insets.bottom, 10)}
          >
              <YStack
                borderWidth={1}
                borderColor={chromeBorder}
                borderRadius={28}
                backgroundColor={composerSurface}
                paddingHorizontal="$3"
                paddingTop="$2.5"
                paddingBottom="$2.5"
              >
                <Pressable
                  onPress={() => {
                    inputRef.current?.focus();
                  }}
                >
                  <View
                      style={{
                        minHeight: 58,
                        justifyContent: 'center',
                      }}
                    >
                      <TextInput
                        ref={inputRef}
                        style={{
                        fontSize: 17,
                        paddingVertical: 8,
                        color: theme.color?.val,
                        lineHeight: 25,
                        minHeight: 24,
                        maxHeight: 140,
                      }}
                      placeholder={t('chat.placeholderAgent', { agent: agentName })}
                      placeholderTextColor={theme.colorMuted?.val}
                      value={inputText}
                      onChangeText={setInputText}
                      multiline
                      maxLength={1000}
                      onSubmitEditing={handleSend}
                      returnKeyType="send"
                      blurOnSubmit={false}
                      autoCapitalize="sentences"
                      autoCorrect
                      editable
                      keyboardType="default"
                    />
                  </View>
                </Pressable>

                <XStack
                  marginTop="$2.5"
                  alignItems="center"
                  justifyContent="space-between"
                  gap="$3"
                >
                  <XStack alignItems="center" gap="$2" flex={1}>
                    <AttachmentMenu
                      onAttach={handleAttachment}
                      onWebSearch={() => {}}
                      onResearchMode={() => {}}
                      metaVisionConfigured={isMetaVisionConfigured}
                      onSelectMetaVisionSource={() => {
                        setVisionSourceMode('meta_glasses');
                        setPolicyError(null);
                      }}
                    />
                    <ModelSelector
                      selectedModel={selectedModel}
                      onSelectModel={setSelectedModel}
                      availableModels={availableModels}
                    />
                  </XStack>

                  <XStack alignItems="center" gap="$2">
                    {inputText.trim() ? (
                      <Pressable
                        onPress={handleSend}
                        disabled={isLoading}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <View
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 23,
                            borderWidth: 1,
                            borderColor: chromeBorder,
                            backgroundColor: isLoading
                              ? (theme.surface?.val || composerSurface)
                              : (theme.primary?.val || '#d68958'),
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ArrowUp size={20} color={isLoading ? theme.colorTertiary?.val : 'white'} />
                        </View>
                      </Pressable>
                    ) : (
                      <XStack alignItems="center" gap="$2">
                        <VoiceRecorder
                          onRecordingComplete={handleVoiceRecording}
                          isTranscribing={isTranscribing}
                        />
                        <Pressable
                          onPress={handleOpenVoiceMode}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <View
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: 23,
                              borderWidth: 1,
                              borderColor: chromeBorder,
                              backgroundColor: theme.surface?.val || composerSurface,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <AudioWaveform size={20} color={theme.color?.val || '#f3efe7'} />
                          </View>
                        </Pressable>
                      </XStack>
                    )}
                  </XStack>
                </XStack>
              </YStack>
          </YStack>
        </KeyboardAvoidingView>
      </YStack>

      {/* Chat History Drawer */}
      <ChatDrawer
        isOpen={isLeftDrawerOpen}
        onClose={() => setIsLeftDrawerOpen(false)}
        conversations={drawerConversations}
        currentConversationId={currentConversationId || undefined}
        onSelectConversation={setCurrentConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={(conversationId) => {
          void archiveConversation(conversationId);
        }}
      />

      <Modal
        visible={isRightDrawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRightDrawerOpen(false)}
      >
        <XStack flex={1}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.34)' }}
            onPress={() => setIsRightDrawerOpen(false)}
          />
          <YStack
            width="78%"
            maxWidth={320}
            backgroundColor="$background"
            borderLeftWidth={1}
            borderLeftColor="$borderColor"
            paddingTop={insets.top + 12}
            paddingHorizontal="$4"
            paddingBottom={Math.max(insets.bottom, 16)}
            gap="$4"
          >
            <Text color="$color" fontSize="$6" fontWeight="700">
              Controls
            </Text>

            <YStack
              borderWidth={1}
              borderColor="$glassBorder"
              borderRadius="$4"
              backgroundColor="$surface"
              padding="$3"
              gap="$3"
            >
              <XStack alignItems="center" justifyContent="space-between">
                <XStack alignItems="center" gap="$2">
                  <Ghost size={16} color="$colorTertiary" />
                  <Text color="$color" fontSize="$4" fontWeight="600">
                    {t('chat.privateMode')}
                  </Text>
                </XStack>
                <Switch
                  value={isIncognitoMode}
                  onValueChange={(value) => setIncognitoMode(value)}
                />
              </XStack>
            </YStack>

            <Pressable onPress={handleOpenSettings}>
              <YStack
                borderWidth={1}
                borderColor="$glassBorder"
                borderRadius="$4"
                backgroundColor="$surface"
                padding="$3"
              >
                <Text color="$color" fontSize="$4" fontWeight="600">
                  {t('settings.title')}
                </Text>
              </YStack>
            </Pressable>

            <Pressable onPress={handleOpenVoiceMode}>
              <YStack
                borderWidth={1}
                borderColor="$glassBorder"
                borderRadius="$4"
                backgroundColor="$surface"
                padding="$3"
              >
                <XStack alignItems="center" gap="$2">
                  <Mic size={16} color="$color" />
                  <Text color="$color" fontSize="$4" fontWeight="600">
                    Conversation
                  </Text>
                </XStack>
              </YStack>
            </Pressable>

            <Pressable onPress={handleNewChat}>
              <YStack
                borderWidth={1}
                borderColor="$glassBorder"
                borderRadius="$4"
                backgroundColor="$surface"
                padding="$3"
              >
                <Text color="$color" fontSize="$4" fontWeight="600">
                  New chat
                </Text>
              </YStack>
            </Pressable>
          </YStack>
        </XStack>
      </Modal>

      <VoiceModeModal
        isOpen={isVoiceModeOpen}
        onClose={() => {
          logVoiceLifecycle('voice_modal_on_close');
          handleEndConversation('modal_request_close');
          setIsVoiceModeOpen(false);
          setHasConversationStarted(false);
          mobileVoiceRuntime.clearPartialTranscript();
        }}
        conversationMode={conversationMode}
        onConversationModeChange={setConversationMode}
        eyesSource={conversationEyesSource}
        onEyesSourceChange={setConversationEyesSource}
        metaGlassesAvailable={isMetaVisionConfigured}
        metaGlassesReason={
          isMetaVisionConfigured
            ? undefined
            : mapVisionReadinessReasonToConversationReason(metaVisionReadiness.reasonCode)
        }
        conversationStarted={hasConversationStarted}
        onStartConversation={handleStartConversation}
        onEndConversation={() => {
          handleEndConversation('orb_stop_control');
          setIsVoiceModeOpen(false);
          mobileVoiceRuntime.clearPartialTranscript();
        }}
        hudStatusLabel={liveHudStatusLabel}
        onRecordingComplete={(uri, duration) => {
          void handleVoiceRecording(uri, duration, { autoSend: true });
        }}
        onAudioFrame={(frame) => {
          return handleLiveVoiceFrame(frame);
        }}
        isTranscribing={isTranscribing}
        isLoading={isLoading}
        agentName={agentName}
        latestUserMessage={latestUserMessage}
        latestAssistantMessage={latestAssistantMessage}
        partialTranscript={mobileVoiceRuntime.partialTranscript}
        isAssistantSpeaking={isAssistantSpeaking}
        onBeforeCapture={handleBeforeVoiceCapture}
      />

      {/* Message Actions */}
      <MessageActions
        isOpen={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        messageContent={selectedMessage?.content || ''}
        messageRole={selectedMessage?.role === 'system' ? 'assistant' : (selectedMessage?.role || 'user')}
        onFeedback={handleMessageFeedback}
      />
    </>
  );
}
