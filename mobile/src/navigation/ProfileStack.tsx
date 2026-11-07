import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ProfileViewScreen } from '../screens/profile/ProfileViewScreen';
import { SettingsStack } from './SettingsStack';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="ProfileView" component={ProfileViewScreen} />
      <Stack.Screen name="Settings" component={SettingsStack} />
    </Stack.Navigator>
  );
};
