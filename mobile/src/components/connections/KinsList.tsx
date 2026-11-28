import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { COLORS } from '../../constants/colors';
import { blockAPI, connectionsAPI } from '../../services/api';
import type { Connection } from '../../types';
import { getErrorMessage } from '../../utils/error';
import { ActionMenu } from '../common/ActionMenu';
import { Avatar } from '../common/Avatar';
import { ReportUserModal } from '../common/ReportUserModal';

const formatLongDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const getSummary = (connection: Connection) => {
  const location = `${connection.currentProvince}, ${connection.currentCountry}`;
  const shown = connection.languages.slice(0, 2).join(', ');
  const more = connection.languages.length > 2 ? ` +${connection.languages.length - 2}` : '';
  return {
    line1: connection.languages.length > 0 ? `${location} · ${shown}${more}` : location,
    line2: `From ${connection.homeCountry}`,
  };
};

type KinsListProps = {
  /** Changes whenever the Kins screen comes back into view, to reload the list. */
  refreshKey: number;
  onOpenProfile: (userId: string) => void;
  onMessage: (userId: string) => void;
  onOpenDiscover: () => void;
};

/** "My kins": people the user is connected with (port of the web ConnectionsList). */
export const KinsList = ({ refreshKey, onOpenProfile, onMessage, onOpenDiscover }: KinsListProps) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ userId: string; name: string } | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'refresh') setIsRefreshing(true);
    setLoadError('');
    try {
      const response = await connectionsAPI.getConnections();
      if (response.success) {
        setConnections(response.connections);
      } else {
        setLoadError('Failed to load kins');
      }
    } catch {
      setLoadError('Failed to load kins');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load, refreshKey]);

  const removeFromList = (userId: string) =>
    setConnections((prev) => prev.filter((connection) => connection._id !== userId));

  const runForUser = async (userId: string, request: () => Promise<unknown>, failure: string) => {
    if (busyUserId) return;
    setBusyUserId(userId);
    setError('');
    try {
      await request();
      removeFromList(userId);
    } catch (err: unknown) {
      setError(getErrorMessage(err, failure));
    } finally {
      setBusyUserId(null);
    }
  };

  const confirmRemove = (connection: Connection, fullName: string) => {
    Alert.alert(
      `Remove ${fullName} as a kin?`,
      'You can send them a new Meet request later from Discover.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            void runForUser(
              connection._id,
              () => connectionsAPI.removeConnection(connection._id),
              'Could not remove kin',
            ),
        },
      ],
    );
  };

  const confirmBlock = (connection: Connection, fullName: string) => {
    Alert.alert(
      `Block ${fullName}?`,
      "They'll be removed from your kins and won't be able to message you or see you in Discover. " +
        "Your conversation will be hidden. You can unblock them in Settings & Privacy, but you won't be reconnected.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () =>
            void runForUser(
              connection._id,
              () => blockAPI.blockUser(connection._id),
              'Could not block kin',
            ),
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.coral} />
        <Text className="mt-4 text-kin-navy">Loading kins...</Text>
      </View>
    );
  }

  if (loadError && connections.length === 0) {
    return (
      <View accessibilityRole="alert" className="flex-1 items-center justify-center px-4">
        <Text className="mb-4 text-center text-kin-navy">{loadError}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void load('refresh')}
          className="rounded-xl bg-kin-coral px-6 py-3 active:opacity-80"
        >
          <Text className="font-semibold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Text className="mb-2 text-xs text-kin-stone-500">
        {connections.length} {connections.length === 1 ? 'kin' : 'kins'}
      </Text>

      {error ? (
        <Text
          accessibilityRole="alert"
          className="mb-2 rounded-xl border border-kin-coral-200 bg-kin-coral-50 px-3 py-2 text-sm text-kin-coral-700"
        >
          {error}
        </Text>
      ) : null}

      <FlatList
        data={connections}
        keyExtractor={(connection) => connection._id}
        refreshing={isRefreshing}
        onRefresh={() => void load('refresh')}
        contentContainerClassName="gap-2 pb-4 flex-grow"
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-8">
            <Text className="mb-4 text-5xl">🤝</Text>
            <Text accessibilityRole="header" className="mb-2 text-xl font-bold text-kin-navy">
              No kins yet
            </Text>
            <Text className="mb-6 text-center text-sm text-kin-stone-500">
              Start discovering people from your homeland and send Meet requests!
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenDiscover}
              className="rounded-xl bg-kin-coral px-6 py-3 active:opacity-80"
            >
              <Text className="font-semibold text-white">Discover people</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item: connection }) => {
          const fullName = `${connection.firstName} ${connection.lastName}`;
          const { line1, line2 } = getSummary(connection);
          const connectedOn = connection.connectedAt ? formatLongDate(connection.connectedAt) : '';
          const isBusy = busyUserId === connection._id;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${fullName}'s profile`}
              onPress={() => onOpenProfile(connection._id)}
              className={`flex-row items-center gap-3 rounded-2xl bg-white px-3 py-4 active:opacity-80 ${
                isBusy ? 'opacity-50' : ''
              }`}
            >
              <Avatar firstName={connection.firstName} photo={connection.photo} />

              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-base font-bold text-kin-navy">
                  {fullName}
                </Text>
                <Text numberOfLines={2} className="mt-0.5 text-xs leading-4 text-kin-stone-500">
                  {line1}
                </Text>
                <Text numberOfLines={1} className="text-xs leading-4 text-kin-stone-500">
                  {line2}
                </Text>
                {connectedOn ? (
                  <Text className="mt-1 text-xs text-kin-navy/70">Connected on {connectedOn}</Text>
                ) : null}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Message ${fullName}`}
                hitSlop={4}
                onPress={() => onMessage(connection._id)}
                className="h-10 w-10 items-center justify-center rounded-xl bg-kin-coral active:opacity-80"
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.white} />
              </Pressable>

              <ActionMenu
                label={`More actions for ${fullName}`}
                items={[
                  {
                    label: isBusy ? 'Working…' : 'Remove Kin',
                    onSelect: () => confirmRemove(connection, fullName),
                    variant: 'destructive',
                    disabled: isBusy,
                  },
                  {
                    label: 'Report',
                    onSelect: () => setReportTarget({ userId: connection._id, name: fullName }),
                    variant: 'destructive',
                  },
                  {
                    label: isBusy ? 'Working…' : 'Block',
                    onSelect: () => confirmBlock(connection, fullName),
                    variant: 'destructive',
                    disabled: isBusy,
                  },
                ]}
              />
            </Pressable>
          );
        }}
      />

      {reportTarget ? (
        <ReportUserModal
          isOpen
          userId={reportTarget.userId}
          displayName={reportTarget.name}
          onClose={() => setReportTarget(null)}
          onBlocked={() => removeFromList(reportTarget.userId)}
        />
      ) : null}
    </View>
  );
};
