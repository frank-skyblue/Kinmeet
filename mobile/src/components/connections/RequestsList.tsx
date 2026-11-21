import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { COLORS } from '../../constants/colors';
import { useConnectionRequests } from '../../contexts/useConnectionRequests';
import { blockAPI, connectionsAPI } from '../../services/api';
import type { ConnectionRequestItem, ConnectionRequestSender } from '../../types';
import { calculateAgeFromDateOfBirth } from '../../utils/age';
import { getErrorMessage } from '../../utils/error';
import { ActionMenu } from '../common/ActionMenu';
import { Avatar } from '../common/Avatar';
import { ReportUserModal } from '../common/ReportUserModal';

/** "Marie, 30", or just "Marie" without an age. Last names stay hidden until people connect. */
const formatSenderName = ({ firstName, dateOfBirth }: ConnectionRequestSender) => {
  const age = calculateAgeFromDateOfBirth(dateOfBirth);
  return age === null ? firstName : `${firstName}, ${age}`;
};

const Chips = ({ label, items, outlined }: { label: string; items: string[]; outlined?: boolean }) => (
  <View>
    <Text className="mb-1 text-xs text-kin-navy/55">{label}</Text>
    <View className="flex-row flex-wrap gap-1">
      {items.map((item) => (
        <View
          key={item}
          className={`rounded-full px-2 py-0.5 ${
            outlined ? 'border border-kin-coral' : 'bg-kin-beige'
          }`}
        >
          <Text className={`text-[11px] font-medium ${outlined ? 'text-kin-coral' : 'text-kin-navy'}`}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  </View>
);

type RequestsListProps = {
  /** Changes whenever the Kins screen comes back into view, to reload the list. */
  refreshKey: number;
  onOpenProfile: (userId: string) => void;
};

/** Pending kin requests with Accept / Ignore (port of the web Requests). */
export const RequestsList = ({ refreshKey, onOpenProfile }: RequestsListProps) => {
  const { refetchConnectionRequests } = useConnectionRequests();
  const [requests, setRequests] = useState<ConnectionRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  // Accept/ignore/block in flight for this request; stops a second tap acting twice.
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    userId: string;
    requestId: string;
    name: string;
  } | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'refresh') setIsRefreshing(true);
    setLoadError('');
    try {
      const response = await connectionsAPI.getConnectionRequests();
      if (response.success) {
        setRequests(response.requests);
      } else {
        setLoadError('Failed to load kin requests');
      }
    } catch {
      setLoadError('Failed to load kin requests');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load, refreshKey]);

  /** Drops a handled request and updates the tab badge. */
  const removeRequest = (requestId: string) => {
    setRequests((prev) => prev.filter((request) => request._id !== requestId));
    void refetchConnectionRequests();
  };

  const runForRequest = async (
    requestId: string,
    request: () => Promise<unknown>,
    failure: string,
  ) => {
    if (busyRequestId) return;
    setBusyRequestId(requestId);
    setError('');
    try {
      await request();
      removeRequest(requestId);
    } catch (err: unknown) {
      setError(getErrorMessage(err, failure));
    } finally {
      setBusyRequestId(null);
    }
  };

  const confirmBlock = (item: ConnectionRequestItem) => {
    const name = item.sender.firstName;
    Alert.alert(
      `Block ${name}?`,
      'Their request will be removed and they won’t be able to message you or see you in Discover. ' +
        'You can unblock them in Settings & Privacy.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () =>
            void runForRequest(
              item._id,
              () => blockAPI.blockUser(item.sender._id),
              `Failed to block ${name}`,
            ),
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.coral} />
        <Text className="mt-4 text-kin-navy">Loading requests...</Text>
      </View>
    );
  }

  if (loadError && requests.length === 0) {
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
      <View className="mb-2 flex-row items-baseline justify-between">
        <Text className="text-base font-semibold text-kin-navy">Connection requests</Text>
        <Text className="text-sm text-kin-stone-500">{requests.length} pending</Text>
      </View>

      {error ? (
        <Text
          accessibilityRole="alert"
          className="mb-2 rounded-xl border border-kin-coral-200 bg-kin-coral-50 px-3 py-2 text-sm text-kin-coral-700"
        >
          {error}
        </Text>
      ) : null}

      <FlatList
        data={requests}
        keyExtractor={(item) => item._id}
        refreshing={isRefreshing}
        onRefresh={() => void load('refresh')}
        contentContainerClassName="gap-2 pb-4 flex-grow"
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-8">
            <Text className="mb-4 text-5xl">👋</Text>
            <Text accessibilityRole="header" className="mb-2 text-xl font-bold text-kin-navy">
              No pending requests
            </Text>
            <Text className="text-center text-sm text-kin-stone-500">
              When someone sends you a Meet request, it will appear here
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const { sender } = item;
          const displayName = formatSenderName(sender);
          const isBusy = busyRequestId === item._id;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${sender.firstName}'s profile`}
              onPress={() => onOpenProfile(sender._id)}
              className={`gap-3 rounded-2xl bg-white p-3 active:opacity-90 ${isBusy ? 'opacity-50' : ''}`}
            >
              <View className="flex-row items-center gap-3 border-b border-kin-stone-300/60 pb-3">
                <Avatar firstName={sender.firstName} photo={sender.photo} size={48} />
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-bold text-kin-navy">{displayName}</Text>
                  <Text className="text-sm font-semibold text-kin-navy/85">
                    📍 {sender.currentProvince}, {sender.currentCountry}
                  </Text>
                </View>
                <ActionMenu
                  label={`More actions for ${sender.firstName}`}
                  items={[
                    { label: 'View Profile', onSelect: () => onOpenProfile(sender._id) },
                    {
                      label: 'Report',
                      onSelect: () =>
                        setReportTarget({
                          userId: sender._id,
                          requestId: item._id,
                          name: sender.firstName,
                        }),
                      variant: 'destructive',
                    },
                    {
                      label: isBusy ? 'Working…' : 'Block',
                      onSelect: () => confirmBlock(item),
                      variant: 'destructive',
                      disabled: isBusy,
                    },
                  ]}
                />
              </View>

              <Chips label="Speaks" items={sender.languages} />
              <Chips label="Looking for" items={sender.lookingFor} outlined />

              <View className="flex-row gap-2 border-t border-kin-stone-300/60 pt-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Accept kin request from ${sender.firstName}`}
                  accessibilityState={{ disabled: Boolean(busyRequestId) }}
                  disabled={Boolean(busyRequestId)}
                  onPress={() =>
                    void runForRequest(
                      item._id,
                      () => connectionsAPI.acceptRequest(item._id),
                      'Failed to accept request',
                    )
                  }
                  className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-kin-coral active:opacity-80"
                >
                  <Ionicons name="checkmark" size={18} color={COLORS.white} />
                  <Text className="font-semibold text-white">Accept</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ignore kin request from ${sender.firstName}`}
                  accessibilityState={{ disabled: Boolean(busyRequestId) }}
                  disabled={Boolean(busyRequestId)}
                  onPress={() =>
                    void runForRequest(
                      item._id,
                      () => connectionsAPI.ignoreRequest(item._id),
                      'Failed to ignore request',
                    )
                  }
                  className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-kin-stone-300 bg-white active:opacity-80"
                >
                  <Ionicons name="close" size={18} color={COLORS.navy} />
                  <Text className="font-semibold text-kin-navy">Ignore</Text>
                </Pressable>
              </View>
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
          onBlocked={() => removeRequest(reportTarget.requestId)}
        />
      ) : null}
    </View>
  );
};
