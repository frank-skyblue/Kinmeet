import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { COLORS } from '../constants/colors';
import { ConnectionsScreen } from '../screens/connections/ConnectionsScreen';
import { DiscoverScreen } from '../screens/matching/DiscoverScreen';
import { ChatStack } from './ChatStack';
import { ProfileStack } from './ProfileStack';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.coral,
        tabBarInactiveTintColor: COLORS.stone500,
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          // Magnifying glass, like the web's Discover nav item; filled when selected.
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen name="Connections" component={ConnectionsScreen} />
      <Tab.Screen name="Chat" component={ChatStack} />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        listeners={({ navigation }) => ({
          // The tab is "my profile": always open on it, even after viewing someone else's there.
          tabPress: (event) => {
            event.preventDefault();
            navigation.navigate('Profile', { screen: 'ProfileHome' });
          },
        })}
      />
    </Tab.Navigator>
  );
};
