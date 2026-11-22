import type { ChatMessage } from '../types';

const DAY_MS = 1000 * 60 * 60 * 24;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Whole calendar days from `date` to `reference` (0 = same day). */
const calendarDaysBetween = (date: Date, reference: Date) =>
  Math.round((startOfDay(reference).getTime() - startOfDay(date).getTime()) / DAY_MS);

export const getCalendarDateKey = (dateString: string): string => {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Separator between days in a thread: "Today", "Yesterday", "Monday", "March 3", "March 3, 2025". */
export const formatMessageDateLabel = (dateString: string, reference: Date = new Date()): string => {
  const date = new Date(dateString);
  const days = calendarDaysBetween(date, reference);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== reference.getFullYear() ? 'numeric' : undefined,
  });
};

export const formatMessageTime = (dateString: string): string =>
  new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** Time of the last message in the inbox: a time today, then "Yesterday", a weekday, a date. */
export const formatInboxTime = (dateString: string, reference: Date = new Date()): string => {
  const date = new Date(dateString);
  const days = calendarDaysBetween(date, reference);

  if (days === 0) return formatMessageTime(dateString);
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

/** Inbox preview text for a message (same wording as the web). */
export const describeMessagePreview = (message: ChatMessage | null, maxLength = 56): string => {
  if (!message) return 'No messages yet';
  if (message.type === 'image') return message.content ? `📷 ${message.content}` : '📷 Photo';
  if (message.type === 'voice') {
    const duration = message.attachment?.durationMs;
    return duration ? `🎤 Voice message · ${formatDuration(duration)}` : '🎤 Voice message';
  }
  const text = message.content ?? '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};
