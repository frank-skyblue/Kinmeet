import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { ProfileStackParamList } from '../../navigation/types';

type ProfileViewScreenProps = NativeStackScreenProps<ProfileStackParamList, 'ProfileView'>;

export const ProfileViewScreen = ({ navigation, route }: ProfileViewScreenProps) => {
  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScreenShell title="Profile">
      <Text className="mt-3 text-base text-slate-600">{route.params.userId}</Text>
      <NavButton label="Back" onPress={handleBack} />
    </ScreenShell>
  );
};
