import { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Circle, Text, XStack, YStack, useTheme } from 'tamagui';
import { Search, X } from '@tamagui/lucide-icons';

import { l4yercak3Client } from '../../src/api/client';
import { useAppPreferences } from '../../src/contexts/AppPreferencesContext';

type Contact = {
  id: string;
  name: string;
  email?: string;
  subtype: string;
  status: string;
};

function subtypeColor(subtype: string): { backgroundColor: string; color: string } {
  switch (subtype) {
    case 'customer':
      return { backgroundColor: 'rgba(34, 197, 94, 0.16)', color: '#22c55e' };
    case 'lead':
      return { backgroundColor: 'rgba(59, 130, 246, 0.16)', color: '#3b82f6' };
    case 'prospect':
      return { backgroundColor: 'rgba(251, 191, 36, 0.16)', color: '#eab308' };
    default:
      return { backgroundColor: 'rgba(107, 114, 128, 0.16)', color: '#9ca3af' };
  }
}

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useAppPreferences();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const response = await l4yercak3Client.crm.listContacts({
          search: searchQuery || undefined,
          limit: 50,
        });
        setContacts((response.contacts || []) as Contact[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('contacts.failed'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [searchQuery, t]
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      void fetchContacts();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, fetchContacts]);

  const renderContact = ({ item }: { item: Contact }) => {
    const colors = subtypeColor(item.subtype);
    const subtypeLabel = item.subtype === 'customer'
      ? t('contacts.subtype.customer')
      : item.subtype === 'lead'
      ? t('contacts.subtype.lead')
      : item.subtype === 'prospect'
      ? t('contacts.subtype.prospect')
      : item.subtype;

    return (
      <Pressable>
        <XStack
          alignItems="center"
          gap="$3"
          paddingHorizontal="$4"
          paddingVertical="$3"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <Circle size={44} backgroundColor="$surface" alignItems="center" justifyContent="center">
            <Text color="$color" fontSize="$4" fontWeight="600">
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </Circle>

          <YStack flex={1}>
            <Text color="$color" fontSize="$4" fontWeight="600" numberOfLines={1}>
              {item.name}
            </Text>
            {item.email ? (
              <Text color="$colorTertiary" fontSize="$2" numberOfLines={1}>
                {item.email}
              </Text>
            ) : null}
          </YStack>

          <YStack
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
            style={{ backgroundColor: colors.backgroundColor }}
          >
            <Text color={colors.color} fontSize="$1" textTransform="uppercase" fontWeight="700">
              {subtypeLabel}
            </Text>
          </YStack>
        </XStack>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <YStack flex={1} backgroundColor="$background" paddingTop={insets.top + 8}>
        <YStack paddingHorizontal="$4" paddingBottom="$3" gap="$3" borderBottomWidth={1} borderBottomColor="$borderColor">
          <Text color="$color" fontSize="$7" fontWeight="700">
            {t('contacts.title')}
          </Text>

          <XStack
            backgroundColor="$surface"
            borderRadius="$3"
            paddingHorizontal="$3"
            paddingVertical="$2"
            alignItems="center"
            gap="$2"
          >
            <Search size={16} color="$colorTertiary" />
            <TextInput
              style={{
                flex: 1,
                color: String(theme.color?.val || '#EDEDED'),
                fontSize: 16,
                paddingVertical: 6,
              }}
              placeholder={t('contacts.searchPlaceholder')}
              placeholderTextColor={String(theme.colorTertiary?.val || '#888888')}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={16} color="#888888" />
              </Pressable>
            ) : null}
          </XStack>
        </YStack>

        {isLoading ? (
          <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
            <ActivityIndicator size="large" color="#E8520A" />
            <Text color="$colorTertiary" fontSize="$3">
              {t('contacts.loading')}
            </Text>
          </YStack>
        ) : error ? (
          <YStack flex={1} alignItems="center" justifyContent="center" paddingHorizontal="$6" gap="$4">
            <Text color="$error" textAlign="center">
              {error}
            </Text>
            <Pressable onPress={() => void fetchContacts()}>
              <YStack
                backgroundColor="$primary"
                borderRadius="$3"
                paddingHorizontal="$4"
                paddingVertical="$3"
              >
                <Text color="white" fontWeight="600">
                  {t('common.retry')}
                </Text>
              </YStack>
            </Pressable>
          </YStack>
        ) : (
          <FlatList
            data={contacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void fetchContacts(true)}
                tintColor="#E8520A"
              />
            }
            ListEmptyComponent={
              <YStack flex={1} alignItems="center" justifyContent="center" paddingVertical="$8">
                <Text color="$colorTertiary" textAlign="center">
                  {searchQuery ? t('contacts.noMatch') : t('contacts.empty')}
                </Text>
              </YStack>
            }
          />
        )}
      </YStack>
    </SafeAreaView>
  );
}
