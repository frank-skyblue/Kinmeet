import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReportUserModal } from '../../components/common/ReportUserModal';
import { DiscoverEmptyState } from '../../components/matching/DiscoverEmptyState';
import { MatchCard } from '../../components/matching/MatchCard';
import { COLORS } from '../../constants/colors';
import type { MainTabParamList } from '../../navigation/types';
import { blockAPI, matchingAPI } from '../../services/api';
import type { DiscoverEmptyState as EmptyStateKind, Match } from '../../types';
import { getErrorMessage } from '../../utils/error';

type DiscoverScreenProps = BottomTabScreenProps<MainTabParamList, 'Discover'>;

const LOAD_FAILED = 'Failed to load matches';

/** Port of the web Discover page: one profile at a time, Pass or Meet, then the next. */
export const DiscoverScreen = ({ navigation }: DiscoverScreenProps) => {
  const insets = useSafeAreaInsets();
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [emptyState, setEmptyState] = useState<EmptyStateKind>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  // Pass/Meet/Block in flight: stops a double tap from acting on two people.
  const [isActing, setIsActing] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const loadMatches = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await matchingAPI.getMatches();
      if (response.success) {
        setMatches(response.matches);
        setCurrentIndex(0);
        setEmptyState(
          response.matches.length === 0 ? response.emptyState ?? 'all_caught_up' : undefined,
        );
      } else {
        // Without this, the "load more" effect below would retry forever.
        setLoadError(LOAD_FAILED);
      }
    } catch {
      setLoadError(LOAD_FAILED);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  // Matches come in pages. At the end of one, ask the server for more; only it can say whether
  // the group is empty or the user has seen everyone.
  const needsMore = !isLoading && !loadError && !emptyState && currentIndex >= matches.length;
  useEffect(() => {
    if (needsMore) void loadMatches();
  }, [needsMore, loadMatches]);

  const currentMatch: Match | undefined = matches[currentIndex];

  const act = async (request: () => Promise<unknown>, failure: string, after: () => void) => {
    if (isActing) return;
    setIsActing(true);
    setError('');
    try {
      await request();
      after();
    } catch (err: unknown) {
      setError(getErrorMessage(err, failure));
    } finally {
      setIsActing(false);
    }
  };

  const moveToNext = () => setCurrentIndex((index) => index + 1);

  /** Drops a blocked person; currentIndex then points at the next one. */
  const removeMatch = (userId: string) =>
    setMatches((prev) => prev.filter((match) => match._id !== userId));

  const handlePass = (match: Match) =>
    void act(() => matchingAPI.passUser(match._id), 'Failed to pass', moveToNext);

  const handleMeet = (match: Match) =>
    void act(() => matchingAPI.sendMeetRequest(match._id), 'Failed to send Meet request', moveToNext);

  const handleBlock = (match: Match) => {
    Alert.alert(
      `Block ${match.firstName}?`,
      'They won’t be able to message you or see you in Discover. You can unblock them in Settings & Privacy.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () =>
            void act(
              () => blockAPI.blockUser(match._id),
              `Failed to block ${match.firstName}`,
              () => removeMatch(match._id),
            ),
        },
      ],
    );
  };

  const handleViewProfile = (match: Match) => {
    // initial: false keeps the user's own profile (ProfileHome) under it, so Back returns there.
    navigation.navigate('Profile', {
      screen: 'ProfileView',
      params: { userId: match._id },
      initial: false,
    });
  };

  const header = (
    <View className="items-center pb-2">
      <Text accessibilityRole="header" className="text-2xl font-bold text-kin-navy">
        Discover
      </Text>
      {currentMatch ? (
        <Text className="text-xs text-kin-stone-500">
          {matches.length - currentIndex} match{matches.length - currentIndex !== 1 ? 'es' : ''} available
        </Text>
      ) : null}
    </View>
  );

  let body;
  if (isLoading) {
    body = (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.coral} />
        <Text className="mt-4 text-kin-navy">Loading matches...</Text>
      </View>
    );
  } else if (!currentMatch) {
    body = emptyState ? (
      <DiscoverEmptyState kind={emptyState} />
    ) : (
      <View accessibilityRole="alert" className="flex-1 items-center justify-center px-4">
        <Text className="mb-4 text-center text-kin-navy">{loadError || 'Loading matches...'}</Text>
        {loadError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadMatches()}
            className="rounded-xl bg-kin-coral px-6 py-3 active:opacity-80"
          >
            <Text className="font-semibold text-white">Try again</Text>
          </Pressable>
        ) : null}
      </View>
    );
  } else {
    body = (
      <>
        {error ? (
          <Text
            accessibilityRole="alert"
            className="mb-2 rounded-xl border border-kin-coral-200 bg-kin-coral-50 px-4 py-2 text-sm text-kin-coral-700"
          >
            {error}
          </Text>
        ) : null}

        <View className="flex-1 overflow-hidden rounded-3xl bg-white">
          <MatchCard
            key={currentMatch._id}
            match={currentMatch}
            menuItems={[
              { label: 'View Profile', onSelect: () => handleViewProfile(currentMatch) },
              { label: 'Report', onSelect: () => setIsReportOpen(true), variant: 'destructive' },
              {
                label: 'Block',
                onSelect: () => handleBlock(currentMatch),
                variant: 'destructive',
                disabled: isActing,
              },
            ]}
          />

          <View className="flex-row gap-3 border-t border-kin-stone-300 bg-white p-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pass on this match"
              accessibilityState={{ disabled: isActing }}
              disabled={isActing}
              onPress={() => handlePass(currentMatch)}
              className={`h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-kin-stone-300 bg-white active:opacity-80 ${
                isActing ? 'opacity-50' : ''
              }`}
            >
              <Ionicons name="close" size={20} color={COLORS.navy} />
              <Text className="font-semibold text-kin-navy">Pass</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send meet request"
              accessibilityState={{ disabled: isActing }}
              disabled={isActing}
              onPress={() => handleMeet(currentMatch)}
              className={`h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-kin-coral active:opacity-80 ${
                isActing ? 'opacity-50' : ''
              }`}
            >
              <Ionicons name="thumbs-up" size={18} color={COLORS.white} />
              <Text className="font-semibold text-white">Meet</Text>
            </Pressable>
          </View>
        </View>

        <ReportUserModal
          isOpen={isReportOpen}
          userId={currentMatch._id}
          displayName={currentMatch.firstName}
          onClose={() => setIsReportOpen(false)}
          onBlocked={() => removeMatch(currentMatch._id)}
        />
      </>
    );
  }

  return (
    <View className="flex-1 bg-kin-beige px-3 pb-3" style={{ paddingTop: insets.top + 8 }}>
      {header}
      {body}
    </View>
  );
};
