import { useRef, useState, type RefObject } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { useAuth } from '../../src/hooks/useAuth';
import { useAppPreferences } from '../../src/contexts/AppPreferencesContext';
import { useAuthStore } from '../../src/stores/auth';
import { Button, Input, PasswordInput } from '../../src/components/ui';

export default function SetupPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { setupPassword } = useAuth();
  const { t } = useAppPreferences();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const firstNameRef = useRef<TextInput | null>(null);
  const lastNameRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const confirmPasswordRef = useRef<TextInput | null>(null);

  const focusRef = (ref: RefObject<TextInput | null>) => {
    ref.current?.focus();
  };

  const handleSetupPassword = async () => {
    if (!password || !confirmPassword) {
      setError(t('setup.enterAndConfirmPassword'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('setup.passwordsDoNotMatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('setup.passwordMinLength'));
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await setupPassword(email || '', password, firstName, lastName);
      const betaAccessStatus = useAuthStore.getState().user?.betaAccessStatus;
      router.replace(betaAccessStatus === 'pending' ? '/(auth)/pending-approval' : '/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('setup.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} backgroundColor="$background">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 40,
            }}
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={false}
            keyboardShouldPersistTaps="handled"
          >
          <YStack flex={1} justifyContent="center" gap="$4">
            <YStack gap="$2" marginBottom="$2">
              <Text color="$color" fontSize="$9" fontWeight="700" textAlign="center">
                {t('setup.welcome')}
              </Text>
              <Text color="$colorSecondary" fontSize="$4" textAlign="center">
                {t('setup.subtitle')}
              </Text>
              {email ? (
                <Text color="$primary" textAlign="center" fontSize="$3">
                  {email}
                </Text>
              ) : null}
            </YStack>

            {error ? (
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
            ) : null}

            <XStack gap="$3">
              <YStack flex={1} gap="$2">
                <Text color="$colorSecondary" fontSize="$2">
                  {t('setup.firstName')}
                </Text>
                <Input
                  ref={firstNameRef}
                  placeholder={t('setup.firstName')}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoComplete="given-name"
                  blurOnSubmit={false}
                  returnKeyType="next"
                  onSubmitEditing={() => focusRef(lastNameRef)}
                  editable={!isLoading}
                />
              </YStack>
              <YStack flex={1} gap="$2">
                <Text color="$colorSecondary" fontSize="$2">
                  {t('setup.lastName')}
                </Text>
                <Input
                  ref={lastNameRef}
                  placeholder={t('setup.lastName')}
                  value={lastName}
                  onChangeText={setLastName}
                  autoComplete="family-name"
                  blurOnSubmit={false}
                  returnKeyType="next"
                  onSubmitEditing={() => focusRef(passwordRef)}
                  editable={!isLoading}
                />
              </YStack>
            </XStack>

            <YStack gap="$2">
              <Text color="$colorSecondary" fontSize="$2">
                {t('setup.password')}
              </Text>
              <PasswordInput
                ref={passwordRef}
                placeholder={t('setup.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                disableStrongPasswordAssist={Platform.OS === 'ios'}
                blurOnSubmit={false}
                returnKeyType="next"
                onSubmitEditing={() => focusRef(confirmPasswordRef)}
                editable={!isLoading}
              />
            </YStack>

            <YStack gap="$2">
              <Text color="$colorSecondary" fontSize="$2">
                {t('setup.confirmPassword')}
              </Text>
              <PasswordInput
                ref={confirmPasswordRef}
                placeholder={t('setup.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                disableStrongPasswordAssist={Platform.OS === 'ios'}
                returnKeyType="done"
                onSubmitEditing={handleSetupPassword}
                editable={!isLoading}
              />
            </YStack>

            <Button
              variant="primary"
              fullWidth
              onPress={handleSetupPassword}
              disabled={isLoading}
              loading={isLoading}
              loadingText={t('setup.createAccount')}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                t('setup.createAccount')
              )}
            </Button>
          </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </YStack>
    </SafeAreaView>
  );
}
