export const getCalendarDateKey = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfCalendarDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const formatMessageDateLabel = (
  dateString: string,
  referenceDate: Date = new Date(),
): string => {
  const date = new Date(dateString);
  const refStart = startOfCalendarDay(referenceDate);
  const msgStart = startOfCalendarDay(date);
  const diffDays = Math.round((refStart.getTime() - msgStart.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== referenceDate.getFullYear() ? 'numeric' : undefined,
  });
};

export const formatMessageTime = (dateString: string): string =>
  new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

export type MessageDateGroup<T extends { createdAt: string }> = {
  dateKey: string;
  dateLabel: string;
  messages: T[];
};

export const groupMessagesByDate = <T extends { createdAt: string }>(
  messages: T[],
  referenceDate: Date = new Date(),
): MessageDateGroup<T>[] => {
  const groups: MessageDateGroup<T>[] = [];

  for (const message of messages) {
    const dateKey = getCalendarDateKey(message.createdAt);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.dateKey === dateKey) {
      lastGroup.messages.push(message);
      continue;
    }

    groups.push({
      dateKey,
      dateLabel: formatMessageDateLabel(message.createdAt, referenceDate),
      messages: [message],
    });
  }

  return groups;
};
