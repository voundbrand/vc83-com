import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, TextInput } from 'react-native';
import Constants from 'expo-constants';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft, Languages, LogOut, Moon, Palette, Sun, UserRound } from '@tamagui/lucide-icons';
import { Circle, Switch, Text, XStack, YStack } from 'tamagui';

import { useAuth } from '../../src/hooks/useAuth';
import {
  AppearancePreference,
  LanguagePreference,
  useAppPreferences,
} from '../../src/contexts/AppPreferencesContext';

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
  const { user, signOut, currentOrganization } = useAuth();
  const {
    t,
    deviceLanguage,
    resolvedLanguage,
    resolvedTheme,
    appearancePreference,
    languagePreference,
    agentName,
    agentAvatar,
    agentVoiceId,
    autoSpeakReplies,
    setAppearancePreference,
    setLanguagePreference,
    setAgentName,
    setAgentAvatar,
    setAgentVoiceId,
    setAutoSpeakReplies,
  } = useAppPreferences();
  const [agentNameDraft, setAgentNameDraft] = useState(agentName);
  const [availableVoices, setAvailableVoices] = useState<Speech.Voice[]>([]);
  const [voiceLoadError, setVoiceLoadError] = useState<string | null>(null);

  const avatarOptions = useMemo(() => ['✨', '🧠', '🎯', '🚀', '🎙️', '💼'], []);

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

  const handleBackToChat = () => {
    router.replace('/(tabs)');
  };
  const isDark = resolvedTheme === 'dark';
  const inputBorder = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(23,23,24,0.18)';
  const inputBackground = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.92)';
  const inputColor = isDark ? '#f5efe4' : '#191713';

  useEffect(() => {
    setAgentNameDraft(agentName);
  }, [agentName]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        if (!cancelled) {
          setAvailableVoices(
            voices
              .filter((voice) => typeof voice.identifier === 'string' && voice.identifier.length > 0)
              .slice(0, 24)
          );
          setVoiceLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setVoiceLoadError(error instanceof Error ? error.message : 'voice_load_failed');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <YStack flex={1} backgroundColor="$background">
        <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}>
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
              {user?.organizations && user.organizations.length > 1 ? (
                <Text color="$primary" fontSize="$3">
                  {t('settings.organizationsAvailable', { count: user.organizations.length })}
                </Text>
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
                    {t('settings.agentAvatar')}
                  </Text>
                  <XStack flexWrap="wrap" gap="$2">
                    {avatarOptions.map((option) => (
                      <Pressable key={option} onPress={() => setAgentAvatar(option)}>
                        <Circle
                          size={40}
                          backgroundColor={agentAvatar === option ? '$primary' : '$glass'}
                          borderWidth={1}
                          borderColor={agentAvatar === option ? '$primary' : '$glassBorder'}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text fontSize="$5" color={agentAvatar === option ? 'white' : '$color'}>
                            {option}
                          </Text>
                        </Circle>
                      </Pressable>
                    ))}
                  </XStack>
                </YStack>

                <YStack gap="$2">
                  <Text color="$colorSecondary" fontSize="$3">
                    {t('settings.agentVoice')}
                  </Text>
                  <OptionRow
                    label={t('common.system')}
                    selected={agentVoiceId === null}
                    onPress={() => setAgentVoiceId(null)}
                  />
                  {availableVoices.map((voice) => (
                    <OptionRow
                      key={voice.identifier}
                      label={voice.name || voice.identifier}
                      selected={agentVoiceId === voice.identifier}
                      onPress={() => setAgentVoiceId(voice.identifier)}
                    />
                  ))}
                  {voiceLoadError ? (
                    <Text color="$error" fontSize="$2">
                      {voiceLoadError}
                    </Text>
                  ) : null}
                </YStack>

                <XStack alignItems="center" justifyContent="space-between" paddingTop="$1">
                  <Text color="$colorSecondary" fontSize="$3">
                    {t('settings.autoSpeakReplies')}
                  </Text>
                  <Switch
                    checked={autoSpeakReplies}
                    onCheckedChange={setAutoSpeakReplies}
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

              <OptionRow
                label={t('common.system')}
                selected={languagePreference === 'system'}
                onPress={() => setLanguagePreference('system')}
              />
              <OptionRow
                label={t('common.english')}
                selected={languagePreference === 'en'}
                onPress={() => setLanguagePreference('en')}
              />
              <OptionRow
                label={t('common.german')}
                selected={languagePreference === 'de'}
                onPress={() => setLanguagePreference('de')}
              />
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
