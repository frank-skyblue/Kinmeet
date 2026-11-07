import type React from 'react';

/** Wording shared with the backend (back-end/src/middleware/schemas.ts → usernameField). */
export const USERNAME_MESSAGES = {
  available: 'Username available',
  taken: 'This username is already taken.',
  current: 'This is your current username',
  checking: 'Checking availability...',
  checkFailed: 'Unable to check availability. Please try again.',
} as const;

/** Usernames are case-insensitive and stored lowercase. */
export const normalizeUsername = (value: string): string => value.trim().toLowerCase();

/** Specific message for the first rule the username breaks, or null if it's valid. */
export const getUsernameRuleError = (value: string): string | null => {
  if (value.length < 3) return 'Username must be at least 3 characters.';
  if (value.length > 30) return 'Username must be at most 30 characters.';
  if (!/^[a-z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores.';
  return null;
};

/**
 * onChange for username inputs: shows what's typed in lowercase, keeping the cursor in place
 * (replacing an input's value otherwise moves the cursor to the end when editing mid-word).
 */
export const handleLowercaseInput = (
  event: React.ChangeEvent<HTMLInputElement>,
  setValue: (value: string) => void,
) => {
  const input = event.target;
  const { selectionStart, selectionEnd } = input;
  setValue(input.value.toLowerCase());
  requestAnimationFrame(() => input.setSelectionRange(selectionStart, selectionEnd));
};
