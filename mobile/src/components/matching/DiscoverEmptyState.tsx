import { Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { COLORS } from '../../constants/colors';
import type { DiscoverEmptyState as EmptyStateKind } from '../../types';

type IconName = 'globe-outline' | 'leaf-outline' | 'compass-outline' | 'checkmark';

// The web version also offers "Notify me" alerts; those aren't in the app yet, so these messages
// don't promise a notification.
const CONTENT: Record<EmptyStateKind, { title: string; message: string; icon: IconName; badge: IconName }> = {
  community_growing: {
    title: 'Your community is still growing',
    message: 'No one from your home country lives near you yet. Check back soon as more people join.',
    icon: 'globe-outline',
    badge: 'leaf-outline',
  },
  all_caught_up: {
    title: 'You’re all caught up',
    message: 'You’ve seen everyone from your home country near you. Check back later for new people.',
    icon: 'compass-outline',
    badge: 'checkmark',
  },
};

type DiscoverEmptyStateProps = {
  kind: EmptyStateKind;
};

/** What Discover shows when there is no one left to show. */
export const DiscoverEmptyState = ({ kind }: DiscoverEmptyStateProps) => {
  const { title, message, icon, badge } = CONTENT[kind];

  return (
    <View className="flex-1 items-center justify-center rounded-3xl bg-white px-6 py-10">
      {/* Illustration: big circle with the icon, small tilted badge at its corner. */}
      <View className="h-36 w-44" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View className="absolute left-3 top-3 h-2.5 w-2.5 rounded-full bg-kin-coral/40" />
        <View className="absolute left-6 top-0 h-32 w-32 items-center justify-center rounded-full bg-kin-coral/15">
          <Ionicons name={icon} size={44} color={COLORS.coral} />
        </View>
        <View
          className="absolute bottom-0 right-2 h-12 w-12 items-center justify-center rounded-2xl border border-kin-stone-300 bg-white"
          style={{ transform: [{ rotate: '-6deg' }] }}
        >
          <Ionicons name={badge} size={24} color={COLORS.coral} />
        </View>
      </View>

      <Text accessibilityRole="header" className="mt-6 text-center text-2xl font-bold text-kin-navy">
        {title}
      </Text>
      <Text className="mt-3 text-center leading-6 text-kin-stone-500">{message}</Text>
    </View>
  );
};
