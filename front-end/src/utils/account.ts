import type { User } from '../types';

export const isAccountDeactivated = (user: User | null | undefined): boolean =>
  user?.accountStatus === 'deactivated';

/**
 * The signed-in user while their account is active, otherwise null. A deactivated
 * account is signed in only to reactivate, so app-wide data (inbox, requests, socket,
 * push) treats it as signed out.
 */
export const activeUserOrNull = (user: User | null): User | null =>
  isAccountDeactivated(user) ? null : user;
