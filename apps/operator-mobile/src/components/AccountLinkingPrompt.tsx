/**
 * Account Linking Prompt
 *
 * Modal shown when a user tries to sign in with an OAuth provider
 * but an account already exists with that email using a different provider.
 * Allows user to link accounts or cancel.
 */

import { Modal, Pressable } from 'react-native';
import { YStack, XStack, Text, Circle, Spinner } from 'tamagui';
import { Link2, X, AlertCircle } from '@tamagui/lucide-icons';

import type { OAuthProvider } from '../lib/oauth';
import { useAppPreferences } from '../contexts/AppPreferencesContext';
import { Button } from './ui';

interface AccountLinkingPromptProps {
  visible: boolean;
  sourceProvider: OAuthProvider;
  existingEmail: string;
  existingProvider: OAuthProvider;
  isLoading?: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onClose: () => void;
}

export function AccountLinkingPrompt({
  visible,
  sourceProvider,
  existingEmail,
  existingProvider,
  isLoading,
  onConfirm,
  onReject,
  onClose,
}: AccountLinkingPromptProps) {
  const { t } = useAppPreferences();
  const sourceName = t(`oauth.provider.${sourceProvider}` as 'oauth.provider.google');
  const existingName = t(`oauth.provider.${existingProvider}` as 'oauth.provider.google');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <YStack
            backgroundColor="$background"
            borderRadius="$4"
            padding="$5"
            marginHorizontal="$4"
            maxWidth={360}
            gap="$4"
            shadowColor="black"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.3}
            shadowRadius={12}
          >
            {/* Close button */}
            <XStack justifyContent="flex-end" marginTop={-8} marginRight={-8}>
              <Pressable onPress={onClose} hitSlop={8}>
                <Circle size={32} backgroundColor="$glass">
                  <X size={18} color="$colorTertiary" />
                </Circle>
              </Pressable>
            </XStack>

            {/* Icon */}
            <XStack justifyContent="center" marginTop={-8}>
              <Circle size={64} backgroundColor="$primaryLight">
                <Link2 size={32} color="$primary" />
              </Circle>
            </XStack>

            {/* Title */}
            <Text
              fontSize={22}
              fontWeight="700"
              textAlign="center"
              color="$color"
            >
              {t('accountLink.title')}
            </Text>

            {/* Description */}
            <YStack gap="$2">
              <Text
                fontSize={15}
                textAlign="center"
                color="$colorSecondary"
                lineHeight={22}
              >
                {t('accountLink.existing', { email: existingEmail, provider: existingName })}
              </Text>

              <Text
                fontSize={15}
                textAlign="center"
                color="$colorSecondary"
                lineHeight={22}
              >
                {t('accountLink.prompt', { provider: sourceName })}
              </Text>
            </YStack>

            {/* Info box */}
            <XStack
              backgroundColor="$glass"
              borderRadius="$3"
              padding="$3"
              gap="$2"
              alignItems="flex-start"
            >
              <AlertCircle size={18} color="$colorTertiary" style={{ marginTop: 2 }} />
              <Text fontSize={13} color="$colorTertiary" flex={1} lineHeight={18}>
                {t('accountLink.info', {
                  sourceProvider: sourceName,
                  existingProvider: existingName,
                })}
              </Text>
            </XStack>

            {/* Buttons */}
            <YStack gap="$3" marginTop="$2">
              <Button
                onPress={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <XStack gap="$2" alignItems="center">
                    <Spinner size="small" color="white" />
                    <Text color="white" fontWeight="600">
                      {t('accountLink.linking')}
                    </Text>
                  </XStack>
                ) : (
                  t('accountLink.linkAccounts')
                )}
              </Button>

              <Pressable
                onPress={onReject}
                disabled={isLoading}
                style={({ pressed }) => ({
                  opacity: isLoading ? 0.5 : pressed ? 0.7 : 1,
                })}
              >
                <Text
                  fontSize={15}
                  fontWeight="500"
                  textAlign="center"
                  color="$colorTertiary"
                  paddingVertical="$2"
                >
                  {t('accountLink.useDifferentEmail')}
                </Text>
              </Pressable>
            </YStack>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default AccountLinkingPrompt;
