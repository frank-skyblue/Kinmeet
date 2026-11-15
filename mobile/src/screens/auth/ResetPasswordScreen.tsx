import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { AuthStackParamList } from '../../navigation/types';

type ResetPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen = ({ navigation }: ResetPasswordScreenProps) => {
  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <ScreenShell title="Reset password">
      <NavButton label="Back to login" onPress={handleBackToLogin} />
    </ScreenShell>
  );
};
