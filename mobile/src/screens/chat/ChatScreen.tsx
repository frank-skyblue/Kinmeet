import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/common/Avatar';
import { COLORS } from '../../constants/colors';
import { useChatInbox } from '../../contexts/useChatInbox';
import type { ChatStackParamList } from '../../navigation/types';
import { describeMessagePreview, formatInboxTime } from '../../utils/chatFormat';
import { formatBadgeCount } from '../connections/ConnectionsScreen';

type ChatScreenProps = NativeStackScreenProps<ChatStackParamList, 'ChatHome'>;

/** Conversation inbox (port of the web ChatSidebar). Unread conversations are listed first. */
export const ChatScreen = ({ navigation }: ChatScreenProps) => {
  const insets = useSafeAreaInsets();
  const { conversations, isLoadingInbox, inboxError, refetchInbox } = useChatInbox();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasFocusedRef = useRef(false);

  // The inbox stays mounted under the thread; reload it when coming back.
  useEffect(() => {
    return navigation.addListener('focus', () => {
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }
      void refetchInbox();
    });
  }, [navigation, refetchInbox]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchInbox();
    setIsRefreshing(false);
  };

  const rows = conversations.filter((row) => row.user !== null);

  return (
    <View className="flex-1 bg-kin-beige" style={{ paddingTop: insets.top + 8 }}>
      <View className="px-4 pb-3">
        <Text accessibilityRole="header" className="text-2xl font-bold text-kin-navy">
          Messages
        </Text>
        <Text className="text-xs text-kin-stone-500">Your kins</Text>
      </View>

      {inboxError ? (
        <Text
          accessibilityRole="alert"
          className="mx-4 mb-2 rounded-xl border border-kin-coral-200 bg-kin-coral-50 px-3 py-2 text-sm text-kin-coral-700"
        >
          {inboxError}
        </Text>
      ) : null}

      {isLoadingInbox && rows.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.coral} />
          <Text className="mt-4 text-kin-navy">Loading inbox…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.user?._id ?? ''}
          refreshing={isRefreshing}
          onRefresh={() => void handleRefresh()}
          contentContainerClassName="flex-grow bg-white"
          ItemSeparatorComponent={() => <View className="ml-[76px] h-px bg-kin-stone-300/60" />}
          ListEmptyComponent={
            inboxError ? undefined : (
              <View className="flex-1 items-center justify-center bg-kin-beige px-6 py-16">
                <Ionicons name="chatbubble-ellipses-outline" size={48} color={COLORS.stone500} />
                <Text accessibilityRole="header" className="mt-3 text-base text-kin-navy">
                  No conversations yet
                </Text>
                <Text className="mt-1 text-center text-sm text-kin-stone-500">
                  Connect with people from Discover to chat.
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const peer = item.user;
            if (!peer) return null;
            const fullName = `${peer.firstName} ${peer.lastName}`.trim();
            const unread = item.unreadCount > 0;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open chat with ${fullName}${unread ? ', unread messages' : ''}`}
                onPress={() => navigation.navigate('ChatThread', { userId: peer._id })}
                className="flex-row items-center gap-3 px-4 py-3 active:bg-kin-beige"
              >
                <Avatar firstName={peer.firstName} photo={peer.photo} size={48} />
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-baseline justify-between gap-2">
                    <Text
                      numberOfLines={1}
                      className={`flex-1 text-base text-kin-navy ${unread ? 'font-bold' : 'font-medium'}`}
                    >
                      {fullName}
                    </Text>
                    {item.lastMessage?.createdAt ? (
                      <Text className={`text-xs ${unread ? 'text-kin-coral' : 'text-kin-stone-500'}`}>
                        {formatInboxTime(item.lastMessage.createdAt)}
                      </Text>
                    ) : null}
                  </View>
                  <View className="mt-0.5 flex-row items-center gap-2">
                    <Text
                      numberOfLines={1}
                      className={`flex-1 text-sm ${
                        unread ? 'font-semibold text-kin-navy' : 'text-kin-stone-500'
                      }`}
                    >
                      {describeMessagePreview(item.lastMessage)}
                    </Text>
                    {unread ? (
                      <View className="min-w-5 items-center rounded-full bg-kin-coral px-1.5 py-0.5">
                        <Text className="text-[10px] font-bold text-white">
                          {formatBadgeCount(item.unreadCount)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
};
