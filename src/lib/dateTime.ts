export const NOON_TIME_ZONE = process.env.NOON_TIMEZONE || 'Asia/Muscat';
const MUSCAT_UTC_OFFSET_MINUTES = 4 * 60;

export type NoonDateInput = Date | string | number;

export function toValidDate(value: NoonDateInput | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function withNoonTimeZone(options: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormatOptions {
  return {
    ...options,
    timeZone: options.timeZone ?? NOON_TIME_ZONE,
  };
}

export function formatNoonDateTime(
  value: NoonDateInput | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = toValidDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, withNoonTimeZone(options)).format(date);
}

export function formatNoonDateTimeLocalInput(value: NoonDateInput | null | undefined): string {
  const date = toValidDate(value);
  if (!date) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: NOON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function noonDateTimeLocalInputToIso(value: string | null | undefined): string | null {
  if (!value) return null;

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const utcMs =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0,
      0,
    ) -
    MUSCAT_UTC_OFFSET_MINUTES * 60 * 1000;

  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isQuarterHourDateTimeValue(value: NoonDateInput | null | undefined): boolean {
  if (value == null || value === '') return true;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/T\d{2}:(\d{2})(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/);
    if (match) {
      return Number(match[1]) % 15 === 0;
    }
  }

  const date = toValidDate(value);
  if (!date) return false;

  return date.getUTCMinutes() % 15 === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
}

export function isQuarterHourTimeValue(value: string | null | undefined): boolean {
  if (value == null || value === '') return true;
  const match = value.trim().match(/^([01]\d|2[0-3]):(00|15|30|45)$/);
  return Boolean(match);
}

export function roundDateToQuarterHour(value: Date = new Date()): Date {
  const rounded = new Date(value);
  const quarterMinutes = Math.round(rounded.getMinutes() / 15) * 15;
  rounded.setMinutes(quarterMinutes, 0, 0);
  return rounded;
}
