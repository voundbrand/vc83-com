import { useState } from 'react';
import { Alert, Modal, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  YStack,
  XStack,
  Text,
  Circle,
  styled,
} from 'tamagui';
import {
  Plus,
  X,
  Camera,
  Image as ImageIcon,
  FileText,
  Globe,
  Search,
  Sparkles,
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

const MenuOption = styled(XStack, {
  alignItems: 'center',
  gap: '$4',
  paddingVertical: '$3',
  paddingHorizontal: '$4',
  borderRadius: '$3',
  pressStyle: {
    backgroundColor: '$glass',
  },
});

type AttachmentType = {
  type: 'image' | 'file';
  uri: string;
  name?: string;
  mimeType?: string;
  width?: number;
  height?: number;
};

type AttachmentMenuProps = {
  onAttach: (attachment: AttachmentType) => void;
  onWebSearch?: () => void;
  onResearchMode?: () => void;
  metaVisionConfigured?: boolean;
  onSelectMetaVisionSource?: () => void;
};

export function AttachmentMenu({
  onAttach,
  onWebSearch,
  onResearchMode,
  metaVisionConfigured = false,
  onSelectMetaVisionSource,
}: AttachmentMenuProps) {
  const { t } = useAppPreferences();
  const [isOpen, setIsOpen] = useState(false);

  const showPermissionAlert = (title: string, body: string) => {
    Alert.alert(title, body);
  };

  const handleCamera = async () => {
    try {
      setIsOpen(false);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showPermissionAlert(
          t('attachment.camera'),
          'Camera permission is required to capture vision input.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        onAttach({
          type: 'image',
          uri: result.assets[0].uri,
          mimeType: result.assets[0].mimeType,
          width: result.assets[0].width,
          height: result.assets[0].height,
        });
      }
    } catch (error) {
      showPermissionAlert(
        t('attachment.vision'),
        error instanceof Error ? error.message : 'Failed to open camera.'
      );
    }
  };

  const handleVision = async () => {
    if (metaVisionConfigured && onSelectMetaVisionSource) {
      Alert.alert(
        t('attachment.vision'),
        'Choose vision source',
        [
          {
            text: 'iPhone camera',
            onPress: () => {
              void handleCamera();
            },
          },
          {
            text: 'Meta glasses',
            onPress: () => {
              onSelectMetaVisionSource();
              setIsOpen(false);
            },
          },
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => {
              setIsOpen(false);
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }
    await handleCamera();
  };

  const handlePhotos = async () => {
    try {
      setIsOpen(false);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showPermissionAlert(
          t('attachment.photos'),
          'Photos permission is required to choose an image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        onAttach({
          type: 'image',
          uri: result.assets[0].uri,
          mimeType: result.assets[0].mimeType,
          width: result.assets[0].width,
          height: result.assets[0].height,
        });
      }
    } catch (error) {
      showPermissionAlert(
        t('attachment.photos'),
        error instanceof Error ? error.message : 'Failed to open photo library.'
      );
    }
  };

  const handleFiles = async () => {
    try {
      setIsOpen(false);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        onAttach({
          type: 'file',
          uri: result.assets[0].uri,
          name: result.assets[0].name,
          mimeType: result.assets[0].mimeType,
        });
      }
    } catch (error) {
      showPermissionAlert(
        t('attachment.files'),
        error instanceof Error ? error.message : 'Failed to open file picker.'
      );
    }
  };

  const handleWebSearch = () => {
    setIsOpen(false);
    if (!onWebSearch) {
      showPermissionAlert(
        t('attachment.webSearch'),
        'Web search is not configured in this build.'
      );
      return;
    }
    try {
      onWebSearch();
    } catch (error) {
      showPermissionAlert(
        t('attachment.webSearch'),
        error instanceof Error ? error.message : 'Failed to start web search.'
      );
    }
  };

  const handleResearchMode = () => {
    setIsOpen(false);
    if (!onResearchMode) {
      showPermissionAlert(
        t('attachment.researchMode'),
        'Research mode is not configured in this build.'
      );
      return;
    }
    try {
      onResearchMode();
    } catch (error) {
      showPermissionAlert(
        t('attachment.researchMode'),
        error instanceof Error ? error.message : 'Failed to start research mode.'
      );
    }
  };

  return (
    <>
      {/* Plus Button */}
      <Pressable
        onPress={() => {
          setIsOpen(true);
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Circle
          size={44}
          backgroundColor="$glass"
          borderWidth={1}
          borderColor="$glassBorder"
          alignItems="center"
          justifyContent="center"
        >
          <Plus size={22} color="$color" />
        </Circle>
      </Pressable>

      {/* Menu Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setIsOpen(false)}
        >
          <MenuOverlay>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <MenuContainer>
                {/* Header */}
                <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
                  <Text color="$color" fontSize="$5" fontWeight="600">
                    {t('attachment.addToMessage')}
                  </Text>
                  <Pressable onPress={() => setIsOpen(false)}>
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

                {/* Options */}
                <YStack gap="$1">
                  <Pressable onPress={() => void handleVision()}>
                    <MenuOption>
                      <Circle size={40} backgroundColor="$glass" alignItems="center" justifyContent="center">
                        <Sparkles size={20} color="$primary" />
                      </Circle>
                      <YStack>
                        <Text color="$color" fontSize="$4" fontWeight="500">{t('attachment.vision')}</Text>
                        <Text color="$colorTertiary" fontSize="$2">{t('attachment.captureVision')}</Text>
                      </YStack>
                    </MenuOption>
                  </Pressable>

                  <Pressable onPress={handleCamera}>
                    <MenuOption>
                      <Circle size={40} backgroundColor="$glass" alignItems="center" justifyContent="center">
                        <Camera size={20} color="$primary" />
                      </Circle>
                      <YStack>
                        <Text color="$color" fontSize="$4" fontWeight="500">{t('attachment.camera')}</Text>
                        <Text color="$colorTertiary" fontSize="$2">{t('attachment.takePhoto')}</Text>
                      </YStack>
                    </MenuOption>
                  </Pressable>

                  <Pressable onPress={handlePhotos}>
                    <MenuOption>
                      <Circle size={40} backgroundColor="$glass" alignItems="center" justifyContent="center">
                        <ImageIcon size={20} color="$primary" />
                      </Circle>
                      <YStack>
                        <Text color="$color" fontSize="$4" fontWeight="500">{t('attachment.photos')}</Text>
                        <Text color="$colorTertiary" fontSize="$2">{t('attachment.selectFromGallery')}</Text>
                      </YStack>
                    </MenuOption>
                  </Pressable>

                  <Pressable onPress={handleFiles}>
                    <MenuOption>
                      <Circle size={40} backgroundColor="$glass" alignItems="center" justifyContent="center">
                        <FileText size={20} color="$primary" />
                      </Circle>
                      <YStack>
                        <Text color="$color" fontSize="$4" fontWeight="500">{t('attachment.files')}</Text>
                        <Text color="$colorTertiary" fontSize="$2">{t('attachment.attachDocuments')}</Text>
                      </YStack>
                    </MenuOption>
                  </Pressable>

                  <YStack height={1} backgroundColor="$borderColor" marginVertical="$2" />

                  <Pressable onPress={handleWebSearch}>
                    <MenuOption>
                      <Circle size={40} backgroundColor="$glass" alignItems="center" justifyContent="center">
                        <Globe size={20} color="$info" />
                      </Circle>
                      <YStack>
                        <Text color="$color" fontSize="$4" fontWeight="500">{t('attachment.webSearch')}</Text>
                        <Text color="$colorTertiary" fontSize="$2">{t('attachment.searchInternet')}</Text>
                      </YStack>
                    </MenuOption>
                  </Pressable>

                  <Pressable onPress={handleResearchMode}>
                    <MenuOption>
                      <Circle size={40} backgroundColor="$glass" alignItems="center" justifyContent="center">
                        <Search size={20} color="$info" />
                      </Circle>
                      <YStack>
                        <Text color="$color" fontSize="$4" fontWeight="500">{t('attachment.researchMode')}</Text>
                        <Text color="$colorTertiary" fontSize="$2">{t('attachment.deepResearch')}</Text>
                      </YStack>
                    </MenuOption>
                  </Pressable>
                </YStack>
              </MenuContainer>
            </Pressable>
          </MenuOverlay>
        </Pressable>
      </Modal>
    </>
  );
}

export default AttachmentMenu;
