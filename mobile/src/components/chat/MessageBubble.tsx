import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { COLORS } from '../../constants/colors';
import type { ChatMessage } from '../../types';
import { formatDuration, formatMessageTime } from '../../utils/chatFormat';

const PHOTO_WIDTH = 220;
/** Keeps a tall photo from filling the whole thread. */
const MAX_PHOTO_HEIGHT = 300;

type MessageBubbleProps = {
  message: ChatMessage;
  isOwn: boolean;
  /** Not yet confirmed by the server. */
  isPending: boolean;
  isTimeShown: boolean;
  onToggleTime: () => void;
};

const Unavailable = ({ label, isOwn }: { label: string; isOwn: boolean }) => (
  <Text className={`px-4 py-3 text-sm italic ${isOwn ? 'text-white/80' : 'text-kin-stone-500'}`}>
    {label}
  </Text>
);

const Photo = ({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) => {
  const { attachment } = message;
  const uri = attachment?.urls?.display;
  if (!attachment || attachment.removed || !uri) {
    return <Unavailable label="Photo unavailable" isOwn={isOwn} />;
  }
  const ratio = attachment.width && attachment.height ? attachment.width / attachment.height : 4 / 3;
  const height = Math.min(PHOTO_WIDTH / ratio, MAX_PHOTO_HEIGHT);
  return (
    <Image
      source={{ uri }}
      accessibilityLabel="Photo"
      accessibilityIgnoresInvertColors
      style={{ width: PHOTO_WIDTH, height }}
      className="bg-kin-beige"
      resizeMode="cover"
    />
  );
};

/** Voice notes can be listened to on the web; mobile shows that one was sent and how long it is. */
const Voice = ({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) => {
  const { attachment } = message;
  if (!attachment || attachment.removed || !attachment.urls?.audio) {
    return <Unavailable label="Voice message unavailable" isOwn={isOwn} />;
  }
  return (
    <View className="flex-row items-center gap-2 px-4 py-3">
      <Ionicons name="mic" size={18} color={isOwn ? COLORS.white : COLORS.navy} />
      <Text className={isOwn ? 'text-white' : 'text-kin-navy'}>
        Voice message
        {attachment.durationMs ? ` · ${formatDuration(attachment.durationMs)}` : ''}
      </Text>
    </View>
  );
};

/** One message in a thread: text, photo (with optional caption) or voice note. */
export const MessageBubble = ({
  message,
  isOwn,
  isPending,
  isTimeShown,
  onToggleTime,
}: MessageBubbleProps) => {
  const isMedia = message.type === 'image' || message.type === 'voice';
  const bubbleColor = isOwn ? 'bg-kin-coral' : 'bg-white';
  const textColor = isOwn ? 'text-white' : 'text-kin-navy';
  const time = formatMessageTime(message.createdAt);

  if (isMedia) {
    const kindLabel = message.type === 'image' ? 'Photo' : 'Voice message';
    return (
      <View className={`my-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        <View
          accessible
          accessibilityLabel={`${kindLabel} from ${message.sender.firstName}`}
          className={`max-w-[80%] overflow-hidden rounded-2xl ${bubbleColor}`}
        >
          {message.type === 'image' ? (
            <Photo message={message} isOwn={isOwn} />
          ) : (
            <Voice message={message} isOwn={isOwn} />
          )}
          {message.content ? (
            <Text className={`px-4 py-2 text-base ${textColor}`}>{message.content}</Text>
          ) : null}
        </View>
        <Text className="mt-1 px-1 text-xs text-kin-stone-500">{time}</Text>
      </View>
    );
  }

  return (
    <View className={`my-1 ${isOwn ? 'items-end' : 'items-start'}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Message from ${message.sender.firstName}: ${message.content ?? ''}`}
        accessibilityHint={isTimeShown ? 'Hides the time it was sent' : 'Shows the time it was sent'}
        onPress={onToggleTime}
        className={`max-w-[80%] rounded-2xl px-4 py-3 active:opacity-80 ${bubbleColor} ${
          isPending ? 'opacity-60' : ''
        }`}
      >
        <Text className={`text-base ${textColor}`}>{message.content}</Text>
      </Pressable>
      {isPending ? (
        <Text className="mt-1 px-1 text-xs text-kin-stone-500">Sending…</Text>
      ) : isTimeShown ? (
        <Text className="mt-1 px-1 text-xs text-kin-stone-500">{time}</Text>
      ) : null}
    </View>
  );
};
