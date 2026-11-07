import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { SettingsStackParamList } from '../../navigation/types';

type AccountSettingsScreenProps = NativeStackScreenProps<SettingsStackParamList, 'Account'>;

export const AccountSettingsScreen = ({ navigation }: AccountSettingsScreenProps) => {
  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScreenShell title="Account">
      <NavButton label="Back to settings" onPress={handleBack} />
    </ScreenShell>
  );
};
