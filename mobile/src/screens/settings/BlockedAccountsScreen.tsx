import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { SettingsStackParamList } from '../../navigation/types';

type BlockedAccountsScreenProps = NativeStackScreenProps<SettingsStackParamList, 'BlockedAccounts'>;

export const BlockedAccountsScreen = ({ navigation }: BlockedAccountsScreenProps) => {
  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScreenShell title="Blocked accounts">
      <NavButton label="Back" onPress={handleBack} />
    </ScreenShell>
  );
};
