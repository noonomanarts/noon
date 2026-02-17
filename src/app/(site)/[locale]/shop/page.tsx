import Link from "next/link";
import Image from 'next/image';
import { isLocale, type Locale } from "@/lib/locale";
import { listShopCategoriesForPublic } from '@/lib/db/shop';

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const t = {
    title: locale === "ar" ? "المتجر" : "Shop",
    subtitle: locale === "ar" ? "استكشف تصنيفات المتجر المعتمدة من فريق نون." : "Explore professionally curated categories from the Noon team.",
    categories: locale === "ar" ? "التصنيفات" : "Categories",
    allProducts: locale === "ar" ? "كل التصنيفات" : "All Categories",
    noCategories: locale === "ar" ? "لا توجد تصنيفات نشطة حالياً." : "No active categories available right now.",
    openCategory: locale === "ar" ? "فتح التصنيف" : "Open category",
    comingSoon: locale === "ar" ? "المنتجات ستتوفر قريباً" : "Products will be available soon",
  };

  const categories = await listShopCategoriesForPublic();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 lg:block">
        <div className="sticky top-24">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t.categories}
          </h2>
          <nav className="space-y-1">
            <Link
              href={`/${locale}/shop`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <span className="text-xl">🛍️</span>
              <span>{t.allProducts}</span>
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/${locale}/shop/${category.slug}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <span className="text-xl">📦</span>
                <span>{locale === 'ar' ? category.name_ar : category.name_en}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t.title}
          </h1>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            {t.subtitle}
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 text-5xl">📭</div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.noCategories}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/${locale}/shop/${category.slug}`}
                className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="relative h-40 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={locale === 'ar' ? category.name_ar : category.name_en}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">{t.comingSoon}</div>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {locale === 'ar' ? category.name_ar : category.name_en}
                  </h2>
                  <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {(locale === 'ar' ? category.description_ar : category.description_en) || t.comingSoon}
                  </p>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t.openCategory} →</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
