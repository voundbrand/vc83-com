import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getLocales } from 'expo-localization';

import { SupportedLanguage, TranslationKey, translate } from '../i18n/translations';
import { l4yercak3Client } from '../api/client';
import {
  isVoiceCompatibleWithLanguage,
  normalizeVoiceLanguageCode,
  normalizeVoiceLanguagePreference,
  resolveVoiceLanguagePreference,
  type AgentVoiceLanguagePreference as SharedAgentVoiceLanguagePreference,
} from '../lib/voice/catalogLanguage';

export type AppearancePreference = 'system' | 'light' | 'dark';
export type LanguagePreference = 'system' | SupportedLanguage;
export type ResolvedTheme = 'light' | 'dark';
export type AgentVoicePreference = string | null;
export type AgentVoiceLanguagePreference = SharedAgentVoiceLanguagePreference;

type AppPreferencesContextType = {
  appearancePreference: AppearancePreference;
  languagePreference: LanguagePreference;
  agentName: string;
  agentVoiceId: AgentVoicePreference;
  agentVoiceLanguage: AgentVoiceLanguagePreference;
  autoSpeakReplies: boolean;
  deviceLanguage: SupportedLanguage;
  deviceVoiceLanguage: string;
  resolvedTheme: ResolvedTheme;
  resolvedLanguage: SupportedLanguage;
  resolvedAgentVoiceLanguage: string;
  setAppearancePreference: (value: AppearancePreference) => void;
  setLanguagePreference: (value: LanguagePreference) => void;
  setAgentName: (value: string) => void;
  setAgentVoiceId: (value: AgentVoicePreference) => void;
  setAgentVoiceLanguage: (value: AgentVoiceLanguagePreference) => void;
  setAutoSpeakReplies: (value: boolean) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isReady: boolean;
};

type StoredPreferences = {
  appearancePreference: AppearancePreference;
  languagePreference: LanguagePreference;
  agentName: string;
  agentVoiceId: AgentVoicePreference;
  agentVoiceLanguage: AgentVoiceLanguagePreference;
  autoSpeakReplies: boolean;
};

const STORAGE_KEY = 'l4yercak3_app_preferences_v1';
const SESSION_KEY = 'l4yercak3_session';
const DEFAULT_AGENT_NAME = 'SevenLayers';

const AppPreferencesContext = createContext<AppPreferencesContextType | null>(null);

