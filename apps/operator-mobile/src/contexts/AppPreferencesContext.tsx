import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getLocales } from 'expo-localization';

import { SupportedLanguage, TranslationKey, translate } from '../i18n/translations';

export type AppearancePreference = 'system' | 'light' | 'dark';
export type LanguagePreference = 'system' | SupportedLanguage;
export type ResolvedTheme = 'light' | 'dark';
export type AgentVoicePreference = string | null;

type AppPreferencesContextType = {
  appearancePreference: AppearancePreference;
  languagePreference: LanguagePreference;
  agentName: string;
  agentAvatar: string;
  agentVoiceId: AgentVoicePreference;
  autoSpeakReplies: boolean;
  deviceLanguage: SupportedLanguage;
  resolvedTheme: ResolvedTheme;
  resolvedLanguage: SupportedLanguage;
  setAppearancePreference: (value: AppearancePreference) => void;
  setLanguagePreference: (value: LanguagePreference) => void;
  setAgentName: (value: string) => void;
  setAgentAvatar: (value: string) => void;
  setAgentVoiceId: (value: AgentVoicePreference) => void;
  setAutoSpeakReplies: (value: boolean) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isReady: boolean;
};

type StoredPreferences = {
  appearancePreference: AppearancePreference;
  languagePreference: LanguagePreference;
  agentName: string;
  agentAvatar: string;
  agentVoiceId: AgentVoicePreference;
  autoSpeakReplies: boolean;
};

const STORAGE_KEY = 'l4yercak3_app_preferences_v1';
const DEFAULT_AGENT_NAME = 'SevenLayers';
const DEFAULT_AGENT_AVATAR = '✨';

const AppPreferencesContext = createContext<AppPreferencesContextType | null>(null);

