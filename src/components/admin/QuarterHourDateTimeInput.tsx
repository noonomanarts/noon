'use client';

import { useMemo } from 'react';

type QuarterHourDateTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  className: string;
  name?: string;
  required?: boolean;
};

type QuarterHourTimeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className: string;
  required?: boolean;
  disabled?: boolean;
};

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

function getDatePart(value: string): string {
  return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
}

function getTimePart(value: string): string {
  return value.match(/T(\d{2}:\d{2})/)?.[1] ?? '';
}

export default function QuarterHourDateTimeInput({
  value,
  onChange,
  className,
  name,
  required,
}: QuarterHourDateTimeInputProps) {
  const timeOptions = useMemo(() => QUARTER_HOUR_OPTIONS, []);

  const datePart = getDatePart(value);
  const timePart = getTimePart(value);

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_8.5rem]">
      <input
        type="date"
        name={name}
        required={required}
        value={datePart}
        onChange={(event) => {
          const nextDate = event.target.value;
          onChange(nextDate ? `${nextDate}T${timePart || '00:00'}` : '');
        }}
        className={className}
      />
      <select
        required={required}
        value={timeOptions.includes(timePart) ? timePart : ''}
        onChange={(event) => {
          if (!datePart) return;
          const nextTime = event.target.value;
          onChange(nextTime ? `${datePart}T${nextTime}` : '');
        }}
        className={className}
      >
        <option value="">Time</option>
        {timeOptions.map((option) => (
          <option key={option} value={option}>
            {formatTimeLabel(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function QuarterHourTimeSelect({
  value,
  onChange,
  className,
  required,
  disabled,
}: QuarterHourTimeSelectProps) {
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
