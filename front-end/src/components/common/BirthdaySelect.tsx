import React, { useEffect, useMemo, useRef, useState } from 'react';
import SearchableSelect from './SearchableSelect';

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

interface BirthdaySelectProps {
  idPrefix: string;
  label: string;
  value: string;
  minIsoDate: string;
  maxIsoDate: string;
  required?: boolean;
  onChange: (isoDate: string) => void;
}

const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

const toIsoDate = (year: string, month: string, day: string): string =>
  `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

const parseIsoBound = (iso: string): { year: number; month: number; day: number } => {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
};

const parseValue = (value: string): { month: string; day: string; year: string } => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return { month: '', day: '', year: '' };
  return {
    year: String(Number(match[1])),
    month: String(Number(match[2])),
    day: String(Number(match[3])),
  };
};

const getMonthBounds = (
  year: number,
  minBound: { year: number; month: number },
  maxBound: { year: number; month: number },
): { min: number; max: number } => {
  let min = 1;
  let max = 12;
  if (year === minBound.year) min = minBound.month;
  if (year === maxBound.year) max = maxBound.month;
  return { min, max };
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const BirthdaySelect: React.FC<BirthdaySelectProps> = ({
  idPrefix,
  label,
  value,
  minIsoDate,
  maxIsoDate,
  required = false,
  onChange,
}) => {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const skipEmptySyncRef = useRef(false);

  useEffect(() => {
    if (!value.trim() && skipEmptySyncRef.current) {
      skipEmptySyncRef.current = false;
      return;
    }

    const parsed = parseValue(value);
    setMonth(parsed.month);
    setDay(parsed.day);
    setYear(parsed.year);
  }, [value]);

  const minYear = Number(minIsoDate.slice(0, 4));
  const maxYear = Number(maxIsoDate.slice(0, 4));
  const minBound = parseIsoBound(minIsoDate);
  const maxBound = parseIsoBound(maxIsoDate);
  const selectedYear = year ? Number(year) : null;
  const selectedMonth = month ? Number(month) : null;

  const yearOptions = useMemo(() => {
    const options = [];
    for (let y = maxYear; y >= minYear; y -= 1) {
      options.push({ value: String(y), label: String(y) });
    }
    return options;
  }, [maxYear, minYear]);

  const monthOptions = useMemo(() => {
    if (!selectedYear) return MONTH_OPTIONS;
    return MONTH_OPTIONS.filter((option) => {
      const optionMonth = Number(option.value);
      if (selectedYear === minBound.year && optionMonth < minBound.month) return false;
      if (selectedYear === maxBound.year && optionMonth > maxBound.month) return false;
      return true;
    });
  }, [maxBound.month, maxBound.year, minBound.month, minBound.year, selectedYear]);

  const dayOptions = useMemo(() => {
    if (!selectedMonth) return [];
    const y = selectedYear ?? 2004;
    const count = getDaysInMonth(y, selectedMonth);

    let startDay = 1;
    let endDay = count;
    if (selectedYear === minBound.year && selectedMonth === minBound.month) {
      startDay = minBound.day;
    }
    if (selectedYear === maxBound.year && selectedMonth === maxBound.month) {
      endDay = maxBound.day;
    }

    if (startDay > endDay) return [];

    return Array.from({ length: endDay - startDay + 1 }, (_, i) => {
      const d = String(startDay + i);
      return { value: d, label: d };
    });
  }, [
    maxBound.day,
    maxBound.month,
    maxBound.year,
    minBound.day,
    minBound.month,
    minBound.year,
    selectedMonth,
    selectedYear,
  ]);

  const emit = (m: string, d: string, y: string) => {
    if (!m || !d || !y) {
      skipEmptySyncRef.current = true;
      onChange('');
      return;
    }
    const iso = toIsoDate(y, m, d);
    if (iso < minIsoDate || iso > maxIsoDate) {
      const fallback = iso > maxIsoDate ? maxIsoDate : minIsoDate;
      const parsed = parseValue(fallback);
      setYear(parsed.year);
      setMonth(parsed.month);
      setDay(parsed.day);
      onChange(fallback);
      return;
    }
    onChange(iso);
  };

  const handleMonthChange = (nextMonth: string) => {
    const monthAllowed =
      !selectedYear ||
      !nextMonth ||
      monthOptions.some((option) => option.value === nextMonth);
    const safeMonth = monthAllowed ? nextMonth : '';
    setMonth(safeMonth);
    let nextDay = day;
    if (safeMonth && day) {
      const y = year ? Number(year) : 2004;
      const maxDay = getDaysInMonth(y, Number(safeMonth));
      if (Number(day) > maxDay) nextDay = String(maxDay);
    }
    setDay(nextDay);
    emit(safeMonth, nextDay, year);
  };

  const handleDayChange = (nextDay: string) => {
    setDay(nextDay);
    emit(month, nextDay, year);
  };

  const handleYearChange = (nextYear: string) => {
    setYear(nextYear);
    let nextMonth = month;
    if (nextYear && month) {
      const { min, max } = getMonthBounds(Number(nextYear), minBound, maxBound);
      nextMonth = String(clamp(Number(month), min, max));
    }

    let nextDay = day;
    if (nextMonth && day && nextYear) {
      const y = Number(nextYear);
      const m = Number(nextMonth);
      let minDay = 1;
      let maxDay = getDaysInMonth(y, m);
      if (y === minBound.year && m === minBound.month) minDay = minBound.day;
      if (y === maxBound.year && m === maxBound.month) maxDay = maxBound.day;
      nextDay = String(clamp(Number(day), minDay, maxDay));
    }
    setMonth(nextMonth);
    setDay(nextDay);
    emit(nextMonth, nextDay, nextYear);
  };

  const labelId = `${idPrefix}-label`;

  return (
    <div>
      <label
        id={labelId}
        className="block text-sm font-medium font-inter text-kin-navy mb-2"
      >
        {label}
        {required ? <span className="text-kin-coral ml-1">*</span> : null}
      </label>

      <div
        className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)] gap-2 sm:gap-3"
        role="group"
        aria-labelledby={labelId}
      >
        <SearchableSelect
          id={`${idPrefix}-month`}
          label="Month"
          hideLabel
          options={monthOptions}
          value={month}
          onChange={handleMonthChange}
          placeholder="Month"
          required={required}
        />
        <SearchableSelect
          id={`${idPrefix}-day`}
          label="Day"
          hideLabel
          options={dayOptions}
          value={day}
          onChange={handleDayChange}
          placeholder="Day"
          disabled={!month}
          required={required}
        />
        <SearchableSelect
          id={`${idPrefix}-year`}
          label="Year"
          hideLabel
          options={yearOptions}
          value={year}
          onChange={handleYearChange}
          placeholder="Year"
          searchable="typeahead"
          required={required}
        />
      </div>
    </div>
  );
};

export default BirthdaySelect;
