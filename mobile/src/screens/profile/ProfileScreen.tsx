import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { NavButton } from '../../components/common/NavButton';
import { ProfileDetails } from '../../components/profile/ProfileDetails';
import { useAuth } from '../../contexts/useAuth';
import type { ProfileStackParamList } from '../../navigation/types';
import { profileAPI } from '../../services/api';
import type { UserProfile } from '../../types';
import { getErrorMessage } from '../../utils/error';

type ProfileScreenProps = NativeStackScreenProps<ProfileStackParamList, 'ProfileHome'>;

export const ProfileScreen = ({ navigation }: ProfileScreenProps) => {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadProfile = async () => {
        setIsLoading(true);
        setError('');
        try {
          const response = await profileAPI.getProfile();
          if (!isActive) return;
          if (!response.success) {
            setProfile(null);
            setError(response.message ?? 'Failed to load profile');
            return;
          }
          setProfile(response.user);
        } catch (err: unknown) {
          if (!isActive) return;
          setProfile(null);
          setError(getErrorMessage(err, 'Failed to load profile'));
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      void loadProfile();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const handleOpenSettings = () => {
    navigation.navigate('Settings', { screen: 'SettingsHome' });
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-kin-beige" contentContainerClassName="px-4 py-8">
      {isLoading ? (
        <View className="items-center py-16" accessibilityLabel="Loading profile">
          <ActivityIndicator accessibilityLabel="Loading profile" />
          <Text className="mt-4 text-kin-navy">Loading profile...</Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <Text accessibilityRole="alert" className="py-16 text-center text-kin-coral-700">
          {error}
        </Text>
      ) : null}

      {!isLoading && profile ? <ProfileDetails profile={profile} /> : null}

      <NavButton label="Settings" onPress={handleOpenSettings} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        accessibilityState={{ disabled: isLoggingOut }}
        disabled={isLoggingOut}
        onPress={handleLogout}
        className="mt-4 rounded-xl border border-kin-navy px-4 py-3 disabled:opacity-50"
      >
        <Text className="text-center text-base font-medium text-kin-navy">
          {isLoggingOut ? 'Signing out...' : 'Log out'}
        </Text>
      </Pressable>
    </ScrollView>
  );
};
