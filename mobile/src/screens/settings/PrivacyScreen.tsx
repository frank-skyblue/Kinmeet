import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { SettingsStackParamList } from '../../navigation/types';

type PrivacyScreenProps = NativeStackScreenProps<SettingsStackParamList, 'Privacy'>;

export const PrivacyScreen = ({ navigation }: PrivacyScreenProps) => {
  const handleOpenBlockedAccounts = () => {
    navigation.navigate('BlockedAccounts');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScreenShell title="Privacy">
      <NavButton label="Blocked accounts" onPress={handleOpenBlockedAccounts} />
      <NavButton label="Back to settings" onPress={handleBack} />
    </ScreenShell>
  );
};
