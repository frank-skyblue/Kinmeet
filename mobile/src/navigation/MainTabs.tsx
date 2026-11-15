import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ConnectionsScreen } from '../screens/connections/ConnectionsScreen';
import { DiscoverScreen } from '../screens/matching/DiscoverScreen';
import { ChatStack } from './ChatStack';
import { ProfileStack } from './ProfileStack';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabs = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Connections" component={ConnectionsScreen} />
      <Tab.Screen name="Chat" component={ChatStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};
