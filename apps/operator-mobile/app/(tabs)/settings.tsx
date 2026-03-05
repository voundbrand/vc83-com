import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Share, Switch, TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Sharing from 'expo-sharing';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Languages,
  LogOut,
  Moon,
  Palette,
  Sun,
  UserRound,
} from '@tamagui/lucide-icons';
import { Circle, Text, XStack, YStack, useTheme } from 'tamagui';

import { useAuth } from '../../src/hooks/useAuth';
import { useChatStore } from '../../src/stores/chat';
import {
  AppearancePreference,
  AgentVoiceLanguagePreference,
  LanguagePreference,
  useAppPreferences,
} from '../../src/contexts/AppPreferencesContext';
import {
  l4yercak3Client,
  type OperatorVoiceCatalogEntry,
  type OperatorVoiceLanguageCatalogEntry,
} from '../../src/api/client';
import {
  createDefaultMetaBridgeSnapshot,
  requiresMetaAiAppConnection,
  type MetaBridgeSnapshot,
} from '../../src/lib/av/metaBridge-contracts';
import { metaBridge } from '../../src/lib/av/metaBridge';
import {
  metaBridgeObservability,
  type MetaBridgeObservabilityStatus,
} from '../../src/lib/av/metaBridge-observability';
import {
  buildVoiceLanguageCatalogFromVoices,
  formatVoiceLanguageLabel,
  isVoiceCompatibleWithLanguage,
  resolveVoiceLanguagePreference,
} from '../../src/lib/voice/catalogLanguage';
import { getNativeSwitchColors } from '../../src/theme/tokens';

