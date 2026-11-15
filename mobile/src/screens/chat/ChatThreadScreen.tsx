import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { ChatStackParamList } from '../../navigation/types';

type ChatThreadScreenProps = NativeStackScreenProps<ChatStackParamList, 'ChatThread'>;

export const ChatThreadScreen = ({ navigation, route }: ChatThreadScreenProps) => {
  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScreenShell title="Conversation">
      <Text className="mt-3 text-base text-slate-600">{route.params.userId}</Text>
      <NavButton label="Back to chat" onPress={handleBack} />
    </ScreenShell>
  );
};