function normalizeAgentVoicePreference(value: unknown): AgentVoicePreference {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getDeviceVoiceLanguage(): string {
  const locale = getLocales()[0];
  const languageCode =
    locale?.languageCode?.toLowerCase() ??
    locale?.languageTag?.split('-')[0]?.toLowerCase() ??
    'en';
  return normalizeVoiceLanguageCode(languageCode) || 'en';
}

function getDeviceLanguage(): SupportedLanguage {
  return getDeviceVoiceLanguage() === 'de' ? 'de' : 'en';
}

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [appearancePreference, setAppearancePreferenceState] = useState<AppearancePreference>('system');
  const [languagePreference, setLanguagePreferenceState] = useState<LanguagePreference>('system');
  const [agentName, setAgentNameState] = useState(DEFAULT_AGENT_NAME);
  const [agentVoiceId, setAgentVoiceIdState] = useState<AgentVoicePreference>(null);
  const [agentVoiceLanguage, setAgentVoiceLanguageState] =
    useState<AgentVoiceLanguagePreference>('system');
  const [autoSpeakReplies, setAutoSpeakRepliesState] = useState(true);

  const deviceVoiceLanguage = getDeviceVoiceLanguage();
  const deviceLanguage = getDeviceLanguage();

  const resolvedTheme: ResolvedTheme =
    appearancePreference === 'system'
      ? colorScheme === 'dark'
        ? 'dark'
        : 'light'
      : appearancePreference;

  const resolvedLanguage: SupportedLanguage =
    languagePreference === 'system' ? deviceLanguage : languagePreference;
  const resolvedAgentVoiceLanguage = resolveVoiceLanguagePreference(
    agentVoiceLanguage,
    deviceVoiceLanguage
  );

  useEffect(() => {
    const loadPreferences = async () => {
      let nextAppearancePreference: AppearancePreference = 'system';
      let nextLanguagePreference: LanguagePreference = 'system';
      let nextAgentName = DEFAULT_AGENT_NAME;
      let nextAgentVoiceId: AgentVoicePreference = null;
      let nextAgentVoiceLanguage: AgentVoiceLanguagePreference = 'system';
      let hasStoredAgentVoiceLanguage = false;
      let nextAutoSpeakReplies = true;

      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
          if (
            parsed.appearancePreference === 'system' ||
            parsed.appearancePreference === 'light' ||
            parsed.appearancePreference === 'dark'
          ) {
            nextAppearancePreference = parsed.appearancePreference;
          }
          if (
            parsed.languagePreference === 'system' ||
            parsed.languagePreference === 'en' ||
            parsed.languagePreference === 'de'
          ) {
            nextLanguagePreference = parsed.languagePreference;
          }
          if (typeof parsed.agentName === 'string' && parsed.agentName.trim().length > 0) {
            nextAgentName = parsed.agentName.trim().slice(0, 40);
          }
          if (parsed.agentVoiceId === null || typeof parsed.agentVoiceId === 'string') {
            nextAgentVoiceId = normalizeAgentVoicePreference(parsed.agentVoiceId);
          }
          if (typeof parsed.agentVoiceLanguage === 'string') {
            nextAgentVoiceLanguage = normalizeVoiceLanguagePreference(parsed.agentVoiceLanguage);
            hasStoredAgentVoiceLanguage = true;
          }
          if (typeof parsed.autoSpeakReplies === 'boolean') {
            nextAutoSpeakReplies = parsed.autoSpeakReplies;
          }
        }

        const sessionRaw = await SecureStore.getItemAsync(SESSION_KEY);
        if (sessionRaw) {
          const session = JSON.parse(sessionRaw) as {
            sessionId?: unknown;
            apiKey?: unknown;
            organizationId?: unknown;
          };
          if (typeof session.apiKey === 'string' && session.apiKey.trim().length > 0) {
            l4yercak3Client.setApiKey(session.apiKey);
          }
          if (typeof session.sessionId === 'string' && session.sessionId.trim().length > 0) {
            l4yercak3Client.setSession(session.sessionId);
          }
          if (typeof session.organizationId === 'string' && session.organizationId.trim().length > 0) {
            l4yercak3Client.setOrganization(session.organizationId);
          }

          const voiceCatalog = await l4yercak3Client.ai.voice.listCatalog();
          nextAgentVoiceId = normalizeAgentVoicePreference(voiceCatalog.selectedVoiceId);
          if (!hasStoredAgentVoiceLanguage && typeof voiceCatalog.selectedLanguage === 'string') {
            nextAgentVoiceLanguage = normalizeVoiceLanguagePreference(voiceCatalog.selectedLanguage);
          }
          const bootstrapVoiceLanguage = resolveVoiceLanguagePreference(
            nextAgentVoiceLanguage,
            getDeviceVoiceLanguage()
          );
          if (nextAgentVoiceId) {
            const selectedVoice = (voiceCatalog.voices || []).find(
              (voice) => voice.id === nextAgentVoiceId
            );
            if (selectedVoice && !isVoiceCompatibleWithLanguage(selectedVoice, bootstrapVoiceLanguage)) {
              nextAgentVoiceId = null;
              try {
                await l4yercak3Client.ai.voice.updatePreferences({
                  agentVoiceId: null,
                  language: bootstrapVoiceLanguage,
                });
              } catch (error) {
                console.warn('Failed to clear incompatible operator voice preference:', error);
              }
            }
          }

          const mergedPayload: StoredPreferences = {
            appearancePreference: nextAppearancePreference,
            languagePreference: nextLanguagePreference,
            agentName: nextAgentName,
            agentVoiceId: nextAgentVoiceId,
            agentVoiceLanguage: nextAgentVoiceLanguage,
            autoSpeakReplies: nextAutoSpeakReplies,
          };
          await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(mergedPayload));
        }
      } catch (error) {
        if (error instanceof Error && /session expired/i.test(error.message)) {
          // Ignore auth expiry on bootstrap; local fallback stays in place.
        } else {
          console.warn('Failed to load app preferences:', error);
        }
      } finally {
        setAppearancePreferenceState(nextAppearancePreference);
        setLanguagePreferenceState(nextLanguagePreference);
        setAgentNameState(nextAgentName);
        setAgentVoiceIdState(nextAgentVoiceId);
        setAgentVoiceLanguageState(nextAgentVoiceLanguage);
        setAutoSpeakRepliesState(nextAutoSpeakReplies);
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
      nextAgentVoiceId: AgentVoicePreference,
      nextAgentVoiceLanguage: AgentVoiceLanguagePreference,
      nextAutoSpeakReplies: boolean
    ) => {
      const payload: StoredPreferences = {
        appearancePreference: nextAppearance,
        languagePreference: nextLanguage,
        agentName: nextAgentName,
        agentVoiceId: nextAgentVoiceId,
        agentVoiceLanguage: nextAgentVoiceLanguage,
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
      void persist(
        value,
        languagePreference,
        agentName,
        agentVoiceId,
        agentVoiceLanguage,
        autoSpeakReplies
      );
    },
    [agentName, agentVoiceId, agentVoiceLanguage, autoSpeakReplies, languagePreference, persist]
  );

  const setLanguagePreference = useCallback(
    (value: LanguagePreference) => {
      setLanguagePreferenceState(value);
      void persist(
        appearancePreference,
        value,
        agentName,
        agentVoiceId,
        agentVoiceLanguage,
        autoSpeakReplies
      );
    },
    [agentName, agentVoiceId, agentVoiceLanguage, autoSpeakReplies, appearancePreference, persist]
  );

  const setAgentName = useCallback(
    (value: string) => {
      const nextValue = value.trim().slice(0, 40) || DEFAULT_AGENT_NAME;
      setAgentNameState(nextValue);
      void persist(
        appearancePreference,
        languagePreference,
        nextValue,
        agentVoiceId,
        agentVoiceLanguage,
        autoSpeakReplies
      );
    },
    [agentVoiceId, agentVoiceLanguage, autoSpeakReplies, appearancePreference, languagePreference, persist]
  );

  const setAgentVoiceId = useCallback(
    (value: AgentVoicePreference) => {
      const normalizedValue = normalizeAgentVoicePreference(value);
      setAgentVoiceIdState(normalizedValue);
      void persist(
        appearancePreference,
        languagePreference,
        agentName,
        normalizedValue,
        agentVoiceLanguage,
        autoSpeakReplies
      );
    },
    [agentName, agentVoiceLanguage, autoSpeakReplies, appearancePreference, languagePreference, persist]
  );

  const setAgentVoiceLanguage = useCallback(
    (value: AgentVoiceLanguagePreference) => {
      const normalizedValue = normalizeVoiceLanguagePreference(value);
      setAgentVoiceLanguageState(normalizedValue);
      void persist(
        appearancePreference,
        languagePreference,
        agentName,
        agentVoiceId,
        normalizedValue,
        autoSpeakReplies
      );
    },
    [agentName, agentVoiceId, autoSpeakReplies, appearancePreference, languagePreference, persist]
  );

  const setAutoSpeakReplies = useCallback(
    (value: boolean) => {
      setAutoSpeakRepliesState(value);
      void persist(
        appearancePreference,
        languagePreference,
        agentName,
        agentVoiceId,
        agentVoiceLanguage,
        value
      );
    },
    [agentName, agentVoiceId, agentVoiceLanguage, appearancePreference, languagePreference, persist]
  );

  useEffect(() => {
    if (!isReady || !agentVoiceId || !l4yercak3Client.hasAuth()) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const voiceCatalog = await l4yercak3Client.ai.voice.listCatalog();
        if (cancelled) {
          return;
        }
        const selectedVoice = (voiceCatalog.voices || []).find(
          (voice) => voice.id === agentVoiceId
        );
        if (!selectedVoice || isVoiceCompatibleWithLanguage(selectedVoice, resolvedAgentVoiceLanguage)) {
          return;
        }
        setAgentVoiceIdState(null);
        void persist(
          appearancePreference,
          languagePreference,
          agentName,
          null,
          agentVoiceLanguage,
          autoSpeakReplies
        );
        await l4yercak3Client.ai.voice.updatePreferences({
          agentVoiceId: null,
          language: resolvedAgentVoiceLanguage,
        });
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to validate operator voice language compatibility:', error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    agentName,
    agentVoiceId,
    agentVoiceLanguage,
    appearancePreference,
    autoSpeakReplies,
    isReady,
    languagePreference,
    persist,
    resolvedAgentVoiceLanguage,
  ]);

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
      agentVoiceId,
      agentVoiceLanguage,
      autoSpeakReplies,
      deviceLanguage,
      deviceVoiceLanguage,
      resolvedTheme,
      resolvedLanguage,
      resolvedAgentVoiceLanguage,
      setAppearancePreference,
      setLanguagePreference,
      setAgentName,
      setAgentVoiceId,
      setAgentVoiceLanguage,
      setAutoSpeakReplies,
      t,
      isReady,
    }),
    [
      appearancePreference,
      languagePreference,
      agentName,
      agentVoiceId,
      agentVoiceLanguage,
      autoSpeakReplies,
      deviceLanguage,
      deviceVoiceLanguage,
      resolvedTheme,
      resolvedLanguage,
      resolvedAgentVoiceLanguage,
      setAppearancePreference,
      setLanguagePreference,
      setAgentName,
      setAgentVoiceId,
      setAgentVoiceLanguage,
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
