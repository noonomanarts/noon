import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';
import { getCurrentUser } from '@/lib/session';
import { getLoyaltyCardByUserId } from '@/lib/db/wallet';
import { LoyaltySection } from '@/components/site/LoyaltySection';

export default async function AccountLoyaltyPage({
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

  let loyalty = await getLoyaltyCardByUserId(user.id);
  if (!loyalty) {
    loyalty = {
      id: '',
      user_id: user.id,
      points: 0,
      stamps: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  return <LoyaltySection loyalty={loyalty} locale={locale} />;
}
