import { useState, useEffect } from 'react';
import { Platform, KeyboardAvoidingView, StatusBar, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  YStack,
  XStack,
  Text,
  Separator,
} from 'tamagui';
import { Mail, Lock } from '@tamagui/lucide-icons';

import { useAuth } from '../../src/hooks/useAuth';
import { useAuthStore } from '../../src/stores/auth';
import { useAppPreferences } from '../../src/contexts/AppPreferencesContext';
import { isAppleSignInAvailable } from '../../src/lib/oauth';
import type { OAuthProvider } from '../../src/lib/oauth';
import { ENV } from '../../src/config/env';
import { Button, Input, PasswordInput, OAuthButton } from '../../src/components/ui';
import { AccountLinkingPrompt } from '../../src/components/AccountLinkingPrompt';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Platform-specific OAuth providers
  const isIOS = Platform.OS === 'ios';
  const showExperimentalOAuthProviders = ENV.ENABLE_GITHUB_MICROSOFT_OAUTH;

  const { signIn, signInWithOAuth } = useAuth();
  const { t, resolvedTheme } = useAppPreferences();
  const {
    accountLinking,
    isLoading: isLinkingLoading,
    confirmLinking,
    rejectLinking,
    clearLinkingState,
  } = useAuthStore();

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError(t('auth.enterEmailAndPassword'));
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await signIn(email, password);
      const betaAccessStatus = useAuthStore.getState().user?.betaAccessStatus;
      router.replace(betaAccessStatus === 'pending' ? '/(auth)/pending-approval' : '/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.signInFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    setError(null);
    setOauthLoading(provider);

    try {
      const result = await signInWithOAuth(provider);

      // Check if account linking is required - modal will show automatically
      if (result.requiresLinking) {
        // Don't navigate - the AccountLinkingPrompt will show
        return;
      }

      const betaAccessStatus = useAuthStore.getState().user?.betaAccessStatus;
      router.replace(betaAccessStatus === 'pending' ? '/(auth)/pending-approval' : '/(tabs)');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.signInFailed');
      // Don't show error for user-cancelled auth
      if (!message.includes('cancelled') && !message.includes('dismiss')) {
        setError(message);
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const handleConfirmLinking = async () => {
    setError(null);
    try {
      await confirmLinking();
      const betaAccessStatus = useAuthStore.getState().user?.betaAccessStatus;
      router.replace(betaAccessStatus === 'pending' ? '/(auth)/pending-approval' : '/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.failedToLinkAccounts'));
    }
  };

  const handleRejectLinking = async () => {
    try {
      await rejectLinking();
      setError(t('auth.linkingCancelledUseDifferentEmail'));
    } catch {
      // Ignore errors - we're just clearing state
    }
  };

  const isAnyLoading = isLoading || oauthLoading !== null;

  return (
    <>
      <StatusBar barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'} />
      <YStack flex={1} backgroundColor="$background">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 }}
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
              contentInsetAdjustmentBehavior="always"
              keyboardShouldPersistTaps="handled"
            >
            <YStack flex={1} justifyContent="center">
              {/* Logo & Brand */}
              <YStack alignItems="center" marginBottom="$8">
                <Image
                  source={require('../../assets/sevenlayers_app_login_logo.png')}
                  alt=""
                  style={{ width: 260, height: 80 }}
                  resizeMode="contain"
                  accessibilityLabel={t('auth.logoA11y')}
                />
              </YStack>

              {/* Glass Card */}
              <YStack
                backgroundColor="$glass"
                borderRadius="$6"
                borderWidth={1}
                borderColor="$glassBorder"
                padding="$5"
                gap="$5"
              >
                {/* Error Message */}
                {error && (
                  <XStack
                    backgroundColor="rgba(239, 68, 68, 0.15)"
                    borderRadius="$3"
                    padding="$3"
                    borderWidth={1}
                    borderColor="rgba(239, 68, 68, 0.3)"
                  >
                    <Text color="$error" fontSize="$3" flex={1} textAlign="center">
                      {error}
                    </Text>
                  </XStack>
                )}

                {/* OAuth Options */}
                <YStack gap="$3">
                  {/* Google Sign-In - Available on all platforms */}
                  <OAuthButton
                    provider="google"
                    onPress={() => handleOAuthSignIn('google')}
                    loading={oauthLoading === 'google'}
                    disabled={isAnyLoading}
                  />

                  {/* Apple Sign-In - iOS only (not recommended on Android) */}
                  {(appleAvailable || isIOS) && (
                    <OAuthButton
                      provider="apple"
                      onPress={() => handleOAuthSignIn('apple')}
                      loading={oauthLoading === 'apple'}
                      disabled={isAnyLoading}
                    />
                  )}

                  {showExperimentalOAuthProviders && (
                    <>
                      {/* Hidden by default until backend mobile OAuth support is expanded */}
                      <OAuthButton
                        provider="github"
                        onPress={() => handleOAuthSignIn('github')}
                        loading={oauthLoading === 'github'}
                        disabled={isAnyLoading}
                      />
                      <OAuthButton
                        provider="microsoft"
                        onPress={() => handleOAuthSignIn('microsoft')}
                        loading={oauthLoading === 'microsoft'}
                        disabled={isAnyLoading}
                      />
                    </>
                  )}
                </YStack>

                {/* Divider */}
                <XStack alignItems="center" gap="$3">
                  <Separator flex={1} borderColor="$borderColor" />
                  <Text color="$colorTertiary" fontSize="$2">
                    {t('auth.orContinueWithEmail')}
                  </Text>
                  <Separator flex={1} borderColor="$borderColor" />
                </XStack>

                {/* Email & Password */}
                <YStack gap="$4">
                  <Input
                    placeholder={t('auth.email')}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    editable={!isAnyLoading}
                    leftIcon={<Mail size={18} color="$colorTertiary" />}
                  />

                  <PasswordInput
                    placeholder={t('auth.password')}
                    value={password}
                    onChangeText={setPassword}
                    autoComplete="password"
                    editable={!isAnyLoading}
                    leftIcon={<Lock size={18} color="$colorTertiary" />}
                  />
                </YStack>

                {/* Sign In Button */}
                <Button
                  variant="primary"
                  fullWidth
                  onPress={handleSignIn}
                  disabled={isAnyLoading}
                  loading={isLoading}
                  loadingText={t('auth.signingIn')}
                >
                  {t('auth.signIn')}
                </Button>

                {/* Forgot Password */}
                <Text
                  color="$primary"
                  fontSize="$3"
                  textAlign="center"
                  fontWeight="500"
                >
                  {t('auth.forgotPassword')}
                </Text>
              </YStack>

              {/* Footer */}
              <YStack alignItems="center" marginTop="$6" gap="$2">
                <Text color="$colorTertiary" fontSize="$3">
                  {t('auth.noAccount')}
                </Text>
                <Text
                  color="$primary"
                  fontWeight="600"
                  fontSize="$3"
                  onPress={() => router.push('/(auth)/sign-up')}
                >
                  {t('auth.createAccount')}
                </Text>
              </YStack>
            </YStack>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </YStack>

      {/* Account Linking Prompt */}
      {accountLinking && (
        <AccountLinkingPrompt
          visible={!!accountLinking}
          sourceProvider={accountLinking.sourceProvider}
          existingEmail={accountLinking.existingEmail}
          existingProvider={accountLinking.existingProvider}
          isLoading={isLinkingLoading}
          onConfirm={handleConfirmLinking}
          onReject={handleRejectLinking}
          onClose={clearLinkingState}
        />
      )}
    </>
  );
}
