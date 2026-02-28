import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider, Theme } from 'tamagui';

import config from '../tamagui.config';
import { AuthProvider } from '../src/contexts/AuthContext';
import { AppPreferencesProvider, useAppPreferences } from '../src/contexts/AppPreferencesContext';
import { configureGoogleSignIn } from '../src/lib/oauth';

import '../global.css';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Configure Google Sign-In once on app startup.
configureGoogleSignIn();

function RootLayoutContent() {
  const { resolvedTheme } = useAppPreferences();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize app state before revealing the root view.
    const prepare = async () => {
      setIsReady(true);
    };

    void prepare();
  }, []);

  const onLayoutRootView = useCallback(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <TamaguiProvider config={config} defaultTheme={resolvedTheme}>
      <Theme name={resolvedTheme}>
        <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <SafeAreaProvider>
            <AuthProvider>
              <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
              <Stack
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
            </AuthProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </Theme>
    </TamaguiProvider>
  );
}

export default function RootLayout() {
  return (
    <AppPreferencesProvider>
      <RootLayoutContent />
    </AppPreferencesProvider>
  );
}
