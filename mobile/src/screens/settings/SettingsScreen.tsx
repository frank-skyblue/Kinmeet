import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { SettingsStackParamList } from '../../navigation/types';

type SettingsScreenProps = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

const settingsLinks: { label: string; screen: Exclude<keyof SettingsStackParamList, 'SettingsHome'> }[] = [
  { label: 'Account', screen: 'Account' },
  { label: 'Community safety', screen: 'CommunitySafety' },
  { label: 'Support', screen: 'Support' },
  { label: 'Contact support', screen: 'ContactSupport' },
  { label: 'Feedback', screen: 'Feedback' },
  { label: 'Privacy', screen: 'Privacy' },
  { label: 'Blocked accounts', screen: 'BlockedAccounts' },
];

export const SettingsScreen = ({ navigation }: SettingsScreenProps) => {
  return (
    <ScreenShell title="Settings">
      {settingsLinks.map((link) => {
        const handleOpen = () => {
          navigation.navigate(link.screen);
        };

        return <NavButton key={link.screen} label={link.label} onPress={handleOpen} />;
      })}
    </ScreenShell>
  );
};
