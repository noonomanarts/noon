import Link from "next/link";
import Image from 'next/image';
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/locale";
import { getShopCategoryBySlug, listShopCategoriesForPublic } from '@/lib/db/shop';

export default async function ShopCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale: rawLocale, category } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const [categories, currentCategory] = await Promise.all([
    listShopCategoriesForPublic(),
    getShopCategoryBySlug(category),
  ]);

  if (!currentCategory) {
    notFound();
  }

  const t = {
    categories: locale === "ar" ? "التصنيفات" : "Categories",
    products: locale === "ar" ? "المنتجات" : "Products",
    comingSoon: locale === "ar" ? "قريباً" : "Coming Soon",
    comingSoonDesc: locale === "ar" 
      ? "نعمل على إضافة منتجات رائعة في هذه الفئة"
      : "We're working on adding amazing products in this category",
    allProducts: locale === "ar" ? "كل التصنيفات" : "All Categories",
    openAll: locale === 'ar' ? 'عرض كل التصنيفات' : 'View all categories',
  };

  const categoryName = locale === 'ar' ? currentCategory.name_ar : currentCategory.name_en;
  const categoryDescription =
    (locale === 'ar' ? currentCategory.description_ar : currentCategory.description_en) || t.comingSoonDesc;

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
            {categories.map((cat) => {
              const isActive = cat.slug === category;
              return (
                <Link
                  key={cat.slug}
                  href={`/${locale}/shop/${cat.slug}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  }`}
                >
                  <span className="text-xl">📦</span>
                  <span>{locale === 'ar' ? cat.name_ar : cat.name_en}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {categoryName}
          </h1>
          <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">{categoryDescription}</p>
        </div>

        {/* Coming Soon Message */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative h-56 w-full bg-zinc-100 dark:bg-zinc-800">
            {currentCategory.image ? (
              <Image
                src={currentCategory.image}
                alt={categoryName}
                fill
                sizes="(max-width: 1024px) 100vw, 70vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">{t.comingSoon}</div>
            )}
          </div>
          <div className="flex min-h-[240px] flex-col items-center justify-center p-12 text-center">
          <h2 className="mb-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {t.comingSoon}
          </h2>
          <p className="max-w-md text-zinc-600 dark:text-zinc-400">
            {t.comingSoonDesc}
          </p>
          <Link
            href={`/${locale}/shop`}
            className="mt-6 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t.openAll}
          </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
