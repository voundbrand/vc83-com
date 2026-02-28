import { Pressable, View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';

import type { PendingToolApproval } from '../../stores/chat';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

type PendingApprovalsPanelProps = {
  approvals: PendingToolApproval[];
  actionInFlightId: string | null;
  onApprove: (executionId: string) => void;
  onReject: (executionId: string) => void;
};

function toParameterPreview(parameters?: Record<string, unknown>): string | null {
  if (!parameters || Object.keys(parameters).length === 0) {
    return null;
  }

  try {
    const serialized = JSON.stringify(parameters);
    if (serialized.length <= 180) {
      return serialized;
    }
    return `${serialized.slice(0, 177)}...`;
  } catch {
    return null;
  }
}

export function PendingApprovalsPanel({
  approvals,
  actionInFlightId,
  onApprove,
  onReject,
}: PendingApprovalsPanelProps) {
  const { t } = useAppPreferences();

  if (approvals.length === 0) {
    return null;
  }

  return (
    <YStack
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      paddingHorizontal="$4"
      paddingVertical="$3"
      gap="$3"
    >
      <Text color="$color" fontSize="$3" fontWeight="700">
        {t('chat.pendingApprovals', { count: approvals.length })}
      </Text>
      {approvals.map((approval) => {
        const parameterPreview = toParameterPreview(approval.parameters);
        const disabled = actionInFlightId === approval.id;

        return (
          <YStack
            key={approval.id}
            backgroundColor="$glass"
            borderWidth={1}
            borderColor="$glassBorder"
            borderRadius="$4"
            padding="$3"
            gap="$2"
          >
            <Text color="$color" fontSize="$3" fontWeight="600">
              {approval.toolName}
            </Text>
            {approval.proposalMessage ? (
              <Text color="$colorSecondary" fontSize="$2">
                {approval.proposalMessage}
              </Text>
            ) : null}
            {parameterPreview ? (
              <Text color="$colorTertiary" fontSize="$1" numberOfLines={3}>
                {parameterPreview}
              </Text>
            ) : null}
            <XStack gap="$2">
              <Pressable onPress={() => onApprove(approval.id)} disabled={disabled}>
                <View
                  style={{
                    backgroundColor: '#22c55e',
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  <Text color="white" fontSize={12} fontWeight="600">
                    {t('chat.approve')}
                  </Text>
                </View>
              </Pressable>
              <Pressable onPress={() => onReject(approval.id)} disabled={disabled}>
                <View
                  style={{
                    backgroundColor: '#ef4444',
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  <Text color="white" fontSize={12} fontWeight="600">
                    {t('chat.reject')}
                  </Text>
                </View>
              </Pressable>
            </XStack>
          </YStack>
        );
      })}
    </YStack>
  );
}