function OptionRow({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: ReactNode;
}) {
  return (
    <Pressable onPress={onPress}>
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderRadius="$3"
        backgroundColor={selected ? '$glass' : 'transparent'}
      >
        <XStack alignItems="center" gap="$3">
          {icon}
          <Text color="$color" fontSize="$4">
            {label}
          </Text>
        </XStack>
        {selected ? <Check size={18} color="$primary" /> : null}
      </XStack>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user, signOut, currentOrganization, switchOrganization } = useAuth();
  const syncConversations = useChatStore((state) => state.syncConversations);
  const {
    t,
    deviceLanguage,
    deviceVoiceLanguage,
    resolvedLanguage,
    resolvedAgentVoiceLanguage,
    resolvedTheme,
    appearancePreference,
    languagePreference,
    agentName,
    agentVoiceId,
    agentVoiceLanguage,
    autoSpeakReplies,
    setAppearancePreference,
    setLanguagePreference,
    setAgentName,
    setAgentVoiceId,
    setAgentVoiceLanguage,
    setAutoSpeakReplies,
  } = useAppPreferences();
  const [agentNameDraft, setAgentNameDraft] = useState(agentName);
  const [isOrganizationAccordionOpen, setIsOrganizationAccordionOpen] = useState(false);
  const [isSwitchingOrganization, setIsSwitchingOrganization] = useState(false);
  const [organizationSwitchError, setOrganizationSwitchError] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<OperatorVoiceCatalogEntry[]>([]);
  const [availableVoiceLanguages, setAvailableVoiceLanguages] = useState<
    OperatorVoiceLanguageCatalogEntry[]
  >([]);
  const [isVoiceAccordionOpen, setIsVoiceAccordionOpen] = useState(false);
  const [isLanguageAccordionOpen, setIsLanguageAccordionOpen] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [voiceLoadError, setVoiceLoadError] = useState<string | null>(null);
  const [voicePreferenceError, setVoicePreferenceError] = useState<string | null>(null);
  const [voicePreviewError, setVoicePreviewError] = useState<string | null>(null);
  const [isPreviewingVoiceId, setIsPreviewingVoiceId] = useState<string | null>(null);
  const [metaBridgeStatus, setMetaBridgeStatus] = useState<MetaBridgeSnapshot>(
    createDefaultMetaBridgeSnapshot()
  );
  const [isMetaBridgeDebugPanelOpen, setIsMetaBridgeDebugPanelOpen] = useState(false);
  const [metaBridgeObservabilityStatus, setMetaBridgeObservabilityStatus] =
    useState<MetaBridgeObservabilityStatus>(() => metaBridgeObservability.getStatus());
  const [isExportingMetaBridgeLogs, setIsExportingMetaBridgeLogs] = useState(false);
  const [isUploadingMetaBridgeLogs, setIsUploadingMetaBridgeLogs] = useState(false);
  const [isClearingMetaBridgeLogs, setIsClearingMetaBridgeLogs] = useState(false);
  const previewPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const hydratedVoiceFromBackendRef = useRef(false);

  const handleSignOut = () => {
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const appBuild = Constants.expoConfig?.ios?.buildNumber ?? '1';
  const name =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email || t('settings.unknownUser');

  const appearanceLabel = (value: AppearancePreference): string => {
    if (value === 'dark') return t('common.dark');
    if (value === 'light') return t('common.light');
    return t('common.system');
  };

  const languageLabel = (value: LanguagePreference): string => {
    if (value === 'de') return t('common.german');
    if (value === 'en') return t('common.english');
    return t('common.system');
  };
  const selectedAppLanguageLabel =
    languagePreference === 'system'
      ? `${t('common.system')} (${languageLabel(deviceLanguage)})`
      : languageLabel(languagePreference);

  const handleBackToChat = () => {
    router.replace('/(tabs)');
  };
  const isDark = resolvedTheme === 'dark';
  const screenBackgroundColor = String(theme.background?.val || (isDark ? '#111113' : '#f5efe4'));
  const normalizedVoiceLanguage = resolvedAgentVoiceLanguage;
  const normalizedVoiceLanguageLabel = formatVoiceLanguageLabel(normalizedVoiceLanguage);
  const inputBorder = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(23,23,24,0.18)';
  const inputBackground = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.92)';
  const inputColor = isDark ? '#f5efe4' : '#191713';
  const autoSpeakSwitchColors = getNativeSwitchColors({
    isDark,
    isEnabled: autoSpeakReplies,
  });
  const persistentCaptureSwitchColors = getNativeSwitchColors({
    isDark,
    isEnabled: metaBridgeObservabilityStatus.persistentCaptureEnabled,
  });
  const remoteUploadSwitchColors = getNativeSwitchColors({
    isDark,
    isEnabled: metaBridgeObservabilityStatus.remoteUploadEnabled,
  });

  const resolveVoiceLanguageForPreference = useCallback(
    (value: AgentVoiceLanguagePreference) =>
      resolveVoiceLanguagePreference(value, deviceVoiceLanguage),
    [deviceVoiceLanguage]
  );

  useEffect(() => {
    setAgentNameDraft(agentName);
  }, [agentName]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsVoiceLoading(true);
      try {
        const response = await l4yercak3Client.ai.voice.listCatalog();
        if (cancelled) return;
        const voices = response.voices || [];
        setAvailableVoices(voices);
        const catalogLanguages =
          Array.isArray(response.languages) && response.languages.length > 0
            ? response.languages
            : (buildVoiceLanguageCatalogFromVoices(voices) as OperatorVoiceLanguageCatalogEntry[]);
        setAvailableVoiceLanguages(catalogLanguages);
        if (!hydratedVoiceFromBackendRef.current) {
          hydratedVoiceFromBackendRef.current = true;
          if (agentVoiceId === null && response.selectedVoiceId) {
            setAgentVoiceId(response.selectedVoiceId);
          }
          if (agentVoiceLanguage === 'system' && response.selectedLanguage) {
            setAgentVoiceLanguage(response.selectedLanguage);
          }
        }
        setVoiceLoadError(response.warning || null);
      } catch (error) {
        if (cancelled) return;
        setVoiceLoadError(error instanceof Error ? error.message : 'voice_load_failed');
      } finally {
        if (!cancelled) {
          setIsVoiceLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agentVoiceId, agentVoiceLanguage, setAgentVoiceId, setAgentVoiceLanguage]);

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

  useEffect(() => {
    const unsubscribe = metaBridgeObservability.subscribe((status) => {
      setMetaBridgeObservabilityStatus(status);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const resolveMetaBridgeUnavailableMessage = useCallback((status: MetaBridgeSnapshot): string => {
    if (!status.datSdkAvailable || status.failure?.reasonCode === 'dat_sdk_unavailable') {
      return t('settings.metaBridgeDatSdkUnavailableBody');
    }

    const reasonCodes = [status.failure?.reasonCode, status.fallbackReason]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    if (reasonCodes.some((reasonCode) => requiresMetaAiAppConnection(reasonCode))) {
      return t('settings.metaBridgeConnectInMetaAi');
    }

    if (status.failure?.message && status.failure.reasonCode === 'dat_configuration_invalid') {
      return status.failure.message;
    }

    if (status.failure?.message) {
      return status.failure.message;
    }

    return t('settings.metaBridgeUnavailableFallback');
  }, [t]);

  const handleConnectMetaBridge = useCallback(async () => {
    const status = await metaBridge.connect();
    setMetaBridgeStatus(status);
    if (status.connectionState === 'connected') {
      return;
    }
    if (!status.datSdkAvailable) {
      Alert.alert(
        t('settings.metaBridgeDatSdkUnavailableTitle'),
        t('settings.metaBridgeDatSdkUnavailableBody')
      );
      return;
    }
    Alert.alert(
      t('settings.metaBridgeUnavailableTitle'),
      resolveMetaBridgeUnavailableMessage(status)
    );
  }, [resolveMetaBridgeUnavailableMessage, t]);

  const handleDisconnectMetaBridge = useCallback(async () => {
    const status = await metaBridge.disconnect();
    setMetaBridgeStatus(status);
    if (status.connectionState !== 'disconnected' && status.failure?.message) {
      Alert.alert(t('settings.metaBridgeDisconnectFailedTitle'), status.failure.message);
    }
  }, [t]);
  const stopPreviewPlayback = useCallback(() => {
    const player = previewPlayerRef.current;
    previewPlayerRef.current = null;
    if (!player) return;
    try {
      player.pause();
    } catch {
      // Ignore preview pause errors.
    }
    try {
      player.release();
    } catch {
      // Ignore preview release errors.
    }
  }, []);
  const buildVoicePreviewRuntimeContext = useCallback(() => {
    const liveSessionId = `mobile_live_settings_voice_preview_${Date.now().toString(36)}`;
    const sourceMode = 'iphone' as const;
    const voiceRuntime = {
      sourceId: 'settings_voice_preview_source',
      sourceClass: 'settings_voice_preview_source',
      providerId: 'settings_voice_preview',
      sourceMode,
      liveSessionId,
    } as const;
    const transportRuntime = {
      transport: 'chunked_fallback',
      requestedTransport: 'chunked_fallback',
      sourceMode,
      liveSessionId,
    } as const;
    const avObservability = {
      ingressSurface: 'operator_mobile_settings_voice_preview',
      sourceMode,
      liveSessionId,
    } as const;

    return {
      liveSessionId,
      sourceMode,
      voiceRuntime,
      transportRuntime,
      avObservability,
    };
  }, []);
  const persistVoicePreference = useCallback(async (
    nextVoiceId: string | null,
    nextLanguage: string
  ) => {
    setVoicePreferenceError(null);
    try {
      await l4yercak3Client.ai.voice.updatePreferences({
        agentVoiceId: nextVoiceId,
        language: nextLanguage,
      });
    } catch (error) {
      setVoicePreferenceError(
        error instanceof Error ? error.message : 'Failed to sync operator voice preference.'
      );
    }
  }, []);
  useEffect(() => {
    if (!agentVoiceId) {
      return;
    }
    const selected = availableVoices.find((voice) => voice.id === agentVoiceId);
    if (!selected) {
      return;
    }
    if (isVoiceCompatibleWithLanguage(selected, normalizedVoiceLanguage)) {
      return;
    }
    setAgentVoiceId(null);
    setVoicePreferenceError(
      `Selected voice does not match ${normalizedVoiceLanguageLabel} and was reset to default.`
    );
    void (async () => {
      try {
        await l4yercak3Client.ai.voice.updatePreferences({
          agentVoiceId: null,
          language: normalizedVoiceLanguage,
        });
      } catch (error) {
        setVoicePreferenceError(
          error instanceof Error
            ? error.message
            : 'Failed to sync operator voice preference.'
        );
      }
    })();
  }, [
    agentVoiceId,
    availableVoices,
    normalizedVoiceLanguage,
    normalizedVoiceLanguageLabel,
    setAgentVoiceId,
  ]);
  const previewVoice = useCallback(async (voice: OperatorVoiceCatalogEntry) => {
    setVoicePreviewError(null);
    setIsPreviewingVoiceId(voice.id);
    stopPreviewPlayback();

    const previewText = `hello this is ${voice.name} of voice`;
    let openedSession:
      | {
          conversationId?: string;
          interviewSessionId: string;
          voiceSessionId: string;
          providerId: 'browser' | 'elevenlabs';
        }
      | null = null;

    try {
      const runtimeContext = buildVoicePreviewRuntimeContext();
      const resolved = await l4yercak3Client.ai.voice.resolveSession({
        liveSessionId: runtimeContext.liveSessionId,
        sourceMode: runtimeContext.sourceMode,
        voiceRuntime: runtimeContext.voiceRuntime,
      });
      const opened = await l4yercak3Client.ai.voice.openSession({
        conversationId: resolved.conversationId,
        interviewSessionId: resolved.interviewSessionId,
        requestedProviderId: 'elevenlabs',
        requestedVoiceId: voice.id,
        liveSessionId: runtimeContext.liveSessionId,
        sourceMode: runtimeContext.sourceMode,
        voiceRuntime: runtimeContext.voiceRuntime,
        transportRuntime: runtimeContext.transportRuntime,
        avObservability: runtimeContext.avObservability,
        attestationProofToken: resolved.sessionOpenAttestationProof?.token,
      });

      if (!opened.success) {
        throw new Error(opened.error || 'Failed to open ElevenLabs preview session.');
      }

      openedSession = {
        conversationId: opened.conversationId,
        interviewSessionId: opened.interviewSessionId,
        voiceSessionId: opened.voiceSessionId,
        providerId: opened.providerId,
      };

      const synthesis = await l4yercak3Client.ai.voice.synthesize({
        conversationId: opened.conversationId,
        interviewSessionId: opened.interviewSessionId,
        voiceSessionId: opened.voiceSessionId,
        text: previewText,
        requestedProviderId: 'elevenlabs',
        requestedVoiceId: voice.id,
      });

      if (!synthesis.success) {
        throw new Error(synthesis.error || 'Voice preview failed.');
      }
      if (synthesis.providerId !== 'elevenlabs') {
        throw new Error('ElevenLabs preview unavailable: provider fallback in effect.');
      }
      if (!synthesis.audioBase64 || !synthesis.mimeType) {
        throw new Error('ElevenLabs preview returned no playable audio.');
      }

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      const player = createAudioPlayer({
        uri: `data:${synthesis.mimeType};base64,${synthesis.audioBase64}`,
      });
      player.volume = 1;
      previewPlayerRef.current = player;
      player.play();
    } catch (error) {
      Speech.stop();
      Speech.speak(previewText);
      setVoicePreviewError(
        error instanceof Error ? error.message : 'Failed to preview selected voice.'
      );
    } finally {
      if (openedSession) {
        try {
          await l4yercak3Client.ai.voice.closeSession({
            conversationId: openedSession.conversationId,
            interviewSessionId: openedSession.interviewSessionId,
            voiceSessionId: openedSession.voiceSessionId,
            activeProviderId: openedSession.providerId,
            reason: 'settings_voice_preview',
          });
        } catch (error) {
          console.warn('Failed to close voice preview session:', error);
        }
      }
      setIsPreviewingVoiceId(null);
    }
  }, [stopPreviewPlayback]);
  useEffect(() => {
    return () => {
      stopPreviewPlayback();
    };
  }, [stopPreviewPlayback]);
  const resolvedLanguageForPersistence = useMemo(
    () => resolveVoiceLanguageForPreference(agentVoiceLanguage),
    [agentVoiceLanguage, resolveVoiceLanguageForPreference]
  );
  const voiceLanguageOptions = useMemo(() => {
    const options = new Map<string, OperatorVoiceLanguageCatalogEntry>();
    for (const language of availableVoiceLanguages) {
      const key = language.code.trim().toLowerCase();
      if (!key) {
        continue;
      }
      options.set(key, {
        code: key,
        label: language.label || formatVoiceLanguageLabel(key),
        voiceCount: language.voiceCount || 0,
      });
    }
    if (!options.has(normalizedVoiceLanguage)) {
      options.set(normalizedVoiceLanguage, {
        code: normalizedVoiceLanguage,
        label: normalizedVoiceLanguageLabel,
        voiceCount: 0,
      });
    }
    return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [availableVoiceLanguages, normalizedVoiceLanguage, normalizedVoiceLanguageLabel]);
  const handleSelectVoiceLanguage = useCallback((nextPreference: AgentVoiceLanguagePreference) => {
    const nextResolvedLanguage = resolveVoiceLanguageForPreference(nextPreference);
    setAgentVoiceLanguage(nextPreference);
    const selectedVoice = agentVoiceId
      ? availableVoices.find((voice) => voice.id === agentVoiceId) || null
      : null;
    const nextVoiceId =
      selectedVoice && isVoiceCompatibleWithLanguage(selectedVoice, nextResolvedLanguage)
        ? selectedVoice.id
        : null;
    if (nextVoiceId !== agentVoiceId) {
      setAgentVoiceId(nextVoiceId);
      if (selectedVoice && nextVoiceId === null) {
        setVoicePreferenceError(
          `Selected voice does not match ${formatVoiceLanguageLabel(nextResolvedLanguage)} and was reset to default.`
        );
      }
    }
    void persistVoicePreference(nextVoiceId, nextResolvedLanguage);
  }, [
    agentVoiceId,
    availableVoices,
    persistVoicePreference,
    resolveVoiceLanguageForPreference,
    setAgentVoiceId,
    setAgentVoiceLanguage,
  ]);
  const languageCompatibleVoices = useMemo(
    () => availableVoices.filter((voice) => isVoiceCompatibleWithLanguage(voice, normalizedVoiceLanguage)),
    [availableVoices, normalizedVoiceLanguage]
  );
  const displayedVoices = languageCompatibleVoices;
  const selectedVoice =
    agentVoiceId === null ? null : availableVoices.find((voice) => voice.id === agentVoiceId) || null;
  const selectedVoiceLanguageLabel =
    agentVoiceLanguage === 'system'
      ? `System (${formatVoiceLanguageLabel(deviceVoiceLanguage)})`
      : normalizedVoiceLanguageLabel;
  const selectedVoiceLabel =
    selectedVoice?.name || (agentVoiceId ? `Operator voice (${agentVoiceId})` : 'One-of-One default (ElevenLabs)');
  const isDatSdkAvailable = metaBridgeStatus.datSdkAvailable;
  const canConnectMetaBridge =
    metaBridgeStatus.connectionState !== 'connected'
    && metaBridgeStatus.connectionState !== 'connecting';
  const canDisconnectMetaBridge =
    metaBridgeStatus.connectionState === 'connected'
    || metaBridgeStatus.connectionState === 'connecting';
  const organizations = user?.organizations || [];
  const bridgeFailureLabel = useMemo(() => {
    if (!metaBridgeStatus.failure && !metaBridgeStatus.fallbackReason) {
      return null;
    }
    return resolveMetaBridgeUnavailableMessage(metaBridgeStatus);
  }, [metaBridgeStatus, resolveMetaBridgeUnavailableMessage]);
  const metaBridgeDebugEvents = useMemo(
    () => (Array.isArray(metaBridgeStatus.debugEvents) ? metaBridgeStatus.debugEvents : []),
    [metaBridgeStatus.debugEvents]
  );
  const renderMetaBridgeDeviceList = useCallback((devices: unknown): string => {
    if (!Array.isArray(devices) || devices.length === 0) {
      return 'none';
    }
    return devices
      .map((entry) => {
        const device = entry as {
          deviceId?: string;
          deviceLabel?: string;
          connected?: boolean;
        };
        const label = device.deviceLabel || 'Unknown device';
        const id = device.deviceId || 'unknown';
        const connectedTag = device.connected ? ' [connected]' : '';
        return `${label} (${id})${connectedTag}`;
      })
      .join(', ');
  }, []);
  const buildMetaBridgeDebugDump = useCallback(() => JSON.stringify({
    generatedAtIso: new Date().toISOString(),
    snapshot: {
      connectionState: metaBridgeStatus.connectionState,
      datSdkAvailable: metaBridgeStatus.datSdkAvailable,
      activeDevice: metaBridgeStatus.activeDevice,
      failure: metaBridgeStatus.failure,
      fallbackReason: metaBridgeStatus.fallbackReason,
      diagnostics: metaBridgeStatus.diagnostics,
      frameIngress: metaBridgeStatus.frameIngress,
      audioIngress: metaBridgeStatus.audioIngress,
      updatedAtMs: metaBridgeStatus.updatedAtMs,
    },
    events: metaBridgeDebugEvents,
  }, null, 2), [metaBridgeDebugEvents, metaBridgeStatus]);
  const handleCopyMetaBridgeDebugLogs = useCallback(async () => {
    await Clipboard.setStringAsync(buildMetaBridgeDebugDump());
    Alert.alert('Copied', 'Meta bridge debug logs copied to clipboard.');
  }, [buildMetaBridgeDebugDump]);
  const formatBytes = useCallback((bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '0 B';
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, []);
  const formatOptionalDateTime = useCallback((atMs: number | null): string => {
    if (!atMs || !Number.isFinite(atMs)) {
      return 'never';
    }
    return new Date(atMs).toLocaleString();
  }, []);
  const handleTogglePersistentCapture = useCallback(async (value: boolean) => {
    try {
      await metaBridgeObservability.setPersistentCaptureEnabled(value);
    } catch (error) {
      Alert.alert(
        'Persistent logs',
        error instanceof Error ? error.message : 'Failed to update persistent log setting.'
      );
    }
  }, []);
  const handleToggleRemoteUpload = useCallback(async (value: boolean) => {
    try {
      await metaBridgeObservability.setRemoteUploadEnabled(value);
    } catch (error) {
      Alert.alert(
        'Remote upload',
        error instanceof Error ? error.message : 'Failed to update remote upload setting.'
      );
    }
  }, []);
  const handleExportMetaBridgeLogs = useCallback(async () => {
    if (isExportingMetaBridgeLogs) {
      return;
    }
    setIsExportingMetaBridgeLogs(true);
    try {
      const result = await metaBridgeObservability.exportLogsWithFallback({
        tryShareFile: async (file) => {
          const canShareFile = await Sharing.isAvailableAsync();
          if (!canShareFile) {
            return {
              ok: false,
              reason: 'File sharing unavailable on this device.',
            };
          }
          try {
            await Sharing.shareAsync(file.uri, {
              mimeType: 'application/json',
              dialogTitle: 'Export Meta bridge logs',
              UTI: 'public.json',
            });
            return {
              ok: true,
              reason: 'Bridge logs exported and shared as a JSON file.',
            };
          } catch (error) {
            return {
              ok: false,
              reason: error instanceof Error ? error.message : 'Failed to share exported file.',
            };
          }
        },
        tryShareJson: async (jsonPayload) => {
          try {
            const shareResult = await Share.share({
              message: jsonPayload.payload,
              title: 'Meta bridge logs',
            });
            if (shareResult.action === Share.dismissedAction) {
              return {
                ok: false,
                reason: 'JSON share was dismissed.',
              };
            }
            return {
              ok: true,
              reason: 'Bridge logs shared as JSON text.',
            };
          } catch (error) {
            return {
              ok: false,
              reason: error instanceof Error ? error.message : 'Failed to share JSON text.',
            };
          }
        },
        tryClipboard: async (jsonPayload) => {
          try {
            await Clipboard.setStringAsync(jsonPayload.payload);
            return {
              ok: true,
              reason: 'Bridge logs copied to clipboard as JSON text.',
            };
          } catch (error) {
            return {
              ok: false,
              reason: error instanceof Error ? error.message : 'Failed to copy logs to clipboard.',
            };
          }
        },
      });

      if (result.ok) {
        Alert.alert('Export complete', result.reason);
      } else {
        Alert.alert('Export failed', result.reason);
      }
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Failed to export bridge logs.');
    } finally {
      setIsExportingMetaBridgeLogs(false);
    }
  }, [isExportingMetaBridgeLogs]);
  const handleUploadMetaBridgeLogsNow = useCallback(async () => {
    if (isUploadingMetaBridgeLogs) {
      return;
    }
    setIsUploadingMetaBridgeLogs(true);
    try {
      await metaBridgeObservability.uploadNow();
      const status = metaBridgeObservability.getStatus();
      if (status.lastUploadError) {
        Alert.alert('Upload finished', `Upload did not complete: ${status.lastUploadError}`);
      } else {
        Alert.alert('Upload finished', 'Queued bridge logs were uploaded successfully.');
      }
    } catch (error) {
      Alert.alert(
        'Upload failed',
        error instanceof Error ? error.message : 'Failed to upload bridge logs.'
      );
    } finally {
      setIsUploadingMetaBridgeLogs(false);
    }
  }, [isUploadingMetaBridgeLogs]);
  const handleClearMetaBridgeLogs = useCallback(() => {
    if (isClearingMetaBridgeLogs) {
      return;
    }
    Alert.alert(
      'Clear persisted logs',
      'This will remove all persisted bridge logs and queued uploads.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setIsClearingMetaBridgeLogs(true);
            void (async () => {
              try {
                await metaBridgeObservability.clearPersistedLogs();
              } catch (error) {
                Alert.alert(
                  'Clear failed',
                  error instanceof Error ? error.message : 'Failed to clear bridge logs.'
                );
              } finally {
                setIsClearingMetaBridgeLogs(false);
              }
            })();
          },
        },
      ]
    );
  }, [isClearingMetaBridgeLogs]);
  const handleOrganizationSwitch = useCallback(async (organizationId: string) => {
    if (!organizationId || organizationId === currentOrganization?.id || isSwitchingOrganization) {
      return;
    }

    setOrganizationSwitchError(null);
    setIsSwitchingOrganization(true);

    try {
      await switchOrganization(organizationId);
      await syncConversations();
      setIsOrganizationAccordionOpen(false);
    } catch (error) {
      setOrganizationSwitchError(
        error instanceof Error ? error.message : t('settings.organizationSwitchFailed')
      );
    } finally {
      setIsSwitchingOrganization(false);
    }
  }, [currentOrganization?.id, isSwitchingOrganization, switchOrganization, syncConversations, t]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBackgroundColor }} edges={['left', 'right', 'bottom']}>
      <YStack flex={1} backgroundColor="$background">
        <ScrollView
          style={{ backgroundColor: screenBackgroundColor }}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24), flexGrow: 1 }}
        >
          <YStack paddingTop={insets.top + 8}>
            <XStack paddingHorizontal="$4" paddingBottom="$3" alignItems="center">
              <Pressable onPress={handleBackToChat}>
                <XStack alignItems="center" gap="$2">
                  <ChevronLeft size={18} color="$colorTertiary" />
                  <Text color="$colorTertiary" fontSize="$4" fontWeight="600">
                    Back
                  </Text>
                </XStack>
              </Pressable>
            </XStack>

            <YStack paddingHorizontal="$4" paddingBottom="$4" gap="$1">
              <Text color="$color" fontSize="$7" fontWeight="700">
                {t('settings.title')}
              </Text>
            </YStack>

            <YStack borderTopWidth={1} borderBottomWidth={1} borderColor="$borderColor">
              <YStack paddingHorizontal="$4" paddingVertical="$4" gap="$3">
                <Text color="$colorTertiary" fontSize="$2" textTransform="uppercase" letterSpacing={0.8}>
                  {t('settings.account')}
                </Text>
                <XStack alignItems="center" gap="$3">
                  <Circle size={54} backgroundColor="$primary" alignItems="center" justifyContent="center">
                    <UserRound size={24} color="white" />
                  </Circle>
                  <YStack flex={1}>
                    <Text color="$color" fontSize="$5" fontWeight="600" numberOfLines={1}>
                      {name}
                    </Text>
                    <Text color="$colorTertiary" fontSize="$3" numberOfLines={1}>
                      {user?.email || t('common.unknown')}
                    </Text>
                  </YStack>
                </XStack>
              </YStack>
            </YStack>

            <YStack borderBottomWidth={1} borderColor="$borderColor" paddingHorizontal="$4" paddingVertical="$4" gap="$2">
              <Text color="$colorTertiary" fontSize="$2" textTransform="uppercase" letterSpacing={0.8}>
                {t('settings.organization')}
              </Text>
              <Text color="$color" fontSize="$4" fontWeight="600">
                {currentOrganization?.name || t('settings.noOrganization')}
              </Text>
              <Text color="$colorTertiary" fontSize="$3">
                {currentOrganization?.role?.name || t('settings.member')}
              </Text>
              {organizations.length > 1 ? (
                <YStack gap="$2" paddingTop="$1">
                  <Text color="$primary" fontSize="$3">
                    {t('settings.organizationsAvailable', { count: organizations.length })}
                  </Text>
                  <Pressable
                    disabled={isSwitchingOrganization}
                    onPress={() => setIsOrganizationAccordionOpen((open) => !open)}
                  >
                    <XStack
                      alignItems="center"
                      justifyContent="space-between"
                      paddingHorizontal="$3"
                      paddingVertical="$2"
                      borderRadius="$3"
                      borderWidth={1}
                      borderColor="$borderColor"
                      opacity={isSwitchingOrganization ? 0.6 : 1}
                    >
                      <Text color="$color" fontSize="$3" fontWeight="600">
                        {isSwitchingOrganization
                          ? t('settings.switchingOrganization')
                          : t('settings.switchOrganization')}
                      </Text>
                      {isOrganizationAccordionOpen ? (
                        <ChevronUp size={16} color="$colorTertiary" />
                      ) : (
                        <ChevronDown size={16} color="$colorTertiary" />
                      )}
                    </XStack>
                  </Pressable>
                  {isOrganizationAccordionOpen ? (
                    <YStack
                      borderWidth={1}
                      borderColor="$borderColor"
                      borderRadius="$3"
                      overflow="hidden"
                    >
                      {organizations.map((organization) => {
                        const isSelected = organization.id === currentOrganization?.id;
                        const organizationRole =
                          organization.role?.name?.trim() || t('settings.member');

                        return (
                          <Pressable
                            key={organization.id}
                            disabled={isSwitchingOrganization || isSelected}
                            onPress={() => {
                              void handleOrganizationSwitch(organization.id);
                            }}
                          >
                            <XStack
                              alignItems="center"
                              justifyContent="space-between"
                              paddingHorizontal="$3"
                              paddingVertical="$2"
                              backgroundColor={isSelected ? '$glass' : 'transparent'}
                              opacity={isSwitchingOrganization && !isSelected ? 0.6 : 1}
                            >
                              <YStack flex={1}>
                                <Text color="$color" fontSize="$3" fontWeight={isSelected ? '600' : '500'}>
                                  {organization.name}
                                </Text>
                                <Text color="$colorTertiary" fontSize="$2">
                                  {organizationRole}
                                </Text>
                              </YStack>
                              {isSelected ? (
                                <XStack alignItems="center" gap="$2">
                                  <Text color="$primary" fontSize="$2" fontWeight="600">
                                    {t('settings.currentOrganizationBadge')}
                                  </Text>
                                  <Check size={16} color="$primary" />
                                </XStack>
                              ) : null}
                            </XStack>
                          </Pressable>
                        );
                      })}
                    </YStack>
                  ) : null}
                  {organizationSwitchError ? (
                    <Text color="$error" fontSize="$2">
                      {organizationSwitchError}
                    </Text>
                  ) : null}
                </YStack>
              ) : null}
            </YStack>

            <YStack borderBottomWidth={1} borderColor="$borderColor" paddingVertical="$3">
              <YStack paddingHorizontal="$4" paddingBottom="$3" gap="$2">
                <Text color="$colorTertiary" fontSize="$2" textTransform="uppercase" letterSpacing={0.8}>
                  {t('settings.agent')}
                </Text>

                <YStack gap="$2">
                  <Text color="$colorSecondary" fontSize="$3">
                    {t('settings.agentName')}
                  </Text>
                  <TextInput
                    value={agentNameDraft}
                    onChangeText={setAgentNameDraft}
                    onBlur={() => setAgentName(agentNameDraft)}
                    placeholder={t('settings.agentNamePlaceholder')}
                    maxLength={40}
                    style={{
                      borderWidth: 1,
                      borderColor: inputBorder,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      color: inputColor,
                      backgroundColor: inputBackground,
                    }}
                  />
                </YStack>

                <YStack gap="$2">
                  <Text color="$colorSecondary" fontSize="$3">
                    {t('settings.agentVoice')}
                  </Text>
                  <Pressable onPress={() => setIsVoiceAccordionOpen((open) => !open)}>
                    <XStack
                      alignItems="center"
                      justifyContent="space-between"
                      paddingHorizontal="$4"
                      paddingVertical="$3"
                      borderRadius="$3"
                      borderWidth={1}
                      borderColor="$borderColor"
                    >
                      <YStack flex={1} gap="$1">
                        <Text color="$color" fontSize="$4" fontWeight="600" numberOfLines={1}>
                          {selectedVoiceLabel}
                        </Text>
                        <Text color="$colorTertiary" fontSize="$2">
                          One-of-One operator voice. Tap a voice to hear: hello this is [name] of voice
                        </Text>
                      </YStack>
                      {isVoiceAccordionOpen ? (
                        <ChevronUp size={18} color="$colorTertiary" />
                      ) : (
                        <ChevronDown size={18} color="$colorTertiary" />
                      )}
                    </XStack>
                  </Pressable>
                  {isVoiceAccordionOpen ? (
                    <YStack gap="$1" paddingTop="$1">
                      <Text color="$colorSecondary" fontSize="$2" fontWeight="600" paddingHorizontal="$4">
                        Voice language
                      </Text>
                      <OptionRow
                        label={`System (${formatVoiceLanguageLabel(deviceVoiceLanguage)})`}
                        selected={agentVoiceLanguage === 'system'}
                        onPress={() => {
                          handleSelectVoiceLanguage('system');
                        }}
                      />
                      {voiceLanguageOptions.map((languageOption) => (
                        <OptionRow
                          key={languageOption.code}
                          label={`${languageOption.label} (${languageOption.code.toUpperCase()})`}
                          selected={agentVoiceLanguage !== 'system' && normalizedVoiceLanguage === languageOption.code}
                          onPress={() => {
                            handleSelectVoiceLanguage(languageOption.code);
                          }}
                        />
                      ))}
                      <Text color="$colorSecondary" fontSize="$2" fontWeight="600" paddingHorizontal="$4" paddingTop="$1">
                        Voice
                      </Text>
                      <OptionRow
                        label="One-of-One default (ElevenLabs)"
                        selected={agentVoiceId === null}
                        onPress={() => {
                          setAgentVoiceId(null);
                          void persistVoicePreference(null, resolvedLanguageForPersistence);
                        }}
                      />
                      {isVoiceLoading ? (
                        <Text color="$colorTertiary" fontSize="$2">
                          Loading ElevenLabs voices...
                        </Text>
                      ) : null}
                      {!isVoiceLoading ? (
                        <Text color="$colorTertiary" fontSize="$2">
                          Showing voices for language: {selectedVoiceLanguageLabel}
                        </Text>
                      ) : null}
                      {displayedVoices.map((voice) => (
                        <OptionRow
                          key={voice.id}
                          label={isPreviewingVoiceId === voice.id ? `${voice.name} (previewing...)` : voice.name}
                          selected={agentVoiceId === voice.id}
                          onPress={() => {
                            setAgentVoiceId(voice.id);
                            void persistVoicePreference(voice.id, resolvedLanguageForPersistence);
                            void previewVoice(voice);
                          }}
                        />
                      ))}
                      {!isVoiceLoading && displayedVoices.length === 0 && !voiceLoadError ? (
                        <Text color="$colorTertiary" fontSize="$2">
                          No ElevenLabs voices match {selectedVoiceLanguageLabel} for this organization.
                        </Text>
                      ) : null}
                      {voiceLoadError ? (
                        <Text color="$error" fontSize="$2">
                          {voiceLoadError}
                        </Text>
                      ) : null}
                      {voicePreferenceError ? (
                        <Text color="$error" fontSize="$2">
                          {voicePreferenceError}
                        </Text>
                      ) : null}
                      {voicePreviewError ? (
                        <Text color="$error" fontSize="$2">
                          {voicePreviewError}
                        </Text>
                      ) : null}
                    </YStack>
                  ) : null}
                </YStack>

                <XStack alignItems="center" justifyContent="space-between" paddingTop="$1">
                  <Text color="$colorSecondary" fontSize="$3">
                    {t('settings.autoSpeakReplies')}
                  </Text>
                  <Switch
                    value={autoSpeakReplies}
                    onValueChange={setAutoSpeakReplies}
                    {...autoSpeakSwitchColors}
                  />
                </XStack>
              </YStack>

              <YStack borderTopWidth={1} borderColor="$borderColor" paddingTop="$3">
              <YStack paddingHorizontal="$4" paddingBottom="$2" gap="$1">
                <XStack alignItems="center" gap="$2">
                  <Palette size={18} color="$colorTertiary" />
                  <Text color="$colorTertiary" fontSize="$2" textTransform="uppercase" letterSpacing={0.8}>
                    {t('settings.appearance')}
                  </Text>
                </XStack>
                <Text color="$colorTertiary" fontSize="$2">
                  {t('settings.currentTheme', { theme: appearanceLabel(resolvedTheme) })}
                </Text>
              </YStack>

              <OptionRow
                label={t('common.system')}
                selected={appearancePreference === 'system'}
                onPress={() => setAppearancePreference('system')}
                icon={<Palette size={18} color="$colorTertiary" />}
              />
              <OptionRow
                label={t('common.dark')}
                selected={appearancePreference === 'dark'}
                onPress={() => setAppearancePreference('dark')}
                icon={<Moon size={18} color="$colorTertiary" />}
              />
              <OptionRow
                label={t('common.light')}
                selected={appearancePreference === 'light'}
                onPress={() => setAppearancePreference('light')}
                icon={<Sun size={18} color="$colorTertiary" />}
              />
            </YStack>
            </YStack>

            <YStack borderBottomWidth={1} borderColor="$borderColor" paddingHorizontal="$4" paddingVertical="$4" gap="$2">
              <Text color="$colorTertiary" fontSize="$2" textTransform="uppercase" letterSpacing={0.8}>
                Vision Source
              </Text>
              <Text color="$colorSecondary" fontSize="$3">
                Native module: {metaBridge.isNativeAvailable() ? 'available' : 'not available'}
              </Text>
              <Text color="$colorSecondary" fontSize="$3">
                DAT SDK: {isDatSdkAvailable ? 'available' : 'not available'}
              </Text>
              <Text color="$colorSecondary" fontSize="$3">
                Bridge status: {metaBridgeStatus.connectionState}
              </Text>
              {metaBridgeStatus.activeDevice ? (
                <Text color="$colorSecondary" fontSize="$3">
                  Device: {metaBridgeStatus.activeDevice.deviceLabel} ({metaBridgeStatus.activeDevice.deviceId})
                </Text>
              ) : null}
              {bridgeFailureLabel ? (
                <Text color="$error" fontSize="$2">
                  {bridgeFailureLabel}
                </Text>
              ) : null}
              <XStack gap="$2" paddingTop="$2">
                <Pressable
                  disabled={!canConnectMetaBridge}
                  onPress={() => {
                    void handleConnectMetaBridge();
                  }}
                >
                  <XStack
                    backgroundColor="$glass"
                    borderWidth={1}
                    borderColor="$glassBorder"
                    borderRadius="$3"
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    opacity={canConnectMetaBridge ? 1 : 0.5}
                  >
                    <Text color="$color" fontSize="$3" fontWeight="600">
                      {t('settings.metaBridgeConnectAction')}
                    </Text>
                  </XStack>
                </Pressable>
                <Pressable
                  disabled={!canDisconnectMetaBridge}
                  onPress={() => { void handleDisconnectMetaBridge(); }}
                >
                  <XStack
                    backgroundColor="$glass"
                    borderWidth={1}
                    borderColor="$glassBorder"
                    borderRadius="$3"
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    opacity={canDisconnectMetaBridge ? 1 : 0.5}
                  >
                    <Text color="$color" fontSize="$3" fontWeight="600">
                      {t('settings.metaBridgeDisconnectAction')}
                    </Text>
                  </XStack>
                </Pressable>
              </XStack>
              <YStack borderWidth={1} borderColor="$borderColor" borderRadius="$3" overflow="hidden">
                <Pressable onPress={() => setIsMetaBridgeDebugPanelOpen((open) => !open)}>
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    backgroundColor="$glass"
                  >
                    <Text color="$color" fontSize="$3" fontWeight="600">
                      Bridge debug logs ({metaBridgeDebugEvents.length})
                    </Text>
                    {isMetaBridgeDebugPanelOpen ? (
                      <ChevronUp size={16} color="$colorTertiary" />
                    ) : (
                      <ChevronDown size={16} color="$colorTertiary" />
                    )}
                  </XStack>
                </Pressable>
                {isMetaBridgeDebugPanelOpen ? (
                  <YStack paddingHorizontal="$3" paddingVertical="$2" gap="$2" maxHeight={360}>
                    <Text color="$colorSecondary" fontSize="$2">
                      Bluetooth adapter: {metaBridgeStatus.diagnostics.bluetoothAdapterState || 'unknown'}
                    </Text>
                    <Text color="$colorSecondary" fontSize="$2">
                      Bluetooth permission: {metaBridgeStatus.diagnostics.permissions?.bluetooth || 'unknown'}
                    </Text>
                    <Text color="$colorSecondary" fontSize="$2">
                      Camera permission: {metaBridgeStatus.diagnostics.permissions?.camera || 'unknown'}
                    </Text>
                    <Text color="$colorSecondary" fontSize="$2">
                      Microphone permission: {metaBridgeStatus.diagnostics.permissions?.microphone || 'unknown'}
                    </Text>
                    <Text color="$colorSecondary" fontSize="$2">
                      Registration: {metaBridgeStatus.diagnostics.registrationState || 'unknown'}
                    </Text>
                    <Text color="$colorSecondary" fontSize="$2">
                      Discovered devices: {renderMetaBridgeDeviceList(metaBridgeStatus.diagnostics.discoveredDevices)}
                    </Text>
                    <Text color="$colorSecondary" fontSize="$2">
                      Paired devices: {renderMetaBridgeDeviceList(metaBridgeStatus.diagnostics.pairedDevices)}
                    </Text>
                    <Pressable
                      onPress={() => {
                        void handleCopyMetaBridgeDebugLogs();
                      }}
                    >
                      <XStack
                        alignSelf="flex-start"
                        borderWidth={1}
                        borderColor="$glassBorder"
                        borderRadius="$3"
                        paddingHorizontal="$3"
                        paddingVertical="$2"
                        backgroundColor="$glass"
                      >
                        <Text color="$color" fontSize="$2" fontWeight="600">
                          Copy logs
                        </Text>
                      </XStack>
                    </Pressable>
                    {metaBridgeDebugEvents.length === 0 ? (
                      <Text color="$colorTertiary" fontSize="$2">
                        No bridge events yet.
                      </Text>
                    ) : (
                      <YStack gap="$1">
                        {metaBridgeDebugEvents.slice(-80).reverse().map((event) => {
                          const details =
                            event.details && Object.keys(event.details).length > 0
                              ? ` | ${JSON.stringify(event.details)}`
                              : '';
                          return (
                            <Text key={event.id} color="$colorTertiary" fontSize="$1">
                              [{new Date(event.atMs).toLocaleTimeString()}] [{event.stage}] [{event.code}] {event.message}{details}
                            </Text>
                          );
                        })}
                      </YStack>
                    )}
                  </YStack>
                ) : null}
              </YStack>
              <YStack
                borderWidth={1}
                borderColor="$borderColor"
                borderRadius="$3"
                paddingHorizontal="$3"
                paddingVertical="$3"
                gap="$2"
              >
                <Text color="$color" fontSize="$3" fontWeight="600">
                  Persistent Logs
                </Text>
                <XStack alignItems="center" justifyContent="space-between" gap="$3">
                  <YStack flex={1}>
                    <Text color="$colorSecondary" fontSize="$2">
                      Enable persistent capture
                    </Text>
                    <Text color="$colorTertiary" fontSize="$1">
                      Keep bridge diagnostics across app restarts.
                    </Text>
                  </YStack>
                  <Switch
                    value={metaBridgeObservabilityStatus.persistentCaptureEnabled}
                    onValueChange={(value) => {
                      void handleTogglePersistentCapture(value);
                    }}
                    {...persistentCaptureSwitchColors}
                  />
                </XStack>
                <XStack alignItems="center" justifyContent="space-between" gap="$3">
                  <YStack flex={1}>
                    <Text color="$colorSecondary" fontSize="$2">
                      Enable remote upload
                    </Text>
                    <Text color="$colorTertiary" fontSize="$1">
                      Upload batched, redacted logs to configured endpoint.
                    </Text>
                  </YStack>
                  <Switch
                    disabled={!metaBridgeObservabilityStatus.remoteUploadConfigured}
                    value={metaBridgeObservabilityStatus.remoteUploadEnabled}
                    onValueChange={(value) => {
                      void handleToggleRemoteUpload(value);
                    }}
                    {...remoteUploadSwitchColors}
                  />
                </XStack>
                {!metaBridgeObservabilityStatus.remoteUploadConfigured ? (
                  <Text color="$colorTertiary" fontSize="$1">
                    Set `EXPO_PUBLIC_META_BRIDGE_LOG_UPLOAD_ENDPOINT` to enable remote upload.
                  </Text>
                ) : null}
                <XStack flexWrap="wrap" gap="$2" paddingTop="$1">
                  <Pressable
                    disabled={isExportingMetaBridgeLogs}
                    onPress={() => {
                      void handleExportMetaBridgeLogs();
                    }}
                  >
                    <XStack
                      borderWidth={1}
                      borderColor="$glassBorder"
                      borderRadius="$3"
                      paddingHorizontal="$3"
                      paddingVertical="$2"
                      backgroundColor="$glass"
                      opacity={isExportingMetaBridgeLogs ? 0.6 : 1}
                    >
                      <Text color="$color" fontSize="$2" fontWeight="600">
                        {isExportingMetaBridgeLogs ? 'Exporting...' : 'Export logs'}
                      </Text>
                    </XStack>
                  </Pressable>
                  <Pressable
                    disabled={
                      !metaBridgeObservabilityStatus.remoteUploadConfigured
                      || isUploadingMetaBridgeLogs
                      || metaBridgeObservabilityStatus.queuedUploadCount === 0
                    }
                    onPress={() => {
                      void handleUploadMetaBridgeLogsNow();
                    }}
                  >
                    <XStack
                      borderWidth={1}
                      borderColor="$glassBorder"
                      borderRadius="$3"
                      paddingHorizontal="$3"
                      paddingVertical="$2"
                      backgroundColor="$glass"
                      opacity={
                        !metaBridgeObservabilityStatus.remoteUploadConfigured
                        || isUploadingMetaBridgeLogs
                        || metaBridgeObservabilityStatus.queuedUploadCount === 0
                          ? 0.5
                          : 1
                      }
                    >
                      <Text color="$color" fontSize="$2" fontWeight="600">
                        {isUploadingMetaBridgeLogs ? 'Uploading...' : 'Upload now'}
                      </Text>
                    </XStack>
                  </Pressable>
                  <Pressable
                    disabled={isClearingMetaBridgeLogs}
                    onPress={handleClearMetaBridgeLogs}
                  >
                    <XStack
                      borderWidth={1}
                      borderColor="rgba(239, 68, 68, 0.35)"
                      borderRadius="$3"
                      paddingHorizontal="$3"
                      paddingVertical="$2"
                      backgroundColor="rgba(239, 68, 68, 0.12)"
                      opacity={isClearingMetaBridgeLogs ? 0.6 : 1}
                    >
                      <Text color="$error" fontSize="$2" fontWeight="600">
                        {isClearingMetaBridgeLogs ? 'Clearing...' : 'Clear logs'}
                      </Text>
                    </XStack>
                  </Pressable>
                </XStack>
                <YStack gap="$1" paddingTop="$1">
                  <Text color="$colorSecondary" fontSize="$2">
                    Persisted events: {metaBridgeObservabilityStatus.persistedEventCount}
                  </Text>
                  <Text color="$colorSecondary" fontSize="$2">
                    File size: {formatBytes(metaBridgeObservabilityStatus.persistedSizeBytes)}
                  </Text>
                  <Text color="$colorSecondary" fontSize="$2">
                    Queued uploads: {metaBridgeObservabilityStatus.queuedUploadCount}
                  </Text>
                  <Text color="$colorSecondary" fontSize="$2">
                    Upload status: {metaBridgeObservabilityStatus.isUploadInFlight ? 'uploading' : 'idle'}
                  </Text>
                  <Text color="$colorSecondary" fontSize="$2">
                    Last upload: {formatOptionalDateTime(metaBridgeObservabilityStatus.lastUploadAtMs)}
                  </Text>
                  {metaBridgeObservabilityStatus.lastUploadError ? (
                    <Text color="$error" fontSize="$1">
                      Last upload error: {metaBridgeObservabilityStatus.lastUploadError}
                    </Text>
                  ) : (
                    <Text color="$colorTertiary" fontSize="$1">
                      Last upload result: {metaBridgeObservabilityStatus.lastUploadAtMs ? 'success' : 'none yet'}
                    </Text>
                  )}
                  {metaBridgeObservabilityStatus.nextRetryAtMs ? (
                    <Text color="$colorTertiary" fontSize="$1">
                      Next retry: {formatOptionalDateTime(metaBridgeObservabilityStatus.nextRetryAtMs)}
                    </Text>
                  ) : null}
                  {metaBridgeObservabilityStatus.lastStorageError ? (
                    <Text color="$error" fontSize="$1">
                      Storage warning: {metaBridgeObservabilityStatus.lastStorageError}
                    </Text>
                  ) : null}
                </YStack>
              </YStack>
            </YStack>

            <YStack borderBottomWidth={1} borderColor="$borderColor" paddingVertical="$3">
              <YStack paddingHorizontal="$4" paddingBottom="$2" gap="$1">
                <XStack alignItems="center" gap="$2">
                  <Languages size={18} color="$colorTertiary" />
                  <Text color="$colorTertiary" fontSize="$2" textTransform="uppercase" letterSpacing={0.8}>
                    {t('settings.language')}
                  </Text>
                </XStack>
                <Text color="$colorTertiary" fontSize="$2">
                  {t('settings.deviceLanguage', { language: languageLabel(deviceLanguage) })}
                </Text>
                <Text color="$colorTertiary" fontSize="$2">
                  {t('settings.currentLanguage', { language: languageLabel(resolvedLanguage) })}
                </Text>
              </YStack>

              <YStack paddingHorizontal="$4">
                <Pressable onPress={() => setIsLanguageAccordionOpen((open) => !open)}>
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    paddingHorizontal="$4"
                    paddingVertical="$3"
                    borderRadius="$3"
                    borderWidth={1}
                    borderColor="$borderColor"
                  >
                    <Text color="$color" fontSize="$4" fontWeight="600" numberOfLines={1}>
                      {selectedAppLanguageLabel}
                    </Text>
                    {isLanguageAccordionOpen ? (
                      <ChevronUp size={18} color="$colorTertiary" />
                    ) : (
                      <ChevronDown size={18} color="$colorTertiary" />
                    )}
                  </XStack>
                </Pressable>
              </YStack>

              {isLanguageAccordionOpen ? (
                <YStack gap="$1" paddingTop="$1">
                  <OptionRow
                    label={`${t('common.system')} (${languageLabel(deviceLanguage)})`}
                    selected={languagePreference === 'system'}
                    onPress={() => {
                      setLanguagePreference('system');
                      setIsLanguageAccordionOpen(false);
                    }}
                  />
                  <OptionRow
                    label={t('common.english')}
                    selected={languagePreference === 'en'}
                    onPress={() => {
                      setLanguagePreference('en');
                      setIsLanguageAccordionOpen(false);
                    }}
                  />
                  <OptionRow
                    label={t('common.german')}
                    selected={languagePreference === 'de'}
                    onPress={() => {
                      setLanguagePreference('de');
                      setIsLanguageAccordionOpen(false);
                    }}
                  />
                </YStack>
              ) : null}
            </YStack>

            <YStack borderBottomWidth={1} borderColor="$borderColor" paddingHorizontal="$4" paddingVertical="$4" gap="$2">
              <Text color="$colorTertiary" fontSize="$2" textTransform="uppercase" letterSpacing={0.8}>
                {t('settings.app')}
              </Text>
              <XStack justifyContent="space-between">
                <Text color="$colorSecondary" fontSize="$3">
                  {t('settings.version')}
                </Text>
                <Text color="$color" fontSize="$3" fontWeight="600">
                  {appVersion}
                </Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$colorSecondary" fontSize="$3">
                  {t('settings.build')}
                </Text>
                <Text color="$color" fontSize="$3" fontWeight="600">
                  {appBuild}
                </Text>
              </XStack>
            </YStack>

            <YStack paddingHorizontal="$4" paddingTop="$5">
              <Pressable onPress={handleSignOut}>
                <XStack
                  backgroundColor="rgba(239, 68, 68, 0.12)"
                  borderWidth={1}
                  borderColor="rgba(239, 68, 68, 0.28)"
                  borderRadius="$4"
                  alignItems="center"
                  justifyContent="center"
                  gap="$2"
                  paddingVertical="$3"
                >
                  <LogOut size={18} color="$error" />
                  <Text color="$error" fontSize="$4" fontWeight="600">
                    {t('settings.signOut')}
                  </Text>
                </XStack>
              </Pressable>
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}
