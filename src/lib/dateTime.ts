export const NOON_TIME_ZONE = process.env.NOON_TIMEZONE || 'Asia/Muscat';

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