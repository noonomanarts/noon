import { isLocale, type Locale } from "@/lib/locale";
import CartPageClient from '@/components/site/CartPageClient';

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  return (
    <div className="route-sharp">
      <CartPageClient locale={locale} />
    </div>
  );
}
