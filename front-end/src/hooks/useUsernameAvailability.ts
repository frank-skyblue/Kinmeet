import { useCallback, useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { USERNAME_MESSAGES, getUsernameRuleError, normalizeUsername } from '../utils/username';

export type UsernameStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'current' | 'error';

const CHECK_DELAY_MS = 400;

/**
 * Live availability check for a username field. Checks the rules first, then asks the server
 * once the user has stopped typing for CHECK_DELAY_MS. An empty value is `idle` (usernames are
 * optional at sign-up); `currentUsername` is recognised as the user's own, not as taken.
 */
export const useUsernameAvailability = (username: string, currentUsername?: string) => {
  const [status, setStatus] = useState<UsernameStatus>('idle');
  const [message, setMessage] = useState('');
  const current = currentUsername ? normalizeUsername(currentUsername) : undefined;

  const show = (next: UsernameStatus, text: string) => {
    setStatus(next);
    setMessage(text);
  };

  useEffect(() => {
    const normalized = normalizeUsername(username);

    if (normalized === '') {
      show('idle', '');
      return;
    }
    if (normalized === current) {
      show('current', USERNAME_MESSAGES.current);
      return;
    }
    // Don't ask the server about a badly formatted name.
    const ruleError = getUsernameRuleError(normalized);
    if (ruleError) {
      show('invalid', ruleError);
      return;
    }

    show('checking', USERNAME_MESSAGES.checking);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await authAPI.checkUsername(normalized);
        if (cancelled) return;
        if (!result.success || result.available === undefined) throw new Error('Unexpected response');
        show(result.available ? 'available' : 'taken', result.available ? USERNAME_MESSAGES.available : USERNAME_MESSAGES.taken);
      } catch {
        if (cancelled) return;
        // Never treat a failed check as available.
        show('error', USERNAME_MESSAGES.checkFailed);
      }
    }, CHECK_DELAY_MS);

    // When the username changes again (or the field unmounts): cancel the pending check and
    // ignore any response still in flight for the old value.
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, current]);

  /**
   * For submit buttons: resolves to null if the username may be used, otherwise the message to
   * show. Re-checks immediately if a check is still pending or the last one failed.
   */
  const confirm = useCallback(async (): Promise<string | null> => {
    if (status === 'idle' || status === 'available' || status === 'current') return null;
    if (status === 'invalid' || status === 'taken') return message;
    try {
      const result = await authAPI.checkUsername(normalizeUsername(username));
      if (!result.success || result.available === undefined) throw new Error('Unexpected response');
      if (!result.available) {
        show('taken', USERNAME_MESSAGES.taken);
        return USERNAME_MESSAGES.taken;
      }
      show('available', USERNAME_MESSAGES.available);
      return null;
    } catch {
      show('error', USERNAME_MESSAGES.checkFailed);
      return USERNAME_MESSAGES.checkFailed;
    }
  }, [status, message, username]);

  return { status, message, confirm };
};
