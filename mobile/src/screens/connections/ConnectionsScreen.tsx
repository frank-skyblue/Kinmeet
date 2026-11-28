import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KinsList } from '../../components/connections/KinsList';
import { RequestsList } from '../../components/connections/RequestsList';
import { useConnectionRequests } from '../../contexts/useConnectionRequests';
import type { MainTabParamList } from '../../navigation/types';

type ConnectionsScreenProps = BottomTabScreenProps<MainTabParamList, 'Connections'>;

type Section = 'kins' | 'requests';

/** Badge text for a count: up to 99, then "99+". */
export const formatBadgeCount = (count: number) => (count > 99 ? '99+' : String(count));

/** Kins hub: "My kins" and "Requests" sections (port of the web ConnectionsHub). */
export const ConnectionsScreen = ({ navigation }: ConnectionsScreenProps) => {
  const insets = useSafeAreaInsets();
  const { pendingRequestCount, refetchConnectionRequests } = useConnectionRequests();
  const [section, setSection] = useState<Section>('kins');
  // Bumped each time the tab comes back into view so the lists reload (the screen stays mounted).
  const [refreshKey, setRefreshKey] = useState(0);
  const hasFocusedRef = useRef(false);

  useEffect(() => {
    return navigation.addListener('focus', () => {
      // The first focus is the initial mount; the lists already load then.
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }
      setRefreshKey((key) => key + 1);
      void refetchConnectionRequests();
    });
  }, [navigation, refetchConnectionRequests]);

  // Back from the profile/thread returns here, so keep the stack's first screen under it.
  const openProfile = (userId: string) =>
    navigation.navigate('Profile', { screen: 'ProfileView', params: { userId }, initial: false });

  const openChat = (userId: string) =>
    navigation.navigate('Chat', { screen: 'ChatThread', params: { userId }, initial: false });

  const tabs: { key: Section; label: string; badge?: number }[] = [
    { key: 'kins', label: 'My kins' },
    { key: 'requests', label: 'Requests', badge: pendingRequestCount },
  ];

  return (
    <View className="flex-1 bg-kin-beige px-4" style={{ paddingTop: insets.top + 8 }}>
      <Text accessibilityRole="header" className="mb-3 text-2xl font-bold text-kin-navy">
        Kins
      </Text>

      <View accessibilityRole="tablist" className="mb-3 flex-row border-b border-kin-stone-300">
        {tabs.map(({ key, label, badge }) => {
          const isActive = section === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityLabel={badge ? `${label}, ${badge} pending` : label}
              accessibilityState={{ selected: isActive }}
              onPress={() => setSection(key)}
              className={`-mb-px min-h-11 flex-1 flex-row items-center justify-center gap-1.5 border-b-2 ${
                isActive ? 'border-kin-coral' : 'border-transparent'
              }`}
            >
              <Text className={`text-sm font-semibold ${isActive ? 'text-kin-coral' : 'text-kin-navy'}`}>
                {label}
              </Text>
              {badge ? (
                <View
                  className={`min-w-5 items-center rounded-full px-1.5 py-0.5 ${
                    isActive ? 'bg-kin-coral/15' : 'bg-kin-coral'
                  }`}
                >
                  <Text className={`text-[10px] font-bold ${isActive ? 'text-kin-coral' : 'text-white'}`}>
                    {formatBadgeCount(badge)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Only the open section is mounted, so switching sections reloads it (like the web). */}
      {section === 'kins' ? (
        <KinsList
          refreshKey={refreshKey}
          onOpenProfile={openProfile}
          onMessage={openChat}
          onOpenDiscover={() => navigation.navigate('Discover')}
        />
      ) : (
        <RequestsList refreshKey={refreshKey} onOpenProfile={openProfile} />
      )}
    </View>
  );
};
