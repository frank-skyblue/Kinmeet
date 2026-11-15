import { Image, Text, View } from 'react-native';
import { getPhotoUrl } from '../../services/api';
import type { UserProfile } from '../../types';
import { calculateAgeFromDateOfBirth } from '../../utils/age';

type ProfileDetailsProps = {
  profile: UserProfile;
};

const genderLabel = (value: string | undefined) => {
  if (value === 'female') return 'Female';
  if (value === 'male') return 'Male';
  if (value === 'other') return 'Other';
  return '—';
};

const Field = ({ label, value }: { label: string; value: string }) => {
  return (
    <View className="mb-6">
      <Text className="mb-2 text-sm font-semibold text-kin-navy">{label}</Text>
      <Text className="text-lg text-kin-navy">{value}</Text>
    </View>
  );
};

const ChipList = ({
  label,
  items,
  chipClassName,
  textClassName,
}: {
  label: string;
  items: string[];
  chipClassName: string;
  textClassName: string;
}) => {
  return (
    <View className="mb-6">
      <Text className="mb-3 text-sm font-semibold text-kin-navy">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {items.map((item, index) => (
          <View key={`${item}-${index}`} className={chipClassName}>
            <Text className={textClassName}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const ProfileDetails = ({ profile }: ProfileDetailsProps) => {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  const age = calculateAgeFromDateOfBirth(profile.dateOfBirth);
  const location = [profile.currentProvince, profile.currentCountry].filter(Boolean).join(', ');

  return (
    <View className="overflow-hidden rounded-3xl bg-white">
      <View className="h-32 bg-kin-coral" />
      <View className="px-6 pb-8">
        <View className="-mt-16 mb-6">
          {profile.photo ? (
            <View className="h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-kin-coral">
              <Image
                accessibilityLabel={fullName}
                source={{ uri: getPhotoUrl(profile.photo) }}
                className="h-full w-full"
              />
            </View>
          ) : (
            <View className="h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-kin-coral">
              <Text className="text-5xl font-bold text-white">{profile.firstName.charAt(0)}</Text>
            </View>
          )}
        </View>

        <Text accessibilityRole="header" className="text-3xl font-bold text-kin-navy">
          {fullName}
        </Text>
        {profile.username ? (
          <Text className="mt-2 text-base text-kin-teal">@{profile.username}</Text>
        ) : null}

        <View className="mt-6">
          <Field label="Gender" value={genderLabel(profile.gender)} />
          <Field label="Age" value={age === null ? '—' : String(age)} />
          {profile.about ? <Field label="About" value={profile.about} /> : null}
          {profile.industry ? <Field label="Work" value={profile.industry} /> : null}
          {profile.educationLevel ? <Field label="Education" value={profile.educationLevel} /> : null}
          <Field label="Home Country" value={profile.homeCountry} />
          <Field label="Current Location" value={location || '—'} />
          <ChipList
            label="Languages"
            items={profile.languages}
            chipClassName="rounded-xl bg-kin-teal-100 px-4 py-2"
            textClassName="font-medium text-kin-teal-700"
          />
          {profile.interests.length > 0 ? (
            <ChipList
              label="Interests"
              items={profile.interests}
              chipClassName="rounded-xl bg-kin-teal-200 px-4 py-2"
              textClassName="font-medium text-kin-teal-800"
            />
          ) : null}
          <ChipList
            label="Looking For"
            items={profile.lookingFor}
            chipClassName="rounded-xl bg-kin-coral-100 px-4 py-2"
            textClassName="font-medium text-kin-coral-700"
          />
        </View>
      </View>
    </View>
  );
};
