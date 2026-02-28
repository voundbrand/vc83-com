import { useState } from 'react';
import { Modal, Pressable, Share, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import {
  YStack,
  XStack,
  Text,
  Circle,
  styled,
} from 'tamagui';
import {
  X,
  Copy,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  RefreshCw,
} from '@tamagui/lucide-icons';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

const MenuOverlay = styled(YStack, {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'flex-end',
});

const MenuContainer = styled(YStack, {
  backgroundColor: '$background',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingTop: '$4',
  paddingBottom: '$8',
  paddingHorizontal: '$4',
});

const ActionButton = styled(YStack, {
  alignItems: 'center',
  gap: '$2',
  padding: '$3',
  borderRadius: '$3',
  minWidth: 70,
  pressStyle: {
    backgroundColor: '$glass',
  },
});

type MessageActionsProps = {
  isOpen: boolean;
  onClose: () => void;
  messageContent: string;
  messageRole: 'user' | 'assistant';
  onFeedback?: (type: 'positive' | 'negative') => void;
  onRegenerate?: () => void;
};

export function MessageActions({
  isOpen,
  onClose,
  messageContent,
  messageRole,
  onFeedback,
  onRegenerate,
}: MessageActionsProps) {
  const { t, agentVoiceId } = useAppPreferences();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(messageContent);
    Alert.alert(t('messageActions.copiedTitle'), t('messageActions.copiedBody'));
    onClose();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: messageContent,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
    onClose();
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      Speech.speak(messageContent, {
        voice: agentVoiceId || undefined,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
      setIsSpeaking(true);
    }
  };

  const handleThumbsUp = () => {
    setFeedback('positive');
    onFeedback?.('positive');
  };

  const handleThumbsDown = () => {
    setFeedback('negative');
    onFeedback?.('negative');
  };

  const handleRegenerate = () => {
    onRegenerate?.();
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <MenuOverlay>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <MenuContainer>
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
                <Text color="$color" fontSize="$5" fontWeight="600">
                  {t('messageActions.title')}
                </Text>
                <Pressable onPress={onClose}>
                  <Circle
                    size={32}
                    backgroundColor="$glass"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <X size={18} color="$color" />
                  </Circle>
                </Pressable>
              </XStack>

              {/* Message Preview */}
              <YStack
                backgroundColor="$glass"
                borderRadius="$3"
                padding="$3"
                marginBottom="$4"
                maxHeight={100}
              >
                <Text color="$colorSecondary" fontSize="$3" numberOfLines={3}>
                  {messageContent}
                </Text>
              </YStack>

              {/* Actions */}
              <XStack justifyContent="space-around" flexWrap="wrap" gap="$2">
                <Pressable onPress={handleCopy}>
                  <ActionButton>
                    <Circle size={44} backgroundColor="$glass" alignItems="center" justifyContent="center">
                      <Copy size={20} color="$color" />
                    </Circle>
                    <Text color="$colorSecondary" fontSize="$2">{t('messageActions.copy')}</Text>
                  </ActionButton>
                </Pressable>

                <Pressable onPress={handleShare}>
                  <ActionButton>
                    <Circle size={44} backgroundColor="$glass" alignItems="center" justifyContent="center">
                      <Share2 size={20} color="$color" />
                    </Circle>
                    <Text color="$colorSecondary" fontSize="$2">{t('messageActions.share')}</Text>
                  </ActionButton>
                </Pressable>

                <Pressable onPress={handleSpeak}>
                  <ActionButton>
                    <Circle
                      size={44}
                      backgroundColor={isSpeaking ? '$primary' : '$glass'}
                      alignItems="center"
                      justifyContent="center"
                    >
                      {isSpeaking ? (
                        <VolumeX size={20} color="white" />
                      ) : (
                        <Volume2 size={20} color="$color" />
                      )}
                    </Circle>
                    <Text color="$colorSecondary" fontSize="$2">
                      {isSpeaking ? t('messageActions.stop') : t('messageActions.read')}
                    </Text>
                  </ActionButton>
                </Pressable>

                {messageRole === 'assistant' && (
                  <>
                    <Pressable onPress={handleThumbsUp}>
                      <ActionButton>
                        <Circle
                          size={44}
                          backgroundColor={feedback === 'positive' ? '$success' : '$glass'}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <ThumbsUp
                            size={20}
                            color={feedback === 'positive' ? 'white' : '$color'}
                          />
                        </Circle>
                        <Text color="$colorSecondary" fontSize="$2">{t('messageActions.good')}</Text>
                      </ActionButton>
                    </Pressable>

                    <Pressable onPress={handleThumbsDown}>
                      <ActionButton>
                        <Circle
                          size={44}
                          backgroundColor={feedback === 'negative' ? '$error' : '$glass'}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <ThumbsDown
                            size={20}
                            color={feedback === 'negative' ? 'white' : '$color'}
                          />
                        </Circle>
                        <Text color="$colorSecondary" fontSize="$2">{t('messageActions.bad')}</Text>
                      </ActionButton>
                    </Pressable>

                    {onRegenerate ? (
                      <Pressable onPress={handleRegenerate}>
                        <ActionButton>
                          <Circle size={44} backgroundColor="$glass" alignItems="center" justifyContent="center">
                            <RefreshCw size={20} color="$color" />
                          </Circle>
                          <Text color="$colorSecondary" fontSize="$2">{t('messageActions.retry')}</Text>
                        </ActionButton>
                      </Pressable>
                    ) : null}
                  </>
                )}
              </XStack>
            </MenuContainer>
          </Pressable>
        </MenuOverlay>
      </Pressable>
    </Modal>
  );
}

export default MessageActions;
