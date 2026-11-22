import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { SelectField } from './SelectField';
import { FieldLabel } from './FieldLabel';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({ value: String(i + 1), label: name }));

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const parseIso = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return { year: '', month: '', day: '' };
  return { year: String(Number(match[1])), month: String(Number(match[2])), day: String(Number(match[3])) };
};

const toIso = (year: string, month: string, day: string) =>
  `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

type BirthdayFieldProps = {
  label: string;
  required?: boolean;
  /** YYYY-MM-DD, or '' until month, day and year are all picked. */
  value: string;
  /** Oldest and newest allowed dates, YYYY-MM-DD. */
  minIsoDate: string;
  maxIsoDate: string;
  onChange: (isoDate: string) => void;
};

/** Month / day / year pickers, like the web BirthdaySelect. */
export const BirthdayField = ({
  label,
  required = false,
  value,
  minIsoDate,
  maxIsoDate,
  onChange,
}: BirthdayFieldProps) => {
  const [parts, setParts] = useState(() => parseIso(value));

  const minYear = Number(minIsoDate.slice(0, 4));
  const maxYear = Number(maxIsoDate.slice(0, 4));

  const yearOptions = useMemo(
    () =>
      Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
        const year = String(maxYear - i);
        return { value: year, label: year };
      }),
    [minYear, maxYear],
  );

  // Leap years: use the picked year, or 2000 (a leap year) so Feb 29 stays available until one is picked.
  const daysInMonth = parts.month
    ? getDaysInMonth(Number(parts.year || 2000), Number(parts.month))
    : 31;
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  const update = (field: 'year' | 'month' | 'day', nextValue: string) => {
    const next = { ...parts, [field]: nextValue };
    // Picking a shorter month (or a non-leap year) can make the chosen day invalid.
    if (next.day && next.month) {
      const maxDay = getDaysInMonth(Number(next.year || 2000), Number(next.month));
      if (Number(next.day) > maxDay) next.day = '';
    }
    setParts(next);
    onChange(next.year && next.month && next.day ? toIso(next.year, next.month, next.day) : '');
  };

  return (
    <View className="mb-4">
      <FieldLabel label={label} required={required} />
      <View className="flex-row gap-2">
        <SelectField
          label="Month"
          hideLabel
          options={MONTH_OPTIONS}
          value={parts.month}
          onChange={(v) => update('month', v)}
          placeholder="Month"
          className="flex-[1.4]"
        />
        <SelectField
          label="Day"
          hideLabel
          options={dayOptions}
          value={parts.day}
          onChange={(v) => update('day', v)}
          placeholder="Day"
          className="flex-1"
        />
        <SelectField
          label="Year"
          hideLabel
          options={yearOptions}
          value={parts.year}
          onChange={(v) => update('year', v)}
          placeholder="Year"
          className="flex-1"
        />
      </View>
    </View>
  );
};
