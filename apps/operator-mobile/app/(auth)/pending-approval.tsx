import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hourglass } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { Text, YStack } from 'tamagui';

import { useAuth } from '../../src/hooks/useAuth';
import { useAppPreferences } from '../../src/contexts/AppPreferencesContext';
import { Button } from '../../src/components/ui';

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();
  const { t, resolvedTheme } = useAppPreferences();
  const [isChecking, setIsChecking] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const isStillPending = user?.betaAccessStatus === 'pending';

  const lastCheckedLabel = useMemo(() => {
    if (!lastCheckedAt) return null;
    return new Date(lastCheckedAt).toLocaleTimeString();
  }, [lastCheckedAt]);

  const checkApprovalStatus = async () => {
    if (isChecking) {
      return;
    }
    setIsChecking(true);
    try {
      await refreshUser();
      setLastCheckedAt(Date.now());
    } finally {
      setIsChecking(false);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      router.replace('/(auth)/sign-in');
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    if (!isStillPending) {
      return;
    }

    void checkApprovalStatus();
    const interval = setInterval(() => {
      void checkApprovalStatus();
    }, 12000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStillPending]);

  return (
    <>
      <StatusBar barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ flex: 1 }}>
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$4">
          <Hourglass size={44} />
          <Text fontSize="$8" fontWeight="700" textAlign="center">
            {t('pending.title')}
          </Text>
          <Text color="$colorSecondary" textAlign="center">
            {t('pending.subtitle')}
          </Text>
          <Text color="$primary" textAlign="center" fontSize="$3">
            {user?.email || ''}
          </Text>
          <YStack
            backgroundColor="$glass"
            borderRadius="$4"
            borderWidth={1}
            borderColor="$glassBorder"
            padding="$4"
          >
            <Text fontSize="$3" color="$colorSecondary">
              {t('pending.details')}
            </Text>
            {lastCheckedLabel && (
              <Text marginTop="$2" fontSize="$2" color="$colorTertiary">
                Last checked: {lastCheckedLabel}
              </Text>
            )}
          </YStack>
          <Button
            variant="primary"
            onPress={checkApprovalStatus}
            loading={isChecking}
            loadingText="Checking status..."
            fullWidth
          >
            Check approval status
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              void handleSignOut();
            }}
            loading={isSigningOut}
            loadingText={t('pending.signOut')}
            fullWidth
          >
            {t('pending.signOut')}
          </Button>
        </YStack>
      </SafeAreaView>
    </>
  );
}
