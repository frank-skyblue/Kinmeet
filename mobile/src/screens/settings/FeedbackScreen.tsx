import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { SettingsStackParamList } from '../../navigation/types';

type FeedbackScreenProps = NativeStackScreenProps<SettingsStackParamList, 'Feedback'>;

export const FeedbackScreen = ({ navigation }: FeedbackScreenProps) => {
  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScreenShell title="Feedback">
      <NavButton label="Back" onPress={handleBack} />
    </ScreenShell>
  );
};
