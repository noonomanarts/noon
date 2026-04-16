import EventBookingCompletionClient from '@/components/site/EventBookingCompletionClient';
import { isLocale, type Locale } from '@/lib/locale';

export default async function EventBookingCompletionPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const resolvedParams = await params;
  const locale = (isLocale(resolvedParams.locale) ? resolvedParams.locale : 'en') as Locale;

  return <EventBookingCompletionClient locale={locale} token={resolvedParams.token} />;
}