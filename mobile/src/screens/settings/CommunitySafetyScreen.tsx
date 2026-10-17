import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { SettingsStackParamList } from '../../navigation/types';

type CommunitySafetyScreenProps = NativeStackScreenProps<SettingsStackParamList, 'CommunitySafety'>;

export const CommunitySafetyScreen = ({ navigation }: CommunitySafetyScreenProps) => {
  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScreenShell title="Community safety">
      <NavButton label="Back to settings" onPress={handleBack} />
    </ScreenShell>
  );
};
