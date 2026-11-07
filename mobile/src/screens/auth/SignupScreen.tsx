import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavButton } from '../../components/common/NavButton';
import { ScreenShell } from '../../components/common/ScreenShell';
import type { AuthStackParamList } from '../../navigation/types';

type SignupScreenProps = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export const SignupScreen = ({ navigation }: SignupScreenProps) => {
  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <ScreenShell title="Sign up">
      <NavButton label="Back to login" onPress={handleBackToLogin} />
    </ScreenShell>
  );
};