function getDeviceLanguage(): SupportedLanguage {
  const locale = getLocales()[0];
  const languageCode =
    locale?.languageCode?.toLowerCase() ??
    locale?.languageTag?.split('-')[0]?.toLowerCase() ??
    'en';
  return languageCode === 'de' ? 'de' : 'en';
}

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [appearancePreference, setAppearancePreferenceState] = useState<AppearancePreference>('system');
  const [languagePreference, setLanguagePreferenceState] = useState<LanguagePreference>('system');
  const [agentName, setAgentNameState] = useState(DEFAULT_AGENT_NAME);
  const [agentAvatar, setAgentAvatarState] = useState(DEFAULT_AGENT_AVATAR);
  const [agentVoiceId, setAgentVoiceIdState] = useState<AgentVoicePreference>(null);
  const [autoSpeakReplies, setAutoSpeakRepliesState] = useState(true);

  const deviceLanguage = getDeviceLanguage();

  const resolvedTheme: ResolvedTheme =
    appearancePreference === 'system'
      ? colorScheme === 'dark'
        ? 'dark'
        : 'light'
      : appearancePreference;

  const resolvedLanguage: SupportedLanguage =
    languagePreference === 'system' ? deviceLanguage : languagePreference;

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
          if (
            parsed.appearancePreference === 'system' ||
            parsed.appearancePreference === 'light' ||
            parsed.appearancePreference === 'dark'
          ) {
            setAppearancePreferenceState(parsed.appearancePreference);
          }
          if (
            parsed.languagePreference === 'system' ||
            parsed.languagePreference === 'en' ||
            parsed.languagePreference === 'de'
          ) {
            setLanguagePreferenceState(parsed.languagePreference);
          }
          if (typeof parsed.agentName === 'string' && parsed.agentName.trim().length > 0) {
            setAgentNameState(parsed.agentName.trim().slice(0, 40));
          }
          if (typeof parsed.agentAvatar === 'string' && parsed.agentAvatar.trim().length > 0) {
            setAgentAvatarState(parsed.agentAvatar.trim().slice(0, 4));
          }
          if (parsed.agentVoiceId === null || typeof parsed.agentVoiceId === 'string') {
            setAgentVoiceIdState(parsed.agentVoiceId);
          }
          if (typeof parsed.autoSpeakReplies === 'boolean') {
            setAutoSpeakRepliesState(parsed.autoSpeakReplies);
          }
        }
      } catch (error) {
        console.warn('Failed to load app preferences:', error);
      } finally {
        setIsReady(true);
      }
    };

    void loadPreferences();
  }, []);

  const persist = useCallback(
    async (
      nextAppearance: AppearancePreference,
      nextLanguage: LanguagePreference,
      nextAgentName: string,
      nextAgentAvatar: string,
      nextAgentVoiceId: AgentVoicePreference,
      nextAutoSpeakReplies: boolean
    ) => {
      const payload: StoredPreferences = {
        appearancePreference: nextAppearance,
        languagePreference: nextLanguage,
        agentName: nextAgentName,
        agentAvatar: nextAgentAvatar,
        agentVoiceId: nextAgentVoiceId,
        autoSpeakReplies: nextAutoSpeakReplies,
      };

      try {
        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(payload));
      } catch (error) {
        console.warn('Failed to save app preferences:', error);
      }
    },
    []
  );

  const setAppearancePreference = useCallback(
    (value: AppearancePreference) => {
      setAppearancePreferenceState(value);
      void persist(value, languagePreference, agentName, agentAvatar, agentVoiceId, autoSpeakReplies);
    },
    [agentAvatar, agentName, agentVoiceId, autoSpeakReplies, languagePreference, persist]
  );

  const setLanguagePreference = useCallback(
    (value: LanguagePreference) => {
      setLanguagePreferenceState(value);
      void persist(appearancePreference, value, agentName, agentAvatar, agentVoiceId, autoSpeakReplies);
    },
    [agentAvatar, agentName, agentVoiceId, autoSpeakReplies, appearancePreference, persist]
  );

  const setAgentName = useCallback(
    (value: string) => {
      const nextValue = value.trim().slice(0, 40) || DEFAULT_AGENT_NAME;
      setAgentNameState(nextValue);
      void persist(appearancePreference, languagePreference, nextValue, agentAvatar, agentVoiceId, autoSpeakReplies);
    },
    [agentAvatar, agentVoiceId, autoSpeakReplies, appearancePreference, languagePreference, persist]
  );

  const setAgentAvatar = useCallback(
    (value: string) => {
      const nextValue = value.trim().slice(0, 4) || DEFAULT_AGENT_AVATAR;
      setAgentAvatarState(nextValue);
      void persist(appearancePreference, languagePreference, agentName, nextValue, agentVoiceId, autoSpeakReplies);
    },
    [agentName, agentVoiceId, autoSpeakReplies, appearancePreference, languagePreference, persist]
  );

  const setAgentVoiceId = useCallback(
    (value: AgentVoicePreference) => {
      setAgentVoiceIdState(value);
      void persist(appearancePreference, languagePreference, agentName, agentAvatar, value, autoSpeakReplies);
    },
    [agentAvatar, agentName, autoSpeakReplies, appearancePreference, languagePreference, persist]
  );

  const setAutoSpeakReplies = useCallback(
    (value: boolean) => {
      setAutoSpeakRepliesState(value);
      void persist(appearancePreference, languagePreference, agentName, agentAvatar, agentVoiceId, value);
    },
    [agentAvatar, agentName, agentVoiceId, appearancePreference, languagePreference, persist]
  );

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return translate(resolvedLanguage, key, params);
    },
    [resolvedLanguage]
  );

  const value = useMemo<AppPreferencesContextType>(
    () => ({
      appearancePreference,
      languagePreference,
      agentName,
      agentAvatar,
      agentVoiceId,
      autoSpeakReplies,
      deviceLanguage,
      resolvedTheme,
      resolvedLanguage,
      setAppearancePreference,
      setLanguagePreference,
      setAgentName,
      setAgentAvatar,
      setAgentVoiceId,
      setAutoSpeakReplies,
      t,
      isReady,
    }),
    [
      appearancePreference,
      languagePreference,
      agentName,
      agentAvatar,
      agentVoiceId,
      autoSpeakReplies,
      deviceLanguage,
      resolvedTheme,
      resolvedLanguage,
      setAppearancePreference,
      setLanguagePreference,
      setAgentName,
      setAgentAvatar,
      setAgentVoiceId,
      setAutoSpeakReplies,
      t,
      isReady,
    ]
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error('useAppPreferences must be used within AppPreferencesProvider');
  }
  return context;
}
