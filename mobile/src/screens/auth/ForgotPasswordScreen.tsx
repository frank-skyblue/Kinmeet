import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { AuthStackParamList } from '../../navigation/types';

type ForgotPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen = ({ navigation }: ForgotPasswordScreenProps) => {
  const handleOpenResetPassword = () => {
    navigation.navigate('ResetPassword');
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <ScreenShell title="Forgot password">
      <NavButton label="Reset password" onPress={handleOpenResetPassword} />
      <NavButton label="Back to login" onPress={handleBackToLogin} />
    </ScreenShell>
  );
};
