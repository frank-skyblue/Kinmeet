import { Image, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { COLORS } from '../../constants/colors';
import { getPhotoUrl } from '../../services/api';
import type { Match } from '../../types';
import { ActionMenu, type ActionMenuItem } from '../common/ActionMenu';

type MatchCardProps = {
  match: Match;
  menuItems: ActionMenuItem[];
};

type ChipTone = 'language' | 'interest' | 'lookingFor';

const CHIP_CLASSES: Record<ChipTone, { box: string; text: string }> = {
  language: { box: 'bg-kin-teal-100', text: 'text-kin-teal-700' },
  interest: { box: 'bg-kin-teal-200', text: 'text-kin-teal-800' },
  lookingFor: { box: 'bg-kin-coral-100', text: 'text-kin-coral-700' },
};

const ChipSection = ({ title, items, tone }: { title: string; items: string[]; tone: ChipTone }) => (
  <View className="mt-4">
    <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-kin-navy">{title}</Text>
    <View className="flex-row flex-wrap gap-1.5">
      {items.map((item) => (
        <View key={item} className={`rounded-full px-2.5 py-0.5 ${CHIP_CLASSES[tone].box}`}>
          <Text className={`text-xs font-medium ${CHIP_CLASSES[tone].text}`}>{item}</Text>
        </View>
      ))}
    </View>
  </View>
);

/** One Discover profile (the card part of the web Discover page); scrolls when it's long. */
export const MatchCard = ({ match, menuItems }: MatchCardProps) => {
  return (
    <ScrollView className="flex-1" contentContainerClassName="pb-4">
      {/* Photo, or initial on the brand gradient's coral end */}
      <View className="h-72 items-center justify-center bg-kin-coral">
        {match.photo ? (
          <Image
            source={{ uri: getPhotoUrl(match.photo) }}
            accessibilityLabel={`Photo of ${match.firstName}`}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <Text className="text-7xl font-bold text-white" accessibilityLabel={`${match.firstName}, no photo`}>
            {match.firstName.charAt(0)}
          </Text>
        )}
      </View>

      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between gap-2">
          <Text accessibilityRole="header" numberOfLines={1} className="flex-1 text-2xl font-bold text-kin-navy">
            {match.firstName}
          </Text>
          <ActionMenu label={`More actions for ${match.firstName}`} items={menuItems} />
        </View>
        {match.industry ? (
          <Text numberOfLines={1} className="text-sm text-kin-stone-500">
            {match.industry}
          </Text>
        ) : null}

        {match.about ? (
          <Text className="mt-3 text-sm leading-5 text-kin-navy">{match.about}</Text>
        ) : null}

        <View className="mt-3 gap-1.5">
          {match.educationLevel || match.graduationYear ? (
            <View className="flex-row items-center">
              <Ionicons name="school-outline" size={16} color={COLORS.stone500} />
              <Text numberOfLines={1} className="ml-2 flex-1 text-sm text-kin-stone-500">
                {[match.educationLevel, match.graduationYear ? `Class of ${match.graduationYear}` : '']
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          ) : null}
          <View className="flex-row items-center">
            <Ionicons name="location-outline" size={16} color={COLORS.stone500} />
            <Text className="ml-2 flex-1 text-sm text-kin-stone-500">
              <Text className="font-bold text-kin-navy">{match.homeCountry}</Text>
              {'  ·  Lives in '}
              <Text className="font-bold text-kin-navy">
                {match.currentProvince}, {match.currentCountry}
              </Text>
            </Text>
          </View>
        </View>

        <ChipSection title="Languages" items={match.languages} tone="language" />
        {match.interests.length > 0 ? (
          <ChipSection title="Interests" items={match.interests} tone="interest" />
        ) : null}
        <ChipSection title="Looking for" items={match.lookingFor} tone="lookingFor" />
      </View>
    </ScrollView>
  );
};
