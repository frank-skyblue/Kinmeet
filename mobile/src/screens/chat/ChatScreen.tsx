import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { ChatStackParamList } from '../../navigation/types';

type ChatScreenProps = NativeStackScreenProps<ChatStackParamList, 'ChatHome'>;

export const ChatScreen = ({ navigation }: ChatScreenProps) => {
  const handleOpenThread = () => {
    navigation.navigate('ChatThread', { userId: 'preview' });
  };

  return (
    <ScreenShell title="Chat">
      <NavButton label="Open conversation" onPress={handleOpenThread} />
    </ScreenShell>
  );
};
