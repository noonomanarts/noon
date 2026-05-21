'use client';

import { useMemo } from 'react';

const QUARTER_HOUR_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const totalMinutes = index * 15;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

function formatTimeLabel(value: string): string {
  const [hourPart, minute] = value.split(':');
  const hour = Number(hourPart);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${minute} ${period}`;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  className: string;
  required?: boolean;
  disabled?: boolean;
};

export default function QuarterHourTimeSelect({ value, onChange, className, required, disabled }: Props) {
  const timeOptions = useMemo(() => QUARTER_HOUR_OPTIONS, []);

  return (
    <select
      required={required}
      disabled={disabled}
      value={timeOptions.includes(value) ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    >
      <option value="">Time</option>
      {timeOptions.map((option) => (
        <option key={option} value={option}>
          {formatTimeLabel(option)}
        </option>
      ))}
    </select>
  );
}
