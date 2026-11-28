import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatComposer } from '../../components/chat/ChatComposer';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { Avatar } from '../../components/common/Avatar';
import { CHAT_SOCKET_EVENTS } from '../../constants/chatSocketEvents';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../contexts/useAuth';
import { useChatInbox } from '../../contexts/useChatInbox';
import { useSocket } from '../../contexts/useSocket';
import type { ChatStackParamList, MainTabParamList } from '../../navigation/types';
import { chatAPI, profileAPI } from '../../services/api';
import type {
  ChatMessage,
  ChatSendMessageAck,
  ChatSendMessagePayload,
  ChatTypingPayload,
  ChatUserTypingPayload,
  UserProfile,
} from '../../types';
import { formatMessageDateLabel, getCalendarDateKey } from '../../utils/chatFormat';

type ChatThreadScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ChatStackParamList, 'ChatThread'>,
  BottomTabScreenProps<MainTabParamList>
>;

const SEND_ACK_TIMEOUT_MS = 15_000;
/** Typing stops being shown this long after the last keystroke. */
const TYPING_IDLE_MS = 2000;
/** Within this distance of the newest message, the reader follows new messages as they arrive. */
const NEAR_BOTTOM_PX = 150;
const TEMP_ID_PREFIX = 'temp-';

type ThreadItem =
  | { kind: 'date'; key: string; label: string }
  | { kind: 'message'; key: string; message: ChatMessage };

/**
 * Rows for the inverted list, newest first. Each day's label comes after that day's oldest message
 * in this order, so on screen it sits above the day's messages.
 */
const buildThreadItems = (messages: ChatMessage[], reference = new Date()): ThreadItem[] => {
  const items: ThreadItem[] = [];
  let currentDateKey: string | undefined;
  for (const message of messages) {
    const dateKey = getCalendarDateKey(message.createdAt);
    if (dateKey !== currentDateKey) {
      currentDateKey = dateKey;
      items.push({
        kind: 'date',
        key: `date-${dateKey}`,
        label: formatMessageDateLabel(message.createdAt, reference),
      });
    }
    items.push({ kind: 'message', key: message._id, message });
  }
  return items.reverse();
};

