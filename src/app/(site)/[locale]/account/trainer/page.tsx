import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';
import { getCurrentUser } from '@/lib/session';
import { getTrainerDashboardData } from '@/lib/db/trainers';
import TrainerDashboardPageClient from '@/components/site/TrainerDashboardPageClient';

export default async function AccountTrainerDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (user.role !== 'TRAINER') {
    redirect(`/${locale}/account/profile`);
  }

  const dashboard = await getTrainerDashboardData(user.id);

  return <TrainerDashboardPageClient locale={locale} dashboard={dashboard} />;
}
