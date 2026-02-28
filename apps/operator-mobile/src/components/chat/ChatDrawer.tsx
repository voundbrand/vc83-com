import { useState } from 'react';
import { Modal, Pressable, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  YStack,
  XStack,
  Text,
  Circle,
  styled,
  Avatar,
} from 'tamagui';
import {
  X,
  Plus,
  MessageCircle,
  ChevronRight,
  Sparkles,
  FolderKanban,
  FileBox,
  Code,
  Menu,
} from '@tamagui/lucide-icons';

import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/auth';
import { useAppPreferences } from '../../contexts/AppPreferencesContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.88; // 88% of screen
const PEEK_WIDTH = SCREEN_WIDTH - DRAWER_WIDTH; // ~12% peek

const NavItem = styled(XStack, {
  alignItems: 'center',
  gap: '$3',
  paddingVertical: 14,
  paddingHorizontal: '$4',
  borderRadius: 12,
  pressStyle: {
    backgroundColor: '$glass',
  },
});

const RecentChatItem = styled(XStack, {
  alignItems: 'center',
  gap: 10,
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 8,
  pressStyle: {
    backgroundColor: '$glass',
  },
});

type Conversation = {
  id: string;
  title: string;
  preview: string;
  updatedAt: Date;
};

type ChatDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation?: (id: string) => void;
};

