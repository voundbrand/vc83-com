import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  Image,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Building2, Ticket } from '@tamagui/lucide-icons';
import { Separator, Text, XStack, YStack } from 'tamagui';

import { useAuth } from '../../src/hooks/useAuth';
import { useAppPreferences } from '../../src/contexts/AppPreferencesContext';
import { useAuthStore } from '../../src/stores/auth';
import { isAppleSignInAvailable } from '../../src/lib/oauth';
import type { OAuthProvider } from '../../src/lib/oauth';
import { ENV } from '../../src/config/env';
import { Button, Input, OAuthButton, PasswordInput } from '../../src/components/ui';

export default function SignUpScreen() {
  const { signUp, signInWithOAuth } = useAuth();
  const { t, resolvedTheme } = useAppPreferences();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [betaCode, setBetaCode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const firstNameRef = useRef<TextInput | null>(null);
  const lastNameRef = useRef<TextInput | null>(null);
  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const confirmPasswordRef = useRef<TextInput | null>(null);
  const organizationRef = useRef<TextInput | null>(null);
  const betaCodeRef = useRef<TextInput | null>(null);

  const isIOS = Platform.OS === 'ios';
  const showExperimentalOAuthProviders = ENV.ENABLE_GITHUB_MICROSOFT_OAUTH;

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const focusRef = (ref: RefObject<TextInput | null>) => {
    ref.current?.focus();
  };

  const handleSignUp = async () => {
    if (!firstName || !email || !password || !confirmPassword) {
      setError(t('signup.requiredFields'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('signup.passwordsDoNotMatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('signup.passwordMinLength'));
      return;
    }

    if (!agreedToTerms) {
      setError(t('signup.termsRequired'));
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await signUp({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim(),
        password,
        organizationName: organizationName.trim() || undefined,
        betaCode: betaCode.trim().toUpperCase() || undefined,
      });
      const betaAccessStatus = useAuthStore.getState().user?.betaAccessStatus;
      router.replace(betaAccessStatus === 'pending' ? '/(auth)/pending-approval' : '/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signup.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignUp = async (provider: OAuthProvider) => {
    if (!agreedToTerms) {
      setError(t('signup.termsRequired'));
      return;
    }

    setError(null);
    setOauthLoading(provider);

    try {
      const result = await signInWithOAuth(provider, {
        organizationName: organizationName.trim() || undefined,
        betaCode: betaCode.trim().toUpperCase() || undefined,
      });

      if (result.requiresLinking) {
        return;
      }

      const betaAccessStatus = useAuthStore.getState().user?.betaAccessStatus;
      router.replace(betaAccessStatus === 'pending' ? '/(auth)/pending-approval' : '/(tabs)');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('signup.failed');
      if (!message.includes('cancelled') && !message.includes('dismiss')) {
        setError(message);
      }
    } finally {
      setOauthLoading(null);
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
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: 20,
                paddingTop: 24,
                paddingBottom: 40,
              }}
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={false}
              keyboardShouldPersistTaps="handled"
            >
              <YStack alignItems="center" marginBottom="$6">
                <Image
                  source={require('../../assets/sevenlayers_app_login_logo.png')}
                  alt=""
                  style={{ width: 240, height: 72 }}
                  resizeMode="contain"
                  accessibilityLabel={t('auth.logoA11y')}
                />
                <Text marginTop="$2" color="$colorSecondary">
                  {t('signup.subtitle')}
                </Text>
              </YStack>

              <YStack
                backgroundColor="$glass"
                borderRadius="$6"
                borderWidth={1}
                borderColor="$glassBorder"
                padding="$5"
                gap="$4"
              >
                <YStack
                  backgroundColor="rgba(250, 204, 21, 0.12)"
                  borderRadius="$3"
                  padding="$3"
                  borderWidth={1}
                  borderColor="rgba(250, 204, 21, 0.25)"
                >
                  <Text color="$color" fontSize="$3">
                    {t('signup.betaGateHint')}
                  </Text>
                </YStack>

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

                <YStack gap="$3">
                  <OAuthButton
                    provider="google"
                    onPress={() => handleOAuthSignUp('google')}
                    loading={oauthLoading === 'google'}
                    disabled={isAnyLoading}
                  />

                  {(appleAvailable || isIOS) && (
                    <OAuthButton
                      provider="apple"
                      onPress={() => handleOAuthSignUp('apple')}
                      loading={oauthLoading === 'apple'}
                      disabled={isAnyLoading}
                    />
                  )}

                  {showExperimentalOAuthProviders && (
                    <>
                      <OAuthButton
                        provider="github"
                        onPress={() => handleOAuthSignUp('github')}
                        loading={oauthLoading === 'github'}
                        disabled={isAnyLoading}
                      />
                      <OAuthButton
                        provider="microsoft"
                        onPress={() => handleOAuthSignUp('microsoft')}
                        loading={oauthLoading === 'microsoft'}
                        disabled={isAnyLoading}
                      />
                    </>
                  )}
                </YStack>

                <XStack alignItems="center" gap="$3">
                  <Separator flex={1} borderColor="$borderColor" />
                  <Text color="$colorTertiary" fontSize="$3">
                    Or create with email
                  </Text>
                  <Separator flex={1} borderColor="$borderColor" />
                </XStack>

                <XStack gap="$3">
                  <YStack flex={1}>
                    <Input
                      ref={firstNameRef}
                      placeholder={t('setup.firstName')}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoComplete="given-name"
                      blurOnSubmit={false}
                      returnKeyType="next"
                      onSubmitEditing={() => focusRef(lastNameRef)}
                      editable={!isAnyLoading}
                    />
                  </YStack>
                  <YStack flex={1}>
                    <Input
                      ref={lastNameRef}
                      placeholder={t('setup.lastName')}
                      value={lastName}
                      onChangeText={setLastName}
                      autoComplete="family-name"
                      blurOnSubmit={false}
                      returnKeyType="next"
                      onSubmitEditing={() => focusRef(emailRef)}
                      editable={!isAnyLoading}
                    />
                  </YStack>
                </XStack>

                <Input
                  ref={emailRef}
                  placeholder={t('auth.email')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  blurOnSubmit={false}
                  returnKeyType="next"
                  onSubmitEditing={() => focusRef(passwordRef)}
                  editable={!isAnyLoading}
                  leftIcon={<Mail size={18} color="$colorTertiary" />}
                />

                <PasswordInput
                  ref={passwordRef}
                  placeholder={t('setup.passwordPlaceholder')}
                  value={password}
                  onChangeText={setPassword}
                  disableStrongPasswordAssist={Platform.OS === 'ios'}
                  blurOnSubmit={false}
                  returnKeyType="next"
                  onSubmitEditing={() => focusRef(confirmPasswordRef)}
                  editable={!isAnyLoading}
                  leftIcon={<Lock size={18} color="$colorTertiary" />}
                />

                <PasswordInput
                  ref={confirmPasswordRef}
                  placeholder={t('setup.confirmPassword')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  disableStrongPasswordAssist={Platform.OS === 'ios'}
                  blurOnSubmit={false}
                  returnKeyType="next"
                  onSubmitEditing={() => focusRef(organizationRef)}
                  editable={!isAnyLoading}
                  leftIcon={<Lock size={18} color="$colorTertiary" />}
                />

                <Input
                  ref={organizationRef}
                  placeholder={t('signup.organizationOptional')}
                  value={organizationName}
                  onChangeText={setOrganizationName}
                  autoCapitalize="words"
                  blurOnSubmit={false}
                  returnKeyType="next"
                  onSubmitEditing={() => focusRef(betaCodeRef)}
                  editable={!isAnyLoading}
                  leftIcon={<Building2 size={18} color="$colorTertiary" />}
                />

                <Input
                  ref={betaCodeRef}
                  placeholder={t('signup.betaCodeOptional')}
                  value={betaCode}
                  onChangeText={(value) => setBetaCode(value.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                  editable={!isAnyLoading}
                  leftIcon={<Ticket size={18} color="$colorTertiary" />}
                />

                <XStack alignItems="center" gap="$3">
                  <Switch
                    value={agreedToTerms}
                    onValueChange={setAgreedToTerms}
                    disabled={isAnyLoading}
                  />
                  <Text flex={1} fontSize="$2" color="$colorSecondary">
                    {t('signup.agreeToTerms')}
                  </Text>
                </XStack>

                <Button
                  variant="primary"
                  fullWidth
                  onPress={handleSignUp}
                  disabled={isAnyLoading}
                  loading={isLoading}
                  loadingText={t('signup.creating')}
                >
                  {t('signup.createAccount')}
                </Button>
              </YStack>

              <YStack alignItems="center" marginTop="$5" gap="$2">
                <Text color="$colorTertiary" fontSize="$3">
                  {t('signup.alreadyHaveAccount')}
                </Text>
                <Text
                  color="$primary"
                  fontWeight="600"
                  fontSize="$3"
                  onPress={() => router.replace('/(auth)/sign-in')}
                >
                  {t('auth.signIn')}
                </Text>
              </YStack>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </YStack>
    </>
  );
}
