import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
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
import { ArrowUp, Ghost, Menu, Mic, Plus, Sparkles } from '@tamagui/lucide-icons';
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
import { l4yercak3Client } from '../../src/api/client';
import { useMobileVoiceRuntime } from '../../src/hooks/useMobileVoiceRuntime';
import { shouldBargeInInterruptPlayback } from '../../src/lib/voice/lifecycle';
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
  metaBridge,
  type VisionSourceMode,
  type MetaBridgeConnectionState,
  type MetaBridgeSnapshot,
} from '../../src/lib/av';

const getGreetingKey = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'chat.greeting.morning';
  if (hour < 18) return 'chat.greeting.afternoon';
  return 'chat.greeting.evening';
};

export default function ConversationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
    t,
    resolvedTheme,
    resolvedLanguage,
    agentName,
    agentAvatar,
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
    [resolvedLanguage, t]
  );
  const welcomeText = useMemo(() => {
    const options = [t('chat.welcome.one'), t('chat.welcome.two'), t('chat.welcome.three')];
    return options[Math.floor(Math.random() * options.length)] || t('chat.welcome.one');
  }, [resolvedLanguage, t]);
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

  const ensureVisionSourceReady = useCallback(() => {
    const readiness = evaluateVisionSourceReadiness({
      sourceMode: visionSourceMode,
      bridge: metaBridgeStatus,
    });
    if (readiness.ready) {
      return true;
    }
    setPolicyError(
      `Meta glasses bridge unavailable (${readiness.reasonCode}). Connect bridge first or switch to iPhone source.`
    );
    return false;
  }, [metaBridgeStatus, visionSourceMode]);

  const handleConnectMetaBridge = useCallback(async () => {
    setPolicyError(null);
    const status = await metaBridge.connect();
    setMetaBridgeStatus(status);
    const readiness = evaluateVisionSourceReadiness({
      sourceMode: 'meta_glasses',
      bridge: status,
    });
    if (!readiness.ready) {
      setPolicyError(`Meta glasses bridge connect failed (${readiness.reasonCode}).`);
    }
  }, []);

  const handleDisconnectMetaBridge = useCallback(async () => {
    const status = await metaBridge.disconnect();
    setMetaBridgeStatus(status);
  }, []);

  useEffect(() => {
    if (visionSourceMode !== 'meta_glasses') {
      return;
    }
    const readiness = evaluateVisionSourceReadiness({
      sourceMode: 'meta_glasses',
      bridge: metaBridgeStatus,
    });
    if (!readiness.ready) {
      setPolicyError(
        `Meta glasses bridge unavailable (${readiness.reasonCode}). Connect bridge first or switch to iPhone source.`
      );
    }
  }, [metaBridgeStatus, visionSourceMode]);

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
  });
  useEffect(() => {
    return () => {
      void mobileVoiceRuntime.stopPlayback();
      void mobileVoiceRuntime.closeSession('screen_unmount');
      setIsAssistantSpeaking(false);
    };
  }, [mobileVoiceRuntime]);

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
    awaitingAssistantSpeechRef.current = false;
  }, [currentConversationId]);

  useEffect(() => {
    if (!autoSpeakReplies || !awaitingAssistantSpeechRef.current) {
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

    setIsAssistantSpeaking(true);
    void (async () => {
      try {
        await mobileVoiceRuntime.synthesizeAndPlay(lastAssistantMessage.content);
      } catch {
        Speech.stop();
        Speech.speak(lastAssistantMessage.content, {
          voice: agentVoiceId || undefined,
        });
      } finally {
        setIsAssistantSpeaking(false);
        lastSpokenAssistantMessageIdRef.current = lastAssistantMessage.id;
      }
    })();
    awaitingAssistantSpeechRef.current = false;
  }, [agentVoiceId, autoSpeakReplies, messages, mobileVoiceRuntime]);

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

  const sendTextMessage = useCallback(async (
    messageText: string,
    options?: { restoreInputOnFail?: boolean }
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

    if (
      !runCommandGate('assemble_concierge_payload', activeCameraSourceId) ||
      !runCommandGate(conciergeCommand, activeCameraSourceId)
    ) {
      return false;
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
      observability: {
        liveSessionId: liveSessionIdRef.current,
        fallbackReason:
          mobileVoiceRuntime.transportSelection.fallbackReason ||
          (policyError ? 'command_policy_blocked' : undefined),
        diagnostics: {
          attachmentCount: pendingAttachments.length,
          imageAttachmentCount: pendingAttachments.filter((attachment) => attachment.type === 'image').length,
          policyError: policyError || undefined,
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
      Alert.alert(t('chat.sendFailedTitle'), sendResult.error || t('chat.sendFailedBody'));
      setIsLoading(false);
      return false;
    }

    awaitingAssistantSpeechRef.current = autoSpeakReplies;
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
    autoSpeakReplies,
    mobileVoiceRuntime,
    t,
  ]);

  const handleSend = useCallback(async () => {
    const messageText = inputText.trim();
    if (!messageText || isLoading) return;
    setInputText('');
    await sendTextMessage(messageText);
  }, [inputText, isLoading, sendTextMessage]);

  const handleNewChat = () => {
    liveSessionIdRef.current = `mobile_live_${Date.now().toString(36)}`;
    setPendingAttachments([]);
    setCameraRuntime(undefined);
    setVoiceRuntime(undefined);
    if (isIncognitoMode) {
      setCurrentConversation(null);
    } else {
      createConversation();
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
      setIsVoiceModeOpen(true);
    }, 120);
  };

  useEffect(() => {
    if (!isVoiceModeOpen) {
      void mobileVoiceRuntime.closeSession('voice_mode_closed');
      return;
    }
    void (async () => {
      try {
        const opened = await mobileVoiceRuntime.openSession();
        if (opened.conversationId && opened.conversationId !== currentConversationId) {
          setCurrentConversation(opened.conversationId);
        }
      } catch (error) {
        console.warn('Voice session open failed:', error);
      }
    })();
    return () => {
      void mobileVoiceRuntime.closeSession('voice_mode_closed');
    };
  }, [currentConversationId, isVoiceModeOpen, mobileVoiceRuntime, setCurrentConversation]);

  const handleAttachment = async (attachment: { type: 'image' | 'file'; uri: string; name?: string; mimeType?: string }) => {
    if (!ensureVisionSourceReady()) {
      return;
    }
    const activeCameraSourceId = getActiveCameraSourceId();
    if (!runCommandGate('capture_frame', activeCameraSourceId)) {
      return;
    }

    const nextAttachment: Attachment = {
      type: attachment.type,
      uri: attachment.uri,
      name: attachment.name,
      mimeType: attachment.mimeType,
      sourceId: activeCameraSourceId || undefined,
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
        sourceMode: visionSourceMode,
        bridgeConnectionState: metaBridgeConnectionState,
        sourceScope: avSourceScope,
        liveSessionId: liveSessionIdRef.current,
        sessionState: 'capturing',
        frameCaptureCount,
        lastFrameCapturedAt: Date.now(),
        captureMode: 'camera_attachment',
        ...(visionSourceMode === 'meta_glasses'
          ? {
              bridgeDiagnostics: buildMetaBridgeDiagnostics(metaBridgeStatus),
              frameCadenceFps: metaBridgeStatus.frameIngress.fps,
              droppedFrames: metaBridgeStatus.frameIngress.droppedFrames,
            }
          : {}),
      };
    });
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
    await mobileVoiceRuntime.ingestStreamingFrame({
      uri: frame.uri,
      mimeType: 'audio/m4a',
      frameDurationMs: frame.durationMs,
      sequence: frame.sequence,
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
  }, [
    isAssistantSpeaking,
    mobileVoiceRuntime,
    ensureVisionSourceReady,
    getActiveVoiceSourceId,
    runCommandGate,
    currentConversationId,
    setCurrentConversation,
    visionSourceMode,
    metaBridgeConnectionState,
    avSourceScope,
    metaBridgeStatus,
  ]);

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
                    {agentAvatar}
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
              <XStack
                backgroundColor="rgba(239, 68, 68, 0.12)"
                paddingVertical={8}
                paddingHorizontal={16}
                alignItems="center"
                justifyContent="center"
              >
                <Text color="$error" fontSize={12} fontWeight="600">
                  {policyError}
                </Text>
              </XStack>
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
                      <VoiceRecorder
                        onRecordingComplete={handleVoiceRecording}
                        isTranscribing={isTranscribing}
                      />
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
              <XStack alignItems="center" justifyContent="space-between">
                <XStack alignItems="center" gap="$2">
                  <Text color="$color" fontSize="$4" fontWeight="600">
                    Use Meta glasses source
                  </Text>
                </XStack>
                <Switch
                  value={visionSourceMode === 'meta_glasses'}
                  onValueChange={(value) => {
                    setVisionSourceMode(value ? 'meta_glasses' : 'iphone');
                    if (!value) {
                      setPolicyError(null);
                    }
                  }}
                />
              </XStack>
              <YStack
                borderWidth={1}
                borderColor="$glassBorder"
                borderRadius="$3"
                backgroundColor="$background"
                padding="$2"
                gap="$2"
              >
                <Text color="$colorTertiary" fontSize="$2">
                  Active source: {visionSourceMode === 'meta_glasses' ? 'Meta glasses' : 'iPhone camera + mic'}
                </Text>
                <Text color="$colorTertiary" fontSize="$2">
                  Bridge: {visionSourceMode === 'meta_glasses' ? metaBridgeConnectionState : 'n/a'}
                </Text>
                {visionSourceMode === 'meta_glasses' && metaBridgeStatus.activeDevice ? (
                  <Text color="$colorTertiary" fontSize="$2">
                    Device: {metaBridgeStatus.activeDevice.deviceLabel} ({metaBridgeStatus.activeDevice.deviceId})
                  </Text>
                ) : null}
                {visionSourceMode === 'meta_glasses' ? (
                  <Text color="$colorTertiary" fontSize="$2">
                    Ingress: {metaBridgeStatus.frameIngress.fps.toFixed(1)}fps / {metaBridgeStatus.audioIngress.packetCount} audio packets
                  </Text>
                ) : null}
                {visionSourceMode === 'meta_glasses' ? (
                  <Pressable
                    onPress={
                      metaBridgeConnectionState === 'connected'
                        ? () => {
                            void handleDisconnectMetaBridge();
                          }
                        : () => {
                            void handleConnectMetaBridge();
                          }
                    }
                  >
                    <YStack
                      borderWidth={1}
                      borderColor="$glassBorder"
                      borderRadius="$3"
                      backgroundColor="$surface"
                      padding="$2"
                    >
                      <Text color="$color" fontSize="$3" fontWeight="600">
                        {metaBridgeConnectionState === 'connected'
                          ? 'Disconnect bridge'
                          : metaBridgeConnectionState === 'connecting'
                            ? 'Connecting...'
                            : 'Connect bridge'}
                      </Text>
                    </YStack>
                  </Pressable>
                ) : null}
              </YStack>
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
                    Voice mode
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
          setIsVoiceModeOpen(false);
          mobileVoiceRuntime.clearPartialTranscript();
        }}
        onRecordingComplete={(uri, duration) => {
          void handleVoiceRecording(uri, duration, { autoSend: true });
        }}
        onAudioFrame={(frame) => {
          return handleLiveVoiceFrame(frame);
        }}
        isTranscribing={isTranscribing}
        isLoading={isLoading}
        agentName={agentName}
        agentAvatar={agentAvatar}
        latestUserMessage={latestUserMessage}
        latestAssistantMessage={latestAssistantMessage}
        partialTranscript={mobileVoiceRuntime.partialTranscript}
        isAssistantSpeaking={isAssistantSpeaking}
        onBeforeCapture={() => {
          if (
            shouldBargeInInterruptPlayback({
              isAssistantSpeaking,
              isUserCaptureStarting: true,
            })
          ) {
            void mobileVoiceRuntime.stopPlayback();
            setIsAssistantSpeaking(false);
          }
        }}
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
