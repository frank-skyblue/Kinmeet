import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { SettingsStackParamList } from '../../navigation/types';

type SupportScreenProps = NativeStackScreenProps<SettingsStackParamList, 'Support'>;

export const SupportScreen = ({ navigation }: SupportScreenProps) => {
  const handleOpenContact = () => {
    navigation.navigate('ContactSupport');
  };

  const handleOpenFeedback = () => {
    navigation.navigate('Feedback');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScreenShell title="Support">
      <NavButton label="Contact support" onPress={handleOpenContact} />
      <NavButton label="Give feedback" onPress={handleOpenFeedback} />
      <NavButton label="Back to settings" onPress={handleBack} />
    </ScreenShell>
  );
};
