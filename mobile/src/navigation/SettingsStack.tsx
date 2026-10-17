import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AccountSettingsScreen } from '../screens/settings/AccountSettingsScreen';
import { BlockedAccountsScreen } from '../screens/settings/BlockedAccountsScreen';
import { CommunitySafetyScreen } from '../screens/settings/CommunitySafetyScreen';
import { ContactSupportScreen } from '../screens/settings/ContactSupportScreen';
import { FeedbackScreen } from '../screens/settings/FeedbackScreen';
import { PrivacyScreen } from '../screens/settings/PrivacyScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { SupportScreen } from '../screens/settings/SupportScreen';
import type { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsHome" component={SettingsScreen} />
      <Stack.Screen name="Account" component={AccountSettingsScreen} />
      <Stack.Screen name="CommunitySafety" component={CommunitySafetyScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="ContactSupport" component={ContactSupportScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="BlockedAccounts" component={BlockedAccountsScreen} />
    </Stack.Navigator>
  );
};
