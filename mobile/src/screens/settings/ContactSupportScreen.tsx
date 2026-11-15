import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { SettingsStackParamList } from '../../navigation/types';

type ContactSupportScreenProps = NativeStackScreenProps<SettingsStackParamList, 'ContactSupport'>;

export const ContactSupportScreen = ({ navigation }: ContactSupportScreenProps) => {
  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScreenShell title="Contact support">
      <NavButton label="Back" onPress={handleBack} />
    </ScreenShell>
  );
};