/** Adds `incoming` to `base` by id (an `incoming` copy wins) and keeps the thread in time order. */
const mergeMessages = (base: ChatMessage[], incoming: ChatMessage[]) => {
  const byId = new Map(base.map((message) => [message._id, message]));
  for (const message of incoming) byId.set(message._id, message);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

const TypingIndicator = ({ name }: { name: string }) => (
  <View
    accessible
    accessibilityLabel={`${name} is typing`}
    className="my-1 flex-row gap-1 self-start rounded-2xl bg-white px-4 py-3"
  >
    {[0, 1, 2].map((dot) => (
      <View key={dot} className="h-2 w-2 rounded-full bg-kin-teal" />
    ))}
  </View>
);

/** A conversation with one kin (port of the web ChatThread, text messages). */
export const ChatThreadScreen = ({ navigation, route }: ChatThreadScreenProps) => (
  // Keyed so opening another conversation starts fresh instead of mixing two threads' state.
  <ChatThread key={route.params.userId} userId={route.params.userId} navigation={navigation} />
);

type ChatThreadProps = {
  userId: string;
  navigation: ChatThreadScreenProps['navigation'];
};

const ChatThread = ({ userId, navigation }: ChatThreadProps) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { conversations, refetchInbox } = useChatInbox();
  const listRef = useRef<FlatList<ThreadItem>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Cursor for the page before the oldest loaded message; null once the start is loaded.
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const messagesRef = useRef(messages);
  const loadingOlderRef = useRef(false);
  const typingActiveRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set when the socket reconnected while this thread was out of view: reload when it's back.
  const isStaleRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const inboxPeer = conversations.find((row) => row.user?._id === userId)?.user ?? null;
  // History stays readable, but a deactivated peer has no profile and can't receive messages.
  const isPeerUnavailable = Boolean(inboxPeer?.unavailable);
  const peer = isPeerUnavailable ? null : (profile ?? inboxPeer);
  const peerName = peer ? `${peer.firstName} ${peer.lastName ?? ''}`.trim() : '';
  const peerLocation = peer ? [peer.currentProvince, peer.currentCountry].filter(Boolean).join(', ') : '';

  /** Shown on screen right now, so arriving messages count as read. */
  const isViewing = useCallback(
    () => navigation.isFocused() && AppState.currentState === 'active',
    [navigation],
  );

  const sendReadReceipt = useCallback(async () => {
    try {
      await chatAPI.markAsRead(userId);
    } catch {
      // Opening the conversation again marks them read.
    }
    void refetchInbox();
  }, [userId, refetchInbox]);

  /** The newest page. Loading it marks the peer's messages read on the server. */
  const loadLatest = useCallback(
    async (isInitial: boolean) => {
      try {
        const response = await chatAPI.getConversation(userId, null);
        if (!response.success) throw new Error('Failed to load conversation');
        const loaded = response.messages.map((message) =>
          message.sender._id === userId ? { ...message, read: true } : message,
        );
        setMessages((prev) => mergeMessages(prev, loaded));
        if (isInitial) setOlderCursor(response.nextCursor ?? null);
        setLoadError('');
        void refetchInbox();
      } catch {
        if (isInitial) setLoadError('Failed to load conversation');
      } finally {
        if (isInitial) setIsLoading(false);
      }
    },
    [userId, refetchInbox],
  );

  useEffect(() => {
    void loadLatest(true);
  }, [loadLatest]);

  useEffect(() => {
    profileAPI
      .getUserProfile(userId)
      .then((response) => {
        if (response.success) setProfile(response.user);
      })
      .catch(() => {
        // The header falls back to the inbox's name and photo.
      });
  }, [userId]);

  const markUnreadAsRead = useCallback(() => {
    const hasUnread = messagesRef.current.some(
      (message) => message.sender._id === userId && !message.read,
    );
    if (!hasUnread) return;
    setMessages((prev) =>
      prev.map((message) => (message.sender._id === userId ? { ...message, read: true } : message)),
    );
    void sendReadReceipt();
  }, [userId, sendReadReceipt]);

  /** Coming back to the thread (another tab, the profile, the background) catches it up. */
  const catchUp = useCallback(() => {
    if (isStaleRef.current) {
      isStaleRef.current = false;
      void loadLatest(false);
      return;
    }
    markUnreadAsRead();
  }, [loadLatest, markUnreadAsRead]);

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', catchUp);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && navigation.isFocused()) catchUp();
    });
    return () => {
      unsubscribeFocus();
      subscription.remove();
    };
  }, [navigation, catchUp]);

  useEffect(() => {
    if (!socket) return;
    // Messages sent while the socket was down aren't replayed, so reload after a reconnect.
    let wasDisconnected = !socket.connected;

    const handleNewMessage = (message: ChatMessage) => {
      const isFromPeer = message.sender._id === userId;
      if (!isFromPeer && message.receiver._id !== userId) return;
      if (isFromPeer) setIsPeerTyping(false);
      const isSeen = isFromPeer && isViewing();
      setMessages((prev) =>
        prev.some((existing) => existing._id === message._id)
          ? prev
          : [...prev, isSeen ? { ...message, read: true } : message],
      );
      if (isSeen) void sendReadReceipt();
    };

    const handleUserTyping = (data: ChatUserTypingPayload) => {
      if (data.userId === userId) setIsPeerTyping(data.isTyping);
    };

    const handleDisconnect = () => {
      wasDisconnected = true;
      setIsPeerTyping(false);
    };

    const handleConnect = () => {
      if (!wasDisconnected) return;
      wasDisconnected = false;
      if (isViewing()) void loadLatest(false);
      else isStaleRef.current = true;
    };

    socket.on(CHAT_SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
    socket.on(CHAT_SOCKET_EVENTS.USER_TYPING, handleUserTyping);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    return () => {
      socket.off(CHAT_SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
      socket.off(CHAT_SOCKET_EVENTS.USER_TYPING, handleUserTyping);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, userId, isViewing, loadLatest, sendReadReceipt]);

  // The safe-area gap under the composer is only needed while the keyboard is down.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (!typingActiveRef.current) return;
    typingActiveRef.current = false;
    const payload: ChatTypingPayload = { receiverId: userId };
    socket?.emit(CHAT_SOCKET_EVENTS.TYPING_STOP, payload);
  }, [socket, userId]);

  // Leaving mid-sentence shouldn't leave "typing…" showing on the other side.
  useEffect(() => stopTyping, [stopTyping]);

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!socket) return;
    if (!value.trim()) {
      stopTyping();
      return;
    }
    // Sent on every change, like the web, so someone opening the thread mid-sentence sees it.
    const payload: ChatTypingPayload = { receiverId: userId };
    socket.emit(CHAT_SOCKET_EVENTS.TYPING_START, payload);
    typingActiveRef.current = true;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const emitSendMessage = (payload: ChatSendMessagePayload) =>
    new Promise<ChatSendMessageAck>((resolve) => {
      if (!socket) {
        resolve({ success: false, message: 'Not connected' });
        return;
      }
      socket
        .timeout(SEND_ACK_TIMEOUT_MS)
        .emit(
          CHAT_SOCKET_EVENTS.SEND_MESSAGE,
          payload,
          (err: Error | null, ack: ChatSendMessageAck) => {
            resolve(err ? { success: false, message: 'No response from the server' } : ack);
          },
        );
    });

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || !user || !socket || isPeerUnavailable) return;

    const tempId = `${TEMP_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: ChatMessage = {
      _id: tempId,
      sender: { _id: user.id, firstName: user.firstName, lastName: user.lastName },
      receiver: { _id: userId, firstName: peer?.firstName ?? '', lastName: peer?.lastName ?? '' },
      content,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setError('');
    stopTyping();
    // Your own message always brings you down to it.
    listRef.current?.scrollToOffset({ offset: 0, animated: true });

    const ack = await emitSendMessage({ receiverId: userId, content });
    if (ack.success) {
      setMessages((prev) => prev.map((message) => (message._id === tempId ? ack.message : message)));
      void refetchInbox();
    } else {
      setMessages((prev) => prev.filter((message) => message._id !== tempId));
      setError(ack.message);
      // Give the text back, unless a new message has been started since.
      setDraft((current) => current || content);
    }
  };

  const loadOlderMessages = async () => {
    if (!olderCursor || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setIsLoadingOlder(true);
    try {
      const response = await chatAPI.getConversation(userId, olderCursor);
      if (!response.success) throw new Error('Failed to load earlier messages');
      // Messages already shown keep their current copy.
      setMessages((prev) => mergeMessages(response.messages, prev));
      setOlderCursor(response.nextCursor ?? null);
    } catch {
      setError('Failed to load earlier messages');
    } finally {
      loadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  };

  const handleRetryLoad = () => {
    setIsLoading(true);
    void loadLatest(true);
  };

  const openProfile = () =>
    navigation.navigate('Profile', { screen: 'ProfileView', params: { userId }, initial: false });

  const renderBody = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.coral} />
          <Text className="mt-4 text-kin-navy">Loading conversation...</Text>
        </View>
      );
    }

    if (loadError && messages.length === 0) {
      return (
        <View accessibilityRole="alert" className="flex-1 items-center justify-center px-4">
          <Text className="mb-4 text-center text-kin-navy">{loadError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleRetryLoad}
            className="rounded-xl bg-kin-coral px-6 py-3 active:opacity-80"
          >
            <Text className="font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      );
    }

    if (messages.length === 0) {
      return (
        <View className="flex-1 justify-center px-4">
          <View className="items-center">
            <Text className="mb-4 text-5xl">💬</Text>
            <Text accessibilityRole="header" className="mb-2 text-lg font-bold text-kin-navy">
              Start the conversation
            </Text>
            <Text className="text-kin-stone-500">Send a message to begin chatting!</Text>
          </View>
          {isPeerTyping ? <TypingIndicator name={peer?.firstName ?? 'Your kin'} /> : null}
        </View>
      );
    }

    return (
      <FlatList
        ref={listRef}
        // Inverted: the newest message sits at the bottom, and scrolling up reaches older ones.
        inverted
        data={buildThreadItems(messages)}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="px-4 py-3"
        // Someone reading older messages stays where they are when a message arrives.
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: NEAR_BOTTOM_PX,
        }}
        onEndReached={() => void loadOlderMessages()}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          isPeerTyping ? <TypingIndicator name={peer?.firstName ?? 'Your kin'} /> : undefined
        }
        ListFooterComponent={
          olderCursor ? (
            // Scrolling up loads these too; the button is for screen readers.
            <View className="items-center py-2">
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isLoadingOlder }}
                disabled={isLoadingOlder}
                onPress={() => void loadOlderMessages()}
                className="rounded-full bg-white px-4 py-1.5 active:opacity-70"
              >
                <Text className="text-xs font-medium text-kin-stone-500">
                  {isLoadingOlder ? 'Loading earlier messages…' : 'Load earlier messages'}
                </Text>
              </Pressable>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          if (item.kind === 'date') {
            return (
              <View className="items-center py-2">
                <Text className="rounded-full bg-white px-4 py-1 text-xs font-medium text-kin-stone-500">
                  {item.label}
                </Text>
              </View>
            );
          }
          const { message } = item;
          return (
            <MessageBubble
              message={message}
              isOwn={message.sender._id === user?.id}
              isPending={message._id.startsWith(TEMP_ID_PREFIX)}
              isTimeShown={selectedMessageId === message._id}
              onToggleTime={() =>
                setSelectedMessageId((current) => (current === message._id ? null : message._id))
              }
            />
          );
        }}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-kin-beige"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        className="flex-row items-center gap-1 border-b border-kin-stone-300/60 bg-white pb-2 pl-1 pr-4"
        style={{ paddingTop: insets.top + 4 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to inbox"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          className="h-11 w-11 items-center justify-center active:opacity-60"
        >
          <Ionicons name="chevron-back" size={26} color={COLORS.navy} />
        </Pressable>

        {isPeerUnavailable ? (
          <View className="min-w-0 flex-1 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-kin-stone-300">
              <Ionicons name="person" size={22} color={COLORS.white} />
            </View>
            <Text accessibilityRole="header" className="text-base font-bold text-kin-stone-500">
              Unavailable
            </Text>
          </View>
        ) : peer ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${peerName}'s profile`}
            onPress={openProfile}
            className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-70"
          >
            <Avatar firstName={peer.firstName} photo={peer.photo} size={40} />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-base font-bold text-kin-navy">
                {peerName}
              </Text>
              {peerLocation ? (
                <Text numberOfLines={1} className="text-xs text-kin-stone-500">
                  {peerLocation}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ) : (
          <View className="flex-1" />
        )}

        {!isConnected ? (
          <View accessibilityLiveRegion="polite" className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-kin-coral" />
            <Text className="text-xs text-kin-coral">Reconnecting…</Text>
          </View>
        ) : null}
      </View>

      {renderBody()}

      <View
        className="border-t border-kin-stone-300/60 bg-white px-3 pt-2"
        style={{ paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 8) }}
      >
        {/* Next to the message box, so it's visible however far the thread is scrolled. */}
        {error ? (
          <View
            accessibilityRole="alert"
            className="mb-2 flex-row items-start gap-2 rounded-xl border border-kin-coral-200 bg-kin-coral-50 px-3 py-2"
          >
            <Text className="flex-1 text-sm text-kin-coral-700">{error}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss error"
              hitSlop={8}
              onPress={() => setError('')}
            >
              <Ionicons name="close" size={18} color={COLORS.coral} />
            </Pressable>
          </View>
        ) : null}
        <ChatComposer
          value={draft}
          onChangeText={handleDraftChange}
          onSend={() => void handleSend()}
          isConnected={isConnected}
          isPeerUnavailable={isPeerUnavailable}
        />
      </View>
    </KeyboardAvoidingView>
  );
};
