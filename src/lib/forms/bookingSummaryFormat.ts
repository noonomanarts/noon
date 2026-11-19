import { formatNoonDateTime } from '@/lib/dateTime';

const intlLocale = (locale: string) => (locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM');

/** "2026-11-20" -> "Friday, 20 November 2026" / "الجمعة، 20 نوفمبر 2026". */
export function formatBookingDate(locale: string, dateKey: string | null | undefined): string {
  if (!dateKey) return '';
  return (
    formatNoonDateTime(`${dateKey}T12:00:00+04:00`, intlLocale(locale), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) || dateKey
  );
}

/** "10:00" -> "10:00 AM" / "10:00 ص" (same style as the time picker). */
export function formatBookingTime(locale: string, time: string | null | undefined): string {
  if (!time) return '';
  return (
    formatNoonDateTime(`2000-01-01T${time}:00+04:00`, intlLocale(locale), {
      hour: 'numeric',
      minute: '2-digit',
    }) || time
  );
}
