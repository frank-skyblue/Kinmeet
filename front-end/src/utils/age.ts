const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseIsoDateParts = (value: string): { year: number; month: number; day: number } | null => {
  const isoDate = value.slice(0, 10);
  if (!ISO_DATE_PATTERN.test(isoDate)) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
};

export const calculateAgeFromDateOfBirth = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  let parts = parseIsoDateParts(value);
  if (!parts) {
    try {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      parts = {
        year: parsed.getUTCFullYear(),
        month: parsed.getUTCMonth() + 1,
        day: parsed.getUTCDate(),
      };
    } catch {
      return null;
    }
  }

  const now = new Date();
  const todayYear = now.getUTCFullYear();
  const todayMonth = now.getUTCMonth() + 1;
  const todayDay = now.getUTCDate();

  let age = todayYear - parts.year;
  if (todayMonth < parts.month || (todayMonth === parts.month && todayDay < parts.day)) {
    age -= 1;
  }

  if (age < 0) {
    return null;
  }

  return age;
};

export const dobIsoBoundsUtc = (now = new Date()): { minIsoUtc: string; todayIsoUtc: string } => {
  const pad = (value: number) => String(value).padStart(2, '0');
  const todayIsoUtc = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
  const maxDobUtc = new Date(
    Date.UTC(now.getUTCFullYear() - 120, now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0),
  );
  const minIsoUtc = `${maxDobUtc.getUTCFullYear()}-${pad(maxDobUtc.getUTCMonth() + 1)}-${pad(maxDobUtc.getUTCDate())}`;
  return { minIsoUtc, todayIsoUtc };
};