export function ChatDrawer({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
}: ChatDrawerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useAppPreferences();
  const { user } = useAuth();
  const { currentOrganization } = useAuthStore();
  const [showAllChats, setShowAllChats] = useState(false);

  // Get recent chats (last 10)
  const recentChats = conversations.slice(0, 10);

  const handleSelectConversation = (id: string) => {
    onSelectConversation(id);
    onClose();
  };

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  // Open settings - close drawer first to avoid nested modal issues on iOS
  const handleOpenSettings = () => {
    onClose();
    setTimeout(() => {
      router.push('/(tabs)/settings');
    }, 100);
  };

  // Open all chats - close drawer first to avoid nested modal issues on iOS
  const handleOpenAllChats = () => {
    onClose();
    setTimeout(() => {
      setShowAllChats(true);
    }, 100);
  };

  // Get user display name (truncated if too long)
  const displayName = user?.firstName
    ? user.firstName.length > 18
      ? user.firstName.substring(0, 18) + '...'
      : user.firstName
    : user?.email
    ? user.email.split('@')[0].substring(0, 18)
    : t('drawer.user');

  // All Chats Full Screen Modal
  const AllChatsModal = () => (
    <Modal
      visible={showAllChats}
      animationType="slide"
      onRequestClose={() => setShowAllChats(false)}
    >
      <YStack flex={1} backgroundColor="$background">
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Header */}
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$4"
            alignItems="center"
            justifyContent="space-between"
            borderBottomWidth={1}
            borderBottomColor="$borderColor"
          >
            <Text color="$color" fontSize="$6" fontWeight="700">
              {t('drawer.allChats')}
            </Text>
            <Pressable onPress={() => setShowAllChats(false)}>
              <Circle
                size={36}
                backgroundColor="$glass"
                alignItems="center"
                justifyContent="center"
              >
                <X size={20} color="$color" />
              </Circle>
            </Pressable>
          </XStack>

          {/* Chat List */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {conversations.length === 0 ? (
              <YStack alignItems="center" paddingVertical="$8">
                <Text color="$colorTertiary" fontSize="$4">
                  {t('drawer.noConversations')}
                </Text>
              </YStack>
            ) : (
              conversations.map((chat) => (
                <Pressable
                  key={chat.id}
                  onPress={() => {
                    handleSelectConversation(chat.id);
                    setShowAllChats(false);
                  }}
                >
                  <XStack
                    alignItems="center"
                    gap="$3"
                    paddingVertical="$3"
                    paddingHorizontal="$3"
                    borderRadius="$3"
                    backgroundColor={chat.id === currentConversationId ? '$glass' : 'transparent'}
                    marginBottom="$2"
                  >
                    <Circle
                      size={44}
                      backgroundColor={chat.id === currentConversationId ? '$primary' : '$glass'}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <MessageCircle
                        size={20}
                        color={chat.id === currentConversationId ? 'white' : '$colorTertiary'}
                      />
                    </Circle>
                    <YStack flex={1}>
                      <Text
                        color="$color"
                        fontSize="$4"
                        fontWeight={chat.id === currentConversationId ? '600' : '400'}
                        numberOfLines={1}
                      >
                        {chat.title}
                      </Text>
                      <Text color="$colorTertiary" fontSize="$2" numberOfLines={1}>
                        {chat.preview}
                      </Text>
                    </YStack>
                  </XStack>
                </Pressable>
              ))
            )}
          </ScrollView>

          {/* Bottom Bar - Search + New Chat */}
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$3"
            borderTopWidth={1}
            borderTopColor="$borderColor"
            gap="$3"
            alignItems="center"
          >
            {/* Search Button */}
            <Pressable style={{ flex: 1 }}>
              <XStack
                flex={1}
                backgroundColor="$glass"
                borderRadius="$3"
                paddingHorizontal="$4"
                paddingVertical="$3"
                alignItems="center"
                gap="$2"
              >
                <Text color="$colorTertiary" fontSize="$4">
                  {t('drawer.searchChats')}
                </Text>
              </XStack>
            </Pressable>

            {/* New Chat Button */}
            <Pressable
              onPress={() => {
                setShowAllChats(false);
                handleNewChat();
              }}
            >
              <Circle
                size={48}
                backgroundColor="$primary"
                alignItems="center"
                justifyContent="center"
              >
                <Plus size={24} color="white" />
              </Circle>
            </Pressable>
          </XStack>
        </SafeAreaView>
      </YStack>
    </Modal>
  );

  return (
    <>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <XStack flex={1}>
          {/* Main Drawer */}
          <YStack
            width={DRAWER_WIDTH}
            backgroundColor="$background"
            height="100%"
          >
            <YStack flex={1} paddingTop={insets.top} paddingBottom={insets.bottom}>
              {/* Header - Layer Cake Title */}
              <XStack
                paddingHorizontal={20}
                paddingTop={8}
                paddingBottom={12}
                alignItems="center"
              >
                <Text color="$color" fontSize={28} fontWeight="700" letterSpacing={-0.5}>
                  SevenLayers
                </Text>
              </XStack>

              {/* Navigation Items */}
              <YStack paddingHorizontal={8} gap={4}>
                <Pressable onPress={onClose}>
                  <NavItem backgroundColor="$glass">
                    <Sparkles size={22} color="$primary" />
                    <Text color="$color" fontSize={17} fontWeight="600">
                      {t('drawer.chats')}
                    </Text>
                  </NavItem>
                </Pressable>

                <Pressable>
                  <NavItem>
                    <FolderKanban size={22} color="$colorTertiary" />
                    <Text color="$color" fontSize={17}>
                      {t('drawer.projects')}
                    </Text>
                  </NavItem>
                </Pressable>

                <Pressable>
                  <NavItem>
                    <FileBox size={22} color="$colorTertiary" />
                    <Text color="$color" fontSize={17}>
                      {t('drawer.artifacts')}
                    </Text>
                  </NavItem>
                </Pressable>

                <Pressable>
                  <NavItem>
                    <Code size={22} color="$colorTertiary" />
                    <Text color="$color" fontSize={17}>
                      {t('drawer.code')}
                    </Text>
                  </NavItem>
                </Pressable>
              </YStack>

              {/* Recents Section */}
              <YStack flex={1} paddingTop={20}>
                <Text
                  color="$colorTertiary"
                  fontSize={12}
                  fontWeight="600"
                  paddingHorizontal={20}
                  marginBottom={8}
                  textTransform="uppercase"
                  letterSpacing={0.8}
                >
                  {t('drawer.recents')}
                </Text>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 8 }}>
                  {recentChats.length === 0 ? (
                    <YStack alignItems="center" paddingVertical={24}>
                      <Text color="$colorTertiary" fontSize={15}>
                        {t('drawer.noRecentChats')}
                      </Text>
                    </YStack>
                  ) : (
                    recentChats.map((chat) => (
                      <Pressable
                        key={chat.id}
                        onPress={() => handleSelectConversation(chat.id)}
                      >
                        <RecentChatItem
                          backgroundColor={chat.id === currentConversationId ? '$glass' : 'transparent'}
                        >
                          <MessageCircle size={18} color="$colorTertiary" />
                          <Text
                            color="$color"
                            fontSize={15}
                            numberOfLines={1}
                            flex={1}
                          >
                            {chat.title}
                          </Text>
                        </RecentChatItem>
                      </Pressable>
                    ))
                  )}
                </ScrollView>

                {/* All Chats Button */}
                <Pressable onPress={handleOpenAllChats}>
                  <XStack
                    paddingHorizontal={20}
                    paddingVertical={14}
                    alignItems="center"
                    gap={6}
                  >
                    <Text color="$primary" fontSize={15} fontWeight="600">
                      {t('drawer.viewAllChats')}
                    </Text>
                    <ChevronRight size={18} color="$primary" />
                  </XStack>
                </Pressable>
              </YStack>

              {/* Bottom Bar - User Profile + New Chat */}
              <XStack
                paddingHorizontal={16}
                paddingVertical={16}
                alignItems="center"
                gap={12}
                borderTopWidth={1}
                borderTopColor="$borderColor"
              >
                {/* User Profile - taps to settings */}
                <Pressable onPress={handleOpenSettings} style={{ flex: 1 }}>
                  <XStack alignItems="center" gap={12} flex={1}>
                    <Avatar circular size={40} backgroundColor="$primary">
                      <Avatar.Fallback>
                        <Text color="white" fontSize={17} fontWeight="600">
                          {displayName.charAt(0).toUpperCase()}
                        </Text>
                      </Avatar.Fallback>
                    </Avatar>
                    <YStack flex={1}>
                      <Text color="$color" fontSize={16} fontWeight="500" numberOfLines={1}>
                        {displayName}
                      </Text>
                      {currentOrganization && (
                        <Text color="$colorTertiary" fontSize={12} numberOfLines={1}>
                          {currentOrganization.name}
                        </Text>
                      )}
                    </YStack>
                    <ChevronRight size={20} color="$colorTertiary" />
                  </XStack>
                </Pressable>

                {/* New Chat Button - Purple */}
                <Pressable onPress={handleNewChat}>
                  <Circle
                    size={46}
                    backgroundColor="$primary"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Plus size={24} color="white" />
                  </Circle>
                </Pressable>
              </XStack>
            </YStack>
          </YStack>

          {/* Peek Area - Shows bit of main UI, tap to close */}
          <Pressable
            style={{
              width: PEEK_WIDTH,
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }}
            onPress={onClose}
          >
            {/* Hamburger menu indicator */}
            <SafeAreaView edges={['top']} style={{ paddingTop: 4 }}>
              <YStack paddingTop="$2" paddingLeft="$2">
                <Circle
                  size={40}
                  backgroundColor="$glass"
                  alignItems="center"
                  justifyContent="center"
                  opacity={0.8}
                >
                  <Menu size={20} color="white" />
                </Circle>
              </YStack>
            </SafeAreaView>
          </Pressable>
        </XStack>
      </Modal>

      {/* Sub-modals */}
      <AllChatsModal />
    </>
  );
}

export default ChatDrawer;
