import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { notificationsAPI } from '../services/api';
import { registerWebPushForCurrentUser } from '../services/pushNotifications';
import type { AlertChannel, ChannelPreferences } from '../types';

export const NEW_PEOPLE_ALERT_MESSAGES = {
  saved: 'Preferences updated.',
  saveFailed: "Couldn't save your change. Please try again.",
  loadFailed: "Couldn't load your alert settings.",
  pushDenied:
    'Notifications are blocked for KinMeet in this browser. Allow them in your browser settings, then try again.',
  pushUnsupported: "Push notifications aren't available in this browser.",
} as const;

export type SaveResult =
  | { ok: true }
  /** `retryable` is false when trying again can't help (the browser has no push support). */
  | { ok: false; message: string; retryable: boolean };

const OFF: ChannelPreferences = { email: false, push: false };

/**
 * "New people nearby" alert preferences, stored on the server so Discover and
 * Settings → Notifications always agree.
 *
 * `setChannel` shows the change at once and saves it. If the save fails, only that channel goes
 * back to its previous value. Turning push on first asks the browser for permission and registers
 * this device; push is never shown as on when the browser refused.
 */
export const useNewPeopleAlerts = () => {
  const [preferences, setPreferences] = useState<ChannelPreferences>(OFF);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState<Record<AlertChannel, boolean>>(OFF);
  const savedRef = useRef<ChannelPreferences>(OFF);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await notificationsAPI.getPreferences();
      savedRef.current = response.preferences.newPeopleNearby;
      setPreferences(response.preferences.newPeopleNearby);
    } catch {
      setLoadError(NEW_PEOPLE_ALERT_MESSAGES.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setChannel = useCallback(async (channel: AlertChannel, enabled: boolean): Promise<SaveResult> => {
    const revert = () => setPreferences((prev) => ({ ...prev, [channel]: savedRef.current[channel] }));

    setSaving((prev) => ({ ...prev, [channel]: true }));
    setPreferences((prev) => ({ ...prev, [channel]: enabled }));
    try {
      if (channel === 'push' && enabled) {
        const registration = await registerWebPushForCurrentUser();
        if (registration !== 'registered') {
          revert();
          return registration === 'denied'
            ? { ok: false, message: NEW_PEOPLE_ALERT_MESSAGES.pushDenied, retryable: true }
            : { ok: false, message: NEW_PEOPLE_ALERT_MESSAGES.pushUnsupported, retryable: false };
        }
      }

      const response = await notificationsAPI.updatePreferences({ newPeopleNearby: { [channel]: enabled } });
      const saved = response.preferences.newPeopleNearby;
      savedRef.current = saved;
      // Only this channel: the other may have a save of its own in flight.
      setPreferences((prev) => ({ ...prev, [channel]: saved[channel] }));
      return { ok: true };
    } catch (err: unknown) {
      revert();
      // 409: the server has no device to push to; its message says what to do.
      const conflict = axios.isAxiosError(err) && err.response?.status === 409
        ? (err.response.data as { message?: string } | undefined)?.message
        : undefined;
      return { ok: false, message: conflict ?? NEW_PEOPLE_ALERT_MESSAGES.saveFailed, retryable: true };
    } finally {
      setSaving((prev) => ({ ...prev, [channel]: false }));
    }
  }, []);

  return { preferences, isLoading, loadError, reload: load, saving, setChannel };
};
