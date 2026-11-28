import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { COLORS } from '../../constants/colors';

/** Same cap as the server (socket send schema, Message model). */
const MAX_MESSAGE_LENGTH = 5000;

type ChatComposerProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  isConnected: boolean;
  isPeerUnavailable: boolean;
};

/** Message box and Send button for a thread. */
export const ChatComposer = ({
  value,
  onChangeText,
  onSend,
  isConnected,
  isPeerUnavailable,
}: ChatComposerProps) => {
  const isDisabled = !isConnected || isPeerUnavailable;
  const canSend = !isDisabled && value.trim().length > 0;

  return (
    <View className="flex-row items-end gap-2">
      <TextInput
        accessibilityLabel="Type a message"
        value={value}
        onChangeText={onChangeText}
        editable={!isPeerUnavailable}
        placeholder={isPeerUnavailable ? 'This account is unavailable' : 'Type a message...'}
        placeholderTextColor={COLORS.stone500}
        multiline
        maxLength={MAX_MESSAGE_LENGTH}
        className="max-h-32 min-h-11 flex-1 rounded-2xl border border-kin-stone-300 bg-white px-4 py-2.5 text-[16px] text-kin-navy"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={onSend}
        hitSlop={4}
        className="h-11 w-11 items-center justify-center rounded-full bg-kin-coral active:opacity-80 disabled:opacity-40"
      >
        <Ionicons name="send" size={18} color={COLORS.white} />
      </Pressable>
    </View>
  );
};
