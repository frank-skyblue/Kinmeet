import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { COLORS } from '../constants/colors';
import { useConnectionRequests } from '../contexts/useConnectionRequests';
import { ConnectionsScreen, formatBadgeCount } from '../screens/connections/ConnectionsScreen';
import { DiscoverScreen } from '../screens/matching/DiscoverScreen';
import { ChatStack } from './ChatStack';
import { ProfileStack } from './ProfileStack';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabs = () => {
  const { pendingRequestCount } = useConnectionRequests();

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
      <Tab.Screen
        name="Connections"
        component={ConnectionsScreen}
        options={{
          // "Kins" like the web nav; the route keeps its name.
          title: 'Kins',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
          tabBarBadge: pendingRequestCount > 0 ? formatBadgeCount(pendingRequestCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.coral, color: COLORS.white },
          tabBarAccessibilityLabel:
            pendingRequestCount > 0 ? `Kins, ${pendingRequestCount} pending requests` : 'Kins',
        }}
      />
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
